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

export interface Movie {
  id: string
  title: string
  cleanTitle: string
  year?: number | null
  filePaths: string[] // multi-part files (e.g. CD1, CD2)
  primaryFilePath: string
  fileName: string
  fileSize?: number
  durationSec: number
  timeSec: number
  completed: boolean
  lastWatchedAt: number | null
  // Technical specs extracted offline via ffmpeg:
  resolution?: string
  videoCodec?: string
  audioCodec?: string
  // TMDB / Online metadata:
  tmdbId?: number | null
  posterUrl?: string | null
  backdropUrl?: string | null
  overview?: string | null
  rating?: number | null
  releaseDate?: string | null
  genres?: string[]
  director?: string | null
  // Local video thumbnail (revealed on hover):
  hasThumbnail?: boolean
  subDelaySec?: number
}

export interface TmdbMovieSearchResult {
  id: number
  title: string
  original_title?: string
  release_date?: string
  year?: number
  poster_path?: string
  backdrop_path?: string
  overview?: string
  vote_average?: number
  genre_ids?: number[]
}

export interface LibraryData {
  series: Series[]
  movies: Movie[]
}

export type MediaPlayerType = 'vlc' | 'mpv'
export type Anime4KPreset = 'hq_lanczos' | 'anime4k' | 'fast'

export interface AppSettings {
  vlcPath: string
  mpvPath?: string
  preferredPlayer?: MediaPlayerType
  enableAnime4K?: boolean
  anime4kPreset?: Anime4KPreset
  mpvCustomArgs?: string
  preferredSubtitleLanguage?: string
  openSubtitlesApiKey?: string
  autoDownloadSubtitles?: boolean
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
  tmdbApiKey?: string
  enableRemoteServer?: boolean
  remotePort?: number
}

export interface RemoteServerInfo {
  enabled: boolean
  port: number
  localIp: string
  url: string
  qrCodeDataUrl: string
  connectedClients: number
}

export interface SubtitleDownloadResult {
  success: boolean
  source: 'subdb' | 'opensubtitles' | 'local_extracted' | 'local_matched' | 'none'
  filePath?: string
  language: string
  message: string
  offsetApplied?: number
}

export interface VlcStateUpdate {
  isRunning: boolean
  seriesId: string | null
  movieId?: string | null
  episodeId: string | null
  filePath: string | null
  filename: string | null
  state: 'playing' | 'paused' | 'stopped'
  currentTime: number
  duration: number
  completed: boolean
  subDelaySec?: number
  playerType?: MediaPlayerType
}

export type PlayerStateUpdate = VlcStateUpdate

export type FilterStatus = 'all' | 'unwatched' | 'in_progress' | 'completed'

export interface AppNotification {
  type: 'success' | 'info' | 'error'
  message: string
}

export interface UpdateInfo {
  hasUpdate: boolean
  currentVersion: string
  latestVersion: string
  releaseDate?: string
  releaseNotes?: string
  downloadUrl?: string | null
  assetName?: string | null
  assetSize?: number | null
}

export interface UpdateDownloadProgress {
  percent: number
  transferred: number
  total: number
}
