# 🛡️ Heimdall — Next-Generation Features & Architecture Plan

This document defines the comprehensive specification and phased execution roadmap for Heimdall's upcoming feature set.

---

## 📋 Feature Breakdown & Implementation Modules

---

### Module 1: Automated Audio-to-Subtitle Auto-Sync Engine
> **Goal:** Eliminate manual audio/subtitle desync completely. Automatically analyze speech patterns in the video's audio track and align subtitle timestamps mathematically.

* **Underlying Technology:** 
  - Bundled lightweight alignment binary: **`alass` (Automated Language-Agnostic Subtitle Synchronization)**.
  - Written in Rust, single standalone binary (`alass-cli.exe` on Windows, native on Linux/macOS, ~4MB, zero external dependencies).
  - Alternative: Python/FFmpeg VAD (Voice Activity Detection) cross-correlation.
* **How It Works:**
  1. Extracts a lightweight audio voice-activity envelope from the video stream using bundled FFmpeg.
  2. Compares the audio speech timestamps against the subtitle dialog lines.
  3. Uses dynamic time warping to correct both constant offsets (e.g., subtitle starts 2 seconds late) and linear drift (e.g., 23.976 fps subtitle on a 24.000 fps video).
  4. Outputs `[filename].synced.srt` and automatically tells VLC/MPV to switch to the synced track.
* **User Experience:**
  - One-click button inside Heimdall: **"⚡ Auto-Sync Subtitle"** with a 3-second progress indicator.
  - On-screen confirmation: *"Aligned 412 subtitle lines by -1.42s"*.
  - Manual micro-adjustment buttons (`[-100ms]`, `[+100ms]`) remain accessible on hover as a fallback.

---

### Module 2: Dedicated Movies Library (with Intelligent Scraping & Offline Fallbacks)
> **Goal:** Full support for feature films alongside series, with rich TMDB metadata and graceful offline handling.

* **Navigation & UI:**
  - Top sidebar switcher: **Series** | **Movies**.
  - Movie cards: Clean, high-impact poster presentation.
  - **Hover Video Preview:** Hovering over a movie card plays a smooth local video frame sequence or reveals local snapshot thumbnails without cluttering the resting poster view.
* **Intelligent Title & Year Scraper:**
  - Standard regex often fails on complex release names (`Oppenheimer.2023.IMAX.2160p.UHD.Remux.mkv`, `Avatar.The.Way.of.Water.HDCAM.x264.mkv`).
  - Scraper uses token extraction: captures candidate title words, release year `(19\d\d|20\d\d)`, and queries TMDB with fuzzy title ranking.
* **Fail-Safe Offline & Unknown Media Handling:**
  - If offline or TMDB lookup returns no match:
    1. Derives the cleanest readable title from the folder/file name.
    2. Extracts technical video specs via `ffprobe` (Resolution `4K/1080p`, Codec `HEVC/AV1`, Audio `DTS 5.1/Dolby Atmos`, Duration).
    3. Generates a local fallback poster frame.
    4. Displays a discreet **"Fix Match"** button on hover to manually search TMDB or enter a custom title.
* **Multi-Part Film Merging:**
  - Automatically groups `Movie - CD1.mkv` and `Movie - CD2.mkv` into a single seamless entry that queues consecutively into VLC/MPV.
* **Letterboxd & Trakt.tv Scrobbling:**
  - Automatically marks films as watched on Letterboxd/Trakt when completion reaches $\ge 90\%$.

---

### Module 3: Dual Media Player Engine (`mpv` + VLC)
> **Goal:** Support both VLC Media Player and `mpv` seamlessly with full telemetry and Anime4K upscaling shaders.

* **Architecture:**
  - Common `IMediaPlayerController` interface implemented by `VlcDriver` and `MpvDriver`.
* **`mpv` IPC Protocol:**
  - Spawns `mpv.exe` with `--input-ipc-server=\\.\pipe\heimdall-mpv`.
  - Connects via Node.js native named pipe (`net.createConnection`).
  - Event-driven push telemetry: MPV immediately sends JSON messages (`property-change` for `time-pos`, `pause`, `filename`) with **0ms latency** and zero polling overhead.
* **Shader & Anime4K Presets:**
  - Option in Settings to toggle pre-configured Anime4K high-quality anime upscaling shaders when launching `mpv`.
* **Player Selection in Settings:**
  - Toggle: **Primary Player: `VLC` | `mpv`** with automatic path detection for both players on the system.

