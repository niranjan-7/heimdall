import { Series, Episode, Movie, MediaPlayerType } from '../../shared/types'

export interface LaunchResult {
  success: boolean
  message?: string
}

export interface IMediaPlayerDriver {
  readonly playerType: MediaPlayerType
  isRunning(): boolean
  launchSeries(
    series: Series,
    targetEpisode: Episode,
    startIndex: number,
    startTime: number,
    subDelay: number
  ): Promise<LaunchResult>
  launchMovie(
    movie: Movie,
    startTime: number,
    subDelay: number
  ): Promise<LaunchResult>
  stop(): Promise<void>
  setSubtitleDelay(delaySec: number): Promise<boolean>
  getSubtitleDelay(): number
}

export interface IMediaPlayerController {
  isRunning(): boolean
  getActivePlayer(): MediaPlayerType | null
  launchSeries(
    seriesId: string,
    targetEpisodeId?: string,
    options?: { advanceIfCompleted?: boolean; startTime?: number }
  ): Promise<LaunchResult>
  launchMovie(
    movieId: string,
    options?: { startTime?: number }
  ): Promise<LaunchResult>
  stopCurrentProcess(): Promise<void>
  setSubtitleDelay(delaySec: number): Promise<boolean>
  getSubtitleDelay(): number
}
