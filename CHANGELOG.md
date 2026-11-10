# Changelog

All notable changes to Heimdall are listed here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow
[Semantic Versioning](https://semver.org/). The text of a version's section becomes the notes of its
GitHub release, so write it for the people who use the app.

## [Unreleased]

### Added
- **Fix filler match**: a new button in the series header (and a click on the "Fillers" badge) opens
  a window where you can search AnimeFillerList, see each show's episode and filler counts, pick the
  right one, or unlink the filler guide. Your choice is remembered and never guessed again.
- Episode offset for filler data: if your files are numbered per season (`S02E01`) but AnimeFillerList
  counts from the first season, Heimdall works out the offset from AniList's earlier seasons, and you
  can change it in the Fix filler match window.

### Changed
- Filler guides are now matched using the series' AniList titles (English, Romaji and alternative
  titles) instead of the folder name, so far more shows find the right page.
- "Refresh Filler Guide" is now "Refresh Filler Data" and always downloads the list again. Otherwise
  filler data is kept for 14 days for shows still airing and 90 days for finished shows.
- Heimdall now identifies itself to AnimeFillerList and makes at most one request per second.

### Fixed
- Episode numbers are read correctly from many more file names:
  - numbers in the show's name are no longer taken as the episode (`Mob Psycho 100 - 03` is
    episode 3, not 100; same for `86 - Eighty Six - 05` and `Show 2 - 04`);
  - re-releases like `05v2`, `1x05`, `S01 E09` and season names like `Season 3 - 05` work;
  - OVAs, specials, recaps (`13.5`), trailers and creditless openings/endings no longer get a
    made-up episode number, so they can't be mistaken for a real episode or sent to AniList. They are
    listed after the regular episodes.
- Episode titles no longer include leftover release tags (`WEB-DL`, `x265`, release group names) or
  `(episode)`.
- Movies: titles with a year-like number keep it (`Blade Runner 2049 (2017)` is from 2017),
  `Part.1` / `Disc 2` are recognised as parts without losing the year, and `HDCAM`-style source tags
  are removed from titles.
- A failed or changed AnimeFillerList page no longer wipes the filler data you already had; the saved
  copy is kept and used.
- When you are offline, filler data no longer gets in the way: the saved copy is shown if there is
  one, and otherwise a quiet "filler data unavailable" note.
- Changing a series' AniList match now also updates its filler guide, and episodes no longer keep
  stale filler labels after the guide changes.

## [1.5.0] - 2026-11-10

### Added
- Stealth Playback Mode: automatically minimizes or hides Heimdall to the system tray while video plays, reducing background memory to ~35–50 MB (far below VLC), and automatically restores the window when the episode finishes.
- Background IPC suspension: telemetry broadcasts to the renderer are paused when the window is minimized or hidden, allowing Chromium and Windows to idle and reclaim memory.
- macOS now ships as one universal app that runs natively on both Apple Silicon and Intel.
- Settings → Updates has an update channel: Stable, or Beta to also get pre-releases.
- Real Anime4K upscaling in mpv. Heimdall now ships the Anime4K v4 shaders: choose Mode A, B or C,
  and a lighter shader set for laptops and older graphics cards, in Settings → Video Quality. Until
  now the "Anime4K" option played the same as HQ scaling.
- Subtitle auto-sync shows its progress while it reads the audio, can be cancelled, and can be undone.

### Changed
- Opaque classic dark theme is now the default for new installs, saving GPU compositing memory by avoiding transparent Acrylic swapchains unless Liquid Glass is selected.
- Library updates during playback are throttled so that high-frequency progress ticks do not clone and re-render the entire episode list every 1.5 seconds.
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
- Auto-sync also uses [alass](https://github.com/kaegi/alass), a subtitle aligner that handles
  subtitles needing different shifts in different parts, for example after a recap or an ad break was
  cut. It is bundled on Windows, Linux and macOS. Heimdall's own aligner is still used if alass is
  missing or fails, and a result that needed many separate sections is never applied without asking.

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
