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
- Real Anime4K upscaling in mpv. Heimdall now ships the Anime4K v4 shaders: choose Mode A, B or C,
  and a lighter shader set for laptops and older graphics cards, in Settings → Video Quality. Until
  now the "Anime4K" option played the same as HQ scaling.
- Subtitle auto-sync shows its progress while it reads the audio, can be cancelled, and can be undone.

### Changed
- Updates on Windows and in the Linux AppImage are downloaded and installed by the app, and the
  download is checked against its published checksum before it installs. On macOS (until the app is
  signed) and for `.deb`/`.tar.gz` installs, the app opens the download page instead.
- Installers have stable names without spaces, for example `Heimdall-Setup-1.5.0.exe`.
- The app package now contains only the app itself.
- mpv uses its `high-quality` profile on mpv 0.37 and newer, instead of the deprecated `gpu-hq`.
- The README and landing page now describe what the app actually does. Claims about SQLite storage,
  FFT/Pearson subtitle sync, "0 ms" latency, "100% accuracy", phone-remote volume control and
  Tailwind v4 were removed or corrected.

- Subtitle auto-sync was rebuilt. It reads the whole episode instead of the first 15 minutes, listens
  to the voice frequencies only, finds shifts of up to two minutes instead of 20 seconds, and fixes
  subtitles made for a different frame rate (for example 25 fps subtitles on a 23.976 fps video).
- Auto-sync now checks its own result. It applies a sync only when it is confident, asks first when
  it is fairly sure, and changes nothing when it can't find a reliable match. Before, it always
  applied whatever it found.
- A synced subtitle is saved as a separate `.heimdall-synced` file next to the video and loaded by
  the player; your original subtitle file is never changed. Auto-sync no longer touches subtitles
  built into the video unless you ask it to.
- Movies use the same subtitle sync panel as episodes.

### Removed
- TheSubDB subtitle source. The service shut down years ago, so every download waited for it to time
  out before asking OpenSubtitles.

### Security
- The phone remote now needs pairing. The QR code carries a pairing code, and requests without it
  are refused. Settings → phone remote can reset the code, which disconnects every phone.
- The phone remote is off until you turn it on, and is no longer started when it is switched off.
- Other websites can no longer read your library or control playback through the phone remote.
- Titles from file names can no longer inject code into the phone remote page.
- Each install gets its own random VLC password instead of a shared default.
- The app window runs sandboxed, with a content security policy, and cannot be navigated away from
  the app. Only web links open in the browser.

### Fixed
- The phone remote no longer falls back to a hard-coded IP address that belonged to the developer's
  network, and shows how many phones are connected.
- Each platform now bundles its own ffmpeg. In 1.4.0 the Linux and Intel Mac builds contained an Apple
  Silicon ffmpeg, so thumbnails, subtitle sync and movie details could not work there.
- The macOS ffmpeg is now a redistributable build.
- A saved subtitle delay was applied 10 times too small when VLC started (VLC counts tenths of a
  second).
- "Download Subtitle" no longer picks up another episode's subtitle from the same folder.

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
