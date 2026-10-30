# Heimdall — The All-Seeing VLC & mpv Media Companion

<p align="center">
  <img src="landing/public/favicon.svg" width="96" height="96" alt="Heimdall Logo" />
</p>

<p align="center">
  <strong>The all-seeing watcher for your local media collection.</strong><br>
  A modern, high-performance Series, Movie & Anime Tracker with dual-engine VLC & mpv support, intelligent speech subtitle auto-sync, and an instant couch remote for your phone.
</p>

<p align="center">
  <a href="https://landing-six-indol-41.vercel.app"><img src="https://img.shields.io/badge/Live_Landing_Page-landing--six--indol--41.vercel.app-f59e0b?style=for-the-badge&logo=vercel" alt="Live Landing Page" /></a>
  <a href="https://github.com/niranjan-7/heimdall/releases/tag/v1.4.0"><img src="https://img.shields.io/badge/Release-v1.4.0-06b6d4?style=for-the-badge&logo=github" alt="GitHub Release v1.4.0" /></a>
  <a href="https://github.com/niranjan-7/heimdall/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-10b981?style=for-the-badge" alt="MIT License" /></a>
</p>

---

## 🌐 Live Animated Landing Page

Experience the interactive 3D application frame, live audio speech correlation visualizer, and dual-engine comparison on our production website:

