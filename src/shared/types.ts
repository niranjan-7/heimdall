export type FillerCategory = 'manga_canon' | 'anime_canon' | 'mixed_canon' | 'filler'

export interface SeriesFillerStats {
  mangaCanonCount: number
  animeCanonCount: number
  mixedCanonCount: number
  fillerCount: number
  fillerPercentage: number
  sourceUrl?: string
  lastSyncedAt?: number
}

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
  /** Retimed copy written by auto-sync; loaded instead of the original subtitle. */
  syncedSubtitlePath?: string
  syncReport?: SyncReport
  fillerType?: FillerCategory
  fillerLabel?: string
  fileMissing?: boolean
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
  fillerStats?: SeriesFillerStats
  lastFillerSyncAt?: number
  aniListTotalEpisodes?: number | null
  aniListProgress?: number | null
  aniListStatus?: string | null
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
  syncedSubtitlePath?: string
  syncReport?: SyncReport
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
/** 'hq_lanczos' = high-quality scaling only; anime4k_* = Anime4K shader modes A/B/C; 'fast' = low power. */
export type Anime4KPreset = 'hq_lanczos' | 'anime4k_a' | 'anime4k_b' | 'anime4k_c' | 'fast'
/** Which Anime4K shader sizes to use: 'high' (VL/M) for strong GPUs, 'low' (M/S) for laptops. */
export type Anime4KGpu = 'high' | 'low'

export type UITheme = 'liquid_glass' | 'classic_dark' | 'oled_black'

/** Stable gets normal releases; Beta also gets pre-releases (e.g. 2.0.0-beta.1). */
export type UpdateChannel = 'stable' | 'beta'
export type StealthPlaybackMode = 'none' | 'minimize' | 'tray'

export interface AppSettings {
  vlcPath: string
  mpvPath?: string
  preferredPlayer?: MediaPlayerType
  enableAnime4K?: boolean
  anime4kPreset?: Anime4KPreset
  anime4kGpu?: Anime4KGpu
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
  enableLiquidGlass?: boolean
  uiTheme?: UITheme
  dimFillerEpisodes?: boolean
  tmdbApiKey?: string
  enableRemoteServer?: boolean
  remotePort?: number
  /** Pairing code phones must send to use the remote. Managed by the app, never by the UI. */
  remoteToken?: string
  updateChannel?: UpdateChannel
  /** Background behavior when playback begins: 'none' | 'minimize' | 'tray' */
  stealthPlaybackMode?: StealthPlaybackMode
}

export interface RemoteServerInfo {
  enabled: boolean
  port: number
  localIp: string
  /** Pairing link for phones: http://<ip>:<port>/#t=<token>. */
  url: string
  token: string
  qrCodeDataUrl: string
  connectedClients: number
}

export type SyncTarget =
  | { kind: 'episode'; seriesId: string; episodeId: string }
  | { kind: 'movie'; movieId: string }

export type SyncConfidence = 'high' | 'medium' | 'low'

export interface SyncReport {
  engine: 'native'
  /** Seconds added to every subtitle time (after `scale`). */
  offsetSec: number
  /** Frame-rate correction; 1 when none. */
  scale: number
  /** Human-readable frame-rate change, e.g. "25 → 23.976 fps". */
  fpsChange?: string
  score: number
  originalScore: number
  confidence: SyncConfidence
  /** The subtitle file the synced copy was made from. */
  sourcePath: string
  at: number
}

export interface SyncOutcome {
  status:
    | 'applied'
    | 'needs-confirmation'
    | 'refused'
    | 'already-in-sync'
    | 'no-subtitle'
    | 'cancelled'
    | 'error'
  message: string
  report?: SyncReport
  /** For 'needs-confirmation': pass to applyPendingSync / discardPendingSync. */
  pendingId?: string
  /** For 'no-subtitle': the video has an embedded text subtitle that can be synced on request. */
  embeddedAvailable?: boolean
}

export interface SyncProgress {
  stage: 'audio' | 'aligning'
  /** 0..1 */
  fraction: number
}

export interface SubtitleDownloadResult {
  success: boolean
  source: 'opensubtitles' | 'local_extracted' | 'local_matched' | 'none'
  filePath?: string
  language: string
  message: string
  /** Result of the automatic sync that runs after a download. */
  sync?: SyncOutcome
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
  /** GitHub page of the release (opened when the app cannot install by itself). */
  releaseUrl?: string
  /** True when this build can download, verify and install the update itself. */
  canInstall: boolean
  channel: UpdateChannel
}

export interface UpdateDownloadProgress {
  percent: number
  transferred: number
  total: number
}

export interface FreeSpacePreview {
  type: 'fillers' | 'watched'
  count: number
  totalBytes: number
  totalFormatted: string
  episodeIds: string[]
}

export interface DeleteEpisodesResult {
  success: boolean
  deletedCount: number
  freedBytes: number
  freedFormatted: string
  message?: string
}
