# Heimdall — The All-Seeing VLC & mpv Media Companion

<p align="center">
  <img src="landing/public/favicon.svg" width="96" height="96" alt="Heimdall Logo" />
</p>

<p align="center">
  <strong>The all-seeing watcher for your local media collection.</strong><br>
  A desktop tracker for your local anime, shows and movies. It plays them in VLC or mpv, remembers where you stopped, finds and syncs subtitles, and gives you a remote on your phone.
</p>

<p align="center">
  <a href="https://landing-six-indol-41.vercel.app"><img src="https://img.shields.io/badge/Live_Landing_Page-landing--six--indol--41.vercel.app-f59e0b?style=for-the-badge&logo=vercel" alt="Live Landing Page" /></a>
  <a href="https://github.com/niranjan-7/heimdall/releases/latest"><img src="https://img.shields.io/github/v/release/niranjan-7/heimdall?style=for-the-badge&logo=github&color=06b6d4" alt="Latest release" /></a>
  <a href="https://github.com/niranjan-7/heimdall/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-10b981?style=for-the-badge" alt="MIT License" /></a>
</p>

---

## 🌐 Live Animated Landing Page

See the app and its features on the landing page:

👉 **[https://landing-six-indol-41.vercel.app](https://landing-six-indol-41.vercel.app)**

---

## 🌟 What is Heimdall?

Most media players require you to manually keep track of where you paused, battle subtitle desync with tedious hotkeys, or install bloated media server stacks just to get basic watch history.

**Heimdall is different.** It is a native, lightweight companion application that sits beside your media player. It talks to **VLC** (through its local web interface) and **mpv** (through its IPC socket) to track playback, sync subtitles, fetch metadata, and let you control playback from your phone.

---

## 🚀 Features

### ⚡ Subtitle Auto-Sync
- **Audio-based offset:** Uses the bundled FFmpeg to find where sound starts and stops in the episode, then picks the subtitle offset whose lines best overlap those sounds. It fixes a constant offset; it does not fix subtitles that drift over time. (A more accurate engine is planned for v1.5.0; see the [roadmap](ROADMAP.md).)
- **No re-encoding:** The offset is sent to VLC or mpv while the video plays; your files are not changed.
- **Nudge buttons:** Move subtitles 0.1 s earlier or later by hand.

### 🎬 Movies Library
- **TMDB metadata:** Posters, backdrops, release years, genres and ratings.
- **Multi-part films:** Groups `CD1 / CD2` and `Part 1 / Part 2` files into one film and plays them in order.
- **Local thumbnails:** Frames taken from your own files with FFmpeg, shown on hover.
- **File details:** Resolution and audio codec read from the file.

### 🎛️ VLC or mpv
- **mpv:**
  - Connected through a named pipe on Windows (`\\.\pipe\heimdall-mpv`) or a Unix socket elsewhere. mpv pushes playback events, so progress updates are instant.
  - **Anime4K upscaling:** Ships the [Anime4K](https://github.com/bloc97/Anime4K) v4 shaders. Pick Mode A, B or C, and a smaller shader set for weaker GPUs, in Settings.
  - High-quality scaling (`ewa_lanczossharp`) with the `high-quality` profile on mpv 0.37+ (`gpu-hq` on older versions).
- **VLC:**
  - Connected through VLC's local web interface on `127.0.0.1`, protected by a random password Heimdall creates. Heimdall checks progress about once a second.
  - Plays almost any format (`.mkv`, `.avi`, `.wmv`, `.vob`, `.ts`).

### 📥 Subtitle Downloader
- **File hash match:** Computes the OpenSubtitles hash of your file, which finds subtitles made for your exact release when OpenSubtitles has them. Otherwise it searches by title and episode (or TMDB ID for movies).
- **Local subtitles first:** Finds existing files such as `sub-eng/` or `english.srt`, and can extract subtitles embedded in the video.
- **Auto-sync:** Downloaded subtitles go through the auto-sync above.

### 📱 Phone Remote
- **Off by default:** Turn it on in the app. It runs a small web server on your Wi-Fi (port `42125`) with live updates over Server-Sent Events.
- **Pairing QR code:** Scan the QR code to pair your phone. Phones without the pairing code can't see or control anything; you can reset pairing at any time.
- **No app to install:** Opens in Safari or Chrome, and can be added to the home screen.
- **Controls:** Browse your library, start an episode or movie, play/pause, seek, stop, and nudge subtitles.

### 📦 Installers and Updates
- **Windows:** NSIS installer.
- **macOS:** One universal DMG for Apple Silicon and Intel (unsigned; see the release notes for how to open it).
- **Linux:** AppImage, `.deb` and `.tar.gz`.
- **Built by CI:** Every release is built by GitHub Actions from a git tag, with a `SHA256SUMS.txt` file. The app checks for updates and installs them itself on Windows and the AppImage; on macOS it opens the download page.

---

## 🛠️ Tech Stack

| Component | Technology |
| :--- | :--- |
| **Desktop Framework** | [Electron 35](https://www.electronjs.org/) + [electron-vite](https://electron-vite.org/) |
| **Frontend UI** | [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) |
| **Styling** | [Tailwind CSS 3.4](https://tailwindcss.com/) (the landing page uses Tailwind v4) |
| **Players** | [mpv](https://mpv.io/) (JSON IPC) and [VLC](https://www.videolan.org/vlc/) (HTTP interface), installed separately |
| **Audio and video tools** | [FFmpeg](https://ffmpeg.org/) (bundled; subtitle sync, thumbnails, file details) |
| **Phone Remote** | Node.js HTTP server + Server-Sent Events |
| **Landing Page** | Vite + Framer Motion + Vercel Deployment |
| **Packaging and updates** | [electron-builder](https://www.electron.build/) + [electron-updater](https://www.electron.build/auto-update), GitHub Actions |

---

## 📥 Downloads & Installation

Download the installer for your system from the **[latest release](https://github.com/niranjan-7/heimdall/releases/latest)**. Each release from v1.5.0 on includes a `SHA256SUMS.txt` file to check your download:

```bash
# macOS / Linux, in the folder with the download and SHA256SUMS.txt
shasum -a 256 --check --ignore-missing SHA256SUMS.txt
```

Heimdall needs [VLC](https://www.videolan.org/vlc/) or [mpv](https://mpv.io/) installed to play videos.

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

`npm install` also downloads the `ffmpeg` build for your OS into `resources/bin/` (checked against
`scripts/binaries.lock.json`). Run `npm run binaries` to fetch it again.

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
# Windows installer (.exe)
npm run build:win

# macOS (.dmg)
npm run build:mac

# Linux (.AppImage, .deb, .tar.gz)
npm run build:linux
```

---

## 🚢 Releasing

Releases are built by GitHub Actions from a tag. See [docs/RELEASING.md](docs/RELEASING.md) and the
[CHANGELOG](CHANGELOG.md). What's planned next is in the [roadmap](ROADMAP.md).

---

## 🔒 Privacy & Architecture

- **Local data:** Your library and watch history are stored as JSON files (`library.json`, `settings.json`) in the app's user data folder. Nothing is uploaded.
- **What goes online:** Heimdall contacts AniList and TMDB for metadata, OpenSubtitles when you download subtitles, Discord for Rich Presence (can be turned off), and GitHub to check for updates when it starts. It sends titles, IDs and a file hash, never the files themselves.
- **Phone remote stays on your network:** It works only on your Wi-Fi, is off by default, and needs the pairing code.
- **No tracking:** No analytics, no telemetry, no account.

---

## 📄 License

Licensed under the [MIT License](LICENSE). Bundled third-party files (FFmpeg, Anime4K) are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