👉 **[https://landing-six-indol-41.vercel.app](https://landing-six-indol-41.vercel.app)**

---

## 🌟 What is Heimdall?

Most media players require you to manually keep track of where you paused, battle subtitle desync with tedious hotkeys, or install bloated media server stacks just to get basic watch history.

**Heimdall is different.** It is a native, lightweight companion application that sits beside your media player. It communicates with **native VLC** and **mpv** via high-speed local IPC, automatically tracking playback, synchronizing subtitles, managing metadata, and giving you couch remote controls right from your smartphone.

---

## 🚀 Key Modules & Capabilities

### ⚡ Module 1: Intelligent Audio-to-Subtitle Auto-Sync Engine
- **Vocal Frequency FFT Extraction:** Samples audio speech energy (300Hz - 3.4kHz) using embedded FFmpeg.
- **Cross-Correlation Drift Detection:** Computes Pearson correlation between speech energy and subtitle timestamps to calculate exact desync down to the millisecond.
- **Zero Video Re-encoding:** Dispatches non-destructive real-time offset commands straight to VLC HTTP API or mpv IPC socket during playback.
- **Micro-Nudge Bar:** In-app floating micro-nudge buttons (`[-250ms]`, `[-50ms]`, `[+50ms]`, `[+250ms]`) for fine adjustments.

### 🎬 Module 2: Dedicated Movies & TV Library
- **TMDB Metadata Scraping:** Auto-fetches official movie backdrops, release years, cast, genres, and ratings.
- **Multi-Part Film Merging:** Seamlessly groups multi-part releases (`CD1 / CD2`, `Part 1 / Part 2`) into a unified film entry with sequential playback chaining.
- **Local Hardware Thumbnails:** Hover video scrubbing through film frames extracted with hardware acceleration.
- **Offline Tech Specs:** Fallback video resolution (`4K`, `1080p`), audio codec badges (`DTS-HD`, `Dolby Atmos`), and container tech specs.

### 🎛️ Module 3: Dual Media Player Engine (mpv + VLC)
- **mpv Player:**
  - Connected via native Windows Named Pipes (`\\.\pipe\heimdall-mpv`) / Unix sockets with **0ms event push latency**.
  - **Anime4K Real-Time GLSL Upscaling:** Built-in shader toggle (`Anime4K_Restore_CNN_M` + `Upscale_CNN_x2_M`) upscaling 1080p anime into razor-sharp 4K.
  - GPU-HQ scaling profile with `ewa_lanczossharp` video interpolation.
- **VLC Media Player:**
  - Connected via local HTTP status interface (`http://127.0.0.1:8080/requests/status.xml`).
  - Rock-solid universal playback for any legacy codec (`.mkv`, `.avi`, `.wmv`, `.vob`, `.ts`).

### 📥 Module 4: Smart Subtitle Downloader
- **64KB OpenSubtitles File Hash:** Calculates 64KB head & tail checksums to match the exact cut/release on OpenSubtitles with 100% accuracy.
- **Multi-Name Fallback Resolver:** Resolves embedded languages, `sub-eng/`, `english.srt`, and folder-level subtitle tracks.
- **Auto-Sync Chaining:** Subtitles downloaded through the app automatically trigger the Module 1 auto-sync engine on launch.

### 📱 Module 5: Mobile Web Companion (PWA Couch Remote)
- **Local Wi-Fi PWA Server:** Spins up a local Node.js HTTP + Server-Sent Events (SSE) server on port `42125`.
- **Instant LAN QR Code:** Scan the in-app QR code with your phone camera to instantly open the remote.
- **Zero App Store Install:** Add to Home Screen as a standalone PWA on iOS or Android.
- **Full Living Room Controls:** Play/pause, 10s seek scrubber, volume control, audio track switcher, and live subtitle offset nudging.

### 📦 Module 6: Cross-Platform Packaging & Official Releases
- **Windows:** Native NSIS Installer (`Heimdall.Setup.1.2.0.exe`) and portable unpacked binaries.
- **macOS:** DMG universal installer for Apple Silicon (M1/M2/M3/M4) & Intel.
- **Linux:** Standalone AppImage with desktop integration.
- **Automated CI/CD Workflow:** Multi-platform build template saved in [`deploy/release.yml`](deploy/release.yml).

### 🌌 Module 7: Animated Vercel Landing Page
- Production Vite + React 19 + Tailwind CSS v4 + Framer Motion site hosted on Vercel: [https://landing-six-indol-41.vercel.app](https://landing-six-indol-41.vercel.app).
- Interactive 3D mouse-tilt desktop app mockup, live audio auto-sync simulation, and dual-player matrix.

---

## 🛠️ Tech Stack

| Component | Technology |
| :--- | :--- |
| **Desktop Framework** | [Electron 35](https://www.electronjs.org/) + [electron-vite](https://electron-vite.org/) |
| **Frontend UI** | [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) + Obsidian Frosted Glass Theme |
| **Media Engines** | [mpv](https://mpv.io/) (Named Pipe IPC) & [VLC Media Player](https://www.videolan.org/vlc/) (HTTP Web API) |
| **Audio Processing** | [FFmpeg](https://ffmpeg.org/) (High-energy speech FFT extraction) |
| **Mobile Remote** | Native Node.js HTTP Server + Server-Sent Events (SSE) PWA |
| **Landing Page** | Vite + Framer Motion + Vercel Deployment |
| **Packager** | [electron-builder](https://www.electron.build/) (NSIS, DMG, AppImage) |

---

## 📥 Downloads & Installation

Pre-built binaries for the latest release (**[v1.4.0](https://github.com/niranjan-7/heimdall/releases/tag/v1.4.0)**) are available on [GitHub Releases](https://github.com/niranjan-7/heimdall/releases/tag/v1.4.0):

| OS / Platform | Asset Name | Format | Size | SHA-256 Digest |
| :--- | :--- | :--- | :--- | :--- |
| **Windows 10/11** | [Heimdall.Setup.1.4.0.exe](https://github.com/niranjan-7/heimdall/releases/download/v1.4.0/Heimdall.Setup.1.4.0.exe) | NSIS Installer | `99.87 MiB` | `bd402afde269a151a37efc24db441ba26f885470159aa8c3b7f746e38f43373a` |
| **macOS (Apple Silicon)** | [Heimdall-1.4.0-arm64.dmg](https://github.com/niranjan-7/heimdall/releases/download/v1.4.0/Heimdall-1.4.0-arm64.dmg) | Native DMG | `119.51 MiB` | `1df69bceeba14970ac785c323dc808157ff7e13908d5802c4f77ad2281f5b4ea` |
| **macOS (Apple Silicon)** | [Heimdall-1.4.0-arm64-mac.zip](https://github.com/niranjan-7/heimdall/releases/download/v1.4.0/Heimdall-1.4.0-arm64-mac.zip) | Portable Zip | `115.29 MiB` | `2e570a5c9392a0e7dde9baf4ce76c5e351fda46d0c759b27e843965a4cf89196` |
| **macOS (Intel)** | [Heimdall-1.4.0.dmg](https://github.com/niranjan-7/heimdall/releases/download/v1.4.0/Heimdall-1.4.0.dmg) | Native DMG | `123.73 MiB` | `111006f5b568145e005024435d62f210025eb9ce9d7c52eb57bfbf4cd675be7f` |
| **macOS (Intel)** | [Heimdall-1.4.0-mac.zip](https://github.com/niranjan-7/heimdall/releases/download/v1.4.0/Heimdall-1.4.0-mac.zip) | Portable Zip | `119.49 MiB` | `6c36fd3371fc30c9dc9a874f3fde29a5ccfcdba7ae34232fdc4310f43e555bec` |
| **Linux (Universal)** | [Heimdall-1.4.0.AppImage](https://github.com/niranjan-7/heimdall/releases/download/v1.4.0/Heimdall-1.4.0.AppImage) | Standalone AppImage | `126.64 MiB` | `5e84eb4a0a00d44a563517308f2a183d081385d0063d4a25e7acdc3a38475a2b` |
| **Linux (Portable)** | [heimdall-1.4.0.tar.gz](https://github.com/niranjan-7/heimdall/releases/download/v1.4.0/heimdall-1.4.0.tar.gz) | Tarball Archive | `119.76 MiB` | `79cac256788c0c7247c5fa364a64ea56d57fab089e3c7b4b56fc9771773ed647` |

---

## 💻 Local Development

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/niranjan-7/heimdall.git
cd heimdall

# Install desktop app dependencies
npm install

# Install landing page dependencies
cd landing && npm install && cd ..
```

### 2. Run Desktop App (Dev Mode)

```bash
npm run dev
```

### 3. Run Landing Page (Dev Mode)

```bash
npm run landing:dev
# Accessible at http://localhost:5174
```

### 4. Build Desktop Executables

```bash
# Windows Installer (.exe)
npm run build:win

# macOS (.dmg)
npm run build:mac

# Linux (.AppImage)
npm run build:linux
```

---

## 🔒 Privacy & Architecture

- **100% Local & Offline:** Watch history is stored in local SQLite (`heimdall.db`) and Electron `userData/`.
- **Zero Cloud Relay:** The mobile couch remote communicates strictly across your home Wi-Fi network. No video streams or credentials ever leave your local machine.
- **Zero Tracking:** No telemetry cookies, no trackers, and no mandatory cloud accounts.

---

## 📄 License

Licensed under the [MIT License](LICENSE). Built for cinephiles and media enthusiasts worldwide.
