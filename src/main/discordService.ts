import { Client } from '@xhayper/discord-rpc'
import { StorageService } from './storageService'

export class DiscordService {
  private client: Client | null = null
  private isConnected = false
  private storageService: StorageService
  private currentClientId = ''

  constructor(storageService: StorageService) {
    this.storageService = storageService
  }

  public async connect(): Promise<void> {
    const settings = this.storageService.getSettings()
    if (!settings.enableDiscordRPC) return

    const clientId = settings.discordClientId || '1343981881774346332'
    if (this.isConnected && this.currentClientId === clientId) return

    this.disconnect()

    try {
      this.currentClientId = clientId
      this.client = new Client({
        clientId
      })

      this.client.on('ready', () => {
        this.isConnected = true
        console.log('Discord RPC connected successfully')
      })

      this.client.on('disconnected', () => {
        this.isConnected = false
      })

      await this.client.login().catch((err) => {
        // Silently catch if Discord is not open on the user's desktop
        this.isConnected = false
      })
    } catch {
      this.isConnected = false
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
      const state = params.isPlaying ? 'Watching in VLC' : 'Paused'

      const startTimestamp =
        params.isPlaying && params.currentTime >= 0
          ? Math.floor(Date.now() - params.currentTime * 1000)
          : undefined

      const endTimestamp =
        params.isPlaying && params.duration > 0 && startTimestamp
          ? Math.floor(startTimestamp + params.duration * 1000)
          : undefined

      await this.client.user?.setActivity({
        details,
        state,
        startTimestamp,
        endTimestamp,
        largeImageKey: params.coverImage || 'heimdall_logo',
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
