import * as http from 'http'
import * as os from 'os'
import * as fs from 'fs'
import * as path from 'path'
import * as QRCode from 'qrcode'
import { StorageService } from './storageService'
import { PlayerManager } from './player/playerManager'
import { ThumbnailService } from './thumbnailService'
import { VlcStateUpdate, RemoteServerInfo } from '../shared/types'

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

  public async getServerInfo(): Promise<RemoteServerInfo> {
    const settings = this.storageService.getSettings()
    const port = settings.remotePort || this.port
    const localIp = this.getLocalIpAddress()
    const url = `http://${localIp}:${port}`
    const enabled = settings.enableRemoteServer ?? true

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
      enabled,
      port,
      localIp,
      url,
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

  public start(): void {
    if (this.server) return

    const settings = this.storageService.getSettings()
    this.port = settings.remotePort || 42125

    this.server = http.createServer((req, res) => {
      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

      if (req.method === 'OPTIONS') {
        res.writeHead(204)
        res.end()
        return
      }

      const parsedUrl = new URL(req.url || '/', `http://127.0.0.1:${this.port}`)
      const pathname = parsedUrl.pathname

      // 1. Web App Manifest
      if (pathname === '/manifest.json') {
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

      // 2. Real-Time Server-Sent Events (SSE) Stream
      if (pathname === '/api/events') {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive'
        })
        res.write('\n')

        this.sseClients.add(res)

        // Send immediate initial state
        res.write(
          `data: ${JSON.stringify({
            type: 'init',
            data: this.lastState
          })}\n\n`
        )

        req.on('close', () => {
          this.sseClients.delete(res)
        })
        return
      }

      // 3. Status API
      if (pathname === '/api/status') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(
          JSON.stringify({
            activeState: this.lastState,
            localIp: this.getLocalIpAddress(),
            preferredPlayer: this.storageService.getSettings().preferredPlayer || 'vlc'
          })
        )
        return
      }

      // 4. Library API
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

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ series: cleanSeries, movies: cleanMovies }))
        return
      }

      // 5. Thumbnails endpoint
      if (pathname.startsWith('/api/thumb/')) {
        const id = pathname.replace('/api/thumb/', '').trim()
        const thumbPath = this.thumbnailService.getThumbnailPath(id)
        if (fs.existsSync(thumbPath)) {
          res.writeHead(200, { 'Content-Type': 'image/jpeg' })
          fs.createReadStream(thumbPath).pipe(res)
          return
        }
        res.writeHead(404)
        res.end('Thumbnail not found')
        return
      }

      // 6. Action Endpoints (POST)
      if (req.method === 'POST') {
        let body = ''
        req.on('data', (chunk) => {
          body += chunk.toString()
        })
        req.on('end', async () => {
          try {
            const data = body ? JSON.parse(body) : {}

            if (pathname === '/api/play-series') {
              const resLaunch = await this.playerManager.launchSeries(
                data.seriesId,
                data.episodeId,
                { advanceIfCompleted: true }
              )
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify(resLaunch))
              return
            }

            if (pathname === '/api/play-movie') {
              const resLaunch = await this.playerManager.launchMovie(data.movieId)
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify(resLaunch))
              return
            }

            if (pathname === '/api/command') {
              if (data.action === 'toggle-pause') {
                const ok = await this.playerManager.togglePause()
                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ success: ok }))
                return
              }

              if (data.action === 'stop') {
                await this.playerManager.stopCurrentProcess()
                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ success: true }))
                return
              }

              if (data.action === 'seek' && typeof data.time === 'number') {
                const ok = await this.playerManager.seek(data.time)
                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ success: ok }))
                return
              }

              if (data.action === 'nudge-sub' && typeof data.delta === 'number') {
                const current = this.playerManager.getSubtitleDelay()
                const next = Math.round((current + data.delta) * 100) / 100
                const ok = await this.playerManager.setSubtitleDelay(next)
                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ success: ok, currentDelay: next }))
                return
              }
            }

            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Unknown action' }))
          } catch (err: any) {
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: err?.message || 'Server error' }))
          }
        })
        return
      }

      // 7. Root Web PWA
      if (pathname === '/' || pathname === '/index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end(this.getMobilePwaHtml())
        return
      }

      res.writeHead(404)
      res.end('Not Found')
    })

    this.server.listen(this.port, '0.0.0.0', () => {
      console.log(`[Heimdall Remote] Running on http://${this.getLocalIpAddress()}:${this.port}`)
    })

    this.server.on('error', (err) => {
      console.error('[Heimdall Remote] Server error:', err)
    })
  }

  public stop(): void {
    for (const client of this.sseClients) {
      try {
        client.end()
      } catch {}
    }
    this.sseClients.clear()
    if (this.server) {
      this.server.close()
      this.server = null
    }
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
    let libraryData = { series: [], movies: [] };
    let currentState = null;

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
        const res = await fetch('/api/library');
        libraryData = await res.json();
        renderSeries();
        renderMovies();
      } catch (e) {
        console.error(e);
      }
    }

    function renderSeries() {
      const grid = document.getElementById('seriesGrid');
      if (!libraryData.series || libraryData.series.length === 0) {
        grid.innerHTML = '<div style="color: #71717a; grid-column: span 2;">No series found in Heimdall library.</div>';
        return;
      }
      grid.innerHTML = libraryData.series.map(s => \`
        <div class="card">
          <img class="card-thumb" src="\${s.coverImage || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22150%22><rect width=%22100%%22 height=%22100%%22 fill=%22%2318181b%22/><text x=%2250%%22 y=%2250%%22 fill=%22%2371717a%22 font-size=%2212%22 text-anchor=%22middle%22>Series</text></svg>'}" />
          <div class="card-body">
            <div>
              <h4 class="card-title">\${s.aniListTitle || s.title}</h4>
              <div class="card-sub">\${s.completedCount}/\${s.episodesCount} watched</div>
            </div>
            <button class="play-btn" onclick="playSeries('\${s.id}')">Play on PC</button>
          </div>
        </div>
      \`).join('');
    }

    function renderMovies() {
      const grid = document.getElementById('moviesGrid');
      if (!libraryData.movies || libraryData.movies.length === 0) {
        grid.innerHTML = '<div style="color: #71717a; grid-column: span 2;">No movies found. Add movies in Heimdall on PC.</div>';
        return;
      }
      grid.innerHTML = libraryData.movies.map(m => \`
        <div class="card">
          <img class="card-thumb" src="\${m.posterUrl || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22150%22><rect width=%22100%%22 height=%22100%%22 fill=%22%2318181b%22/><text x=%2250%%22 y=%2250%%22 fill=%22%2371717a%22 font-size=%2212%22 text-anchor=%22middle%22>Movie</text></svg>'}" />
          <div class="card-body">
            <div>
              <h4 class="card-title">\${m.title}</h4>
              <div class="card-sub">\${m.year || ''} \${m.resolution ? '• ' + m.resolution : ''}</div>
            </div>
            <button class="play-btn" onclick="playMovie('\${m.id}')">Play Movie</button>
          </div>
        </div>
      \`).join('');
    }

    async function playSeries(id) {
      await fetch('/api/play-series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seriesId: id })
      });
    }

    async function playMovie(id) {
      await fetch('/api/play-movie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movieId: id })
      });
    }

    async function togglePause() {
      await fetch('/api/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle-pause' })
      });
    }

    async function stopPlayback() {
      await fetch('/api/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' })
      });
    }

    async function seekPlayback(val) {
      if (!currentState || !currentState.duration) return;
      const targetSec = (val / 100) * currentState.duration;
      await fetch('/api/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seek', time: targetSec })
      });
    }

    async function sendNudge(delta) {
      await fetch('/api/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'nudge-sub', delta })
      });
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

    // Connect SSE
    function connectEvents() {
      const evt = new EventSource('/api/events');
      evt.onopen = () => {
        document.getElementById('connStatus').innerText = '● Live Sync';
        document.getElementById('connStatus').style.color = '#10b981';
      };
      evt.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'playback_state' || msg.type === 'init') {
            updateController(msg.data);
          }
        } catch (err) {}
      };
      evt.onerror = () => {
        document.getElementById('connStatus').innerText = '○ Reconnecting';
        document.getElementById('connStatus').style.color = '#f59e0b';
      };
    }

    loadLibrary();
    connectEvents();
  </script>
</body>
</html>`
  }
}
