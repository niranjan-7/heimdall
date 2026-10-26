export interface Episode {
  id: string
  filePath: string
  fileName: string
  title: string
  seasonName: string
  seasonFolder: string
  episodeNumber: number | null
  timeSec: number
  durationSec: number
  completed: boolean
  lastWatchedAt: number | null
  hasThumbnail?: boolean
  subDelaySec?: number
}

export interface AniListMediaInfo {
  id: number
  title: {
    romaji?: string
    english?: string
    native?: string
  }
  coverImage?: {
    large?: string
    extraLarge?: string
  }
  bannerImage?: string
  episodes?: number
  seasonYear?: number
  format?: string
  status?: string
  description?: string
}

export interface Series {
  id: string
  title: string
  rootPath: string
  additionalPaths: string[]
  episodes: Episode[]
  lastActiveEpisodeId: string | null
  createdAt: number
  updatedAt: number
  aniListId?: number | null
  coverImage?: string | null
  bannerImage?: string | null
  aniListTitle?: string | null
  defaultSubDelaySec?: number
}

export interface LibraryData {
  series: Series[]
}

export interface AppSettings {
  vlcPath: string
  completionThreshold: number
  httpPort: number
  httpPassword: string
  enableDiscordRPC: boolean
  discordClientId: string
  aniListToken?: string
  aniListUsername?: string
  aniListAvatar?: string
  enableAniListScrobble: boolean
  enableThumbnails: boolean
}

export interface VlcStateUpdate {
  isRunning: boolean
  seriesId: string | null
  episodeId: string | null
  filePath: string | null
  filename: string | null
  state: 'playing' | 'paused' | 'stopped'
  currentTime: number
  duration: number
  completed: boolean
  subDelaySec?: number
}

export type FilterStatus = 'all' | 'unwatched' | 'in_progress' | 'completed'

export interface AppNotification {
  type: 'success' | 'info' | 'error'
  message: string
}
