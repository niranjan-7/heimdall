import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RemoteServer } from '../src/main/remoteServer'
import type { AppSettings } from '../src/shared/types'

const TOKEN = 'test-pairing-code-0123456789abcdef'

function makeServer() {
  const settings = {
    remotePort: 0, // pick a free port
    remoteToken: TOKEN,
    enableRemoteServer: true
  } as AppSettings

  const storage = {
    getSettings: () => ({ ...settings }),
    saveSettings: (s: Partial<AppSettings>) => Object.assign(settings, s),
    setRemoteToken: (t: string) => {
      settings.remoteToken = t
    },
    getLibrary: () => ({
      series: [
        {
          id: 'series-1',
          title: '<img src=x onerror=alert(1)>',
          episodes: [],
          lastActiveEpisodeId: null
        }
      ],
      movies: []
    }),
    getSeries: (id: string) => (id === 'series-1' ? { id } : undefined),
    getMovie: (id: string) => (id === 'movie-1' ? { id } : undefined)
  }

  const player = {
    launchSeries: vi.fn(async () => ({ success: true })),
    launchMovie: vi.fn(async () => ({ success: true })),
    togglePause: vi.fn(async () => true),
    stopCurrentProcess: vi.fn(async () => {}),
    seek: vi.fn(async () => true),
    getSubtitleDelay: vi.fn(() => 0),
    setSubtitleDelay: vi.fn(async () => true)
  }

  const thumbs = { getThumbnailPath: () => '/does/not/exist.jpg' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const server = new RemoteServer(storage as any, player as any, thumbs as any)
  return { server, player, settings }
}

let ctx: ReturnType<typeof makeServer>
let base: string

beforeEach(async () => {
  ctx = makeServer()
  await ctx.server.start()
  base = `http://127.0.0.1:${ctx.server.getPort()}`
})

afterEach(() => {
  ctx.server.stop()
})

const auth = (token = TOKEN) => ({ Authorization: `Bearer ${token}` })
const json = (token = TOKEN) => ({ ...auth(token), 'Content-Type': 'application/json' })
const post = (path: string, body: unknown, headers: Record<string, string> = json()) =>
  fetch(base + path, { method: 'POST', headers, body: JSON.stringify(body) })

describe('remote server: pairing', () => {
  it('serves the page without a code, with no CORS header', async () => {
    const res = await fetch(base + '/')
    expect(res.status).toBe(200)
    expect(res.headers.get('access-control-allow-origin')).toBeNull()
    expect(res.headers.get('content-security-policy')).toContain("connect-src 'self'")
  })

  it('refuses the API without the pairing code', async () => {
    const res = await fetch(base + '/api/library')
    expect(res.status).toBe(401)
    expect(res.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('refuses a wrong pairing code', async () => {
    expect((await fetch(base + '/api/library', { headers: auth('wrong') })).status).toBe(401)
    expect((await fetch(base + '/api/library', { headers: auth(TOKEN + 'x') })).status).toBe(401)
  })

  it('accepts the pairing code in the Authorization header', async () => {
    const res = await fetch(base + '/api/library', { headers: auth() })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.series[0].id).toBe('series-1')
  })

  it('accepts ?t= for GET only (EventSource cannot send headers)', async () => {
    expect((await fetch(`${base}/api/status?t=${TOKEN}`)).status).toBe(200)
    const res = await fetch(`${base}/api/command?t=${TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stop' })
    })
    expect(res.status).toBe(401)
    expect(ctx.player.stopCurrentProcess).not.toHaveBeenCalled()
  })

  it('stops accepting the old code after a reset', async () => {
    ctx.server.resetPairing()
    expect((await fetch(base + '/api/library', { headers: auth() })).status).toBe(401)
    const fresh = ctx.settings.remoteToken as string
    expect(fresh).not.toBe(TOKEN)
    expect((await fetch(base + '/api/library', { headers: auth(fresh) })).status).toBe(200)
  })

  it('puts the pairing code after # in the QR link', async () => {
    const info = await ctx.server.getServerInfo()
    expect(info.url.endsWith(`/#t=${TOKEN}`)).toBe(true)
    expect(info.qrCodeDataUrl.startsWith('data:image/png')).toBe(true)
  })
})

describe('remote server: requests', () => {
  it('rejects a non-JSON POST, which other websites could send without a preflight', async () => {
    const res = await post(
      '/api/command',
      { action: 'stop' },
      { ...auth(), 'Content-Type': 'text/plain' }
    )
    expect(res.status).toBe(415)
    expect(ctx.player.stopCurrentProcess).not.toHaveBeenCalled()
  })

  it('does not answer CORS preflight requests', async () => {
    const res = await fetch(base + '/api/command', { method: 'OPTIONS', headers: auth() })
    expect(res.status).toBe(405)
    expect(res.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('rejects oversized bodies', async () => {
    const res = await post('/api/command', { action: 'stop', pad: 'x'.repeat(20_000) })
    expect(res.status).toBe(413)
  })

  it('rejects malformed JSON', async () => {
    const res = await fetch(base + '/api/command', { method: 'POST', headers: json(), body: '{' })
    expect(res.status).toBe(400)
  })

  it.each([
    [{ action: 'seek', time: -5 }],
    [{ action: 'seek', time: 'soon' }],
    [{ action: 'nudge-sub', delta: 100 }],
    [{ action: 'nudge-sub', delta: null }],
    [{ action: 'self-destruct' }]
  ])('rejects invalid command %j', async (body) => {
    expect((await post('/api/command', body)).status).toBe(400)
    expect(ctx.player.seek).not.toHaveBeenCalled()
    expect(ctx.player.setSubtitleDelay).not.toHaveBeenCalled()
  })

  it('runs valid commands', async () => {
    expect((await post('/api/command', { action: 'seek', time: 90 })).status).toBe(200)
    expect(ctx.player.seek).toHaveBeenCalledWith(90)
    expect((await post('/api/command', { action: 'nudge-sub', delta: 0.1 })).status).toBe(200)
    expect(ctx.player.setSubtitleDelay).toHaveBeenCalledWith(0.1)
  })

  it('only plays series and movies that exist', async () => {
    expect((await post('/api/play-series', { seriesId: 'nope' })).status).toBe(404)
    expect((await post('/api/play-series', { seriesId: 42 })).status).toBe(400)
    expect((await post('/api/play-series', { seriesId: 'series-1' })).status).toBe(200)
    expect(ctx.player.launchSeries).toHaveBeenCalledTimes(1)
    expect((await post('/api/play-movie', { movieId: 'nope' })).status).toBe(404)
  })
})

describe('remote server: on/off', () => {
  it('does not start when the remote is switched off', async () => {
    ctx.server.stop()
    ctx.settings.enableRemoteServer = false
    await ctx.server.startIfEnabled()
    await expect(fetch(base + '/')).rejects.toThrow()
  })
})
