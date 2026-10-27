import { Client } from '@xhayper/discord-rpc'
import { StorageService } from './storageService'

export class DiscordService {
  private client: Client | null = null
  private isConnected = false
  private isConnecting = false
  private storageService: StorageService
  private currentClientId = ''
  private lastConnectAttempt = 0
  private connectedUsername = ''

  constructor(storageService: StorageService) {
    this.storageService = storageService
  }

  public getStatus(): { isConnected: boolean; username: string; clientId: string } {
    return {
      isConnected: this.isConnected,
      username: this.connectedUsername,
      clientId: this.currentClientId || this.storageService.getSettings().discordClientId || '737663962677510245'
    }
  }

  public async connect(): Promise<void> {
    const settings = this.storageService.getSettings()
    if (!settings.enableDiscordRPC) return

    const clientId = settings.discordClientId || '737663962677510245'
    if (this.isConnected && this.currentClientId === clientId) return
    if (this.isConnecting) return

    // Throttle connection attempts to at least 5 seconds apart
    const now = Date.now()
    if (now - this.lastConnectAttempt < 5000) return
    this.lastConnectAttempt = now

    this.disconnect()

    try {
      this.isConnecting = true
      this.currentClientId = clientId
      this.client = new Client({
        clientId
      })

      this.client.on('ready', () => {
        this.isConnected = true
        this.isConnecting = false
        this.connectedUsername = this.client?.user?.username || ''
        console.log(`[Discord RPC] Connected successfully as ${this.connectedUsername} (App ID: ${clientId})`)
      })

      this.client.on('disconnected', () => {
        this.isConnected = false
        this.isConnecting = false
        this.connectedUsername = ''
        console.log('[Discord RPC] Disconnected from Discord')
      })

      await this.client.login().catch((err) => {
        // Discord desktop client may not be open or responded slowly
        this.isConnected = false
        this.isConnecting = false
        this.connectedUsername = ''
      })
    } catch {
      this.isConnected = false
      this.isConnecting = false
      this.connectedUsername = ''
    }
  }

  public disconnect(): void {
    if (this.client) {
      try {
        this.client.destroy()
      } catch {
        // ignore
      }
      this.client = null
      this.isConnected = false
      this.isConnecting = false
      this.connectedUsername = ''
    }
  }

  public async updateActivity(params: {
    seriesTitle: string
    episodeNumber: number | null
    currentTime: number
    duration: number
    isPlaying: boolean
    coverImage?: string | null
  }): Promise<void> {
    const settings = this.storageService.getSettings()
    if (!settings.enableDiscordRPC) return

    if (!this.isConnected || !this.client) {
      await this.connect()
    }

    if (!this.isConnected || !this.client) return

    try {
      const epLabel =
        params.episodeNumber !== null ? `Episode ${params.episodeNumber}` : 'Episode'
      const details = `${params.seriesTitle} • ${epLabel}`
      const state = params.isPlaying ? 'Watching via Heimdall' : 'Paused'

      const startTimestamp =
        params.isPlaying && params.currentTime >= 0
          ? Math.floor(Date.now() - params.currentTime * 1000)
          : undefined

      const endTimestamp =
        params.isPlaying && params.duration > 0 && startTimestamp
          ? Math.floor(startTimestamp + params.duration * 1000)
          : undefined

      // External HTTP/HTTPS URLs are supported by modern Discord RPC.
      // If none is provided or if it's a local file path, fallback to 'mpv'
      const coverUrl =
        params.coverImage && (params.coverImage.startsWith('http://') || params.coverImage.startsWith('https://'))
          ? params.coverImage
          : 'mpv'

      await this.client.user?.setActivity({
        details,
        state,
        startTimestamp,
        endTimestamp,
        largeImageKey: coverUrl,
        largeImageText: params.seriesTitle,
        smallImageKey: params.isPlaying ? 'play' : 'pause',
        smallImageText: params.isPlaying ? 'Playing' : 'Paused'
      })
    } catch {
      // ignore ephemeral RPC communication errors
    }
  }

  public async clearActivity(): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        await this.client.user?.clearActivity()
      } catch {
        // ignore
      }
    }
  }
}
