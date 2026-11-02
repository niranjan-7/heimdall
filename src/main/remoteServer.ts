import * as crypto from 'crypto'
import * as http from 'http'
import * as os from 'os'
import * as fs from 'fs'
import * as path from 'path'
import * as QRCode from 'qrcode'
import { StorageService, generateSecret } from './storageService'
import { PlayerManager } from './player/playerManager'
import { ThumbnailService } from './thumbnailService'
import { VlcStateUpdate, RemoteServerInfo } from '../shared/types'

const MAX_BODY_BYTES = 16 * 1024
const MAX_SUBTITLE_NUDGE_SEC = 10

function sendJson(res: http.ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  })
  res.end(JSON.stringify(body))
}

/** Reads a request body, or resolves null if it is larger than `limit` bytes. */
function readBody(req: http.IncomingMessage, limit: number): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size <= limit) chunks.push(chunk)
    })
    req.on('end', () => resolve(size > limit ? null : Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

export class RemoteServer {
  private server: http.Server | null = null
  private storageService: StorageService
  private playerManager: PlayerManager
  private thumbnailService: ThumbnailService
  private sseClients = new Set<http.ServerResponse>()
  private lastState: VlcStateUpdate | null = null
  private port = 42125

  constructor(
    storageService: StorageService,
    playerManager: PlayerManager,
    thumbnailService: ThumbnailService
  ) {
    this.storageService = storageService
    this.playerManager = playerManager
    this.thumbnailService = thumbnailService
  }

  public getLocalIpAddress(): string {
    const interfaces = os.networkInterfaces()
    const candidates: string[] = []
    for (const name of Object.keys(interfaces)) {
      for (const net of interfaces[name] || []) {
        if (net.family === 'IPv4' && !net.internal) {
          candidates.push(net.address)
        }
      }
    }
    // Prefer standard Wi-Fi / LAN subnets first (192.168.x.x or 10.x.x.x)
    const lan = candidates.find((ip) => ip.startsWith('192.168.') || ip.startsWith('10.'))
    if (lan) return lan
    // Avoid link-local 169.254.x.x if any other address is present
    const nonLinkLocal = candidates.find((ip) => !ip.startsWith('169.254.'))
    if (nonLinkLocal) return nonLinkLocal
    return candidates[0] || '127.0.0.1'
  }

  /** The port actually in use (differs from the setting when that is 0, as in tests). */
  public getPort(): number {
    const addr = this.server?.address()
    if (addr && typeof addr === 'object') return addr.port
    return this.storageService.getSettings().remotePort ?? this.port
  }

  public async getServerInfo(): Promise<RemoteServerInfo> {
    const settings = this.storageService.getSettings()
    const port = this.getPort()
    const localIp = this.getLocalIpAddress()
    const token = settings.remoteToken || ''
    // The pairing code goes after "#", which browsers never send to a server or in a Referer.
    const url = `http://${localIp}:${port}/#t=${token}`

    let qrCodeDataUrl = ''
    try {
      qrCodeDataUrl = await QRCode.toDataURL(url, {
        margin: 2,
        scale: 6,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      })
    } catch {
      // ignore
    }

    return {
      enabled: !!settings.enableRemoteServer,
      port,
      localIp,
      url,
      token,
      qrCodeDataUrl,
      connectedClients: this.sseClients.size
    }
  }

  public broadcastState(state: VlcStateUpdate | null): void {
    this.lastState = state
    const payload = JSON.stringify({
      type: 'playback_state',
      data: state
    })
    for (const client of this.sseClients) {
      try {
        client.write(`data: ${payload}\n\n`)
      } catch {
        this.sseClients.delete(client)
      }
    }
  }

  /** Starts the server only if the phone remote is switched on in settings. */
  public async startIfEnabled(): Promise<void> {
    if (this.storageService.getSettings().enableRemoteServer) await this.start()
  }

  public async setEnabled(enabled: boolean): Promise<void> {
    this.storageService.saveSettings({ enableRemoteServer: enabled })
    if (enabled) await this.start()
    else this.stop()
  }

  /** Issues a new pairing code. Every paired phone has to scan the new QR code. */
  public resetPairing(): void {
    this.storageService.setRemoteToken(generateSecret())
    this.disconnectClients()
  }

  public start(): Promise<void> {
    if (this.server) return Promise.resolve()

    this.port = this.storageService.getSettings().remotePort ?? 42125
    const server = http.createServer((req, res) => {
      this.handleRequest(req, res).catch((err) => {
        console.error('[Heimdall Remote] Request failed:', err)
        if (!res.headersSent) sendJson(res, 500, { error: 'Server error' })
        else res.end()
      })
    })
    this.server = server

    return new Promise((resolve) => {
      server.once('error', (err) => {
        console.error('[Heimdall Remote] Server error:', err)
        if (this.server === server) this.server = null
        resolve()
      })
      server.listen(this.port, '0.0.0.0', () => {
        console.log(
          `[Heimdall Remote] Running on http://${this.getLocalIpAddress()}:${this.getPort()}`
        )
        resolve()
      })
    })
  }

  public stop(): void {
    this.disconnectClients()
    if (this.server) {
      this.server.close()
      this.server = null
    }
  }

  private disconnectClients(): void {
    for (const client of this.sseClients) {
      try {
        client.end()
      } catch {}
    }
    this.sseClients.clear()
  }

  /**
   * Checks the pairing code in constant time. POST requests must send it in the Authorization
   * header; GET requests may also use ?t= because EventSource cannot set headers.
   */
  private isAuthorized(req: http.IncomingMessage, url: URL): boolean {
    const expected = this.storageService.getSettings().remoteToken
    if (!expected) return false

    const header = req.headers.authorization || ''
    let supplied = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : ''
    if (!supplied && req.method === 'GET') supplied = url.searchParams.get('t') || ''

    const a = Buffer.from(supplied)
    const b = Buffer.from(expected)
    return a.length === b.length && crypto.timingSafeEqual(a, b)
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    // No CORS headers on purpose: only this server's own page may call its API.
    const url = new URL(req.url || '/', 'http://localhost')
    const pathname = url.pathname

    // The page and its manifest are public. They contain no library data.
    if (req.method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'Referrer-Policy': 'no-referrer',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy':
          "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; base-uri 'none'; form-action 'none'"
      })
      res.end(this.getMobilePwaHtml())
      return
    }

    if (req.method === 'GET' && pathname === '/manifest.json') {
      res.writeHead(200, { 'Content-Type': 'application/manifest+json' })
      res.end(
        JSON.stringify({
          name: 'Heimdall Remote',
          short_name: 'Heimdall',
          start_url: '/',
          display: 'standalone',
          background_color: '#09090b',
          theme_color: '#f59e0b',
          icons: []
        })
      )
      return
    }

    if (!pathname.startsWith('/api/')) {
      sendJson(res, 404, { error: 'Not found' })
      return
    }

    if (!this.isAuthorized(req, url)) {
      sendJson(res, 401, { error: 'Not paired. Scan the QR code in Heimdall again.' })
      return
    }

    if (req.method === 'GET') {
      this.handleGet(pathname, req, res)
      return
    }

    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed' })
      return
    }

    // Requiring JSON means a web page on another site cannot send these requests: a browser
    // only sends a cross-site JSON POST after a preflight check, which this server never approves.
    const contentType = (req.headers['content-type'] || '').toLowerCase()
    if (!contentType.startsWith('application/json')) {
      sendJson(res, 415, { error: 'Send JSON' })
      return
    }

    const body = await readBody(req, MAX_BODY_BYTES)
    if (body === null) {
      sendJson(res, 413, { error: 'Request too large' })
      return
    }

    let data: Record<string, unknown>
    try {
      const parsed = body ? JSON.parse(body) : {}
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error()
      data = parsed
    } catch {
      sendJson(res, 400, { error: 'Invalid JSON' })
      return
    }

    await this.handleAction(pathname, data, res)
  }

  private handleGet(pathname: string, req: http.IncomingMessage, res: http.ServerResponse): void {
    // Real-time playback state (Server-Sent Events)
    if (pathname === '/api/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive'
      })
      res.write('\n')
      this.sseClients.add(res)
      res.write(`data: ${JSON.stringify({ type: 'init', data: this.lastState })}\n\n`)
      req.on('close', () => {
        this.sseClients.delete(res)
      })
      return
    }

    if (pathname === '/api/status') {
      sendJson(res, 200, {
        activeState: this.lastState,
        preferredPlayer: this.storageService.getSettings().preferredPlayer || 'vlc'
      })
      return
    }

    if (pathname === '/api/library') {
      const lib = this.storageService.getLibrary()
      const cleanSeries = lib.series.map((s) => ({
        id: s.id,
        title: s.aniListTitle || s.title,
        aniListTitle: s.aniListTitle,
        coverImage: s.coverImage,
        bannerImage: s.bannerImage,
        episodesCount: s.episodes.length,
        completedCount: s.episodes.filter((e) => e.completed).length,
        lastActiveEpisodeId: s.lastActiveEpisodeId,
        episodes: s.episodes.map((e) => ({
          id: e.id,
          title: e.title,
          seasonName: e.seasonName,
          episodeNumber: e.episodeNumber,
          completed: e.completed,
          timeSec: e.timeSec,
          durationSec: e.durationSec,
          hasThumbnail: e.hasThumbnail
        }))
      }))

      const cleanMovies = lib.movies.map((m) => ({
        id: m.id,
        title: m.title,
        cleanTitle: m.cleanTitle,
        year: m.year,
        completed: m.completed,
        timeSec: m.timeSec,
        durationSec: m.durationSec,
        posterUrl: m.posterUrl,
        backdropUrl: m.backdropUrl,
        resolution: m.resolution,
        rating: m.rating,
        overview: m.overview
      }))

      sendJson(res, 200, { series: cleanSeries, movies: cleanMovies })
      return
    }

    if (pathname.startsWith('/api/thumb/')) {
      const id = pathname.replace('/api/thumb/', '').trim()
      const thumbPath = this.thumbnailService.getThumbnailPath(id)
      if (fs.existsSync(thumbPath)) {
        res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store' })
        fs.createReadStream(thumbPath).pipe(res)
        return
      }
      sendJson(res, 404, { error: 'Thumbnail not found' })
      return
    }

    sendJson(res, 404, { error: 'Not found' })
  }

  private async handleAction(
    pathname: string,
    data: Record<string, unknown>,
    res: http.ServerResponse
  ): Promise<void> {
    if (pathname === '/api/play-series') {
      const { seriesId, episodeId } = data
      if (
        typeof seriesId !== 'string' ||
        (episodeId !== undefined && typeof episodeId !== 'string')
      ) {
        sendJson(res, 400, { error: 'seriesId must be a string' })
        return
      }
      if (!this.storageService.getSeries(seriesId)) {
        sendJson(res, 404, { error: 'Series not found' })
        return
      }
      const result = await this.playerManager.launchSeries(
        seriesId,
        episodeId as string | undefined,
        {
          advanceIfCompleted: true
        }
      )
      sendJson(res, 200, result)
      return
    }

    if (pathname === '/api/play-movie') {
      const { movieId } = data
      if (typeof movieId !== 'string') {
        sendJson(res, 400, { error: 'movieId must be a string' })
        return
      }
      if (!this.storageService.getMovie(movieId)) {
        sendJson(res, 404, { error: 'Movie not found' })
        return
      }
      sendJson(res, 200, await this.playerManager.launchMovie(movieId))
      return
    }

    if (pathname === '/api/command') {
      const { action, time, delta } = data

      if (action === 'toggle-pause') {
        sendJson(res, 200, { success: await this.playerManager.togglePause() })
        return
      }

      if (action === 'stop') {
        await this.playerManager.stopCurrentProcess()
        sendJson(res, 200, { success: true })
        return
      }

      if (action === 'seek') {
        if (typeof time !== 'number' || !Number.isFinite(time) || time < 0) {
          sendJson(res, 400, { error: 'time must be a number of seconds, 0 or more' })
          return
        }
        sendJson(res, 200, { success: await this.playerManager.seek(time) })
        return
      }

      if (action === 'nudge-sub') {
        if (
          typeof delta !== 'number' ||
          !Number.isFinite(delta) ||
          Math.abs(delta) > MAX_SUBTITLE_NUDGE_SEC
        ) {
          sendJson(res, 400, {
            error: `delta must be between -${MAX_SUBTITLE_NUDGE_SEC} and ${MAX_SUBTITLE_NUDGE_SEC}`
          })
          return
        }
        const current = this.playerManager.getSubtitleDelay()
        const next = Math.round((current + delta) * 100) / 100
        const ok = await this.playerManager.setSubtitleDelay(next)
        sendJson(res, 200, { success: ok, currentDelay: next })
        return
      }
    }

    sendJson(res, 400, { error: 'Unknown action' })
  }

  /**
   * Complete Single-File Mobile Progressive Web App (PWA)
   * Designed for iPhone/iPad and Android screens.
   */
  private getMobilePwaHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
  <title>Heimdall Remote</title>
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <link rel="manifest" href="/manifest.json">
  <style>
    * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    body {
      margin: 0;
      padding: 0;
      background: #09090b;
      color: #fafafa;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      overflow-x: hidden;
      padding-bottom: 120px;
    }
    header {
      position: sticky;
      top: 0;
      z-index: 40;
      background: rgba(9, 9, 11, 0.85);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding: 14px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 800;
      font-size: 17px;
      letter-spacing: -0.3px;
    }
    .badge {
      font-size: 10px;
      text-transform: uppercase;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 9999px;
      background: rgba(245, 158, 11, 0.15);
      color: #f59e0b;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }
    .tabs {
      display: flex;
      gap: 6px;
      padding: 12px 16px;
      background: #101014;
    }
    .tab-btn {
      flex: 1;
      padding: 9px 0;
      font-size: 13px;
      font-weight: 700;
      border-radius: 10px;
      border: none;
      background: #18181b;
      color: #a1a1aa;
      cursor: pointer;
      transition: all 0.2s;
    }
    .tab-btn.active {
      background: #f59e0b;
      color: #09090b;
    }
    .tab-content { display: none; padding: 12px 16px; }
    .tab-content.active { display: block; }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }
    .card {
      background: #141418;
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 14px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .card-thumb {
      width: 100%;
      aspect-ratio: 2/3;
      background: #1c1c22;
      object-fit: cover;
    }
    .card-body {
      padding: 10px;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .card-title {
      font-size: 13px;
      font-weight: 700;
      margin: 0 0 4px 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .card-sub {
      font-size: 11px;
      color: #71717a;
      margin-bottom: 8px;
    }
    .play-btn {
      width: 100%;
      padding: 7px;
      background: #f59e0b;
      color: #09090b;
      border: none;
      border-radius: 8px;
      font-weight: 700;
      font-size: 12px;
      cursor: pointer;
    }
    /* Fixed Now Playing Controller Bar */
    .now-playing-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 50;
      background: rgba(18, 18, 22, 0.95);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      padding: 12px 16px env(safe-area-inset-bottom, 14px);
      box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.6);
    }
    .now-playing-info {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .now-title {
      font-size: 14px;
      font-weight: 700;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 200px;
    }
    .now-time {
      font-size: 11px;
      font-mono;
      color: #a1a1aa;
    }
    .seek-slider {
      width: 100%;
      height: 4px;
      background: #27272a;
      border-radius: 2px;
      outline: none;
      accent-color: #f59e0b;
      margin: 6px 0 10px 0;
    }
    .controls-row {
      display: flex;
      align-items: center;
      justify-content: space-around;
      gap: 8px;
    }
    .ctrl-btn {
      background: #27272a;
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #fafafa;
      border-radius: 10px;
      padding: 8px 14px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
    .ctrl-btn.primary {
      background: #f59e0b;
      color: #09090b;
      font-weight: 800;
      padding: 8px 20px;
    }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <span>🛡️ Heimdall</span>
      <span class="badge">Remote</span>
    </div>
    <div id="connStatus" style="font-size: 11px; color: #10b981;">● Live Sync</div>
  </header>

  <div id="pairNotice" style="display: none; margin: 16px; padding: 14px; border-radius: 12px; background: #18181b; border: 1px solid #3f3f46; font-size: 13px; line-height: 1.5; color: #e4e4e7;">
    <strong>This phone is not paired.</strong> Open Heimdall on your computer, open the phone remote,
    and scan its QR code again.
  </div>

  <div class="tabs">
    <button class="tab-btn active" onclick="switchTab('series')">Series</button>
    <button class="tab-btn" onclick="switchTab('movies')">Movies</button>
  </div>

  <div id="seriesTab" class="tab-content active">
    <div id="seriesGrid" class="grid">Loading library...</div>
  </div>

  <div id="moviesTab" class="tab-content">
    <div id="moviesGrid" class="grid">Loading movies...</div>
  </div>

  <!-- Bottom Couch Remote Controller -->
  <div class="now-playing-bar" id="playerBar" style="display: none;">
    <div class="now-playing-info">
      <div>
        <div class="now-title" id="nowTitle">Playing Media</div>
        <div style="font-size: 10px; color: #f59e0b;" id="nowPlayer">Desktop Player</div>
      </div>
      <div class="now-time" id="nowTimeDisplay">00:00 / 00:00</div>
    </div>
    <input type="range" class="seek-slider" id="seekSlider" min="0" max="100" value="0" onchange="seekPlayback(this.value)">
    <div class="controls-row">
      <button class="ctrl-btn" onclick="sendNudge(-0.1)">-0.1s Sub</button>
      <button class="ctrl-btn primary" id="pauseBtn" onclick="togglePause()">Pause</button>
      <button class="ctrl-btn" onclick="sendNudge(0.1)">+0.1s Sub</button>
      <button class="ctrl-btn" style="color: #ef4444;" onclick="stopPlayback()">Stop</button>
    </div>
  </div>

  <script>
    const TOKEN_KEY = 'heimdallRemoteToken';
    const SERIES_PLACEHOLDER = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22150%22><rect width=%22100%%22 height=%22100%%22 fill=%22%2318181b%22/><text x=%2250%%22 y=%2250%%22 fill=%22%2371717a%22 font-size=%2212%22 text-anchor=%22middle%22>Series</text></svg>';
    const MOVIE_PLACEHOLDER = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22150%22><rect width=%22100%%22 height=%22100%%22 fill=%22%2318181b%22/><text x=%2250%%22 y=%2250%%22 fill=%22%2371717a%22 font-size=%2212%22 text-anchor=%22middle%22>Movie</text></svg>';

    let token = null;
    let libraryData = { series: [], movies: [] };
    let currentState = null;
    let events = null;

    // The QR code link ends with "#t=<pairing code>". Remember it on this phone and remove it from
    // the address bar.
    (function readToken() {
      const match = /[#&]t=([A-Za-z0-9_-]+)/.exec(location.hash);
      if (match) {
        token = match[1];
        try { localStorage.setItem(TOKEN_KEY, token); } catch (e) {}
        history.replaceState(null, '', location.pathname);
      } else {
        try { token = localStorage.getItem(TOKEN_KEY); } catch (e) {}
      }
    })();

    // Titles come from file names, so they are escaped before going into the page.
    function esc(value) {
      return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    }

    function showUnpaired() {
      token = null;
      try { localStorage.removeItem(TOKEN_KEY); } catch (e) {}
      if (events) { events.close(); events = null; }
      document.getElementById('pairNotice').style.display = 'block';
      document.getElementById('connStatus').innerText = '○ Not paired';
      document.getElementById('connStatus').style.color = '#ef4444';
      document.getElementById('seriesGrid').innerHTML = '';
      document.getElementById('moviesGrid').innerHTML = '';
      document.getElementById('playerBar').style.display = 'none';
    }

    async function api(path, body) {
      if (!token) { showUnpaired(); throw new Error('Not paired'); }
      const options = body === undefined
        ? { headers: { Authorization: 'Bearer ' + token } }
        : {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
            body: JSON.stringify(body)
          };
      const res = await fetch(path, options);
      if (res.status === 401) { showUnpaired(); throw new Error('Not paired'); }
      return res.json();
    }

    function formatTime(s) {
      s = Math.floor(s || 0);
      const m = Math.floor(s / 60);
      const sec = s % 60;
      return (m < 10 ? '0' : '') + m + ':' + (sec < 10 ? '0' : '') + sec;
    }

    function switchTab(tab) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      if (tab === 'series') {
        document.querySelector('.tab-btn:nth-child(1)').classList.add('active');
        document.getElementById('seriesTab').classList.add('active');
      } else {
        document.querySelector('.tab-btn:nth-child(2)').classList.add('active');
        document.getElementById('moviesTab').classList.add('active');
      }
    }

    async function loadLibrary() {
      try {
        libraryData = await api('/api/library');
        renderSeries();
        renderMovies();
      } catch (e) {
        console.error(e);
      }
    }

    function card(image, title, sub, kind, id, label) {
      return '<div class="card">' +
        '<img class="card-thumb" src="' + esc(image) + '" />' +
        '<div class="card-body"><div>' +
        '<h4 class="card-title">' + esc(title) + '</h4>' +
        '<div class="card-sub">' + esc(sub) + '</div>' +
        '</div>' +
        '<button class="play-btn" data-kind="' + kind + '" data-id="' + esc(id) + '">' + label + '</button>' +
        '</div></div>';
    }

    function renderSeries() {
      const grid = document.getElementById('seriesGrid');
      if (!libraryData.series || libraryData.series.length === 0) {
        grid.innerHTML = '<div style="color: #71717a; grid-column: span 2;">No series found in Heimdall library.</div>';
        return;
      }
      grid.innerHTML = libraryData.series.map(s => card(
        s.coverImage || SERIES_PLACEHOLDER,
        s.aniListTitle || s.title,
        s.completedCount + '/' + s.episodesCount + ' watched',
        'series', s.id, 'Play on PC'
      )).join('');
    }

    function renderMovies() {
      const grid = document.getElementById('moviesGrid');
      if (!libraryData.movies || libraryData.movies.length === 0) {
        grid.innerHTML = '<div style="color: #71717a; grid-column: span 2;">No movies found. Add movies in Heimdall on PC.</div>';
        return;
      }
      grid.innerHTML = libraryData.movies.map(m => card(
        m.posterUrl || MOVIE_PLACEHOLDER,
        m.title,
        (m.year || '') + (m.resolution ? ' • ' + m.resolution : ''),
        'movie', m.id, 'Play Movie'
      )).join('');
    }

    document.addEventListener('click', (e) => {
      const button = e.target.closest('.play-btn');
      if (!button) return;
      const request = button.dataset.kind === 'series'
        ? api('/api/play-series', { seriesId: button.dataset.id })
        : api('/api/play-movie', { movieId: button.dataset.id });
      request.catch(() => {});
    });

    function togglePause() {
      api('/api/command', { action: 'toggle-pause' }).catch(() => {});
    }

    function stopPlayback() {
      api('/api/command', { action: 'stop' }).catch(() => {});
    }

    function seekPlayback(val) {
      if (!currentState || !currentState.duration) return;
      const targetSec = (val / 100) * currentState.duration;
      api('/api/command', { action: 'seek', time: targetSec }).catch(() => {});
    }

    function sendNudge(delta) {
      api('/api/command', { action: 'nudge-sub', delta }).catch(() => {});
    }

    function updateController(state) {
      currentState = state;
      const bar = document.getElementById('playerBar');
      if (!state || !state.isRunning) {
        bar.style.display = 'none';
        return;
      }
      bar.style.display = 'block';
      document.getElementById('nowTitle').innerText = state.filename || 'Active Media';
      document.getElementById('nowPlayer').innerText = (state.playerType === 'mpv' ? '⚡ mpv Playing' : '🛡️ VLC Playing');
      document.getElementById('nowTimeDisplay').innerText = formatTime(state.currentTime) + ' / ' + formatTime(state.duration);
      document.getElementById('pauseBtn').innerText = (state.state === 'paused' ? 'Resume' : 'Pause');

      if (state.duration > 0) {
        document.getElementById('seekSlider').value = (state.currentTime / state.duration) * 100;
      }
    }

    // Live playback state. EventSource cannot send headers, so the code goes in the URL.
    function connectEvents() {
      events = new EventSource('/api/events?t=' + encodeURIComponent(token));
      events.onopen = () => {
        document.getElementById('connStatus').innerText = '● Live Sync';
        document.getElementById('connStatus').style.color = '#10b981';
      };
      events.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'playback_state' || msg.type === 'init') {
            updateController(msg.data);
          }
        } catch (err) {}
      };
      events.onerror = () => {
        document.getElementById('connStatus').innerText = '○ Reconnecting';
        document.getElementById('connStatus').style.color = '#f59e0b';
        // If the pairing code was reset, stop retrying and say so.
        api('/api/status').catch(() => {});
      };
    }

    if (token) {
      loadLibrary();
      connectEvents();
    } else {
      showUnpaired();
    }
  </script>
</body>
</html>`
  }
}
