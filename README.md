# Heimdall — VLC Series & Watch-History Companion

<p align="center">
  <strong>The all-seeing watcher for your local media collection.</strong><br>
  A sleek, Netflix-style Series & Anime Tracker that wraps around native <strong>VLC Media Player</strong>.
</p>

---

## 🌟 Highlights & Features

- **Seamless Native VLC Integration:** Spawns your local `vlc.exe` with queued playlists, starting precisely at your saved timestamp and automatically advancing across episodes and seasons.
- **Real-Time HTTP Telemetry Sync:** Uses VLC's built-in web status interface (`--extraintf=http`) to track live playback progress (`time`, `duration`, `state`) every 1.5s with zero performance overhead.
- **90% Auto-Completion Rule:** Automatically marks episodes as Watched when playback crosses 90% (customizable in Settings), smoothly queuing the next episode.
- **Natural Numerical Sorting:** Intelligently sorts files (`Intl.Collator` with numeric sensitivity) so `Episode 2` appears before `Episode 10` and `Episode 150`.
- **Hero Resume Banner:** Immediate "Continue Watching" CTA banner with episode details, timestamp (`14:32 / 24:00`), and a "Play Next Episode" button.
- **Multi-Season & Folder Grouping:** Supports flat multi-hundred episode directories or structured folders (`Season 1`, `Season 2`, `OVA`, etc.), with the ability to link additional season folders to existing series.
- **Filterable Visual Episode Grid:** Filter by Season tabs, search or jump to specific episodes, filter by watch status (`All`, `Unwatched`, `In Progress`, `Completed`), and manually toggle watched state or reset progress.
- **Bifrost Dark Aesthetic:** Designed with deep obsidian backgrounds (`#09090b`), amber/gold accents, and crisp typography with Tailwind CSS and Lucide icons.
- **Production-Ready Windows App:** Packaged via `electron-builder` (`com.heimdall.vlc`) as both an unpacked executable and an NSIS Windows installer.

---

## 🛠️ Tech Stack

- **Framework:** [Electron](https://www.electronjs.org/) + [electron-vite](https://electron-vite.org/)
- **UI Library:** [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Packager:** [electron-builder](https://www.electron.build/)

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [VLC Media Player](https://www.videolan.org/vlc/) installed in default location (`C:\Program Files\VideoLAN\VLC\vlc.exe`) or configured in Heimdall Settings.

### Development

```bash
# Install dependencies
npm install

# Run the app locally in dev mode with hot reload
npm run dev
```

### Production Build

```bash
# Typecheck & bundle application
npm run build

# Build unpacked Windows binary (dist/win-unpacked/Heimdall.exe)
npm run build:unpack

# Build native Windows installer (dist/Heimdall Setup 1.0.0.exe)
npm run build:win
```

---

## ⚙️ Configuration & Settings

Settings are stored securely in Electron's `userData/settings.json`:
- **VLC Path:** Auto-detects `C:\Program Files\VideoLAN\VLC\vlc.exe` and `C:\Program Files (x86)\VideoLAN\VLC\vlc.exe`, with in-app file browser override.
- **Auto-Complete Threshold:** Defaults to `90%` (configurable via slider).
- **HTTP Port:** Defaults to `42120`.
- **HTTP Secret:** Defaults to `heimdall_secret`.

---

## 🛡️ License

MIT License. Designed and crafted for seamless binge-watching.
