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
}

export interface LibraryData {
  series: Series[]
}

export interface AppSettings {
  vlcPath: string
  completionThreshold: number
  httpPort: number
  httpPassword: string
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
}

export type FilterStatus = 'all' | 'unwatched' | 'in_progress' | 'completed'
