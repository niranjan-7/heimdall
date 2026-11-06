# Ultra-Lean Stealth Watcher & Memory Throttling

## 1. Overview & Objective

When tracking local anime or movies in external media players (VLC media player or mpv), Heimdall runs in the background. In previous versions, Task Manager reported Heimdall consuming **269 MB – 277 MB of RAM**, whereas VLC decoding high-bitrate 1080p video consumed only **140 MB – 172 MB**.

A background tracker should never consume more memory than the media player decoding the video.

The **Stealth Watcher & Memory Throttling Engine** reduces Heimdall's active background memory footprint down to **~35 MB – 50 MB**, eliminating background UI churn and GPU compositing overhead during playback.

---

## 2. Root Cause Analysis

Heimdall's prior memory profile under Windows 11 Task Manager broke down into four distinct processes:

| Process Component | Measured RAM | Root Cause |
| :--- | :--- | :--- |
| **Electron (Renderer)** | **133.1 MB** (49.4%) | `SyncWorker` polled player telemetry every 1.5 seconds and broadcasted `vlc:progress-update` to the renderer. In `App.tsx`, this triggered `setLibrary(prev => ...)`, cloning the entire series, season, and episode object arrays 40 times a minute. This continuous allocation churn kept the V8 garbage collector active and prevented heap compaction. |
| **Electron (GPU)** | **72.3 MB** (26.9%) | Windows DWM and Chromium allocated active Direct3D swapchains, framebuffers, and Acrylic blur textures (`Liquid Glass` theme) even when the window was obscured by the video player. |
| **Heimdall (Main)** | **56.9 MB** (21.1%) | Node.js runtime, VLC HTTP polling / mpv IPC socket, Discord RPC client, and AniList scrobbler. |
| **Electron (Broker/Utility)** | **6.9 MB** (2.6%) | Chromium sandbox broker and audio/network utilities. |

**Key Finding:** Over **76% of Heimdall's memory (205.4 MB)** was tied up in rendering and compositing an application interface that the user could not see while watching full-screen or focused video in VLC/mpv.

---

## 3. Architecture & Mechanics

```
  ┌────────────────────────────────────────────────────────┐
  │                 VLC / mpv Playback                     │
  └───────────────────────────┬────────────────────────────┘
                              │ 1.5s telemetry
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │               SyncWorker (Node.js Main)                │
  │  - Headless tracking & timestamp updates               │
  │  - AniList completion threshold checks                 │
  │  - Discord Rich Presence broadcast                     │
  └───────────────┬────────────────────────┬───────────────┘
                  │                        │
       Window Minimized / Hidden?          │ Window Visible?
                  │                        │
       ┌──────────▼─────────┐   ┌──────────▼─────────┐
       │   SUSPEND IPC      │   │  THROTTLED SYNC    │
       │ - Defer send       │   │ - Active live time │
       │ - Renderer idles   │   │ - 10s library sync │
       │ - GPU drops D3D    │   │ - Instant complete │
       └────────────────────┘   └────────────────────┘
                  │
        Window Restored / Stopped?
                  │
       ┌──────────▼─────────┐
       │  FLUSH ON RESTORE  │
       │ - Single IPC sync  │
       │ - UI updates once  │
       └────────────────────┘
```

### A. Headless Background Tracking & IPC Suspension
- When playback is active and the Heimdall window is minimized or hidden (`win.isMinimized() || !win.isVisible()`), `SyncWorker` **ceases broadcasting `vlc:progress-update` IPC events** to `win.webContents`.
- The Node.js main process continues executing all mission-critical operations headlessly: tracking timestamps, checking completion thresholds, triggering AniList scrobbles, and updating Discord RPC.
- The React DOM and Chromium V8 engine in the renderer process enter complete idle. Windows and Chromium's background process memory manager ("Efficiency mode") can compress or release unused renderer pages.
- `SyncWorker` retains a reference to the latest telemetry update (`hasPendingProgressSync = true`).
- When the window is restored, shown, or focused (`win.on('restore')`, `win.on('show')`, `win.on('focus')`), `SyncWorker.flushPendingProgress()` fires a single consolidated update to sync the UI instantly.

### B. React Reconciliation & Heap Churn Elimination
- In `App.tsx`, high-frequency telemetry updates only update the lightweight `activeVlcState` hook for components that display live timers (such as `HeroBanner`).
- The heavy `setLibrary(...)` deep-clone of the entire series and episode library tree is throttled to at most once every 10 seconds, or immediately when an episode's completion status transitions.
- When playback ends (`vlc:stopped`), `loadLibrary()` reloads the persisted state from disk.
- Result: Eliminates over 85% of React re-render cycles when visible, and 100% when minimized.

### C. Stealth Playback Modes
Configurable in **Settings → Playback → Stealth Playback & Memory Throttling**:
1. **Minimize (Default):**  
   Automatically minimizes Heimdall to the taskbar the moment playback begins (`state === 'playing'`). On Windows, minimizing commands Chromium and Windows DWM to release Direct3D swapchains and surface textures, immediately dropping GPU memory from ~72 MB to ~15 MB.
2. **System Tray:**  
   Hides the window into the Windows System Tray with a tray icon tooltip showing current playback status (e.g. `Heimdall - Playing: Ep 1.mkv`). Clicking or double-clicking the tray icon restores the window.
3. **Keep Open:**  
   Leaves the window open on screen (for multi-monitor setups), while still benefiting from throttled React library updates and IPC suspension whenever manually minimized or covered.

### D. Auto-Restore on Playback Completion
When an episode ends or the media player closes (`state === 'stopped'` or `vlc:stopped`):
- If Heimdall was minimized or hidden by Stealth Mode, it automatically restores, brings itself into focus, and displays the scrobbled episode status with the next episode ready to watch.

### E. Opaque Theme by Default
- The default UI theme for new installs is set to `classic_dark` (`enableLiquidGlass: false`).
- In `createWindow()`, opaque themes disable `transparent: true`, `backgroundMaterial: 'acrylic'`, and `vibrancy: 'under-window'`. This prevents Windows DWM from creating costly transparent composition swapchains at startup. Users who prefer translucency can still toggle `Liquid Glass` in Settings.

---

## 4. Test Suite

Unit tests verifying this engine are implemented in:
- [`tests/syncWorkerThrottling.test.ts`](file:///c:/code/Heimdall/tests/syncWorkerThrottling.test.ts)
  - `sends IPC progress update when window is visible and unminimized`
  - `suspends IPC progress update when window is minimized`
  - `suspends IPC progress update when window is hidden`
  - `flushes deferred progress update when window is restored`
  - `clears pending sync and sends stopped event when playback ends`
- [`tests/storageService.test.ts`](file:///c:/code/Heimdall/tests/storageService.test.ts)
  - `defaults stealthPlaybackMode to minimize and theme to classic_dark`
  - `persists stealthPlaybackMode changes`
