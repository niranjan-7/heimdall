# Changelog

All notable changes to Heimdall are listed here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow
[Semantic Versioning](https://semver.org/). The text of a version's section becomes the notes of its
GitHub release, so write it for the people who use the app.

## [Unreleased]

### Added
- macOS now ships as one universal app that runs natively on both Apple Silicon and Intel.
- Automated tests, linting and a continuous-integration check on every pull request.

- Settings → Updates has an update channel: Stable, or Beta to also get pre-releases.

### Changed
- Updates on Windows and in the Linux AppImage are downloaded and installed by the app, and the
  download is checked against its published checksum before it installs. On macOS (until the app is
  signed) and for `.deb`/`.tar.gz` installs, the app opens the download page instead.
- Installers have stable names without spaces, for example `Heimdall-Setup-1.5.0.exe`.
- The app package now contains only the app itself.

### Fixed
- Each platform now bundles its own ffmpeg. In 1.4.0 the Linux and Intel Mac builds contained an Apple
  Silicon ffmpeg, so thumbnails, subtitle sync and movie details could not work there.
- The macOS ffmpeg is now a redistributable build.

## [1.4.0] - 2026-10-28

### Added
- Free disk space by deleting filler episodes or watched episodes. Files go to the system trash.
- Watch history, checkmarks and timestamps are kept after the video files are deleted.
- The series banner shows your overall AniList progress.

## [1.3.1] - 2026-10-28

### Fixed
- Opening Settings no longer shows a blank white screen.
- Rendering errors now show a recovery card instead of crashing the window.

## [1.3.0] - 2026-10-28

### Added
- Anime filler detection from AnimeFillerList, with episode badges and a "canon only" filter.
- Three UI themes: Liquid Glass, Classic Dark and OLED Black.
- Two-way AniList sync.

## [1.2.1] - 2026-10-27

### Fixed
- Discord Rich Presence and AniList sign-in problems.

## [1.2.0] - 2026-10-26

### Added
- Movies library with TMDB details.
- mpv support alongside VLC.
- Subtitle auto-sync.
- Mobile web remote.

## [1.1.0] - 2026-10-26

### Added
- Episode thumbnails, Discord Rich Presence and AniList scrobbling.

## [1.0.0] - 2026-10-25

First release: tracks series and watch history for VLC on Windows.