---

### Module 4: Smart Subtitle Downloader & Mismatch Prevention
> **Goal:** Fast, reliable subtitle downloads that never mismatch releases or interfere with offline playback.

* **Hash Matching First:**
  - Computes the OpenSubtitles 64KB video hash.
  - If a hash match is found, the subtitle is guaranteed to be 100% matched to that exact video encode.
* **Clean Metadata Fallback:**
  - If no hash exists, searches using linked TMDB ID (for movies) or AniList ID (for anime) + Episode number, completely ignoring messy torrent names.
* **Automatic Post-Download Syncing:**
  - After downloading, automatically triggers Module 1 (Auto-Sync Engine) to verify and correct any potential delay before playing.
* **Zero Offline Hassle:**
  - Strictly on-demand (via card right-click or quick action button).
  - Times out cleanly in 2 seconds if offline with zero modals or interrupted playback.

---

### Module 5: Mobile Web Companion (Local PWA Couch Remote)
> **Goal:** Control playback, browse your library, and manage your watchlist from your smartphone or tablet on the couch.

* **Architecture:**
  - Heimdall runs an embedded lightweight HTTP + WebSocket server (`port 42125`).
  - Access via local WiFi (`http://192.168.x.x:42125`).
  - Desktop Settings shows a **"Mobile Remote"** pairing QR code.
* **Client Implementation:**
  - Responsive Progressive Web App (PWA) with manifest & service worker.
  - Scan QR code $\rightarrow$ opens instantly in iOS Safari or Android Chrome with zero app store installs.
  - Can be added to the mobile home screen as a standalone full-screen web app.
* **Mobile Capabilities:**
  - Browse Movies & Series library with posters and progress bars.
  - One-tap **"Play on PC"** to launch on your desktop monitor/TV.
  - Full playback controls: Play, Pause, Next Episode, Volume, Subtitle toggle, Seek timeline.

---

### Module 6: Cross-Platform Packaging (Linux & macOS Releases)
> **Goal:** Distribute native packages for Windows, Linux, and macOS from the same GitHub repository.

* **Targets:**
  - **Windows:** NSIS Installer (`.exe`) + portable unpacked binary.
  - **Linux:** `.AppImage` (runs on all distros) + Debian/Ubuntu (`.deb`).
  - **macOS:** Universal Apple Silicon (M1/M2/M3/M4) and Intel `.dmg`.
* **CI/CD Automation:**
  - GitHub Actions workflow (`.github/workflows/release.yml`) triggered on version tags (`v*.*.*`).
  - Compiles and attaches all OS binaries directly to GitHub Releases automatically.

---

### Module 7: Animated Vercel Landing Page ("Cinematic Glass")
> **Goal:** A landing page hosted on Vercel inspired by Apple TV / Plex Pro aesthetics with high-performance animations.

* **Tech Stack:** Next.js / Vite + React + Tailwind CSS + Framer Motion.
* **Design & Visual Style:**
  - **Cinematic Frosted Glass:** Obsidian backdrops (`#09090b`), frosted glassmorphic cards (`backdrop-blur-xl`), subtle Bifrost color gradients.
  - **Interactive Hero Showcase:** Simulated 3D tilt desktop application frame showing live playback progress, Discord Rich Presence pill, and AniList auto-scrobbling badge triggering.
  - **Hover Video Bento Grid:** Interactive tiles demonstrating local video frame generation, automatic subtitle sync, and MPV shaders.
  - **Dynamic One-Click Download:** Automatically queries the GitHub Releases API to provide the correct installer (`.exe`, `.dmg`, `.AppImage`) based on the visitor's operating system.
* **Deployable to Vercel in 1 click** with automated GitHub sync.

---

## 🚀 Execution Order

1. **Step 1:** Module 1 — Automated Audio-to-Subtitle Auto-Sync Engine
2. **Step 2:** Module 2 — Movies Library Integration (TMDB + Hover previews + Offline fallbacks)
3. **Step 3:** Module 3 — Dual Media Player Engine (`mpv` integration + IPC)
4. **Step 4:** Module 4 — Smart Subtitle Downloader (OpenSubtitles Hash + Auto-Sync chaining)
5. **Step 5:** Module 5 — Mobile Web Companion (PWA Couch Remote + QR code)
6. **Step 6:** Module 6 — Cross-Platform Build Configurations (Linux & macOS)
7. **Step 7:** Module 7 — Animated Vercel Landing Page ("Cinematic Glass")
