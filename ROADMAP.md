# Heimdall Roadmap — v1.5.0 → v2.0

> Status: planning. Nothing here is implemented yet.
> Supersedes `FEATURES_PLAN.md` (archive it to `docs/archive/` in Phase 1.3).

**Principle for the whole roadmap:** every claim in the README, landing page and in-app copy must be something the code does today. Features ship before they are marketed.

---

## Overview

| Release | Theme | Phases |
| :--- | :--- | :--- |
| **v1.5.0** | *Make it true, make it safe, ship it properly.* Fix every existing problem, build a real release pipeline; no new headline features. | 1.0 – 1.8 |
| **v2.0** | *A modern local anime tracker.* New foundation, new features, new UI, new brand. Rename (if any) ships here. Ships as GitHub pre-releases (`v2.0.0-beta.N`, see 1.1.e) until all phases land. | 2.0 – 2.6 |

Recommended order inside v1.5.0: **1.0 → 1.1 → 1.2 → 1.3** first (tests/CI, release pipeline, security, honest claims — they unblock everything and fix the risky stuff), then 1.4–1.8 in any order.

---

# v1.5.0 — Fix Everything That Exists

## Phase 1.0 — Engineering groundwork

Nothing else in this plan can be verified without this. Do it first.

**Tasks**
1. Add **Vitest** (`vitest`, `@vitest/coverage-v8`) with a `test` script and a `tests/` folder for main-process code.
2. Add an ESLint flat config (`eslint.config.mjs`) — the `lint` script exists but there is no config file. Add Prettier config to match current style.
3. Add a **CI workflow** `.github/workflows/ci.yml` on every push/PR: `npm ci` → `typecheck` → `lint` → `test`. Keep `release.yml` for tags only, and make it depend on the same checks.
4. Create `tests/fixtures/filenames/` — a big table of real-world file names (fansub, BD remux, scene, Plex-style `S01E05`, absolute numbering `- 1047`, specials `OVA`, `NCOP`, `v2` re-releases, multi-part `CD1/CD2`, years in titles like `2001 A Space Odyssey`, `Blade Runner 2049`).

**Done when:** `npm test` runs in CI and fails the build on a red test.

**Status: implemented on branch `phase-1.0-tests-ci` (not yet merged or run on GitHub).**
- Vitest 3, ESLint 9 (flat config), Prettier 3 added; scripts `test`, `test:watch`, `test:coverage`, `lint`, `lint:fix`, `format:check`. `.nvmrc` pins Node 22 (this Mac's default is Node 16, which the toolchain does not support — use `nvm use`).
- `ci.yml`: typecheck + lint + build on Linux, tests on Linux/Windows/macOS. It can also be called from `release.yml` (`workflow_call`).
- 79 tests: episode/movie file-name tables (`tests/fixtures/filenames/`) and `scanSeriesFolders` against real temp folders.
- **13 known parser bugs are recorded as `it.fails` cases** with the correct expected values (for example `Mob Psycho 100 - 03` is read as episode 100, `Blade Runner 2049 (2017)` as year 2049, `Movie.Name.2005.Part.1` loses its part number). They pass CI today and turn red when fixed — then promote them to the main tables. Fixing them is Phase 1.7.
- Lint baseline: 0 errors, 77 warnings (mostly `any` and unused imports). Three trivial errors were fixed (two redundant regex escapes in `movieParser.ts`, one `let`→`const` in `MovieGrid.tsx`; no behaviour change).
- Not done yet: `format:check` is not in CI (34 existing files are not Prettier-formatted; do one separate reformat commit first). `npm audit` reports 48 vulnerabilities in the dependency tree (not yet triaged).

---

## Phase 1.1 — Release pipeline (build and publish from CI)

> First time setting up releases? Read **1.1.a** first — it explains the whole flow. Everything after it is the implementation.

### What's wrong today (found on GitHub)
- All 7 releases (v1.0.0 → v1.4.0) were **built and uploaded by hand**. `release.yml` has **never run**: it was committed on Oct 31, *after* `v1.4.0` was tagged, and a tag-triggered workflow only runs if the workflow file exists in the tagged commit. No tag has been pushed since.
- **v1.4.0's macOS/Linux files don't match the `v1.4.0` tag** — the packaging config they need (`5240557`) came after the tag, so they can't be rebuilt from it.
- **v1.1.0 ships the wrong file** (`Heimdall.Setup.1.0.0.exe`).
- No release has `latest*.yml` / `.blockmap` files (needed by `electron-updater`) or a checksum file; the README checksum table was written by hand.
- The v1.4.0 in-app updater picks the **first `.dmg`** (Intel Macs get offered the arm64 build) and on Linux runs the new AppImage **from a temp folder** without replacing the old one.
- `@ffmpeg-installer/ffmpeg` only installs ffmpeg for the machine running `npm ci`. **Confirmed** by inspecting the hand-built `dist/` on the owner's Apple Silicon Mac: the Linux package and the Intel Mac app both contain a **macOS arm64 ffmpeg** (`Mach-O arm64`). So in the v1.4.0 Linux AppImage and Intel DMG, thumbnails, subtitle sync and movie specs very likely do not work.
- **The macOS arm64 ffmpeg from `@ffmpeg-installer` (and from `ffmpeg-static`) is built with `--enable-nonfree`** (its own `-L` text says "nonfree and unredistributable"), so the macOS v1.4.0 builds ship a binary that must not be redistributed. The Intel Mac, Linux and Windows builds from those packages are clean GPL.
- `electron-builder.yml` had no `files` allowlist, so `app.asar` also contained `landing/`, `deploy/`, `FEATURES_PLAN.md` and config files.
- Release notes and the repo description repeat the overclaims ("preserves 100%…", "0ms telemetry", "Windows Recycle Bin" in a cross-platform release).
- Two copies of the workflow exist (`.github/workflows/release.yml` and `deploy/release.yml`) and they differ. The current workflow also hardcodes `v1.4.0` as a default tag and publishes immediately (`draft: false`).

### 1.1.a How a release will work (the big picture)

```
 YOU (laptop)                  GITHUB ACTIONS (clean machines)                          YOU (browser)
 ────────────                  ───────────────────────────────                          ─────────────
 update CHANGELOG.md
 npm version 1.5.0      ──▶    1. verify   tag v1.5.0 == package.json 1.5.0?
 git push --follow-tags        2. test     typecheck · lint · unit tests
                               3. build    in parallel:
                                             Windows x64 │ macOS x64 + arm64 │ Linux x64
                               4. collect  installers + latest*.yml + blockmaps
                                           + SHA256SUMS.txt
                               5. draft    GitHub Release (notes from CHANGELOG)   ──▶   download, smoke-test,
                                                                                         click "Publish release"
```

Key ideas:
- **A tag is the release.** Pushing the tag `v1.5.0` is what starts the build. `npm version` creates the tag for you.
- **CI builds from exactly the tagged commit** on fresh machines, so every file in a release matches the source code at that tag. Nothing is built on your laptop any more.
- **Draft first.** The release stays a private draft until you click *Publish*. Installed apps (and the "latest" link) only see published releases.
- **Pre-releases** (`v1.5.0-rc.1`, `v2.0.0-beta.1`) are marked as pre-release automatically and are ignored by the stable update check.
- **`ci.yml`** (Phase 1.0) runs on every push/PR; **`release.yml`** runs only on tags. The release workflow re-runs the same checks before building.

### 1.1.b Fix `electron-builder.yml`
1. **File names without spaces.** GitHub turns spaces into dots (`Heimdall Setup 1.4.0.exe` → `Heimdall.Setup.1.4.0.exe`), which breaks the download URLs `electron-updater` reads from `latest.yml`. Set explicit names:
   - `nsis.artifactName: ${productName}-Setup-${version}.${ext}` → `Heimdall-Setup-1.5.0.exe`
   - `mac.artifactName: ${productName}-${version}-mac-${arch}.${ext}` with `arch: universal` → `Heimdall-1.5.0-mac-universal.dmg` (one universal build, see 1.1.f)
   - `linux.artifactName: ${productName}-${version}-linux-${arch}.${ext}` → `Heimdall-1.5.0-linux-x86_64.AppImage`, `.deb`, `.tar.gz`
2. **Add a `publish` block** so `latest*.yml` gets generated with the right feed:
   ```yaml
   publish:
     provider: github
     owner: niranjan-7
     repo: heimdall
   ```
   CI runs electron-builder with `--publish never`; the workflow's final job uploads everything in one place (1.1.d).
3. Keep Linux targets **AppImage** (the one that self-updates), **deb** (Debian/Ubuntu users expect it; it was configured but never shipped) and **tar.gz**.
4. Rewrite `linux.synopsis` / `linux.description` (drop "real-time telemetry").
5. Keep `appId: com.heimdall.vlc` for now. Changing it changes the install identity and the data folder — that only happens with a rename (Phase 2.1).

### 1.1.c Bundled binaries per platform and architecture
> **Status: implemented in branch `phase-1.1a-build-config`** (with 1.1.b). What was actually built, which differs from the first draft below in the sources chosen:
> - `scripts/binaries.lock.json` pins one download per platform with its SHA-256. Sources (all checked statically for `--enable-gpl` and **no** nonfree markers; versions read from the binaries): Windows = gyan.dev FFmpeg 6.1.1, Linux = John Van Sickle FFmpeg 7.0.2 (both via the `eugeneware/ffmpeg-static` `b6.1.1` release), macOS arm64 + x64 = Martin Riedl FFmpeg 9.0.2.
> - `scripts/fetch-binaries.mjs` (`--host`, `--all`, `--target`, `--force`, `--soft`): verifies SHA-256, refuses mismatches, skips what is already there. `npm install` fetches the host's build; CI has a canary step.
> - `src/main/binaries.ts` `getBinaryPath('ffmpeg')` replaces `@ffmpeg-installer` (removed). Falls back to `ffmpeg` on PATH.
> - Verified by packaging each OS: Linux = ELF, Windows = PE, macOS universal = one fat `x86_64 + arm64` ffmpeg that is still validly signed by its author.
> - **Risk:** the macOS builds come from a single maintainer's site that may not keep old versions forever. Mitigation (needs your OK, it publishes files): mirror the four pinned binaries as assets of a `binaries-1` release in this repo and point the lock file there.
> - ffprobe is not bundled yet (the code does not use it); the lock format supports adding it when Phase 1.4 / 2.2 need it.

Original draft:
Fixes the wrong-arch ffmpeg, and sets up the same mechanism for `alass` (Phase 1.4) and `fpcalc` (Phase 2.2).
1. **`scripts/fetch-binaries.mjs --platform <win|mac|linux> --arch <x64|arm64>`**: downloads ffmpeg + ffprobe (later alass, fpcalc) into `resources/bin/<platform>-<arch>/` and checks each file against a SHA-256 pinned in `scripts/binaries.lock.json`. A mismatch fails the build. `resources/bin/` is git-ignored.
2. **electron-builder `extraResources`** copies only the matching folder into the app: `from: resources/bin/${os}-${arch}` → `to: bin`.
3. **`src/main/binaries.ts`**: `getBinaryPath('ffmpeg')` → `process.resourcesPath/bin/ffmpeg(.exe)` in a packaged app, `resources/bin/<host>/…` in `npm run dev` (the dev script runs the fetch for the host machine on `postinstall`).
4. Replace every `ffmpegInstaller.path` use (subtitle sync, thumbnails, movie scanner…) with `getBinaryPath`, then **remove `@ffmpeg-installer/ffmpeg`**.
5. **Arch check in CI** after packaging: `lipo -archs` on the mac binaries (must be `x86_64` in the x64 app, `arm64` in the arm64 app); `ffmpeg -version` on Windows/Linux.
6. **`THIRD_PARTY_NOTICES.md`**: FFmpeg license notice + source link (and alass/fpcalc later). Ship it inside the app and show it in Settings → About.

### 1.1.d New `release.yml`
Replace the current workflow and delete `deploy/release.yml`.

> **Design change found while testing 1.1.b:** `electron-builder --publish never` does **not** write `latest*.yml` (checked: none are produced). The update files are only generated when electron-builder publishes. So the build jobs must run `electron-builder --publish always` with `GH_TOKEN`, uploading into a **draft** release (`publish.releaseType: draft`). To avoid three jobs racing to create the draft, a first `draft` job creates it with `gh release create --draft`, then each build job uploads into it. The last job then downloads the assets, adds `SHA256SUMS.txt`, sets the notes from `CHANGELOG.md`, and fails if an expected file is missing. Mac builds run `electron-builder --mac` (the config already says `universal`); do **not** pass `--x64`/`--arm64` flags for mac.
> Not producible on an Apple Silicon Mac, so first proven in CI: the Windows NSIS installer and the Linux `.deb` (both failed locally for tooling reasons unrelated to the config).

**Triggers:** `push: tags: ['v*']` (real releases), plus `workflow_dispatch` that builds everything and keeps the files as workflow artifacts **without creating a release** (for testing the pipeline on a branch).

| Job | Runs on | What it does |
| :--- | :--- | :--- |
| `verify` | ubuntu | Tag must be `vX.Y.Z` or `vX.Y.Z-pre.N` and equal `package.json` `version`; `CHANGELOG.md` must have a `## [X.Y.Z]` section. Outputs `prerelease=true` when the tag contains `-`. |
| `test` | ubuntu | Calls `ci.yml` (`workflow_call`): typecheck, lint, unit tests. |
| `build-win` | `windows-latest` | `npm ci` → `fetch-binaries --platform win --arch x64` → `npm run build` → `electron-builder --win --x64 --publish never` → arch check. |
| `build-mac` | `macos-latest` (Apple Silicon) | Fetch **both** `mac-x64` and `mac-arm64` binaries → `electron-builder --mac --x64 --arm64 --publish never` (one job, so it writes a single combined `latest-mac.yml`) → `lipo` checks. `CSC_IDENTITY_AUTO_DISCOVERY=false` until signing exists. |
| `build-linux` | `ubuntu-22.04` | Older glibc → the AppImage runs on more distros. `electron-builder --linux --x64 --publish never`. |
| `release` | ubuntu | Download all build artifacts → `sha256sum * > SHA256SUMS.txt` → extract this version's notes with `scripts/changelog-section.mjs X.Y.Z` → `gh release create vX.Y.Z --draft --verify-tag --title "Heimdall X.Y.Z" --notes-file notes.md [--prerelease] <files>`. |

Each build job uploads installers **plus** `latest*.yml` and `*.blockmap`. Other details: `contents: write` permission only on the `release` job; npm cache; a `concurrency` group per tag so a re-pushed tag doesn't race itself; `if-no-files-found: error` everywhere.

> **Status (1.1.d and 1.1.e): implemented in branch `phase-1.1b-release-workflow`** (not yet run on GitHub — the first real run is the pull-request packaging build, then a `v1.5.0-rc.1` release candidate).
> - `release.yml`: `prepare` (tag = `package.json` = `CHANGELOG.md`) → `test` (reuses `ci.yml`) → `draft` (creates the draft release once) → `build` ×3 (`electron-builder --publish always` into that draft, so `latest*.yml` is produced) → `finalize` (adds `SHA256SUMS.txt`, fails if any expected file is missing). Tag pushes publish; manual runs and pull requests that touch packaging only build and keep the installers as 3-day artifacts.
> - `scripts/release-info.mjs` holds the logic (unit-tested); `CHANGELOG.md` and `docs/RELEASING.md` added; `deploy/release.yml` deleted.
> - Changed from the draft below: because the repo merges by squash, the release flow is "release PR → merge → tag the merged commit", not `npm version` + `git push --follow-tags`.
> - **Unproven until the release candidate:** `gh` finding a *draft* release by tag (`release view` / `release upload`), electron-builder uploading into the pre-created draft, the Windows installer and the `.deb` building in CI.

### 1.1.e Versioning, changelog and how you cut a release
1. **Semantic versioning** (you already do this well): patch = fixes (`1.5.1`), minor = features (`1.6.0`), major = breaking (`2.0.0`). Test builds: `1.5.0-rc.1`, `2.0.0-beta.1`.
2. **`CHANGELOG.md`** in [Keep a Changelog](https://keepachangelog.com) format, with an `## [Unreleased]` section at the top. Every PR adds a line there. Plain, honest wording — this text becomes the release notes.
3. **`docs/RELEASING.md`**, the checklist you follow each time:
   ```bash
   git switch main && git pull
   # In CHANGELOG.md: rename "## [Unreleased]" entries to "## [1.5.0] - <date>", add a new empty Unreleased; commit
   npm version 1.5.0 -m "chore(release): v%s"   # bumps package.json, commits, creates tag v1.5.0
   git push --follow-tags                        # pushes the commit and the tag → starts the Release workflow
   # GitHub → Actions: wait for green → Releases: open the draft → smoke-test → "Publish release"
   ```
4. Optional `npm run release -- 1.5.0` helper that checks first (on `main`, clean tree, CI green for `HEAD` via `gh run list`), moves the CHANGELOG section, then calls `npm version`.
5. **Smoke-test checklist** (in RELEASING.md): Windows — install over the previous version, launch, play an episode in VLC and in mpv, open Settings, pair the remote. macOS — open the DMG on Apple Silicon (and Intel if you can borrow one). Linux — run the AppImage. Check that `SHA256SUMS.txt` matches the downloaded files.
6. **Protect `main`** in GitHub settings: require the CI check to pass before merging PRs. (Repo setting — you change it, or approve me doing it.)

### 1.1.f Updater: switch to `electron-updater`
> **Status: implemented in branch `phase-1.1c-updater`.** Detection stays a small GitHub-API check (works on every platform and in development) with proper semver ordering (`1.5.0-rc.1` < `1.5.0`) and a Stable/Beta channel saved in settings. Installing uses `electron-updater` 6.3.9 (same runtime as electron-builder 25.1.8): it downloads, verifies the sha512 from `latest*.yml`, and installs on Windows and the AppImage; macOS (unsigned), `.deb` and `.tar.gz` open the release page. A backup is made first and the update is cancelled if the backup fails. Logic is in `src/main/updateLogic.ts` (unit-tested). The pipeline was proven end to end with a `v1.5.0-rc.1` test release (all 13 files, checksums match GitHub's digests, CI-built macOS ffmpeg is universal and signed, Linux ffmpeg is ELF), which was then deleted. **Not yet proven:** an actual in-app update from one release to the next — needs two published versions (see step 7).

*(Moved here from the security phase — it depends on this pipeline.)*

> **Context:** Heimdall has no outside users yet — only the owner. So there is **no bridge release**: v1.5.0 is installed by hand once over v1.4.0, and from then on updates are automatic. No need to keep file names compatible with the old v1.4.0 updater.

1. Replace the custom updater (`src/main/updateService.ts`) with **`electron-updater`** (GitHub provider). It reads `latest.yml` / `latest-mac.yml` / `latest-linux.yml`, picks the right file for the OS **and CPU arch**, and **verifies its sha512** before installing. Windows (NSIS) and Linux (AppImage) update in place. deb/tar.gz installs get "New version available → open release page".
2. **macOS: one universal build** (Intel + Apple Silicon in one app, `arch: universal`), one DMG + one zip. Native binaries are merged with `lipo` in `fetch-binaries` (or fetched per-arch and merged at package time). This also makes the landing page's download button a single mac link.
3. **macOS self-install** requires a signed app. Until 1.1.i: show "Update available" with a button that opens the DMG download. No silent install.
4. Keep the existing UI (update pill, progress %, release notes) wired to `autoUpdater` events, and keep the pre-update backup.
5. Settings → About → **Update channel: Stable / Beta** (`autoUpdater.allowPrerelease`). Default Stable. v2 betas go to Beta only.
6. **Linux AppImage:** `electron-updater` replaces the file in place via `process.env.APPIMAGE`; no temp-folder bug.
7. **First-update test:** build v1.5.0, install it, publish a test `v1.5.1-rc.1` pre-release, set the channel to Beta, confirm the app downloads, verifies and installs it. Repeat on macOS (open-release-page path) and Linux.
8. Tests: unit-test channel/version comparison and the "open release page" fallback.

### 1.1.g Dry run before the real thing
1. Run `release.yml` via `workflow_dispatch` on the pipeline branch → check the artifacts.
2. Push a test tag `v1.5.0-rc.1` → a **draft pre-release** appears. Check: every expected file is there; `SHA256SUMS.txt` matches; `latest*.yml` point at the right file names; installers run; `lipo` checks pass.
3. **Test auto-update end to end:** install the RC, then push a second RC (`v1.5.0-rc.2`); with the channel set to Beta the app must offer, download, verify and install it (see 1.1.f step 7).
4. Delete the RC drafts afterwards.

### 1.1.h Clean up existing releases and repo metadata
> **Status: done (2026-11-03, approved by the owner).** v1.1.0's wrong installer removed (note added); v1.4.0's six macOS/Linux files removed (note explains why; Windows installer kept); all seven releases' notes replaced with their `CHANGELOG.md` sections (no overclaims left); repo description and topics updated. The old text was backed up before editing. Not done: deleting the merged `phase-*` branches (use **Delete branch** on each merged PR).
These change public pages, so each one is run only with your OK.
1. **v1.1.0:** remove the wrong `Heimdall.Setup.1.0.0.exe` and add a note: "The installer for this version is no longer available — please use the latest release." (Rebuilding from the old tag isn't worth it.)
2. **v1.4.0:** the macOS/Linux files were built from commit `5240557`, which adds packaging config after the tag, and they bundle the wrong-platform and (macOS arm64) non-redistributable ffmpeg described above. Add a note, and with the owner's OK **delete the macOS and Linux assets of v1.4.0** (nobody else uses them yet) so a non-redistributable binary is no longer on the public releases page. v1.5.0 supersedes them.
3. **Release notes (all 7):** remove overclaims ("100%", "0ms", "Windows Recycle Bin" → "system trash / Recycle Bin"); keep them short and factual.
4. **Repo description and topics** (`gh repo edit`): e.g. *"Tracks your local anime, shows and movies in VLC and mpv — resume where you stopped, subtitle sync, filler detection, AniList, phone remote."* Topics: `anime`, `mpv`, `vlc`, `electron`, `media-tracker`, `anilist`, `local-first`. Remove "0ms telemetry".
5. **README downloads:** replace the hand-written size/checksum table with links to the latest release, its `SHA256SUMS.txt`, and stable permalinks (`…/releases/latest/download/Heimdall-Setup-<ver>.exe` style, which works because of the fixed names in 1.1.b).
6. Delete `deploy/release.yml`.

### 1.1.i Code signing (needs money; can come later)
> **Decided (owner, 2026-11-03): not doing it.** Heimdall is a hobby project with no budget, so builds stay unsigned. Users see the SmartScreen / Gatekeeper warnings documented in `docs/RELEASING.md`, and macOS keeps the "Open Download Page" update path. Revisit only if the project is shared widely; free option to try first: SignPath Foundation (Windows, open source).
- **Windows:** Azure Trusted Signing or an OV certificate; without it SmartScreen warns on every download.
- **macOS:** Apple Developer Program → set `identity`, `hardenedRuntime: true`, `notarize: true`. Without it, Apple Silicon users downloading the DMG see "app is damaged". Until then, document the `xattr -dr com.apple.quarantine /Applications/Heimdall.app` workaround in the README and on the landing FAQ.
- Store certificates and Apple credentials as **GitHub repository secrets** (`CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`); never commit them.
- Once macOS is signed, turn on macOS self-update in 1.1.f.

**Phase done when:** pushing a tag produces a complete draft release with no manual steps except clicking *Publish*; the RC dry run passed; the v1.4.0 → v1.5.0 update was tested on Windows and macOS.

---

## Phase 1.2 — Security fixes (ship-blocking)
> **Status: implemented in branch `phase-1.2-security`.** Remote: pairing code in the QR link fragment (`#t=`), constant-time check, `?t=` accepted for GET only, no CORS headers, JSON-only POSTs, 16 KB body limit, validated commands, escaped page content, CSP on the page, off by default and only started when enabled, reset-pairing and on/off in the desktop panel (the hard-coded `192.168.29.195` fallback is gone). VLC: random per-install password, old default replaced on load. Electron: `sandbox: true`, production CSP, navigation guard, web-only external links. The delete handler already used library IDs only, so no change was needed. Verified with 25 new tests, a live run of the phone page (injection attempts render as text; stale code shows "not paired"), and the built app inspected over the DevTools protocol with a throwaway profile. **Not covered:** thumbnails (`heimdall-thumb:`) under the CSP with a real library, and a real VLC launch with the new password.

### 1.2.a Mobile remote server (`src/main/remoteServer.ts`)
Current state: listens on `0.0.0.0`, no auth, `Access-Control-Allow-Origin: *`, parses any body as JSON. Any website can read `/api/library` (with file paths) from `127.0.0.1:42125` and POST commands.

1. **Pairing token.** Generate a 32-byte random token on first run (`crypto.randomBytes`), store in settings (`remoteToken`). Add a "Reset pairing" button in Settings that rotates it (disconnects all phones).
2. **QR code carries the token** in the URL fragment: `http://192.168.x.x:42125/#t=<token>`. The PWA reads the fragment, stores it in `localStorage`, strips it from the address bar, and sends it as `Authorization: Bearer <token>` on every API call. Fragment = never sent to server logs or Referer.
3. **Reject every `/api/*` request** without a valid token (constant-time compare, `crypto.timingSafeEqual`) with `401`. SSE: token via query param on `/api/events` only (EventSource can't set headers) — acceptable on LAN, rotateable.
4. **Remove the wildcard CORS headers entirely.** The PWA is same-origin; it doesn't need CORS. Add `Access-Control-Allow-Origin` nowhere.
5. **Require `Content-Type: application/json`** on POST (blocks "simple request" CSRF that skips preflight) and cap body size (e.g. 16 KB).
6. **Default `enableRemoteServer: false`** for new installs. Start the server only when enabled; stop it when disabled.
7. **Escape all library data** rendered with `innerHTML` in the remote page (titles come from file names, which can contain `<img onerror>`). Use a tiny `escapeHtml()` or build DOM nodes with `textContent`.
8. Validate POST payloads (`seriesId`/`episodeId` must exist; `time` finite and ≥ 0; `delta` within ±10 s).
9. Optional hardening: allow binding to a chosen interface; show connected device count + "kick all".

**Tests:** request without token → 401; wrong token → 401; `text/plain` POST → 415; cross-origin response has no CORS header; title with HTML is escaped.

> The updater fix (download without integrity check) moved to **Phase 1.1.f**, because it depends on the release pipeline.

### 1.2.b Electron hardening (`src/main/index.ts`, `storageService.ts`)
1. **VLC HTTP password:** replace the hardcoded `heimdall_secret` default with a random per-install password. Migration: on load, if the stored value equals `heimdall_secret`, regenerate and save.
2. Set `sandbox: true` in `webPreferences` (the preload only imports `contextBridge`/`ipcRenderer`, so it should work — verify).
3. Add a Content-Security-Policy to `src/renderer/index.html` (allow `self`, `heimdall-thumb:`, `https://image.tmdb.org`, `https://s4.anilist.co`, AniList/TMDB API hosts).
4. Block navigation and `window.open` in the renderer (`will-navigate`, `setWindowOpenHandler` → `shell.openExternal` only for `https:` URLs).
5. Validate IPC arguments for handlers that touch disk (`series:add`, delete/trash handlers): paths must be inside a library root the user added.

**Phase done when:** all 1.2 tests pass; a manual check from a second machine on the LAN without the token gets `401`.

---

## Phase 1.3 — Make every claim true

### 1.3.a Copy audit (README, landing, `package.json`, in-app text, GitHub release notes)
Fix or remove every claim the code does not back up:

| Claim (where) | Reality | Action |
| :--- | :--- | :--- |
| "Local SQLite (`heimdall.db`)" (README) | `library.json` + `settings.json` in `userData` | Say "stored locally as JSON in your user data folder". (SQLite is planned for v2 — Phase 2.0.) |
| "Vocal FFT 300Hz–3.4kHz", "Pearson correlation" (README, landing AutoSyncDemo) | `silencedetect` on the full mix + overlap score | Rewrite after Phase 1.4 lands to describe the real engine. |
| "Anime4K Real-Time GLSL Upscaling" (README, landing DualPlayerDemo) | **No shaders are shipped.** The `anime4k` preset passes the same args as `hq_lanczos`. | Either implement (1.3.b) or remove the claim. |
| "0ms event push latency" | mpv IPC is event-driven but not 0 ms; VLC is polled | "Instant, event-driven updates with mpv". |
| "100% accuracy" hash matching | Hash match is exact *when* OpenSubtitles has that hash | "Matches your exact release when OpenSubtitles has it". |
| TheSubDB source | Service shut down years ago | Remove code path and `'subdb'` from `SubtitleDownloadResult.source`. |
| "Tailwind CSS v4" (README tech table) | Desktop app uses Tailwind **3.4**; only the landing uses v4 | Correct the table. |
| `package.json` description "Standalone Windows VLC…" | Cross-platform, VLC + mpv, movies | Update; also align `author.email` with the public contact. |
| `Heimdall.Setup.1.2.0.exe` in Module 6 | Old version string | Remove hardcoded versions from prose. |
| Landing "Module 1/2/3…" engineering copy | — | Full rewrite happens in Phase 2.6; in v1.5 only remove false claims. |
| GitHub release notes ("preserves 100% of your watch history", "Windows Recycle Bin" in a cross-platform release) | Overclaims / Windows-only wording | Edit all 7 releases (Phase 1.1.h). |
| GitHub repo description ("dual-engine 0ms telemetry") | Overclaim; "telemetry" also suggests tracking, the opposite of the privacy pitch | New description and topics (Phase 1.1.h). |
| `electron-builder.yml` Linux description ("real-time telemetry") | Same | Rewrite (Phase 1.1.b). |

Also: move `FEATURES_PLAN.md` → `docs/archive/FEATURES_PLAN.md` and link this roadmap from the README.

### 1.3.b Anime4K — implement it properly (or drop it)
Recommendation: implement, it's small and it's a real differentiator for the anime audience.
1. Bundle the Anime4K GLSL shaders (MIT license) in `resources/shaders/anime4k/`, via `extraResources`.
2. Presets mapped to the official Anime4K mode chains: **Mode A (HQ)**, **Mode B**, **Mode C**, plus "Fast" variants for weaker GPUs. Pass with `--glsl-shaders=<path1>;<path2>…` (use `:` on Linux/macOS, `;` on Windows).
3. Replace the deprecated `--profile=gpu-hq` with `--profile=high-quality` (mpv ≥ 0.37); detect mpv version via `mpv --version` and fall back.
4. Add a "GPU warning" note in Settings; Anime4K only applies when mpv is the player.
5. Add a runtime toggle via IPC (`change-list glsl-shaders set …`) so it can be switched without relaunch.

> Packaging and binary-arch checks moved to **Phase 1.1.c**.

**Status: implemented on branch `phase-1-3-honest-claims`.**
- 1.3.a: README and landing page rewritten where they overclaimed (SQLite, FFT/Pearson, 0 ms, 100%, phone-remote volume and audio tracks, ±50/250 ms nudges, Tailwind v4, Recycle Bin, hard-coded versions and download links now point at the latest release). TheSubDB removed. `FEATURES_PLAN.md` archived to `docs/archive/`. GitHub release notes and repo description were already cleaned up in 1.1.h.
- 1.3.b: Anime4K v4.0.1 shaders bundled (12 files, MIT) in `resources/shaders/anime4k`, packaged as `shaders/anime4k`. Presets HQ / Mode A / B / C / Fast, plus a "Strong GPU / Laptop" shader size. Shaders are passed with one `--glsl-shaders-append` per file (no OS-specific separator). mpv's version is read once with `mpv --version` to choose `high-quality` or `gpu-hq`. Old `anime4k` settings migrate to Mode A. GPU warning in Settings.
- Moved to the backlog: 1.3.b step 5 (switching shaders live over IPC). Not tested with a real mpv yet (none installed on the dev Mac).

---

## Phase 1.4 — Subtitle auto-sync: rebuild the engine

### Problems today (`src/main/subtitleSyncService.ts`)
1. `silencedetect` on the full mix → music/SFX count as "speech". Fails on anime and films with score-heavy audio.
2. Constant offset only, max ±20 s, first ~15 min only. No framerate drift (23.976 ↔ 25 fps), no handling of cuts (recap/ads removed).
3. Confidence is clamped to ≥ 10% and the offset is **always applied**.
4. Falls back to the first embedded track (`0:s:0`), which is almost never out of sync, and may not be the track actually playing.
5. Result is a single constant `sub-delay`, so drift can't be represented anyway.

### Target design

```
            ┌──────────────────────────┐
 video ───▶ │ SpeechEnvelope (ffmpeg)  │──┐
            └──────────────────────────┘  │     ┌──────────────┐     ┌──────────────┐
                                          ├───▶ │  Aligner     │───▶ │ Verifier     │──▶ result + score
            ┌──────────────────────────┐  │     │ alass | native│     │ (independent)│
 subtitle ▶ │ SubtitleSource resolver  │──┘     └──────────────┘     └──────────────┘
            └──────────────────────────┘                                   │
                                                          High → apply  Medium → ask  Low → refuse
```

New module layout under `src/main/subsync/`:
- `subtitleSource.ts` — decides *which* subtitle to sync.
- `speechEnvelope.ts` — audio → 10 ms speech-probability frames.
- `aligners/alassAligner.ts` — primary engine.
- `aligners/nativeAligner.ts` — fallback engine (pure TS).
- `verifier.ts` — independent quality score.
- `subtitleWriter.ts` — writes retimed SRT/ASS.
- `index.ts` — `SubtitleSyncService` orchestrator (keeps the existing IPC API).

#### Step 1 — Pick the right subtitle (`subtitleSource.ts`)
1. Ask the active player which subtitle is selected:
   - mpv: IPC `get_property track-list` → the `sub` track with `selected: true`, read `external` / `external-filename`.
   - VLC: parse `status.xml` stream info; if ambiguous, use the external file Heimdall loaded.
2. Priority: currently-playing external file → Heimdall-downloaded file → matching external files next to the video (existing candidate list).
3. **Never auto-sync an embedded track.** Offer it only behind an explicit "Sync embedded track anyway" action.
4. Support `.srt`, `.ass`, `.ssa`, `.vtt`.

#### Step 2 — Better speech envelope (`speechEnvelope.ts`)
1. One ffmpeg pass over the **whole file** (not 15 min), audio only, streamed as raw PCM:
   `ffmpeg -i in -vn -sn -dn -ac 1 -ar 16000 -af "highpass=f=200,lowpass=f=3500" -f s16le -`
   - If the file has multiple audio tracks, use the one the player has selected (pass `-map 0:a:<n>`).
   - For 5.1 sources, prefer the center channel (`pan=mono|c0=FC`) — dialogue lives there.
2. In TS, compute RMS energy per 10 ms frame, then an **adaptive threshold** (e.g. rolling 30 s window, speech = energy above the 60th percentile + hysteresis, min speech run 150 ms). Output a `Float32Array` of speech probability.
3. Later upgrade path (not required for v1.5): Silero VAD via `onnxruntime-node` for true voice detection.
4. Cache the envelope per file (`cache/speech/<size>-<mtime>-<hash64k>.bin`) so re-syncs are instant.
5. Run in a `worker_thread`; report progress from ffmpeg's `time=` output; support cancel (kill ffmpeg).

#### Step 3a — Primary aligner: bundle `alass`
`alass` (Rust, GPL-3.0) handles constant offset, framerate drift ("fps guessing") and splits/cuts.
1. Ship `alass-cli` as a **separate executable** in `resources/bin/<platform>-<arch>/` via `extraResources`, fetched and checksum-checked by `scripts/fetch-binaries.mjs` (Phase 1.1.c).
   - Windows/Linux: official release binaries.
   - macOS (x64 + arm64): build from source in `release.yml` with `cargo build --release` (cache the build).
2. alass needs ffmpeg/ffprobe: point it at the bundled ones via its environment variables (`ALASS_FFMPEG_PATH`, `ALASS_FFPROBE_PATH` — verify names against the alass version you ship). Add `@ffprobe-installer/ffprobe` if ffprobe isn't already bundled.
3. Invoke: `alass-cli <video> <input.srt> <output.srt>` (start with defaults; expose `--split-penalty` as an "Advanced" setting for recaps/ads).
4. **Licensing:** shipping a GPL tool as a separate, unmodified executable alongside an MIT app is normal practice, but add `THIRD_PARTY_NOTICES.md`, include alass's license text, and link its source. Same file should list FFmpeg's license.
5. If the alass binary is missing or fails → fall back to the native aligner.

#### Step 3b — Fallback aligner: native TS (`nativeAligner.ts`)
1. Rasterise subtitle cues to the same 10 ms grid (1 inside a cue, 0 outside).
2. **Global offset:** FFT cross-correlation of subtitle signal vs speech envelope over ±120 s (not ±20 s). Use a small FFT lib (e.g. `fft.js`) — O(n log n), runs in < 1 s for a 2-hour film.
3. **Drift:** split the timeline into ~8 windows; find the best local offset per window around the global offset; fit `offset(t) = a + b·t` with a robust fit (RANSAC / Theil–Sen). If `b` is significant, snap to a known fps ratio (25/23.976, 23.976/25, 24/23.976, 25/24…) when close.
4. **Cuts (optional v1.5, required v2):** if windows split into two clusters of offsets, segment at the boundary and apply piecewise offsets.
5. Output: a timing transform `{ offset, scale, segments[] }`.

#### Step 4 — Independent verifier (`verifier.ts`)
Don't trust any aligner's own score. For the original and the aligned subtitle, compute:
- **Speech coverage:** % of subtitle cue time that overlaps detected speech.
- **Peak sharpness** (native aligner only): ratio of best correlation peak to the second-best peak outside ±1 s.
- **Window agreement:** fraction of drift windows within ±150 ms of the fitted line.

Combine into a 0–100 score and classify:
| Score | Label | Behaviour |
| :--- | :--- | :--- |
| ≥ 75 and improvement ≥ 10 pts over original | **High** | Apply automatically (incl. after auto-download). |
| 60–74 | **Medium** | Show result, user must confirm. |
| < 60, or no improvement | **Low** | Refuse. "Couldn't find a reliable match — try the nudge bar." Nothing changes. |

If the original subtitle already scores High → "Subtitles already look in sync" and do nothing.

#### Step 5 — Apply the result (`subtitleWriter.ts`)
1. Never overwrite the user's file. Write `<video-base>.<lang>.heimdall-synced.srt` (or `.ass`, preserving styles — only timestamps change).
2. Load it in the player and select it:
   - mpv: IPC `sub-add <path> select`.
   - VLC: HTTP `command=addsubtitle&val=<file-uri>`.
3. Reset `sub-delay` to 0 after loading the retimed file (the timing is now baked in). Keep the nudge bar for fine tuning on top.
4. New fields: `Episode.syncedSubtitlePath`, `Episode.syncReport { engine, offsetSec, fpsRatio?, score, at }` (same on `Movie`). Use them on next launch so the synced file loads automatically.
5. "Undo sync" → delete the synced file, clear fields, reload the original.

#### Step 6 — UX (`SubtitleSyncWidget.tsx`)
1. States: **Analyzing (progress %, cancel)** → **Result card** → **Applied / Discarded**.
2. Result card text example: *"Shifted −1.42 s and corrected 25 → 23.976 fps. Confidence: High."*
3. **Preview** button: seek the player to a dialogue-dense moment (pick the window with most cues), load the synced subs temporarily, let the user hit **Keep** / **Discard**.
4. Low-confidence result opens the nudge bar instead of applying anything.
5. "Apply to whole season" only offers itself when the next episode's original subtitle has the same detected offset (verify on 1–2 more episodes in the background).

#### Step 7 — Benchmark & tests
1. `scripts/subsync-bench.ts` + a small private corpus (5–10 clips: anime with OST, action film, dialogue-heavy drama). For each, generate broken variants from a known-good subtitle: shift ±0.5/2.3/15/60 s, stretch 25↔23.976, cut a 90 s block.
2. Pass criteria: recover within **±100 ms** on ≥ 90% of variants; **never** apply a result that makes things worse (verifier must classify those as Low).
3. Unit tests: SRT/ASS/VTT parsing, rasterisation, fps snapping, verifier classification, writer preserves ASS styling.

**Phase done when:** benchmark passes, the old `computeOptimalOffset` path is deleted, and landing/README copy describes this engine accurately.

### Status
Split into two PRs.

**1.4a — native engine (branch `phase-1-4-subtitle-sync`).** Implemented:
- `src/main/subsync/`: `subtitleFormat.ts` (SRT/VTT/ASS parse + retime, only timestamps change), `speechEnvelope.ts` (whole-file ffmpeg pass, 200–3500 Hz, 10 ms frames, adaptive threshold between the 10th and 90th percentile of the surrounding 30 s, cached per file in `userData/cache/speech`), `aligner.ts` (±120 s search at 100 ms, then 10 ms; tries the common fps ratios instead of fitting drift windows), `verifier.ts` (lift over chance + peak sharpness + 8-section agreement → 0–100; High ≥ 75 and +10 over the original applies, Medium 60–74 asks, otherwise refuses; "already in sync" when the original scores High), `subtitleSource.ts` (playing file → last source → downloaded → nearby; never embedded unless asked).
- Retimed copy `<video>.<lang>.heimdall-synced.<ext>`, loaded per file at launch (mpv `--{ --sub-file }`, VLC `:sub-file=`) and live (mpv `sub-add … select`, VLC `addsubtitle`). `syncedSubtitlePath` + `syncReport` on episodes and movies; Undo deletes the copy.
- Widget: progress with cancel, confirm card for Medium, explanation for refusals, "Sync built-in track anyway", Undo. Movies use the same widget.
- Fixed on the way: VLC `--sub-delay` is in tenths of a second; local-subtitle search could take another episode's file.
- Tests: synthetic shifts (0.5–110 s), both fps directions, wrong episode, silence, formats, file choice, playlists. An ffmpeg end-to-end test (generated soundtrack) runs in CI on all three OSes.
- Not done: Preview button, "apply to whole season" verification, cut/segment handling (a 90 s cut scores Medium today), worker thread (the search blocks the main process for about 0.5 s per 24-minute episode, so an estimated 2.5–3 s on a 2-hour film), selected audio track (uses the first one), real-media benchmark corpus (thresholds are tuned on synthetic data).

**1.4b — bundle `alass` (branch `phase-1-4b-alass`).** Implemented, but only the Heimdall side has run here (no Rust toolchain and no Linux/Windows on the dev Mac); the real alass runs for the first time in CI.
- Windows x64 and Linux x64 use the v2.0.0 release binaries, pinned by SHA-256. macOS has no published binary: `scripts/build-alass.mjs` compiles the pinned v2.0.0 commit (`cargo build --locked`) for Apple Silicon and Intel; electron-builder merges them into the universal app. Cached in CI.
- Heimdall gives alass the speech it detected as a reference subtitle (one line per stretch of speech) instead of the video, so alass needs neither ffmpeg nor ffprobe. alass returns a time for every line, so the result can contain several shifts (a cut recap or ad break) and a frame-rate correction.
- `subsync/engine.ts` tries alass first, then the built-in aligner unless alass was confident, and keeps the better-scoring result. The verifier scores whichever wins. A result split into 4–6 sections is capped at "ask first" and more than 6 is refused, because a many-piece subtitle can be made to fit almost any audio.
- If alass is missing, fails, times out (3 min) or returns the wrong number of lines, the built-in aligner is used. Cancel stops alass.
- Tests: stand-in alass (arguments, order, failure, wrong line count, cancel, timeout), engine choice, per-line retiming for SRT/ASS/VTT; real-alass tests (shifts, 25→23.976, a 90 s cut, end to end) run in CI on all three OSes (`HEIMDALL_ALASS_TESTS`).
- Not verified: alass compiling with today's Rust on macOS; the unsigned universal macOS app running the bundled alass-cli and ffmpeg on Apple Silicon (same open question as ffmpeg); real episodes.

---

## Phase 1.5 — Filler detection reliability

Current: scrapes `animefillerlist.com` HTML; page slug guessed from the folder title (`fillerService.generateSlug`).

1. **Match from AniList, not the folder name.** Once a series has `aniListId`, try slugs derived from its AniList titles (English, Romaji, synonyms) in order. Fuzzy-match each against the cached master show list (`shows_master_list.json`) with a normalised similarity score (e.g. Jaro-Winkler / token-set ratio); take the best above a threshold.
2. **Persist the match:** new fields `Series.fillerSlug`, `Series.fillerMatchSource: 'auto' | 'manual'`. Once matched, never guess again.
3. **"Fix filler match" modal** (mirror `MovieMatchModal`): searchable list from the master show list, preview of episode counts/filler %, "Unlink" option. Entry point in the series hero `…` menu and in the filler badge.
4. **Episode alignment:** animefillerlist uses absolute numbering; local files may be season-relative (`S02E03`). Add a per-series "episode offset" (auto-computed from AniList relations/previous seasons when possible, editable in the modal).
5. **Parser resilience:** move HTML parsing into `fillerParser.ts` with fixture-based tests (save 3–4 real pages into `tests/fixtures/filler/`). If parsing returns 0 episodes for a page that previously had data, keep the old cache and log a warning instead of wiping data.
6. **Cache policy:** keep the 14-day TTL for airing shows; finished shows (AniList status `FINISHED`) cache for 90 days. Add "Refresh filler data" action. Send a descriptive `User-Agent` and throttle requests (1 req/sec).
7. **Offline:** never block UI; show "filler data unavailable" quietly.

**Tests:** slug candidates from AniList titles; fuzzy match picks the right show for 20 known titles; absolute vs relative numbering mapping; parser fixtures.

**Status: implemented on branch `phase-1-5-filler` (ships after v1.5.0, in 1.5.1 or 1.6.0).**
- Pure code in `src/main/fillerParser.ts` (HTML) and `src/main/fillerMatcher.ts` (slug candidates, Jaro-Winkler + token-sort scoring, offsets, cache TTL, throttle); `fillerService.ts` does I/O only. Cache is now per show (`show_<slug>.json`), not per series.
- Tests: `tests/fillerParser.test.ts` (4 trimmed real pages + show list in `tests/fixtures/filler/`, captured 2026-11-10) and `tests/fillerMatcher.test.ts` (28 known titles).
- The hero has no `…` menu, so "Fix Filler Match" is a button in the action row next to "Refresh Filler Data"; the Fillers badge also opens it.
- Auto offset walks AniList TV prequels and only counts seasons that match the same filler page; it is 0 when local files already start past those seasons.

---

## Phase 1.6 — TMDB metadata for non-anime TV series

Today series metadata only comes from AniList, so western TV gets nothing.

1. Extend `tmdbService.ts`: `searchTv(query, year?)`, `getTv(id)`, `getSeason(id, seasonNumber)` (episode titles, air dates, stills, overviews), with `append_to_response=external_ids`.
2. New fields on `Series`: `metadataSource: 'anilist' | 'tmdb' | null`, `tmdbId`, `overview`, `genres`, `network`, `firstAirYear`; on `Episode`: `tmdbTitle`, `airDate`, `overview`, `stillUrl`, `seasonNumber`.
3. **Auto-detection on import:** search AniList *and* TMDB TV; pick by score (title similarity + year + episode count). Anime-looking signals (fansub brackets, absolute numbering, Japanese titles) bias toward AniList.
4. **Episode mapping:** map local files to TMDB `SxxEyy` using parsed season/episode numbers; fall back to order within a season folder.
5. **"Fix match" modal for series** with tabs: AniList | TMDB. Reuse the same component for movies.
6. **Image caching:** download posters/backdrops/stills to `userData/cache/images/` (served via the existing custom protocol) so the library works offline and the remote server doesn't hotlink.
7. API key: keep the user-supplied `tmdbApiKey` setting; document how to get one; consider a built-in key with rate-limit backoff.

**Tests:** filename → (season, episode) mapping; source selection heuristic on a fixture list of 30 titles.

---

## Phase 1.7 — Scrobbling decision & parser tests

### 1.7.a Trakt / Letterboxd
- **Letterboxd:** has no public write API for third-party apps. **Remove** it from all plans and copy.
- **Trakt:** worth building, but it's a v2 feature (Phase 2.3, as part of the tracker framework). In v1.5: remove it from copy; it lives in this roadmap only.

### 1.7.b Parser test suite (highest-ROI tests)
1. `extractEpisodeNumber` and `cleanEpisodeTitle` (`folderScanner.ts`) and `parseMovieFileName` (`movieParser.ts`) against the fixture table from Phase 1.0 (aim for 150+ cases).
2. Every bug found becomes a new fixture row before it's fixed.
3. Known hard cases to cover: `[Group] Show - 05v2 [1080p].mkv`, `Show S01E05E06`, `Show - 1047 (1080p)`, `Show.2023.S01E05`, `Show - 05.5` (recap), `NCOP/NCED`, `OVA`, `Special`, `[HASH12AB]`, movie years vs resolutions (`1080`), `Part 2` (movie part vs title).
4. Consider adopting a proven parser (an npm port of **Anitomy**, the anime file-name parser Taiga uses — evaluate what's maintained) behind the same function signatures if the hand-rolled regexes keep failing.

---

## Phase 1.8 — Quick UI fixes that are really bugs

> **Status: items 1 & 4 implemented in branch `phase-1.8-memory-throttling`.** Default theme switched to `classic_dark` (opaque), eliminating D3D acrylic composition swapchains; `SyncWorker` suspends `vlc:progress-update` IPC broadcasts when the window is minimized or hidden, flushing a single consolidated update on restore; `App.tsx` throttles library state cloning to at most once per 10s or upon completion transitions; Stealth Playback Mode added (minimize / system tray / keep open) with auto-restore on episode completion; documented in `docs/STEALTH_WATCHER.md` with unit test suite in `tests/syncWorkerThrottling.test.ts`. Items 2 and 3 remain to complete Phase 1.8.

1. **Opaque theme by default** (`classic_dark` for new installs). Liquid Glass stays as an option. On Windows, `transparent: true` + `backgroundMaterial: 'acrylic'` breaks snap/maximize and costs GPU; only enable transparency when the Liquid Glass theme is active (needs a window re-create on theme switch — acceptable, or ask to restart).
2. **Minimum font size 12px** for all body/label text (replace `text-[10px]` usages). Uppercase+tracking only for tiny section labels.
3. Respect `prefers-reduced-motion`: disable caustic animations and large transitions.
4. **Pause renderer IPC progress spam when window is hidden/minimized**: `SyncWorker` currently pushes `vlc:progress-update` to `win.webContents` every 1.5 s. In `App.tsx`, this clones and re-renders the entire library object tree (`setLibrary(prev => ...)`) every tick, preventing V8 garbage collection and keeping the renderer active. When the window is minimized or hidden, suspend these IPC broadcasts until the window is restored, then send a single sync.

### v1.5.0 release checklist
- [ ] All phases merged, CI green, subtitle-sync benchmark passing.
- [ ] Opened with the owner's existing v1.4.0 `userData` folder without errors (default VLC password regenerated; remote server off until re-enabled and re-paired). Only the owner is affected, so no in-app notice is needed.
- [ ] README, landing, GitHub release notes and repo description re-audited against the code.
- [ ] `CHANGELOG.md` has a `## [1.5.0]` section (it becomes the release notes).
- [ ] RC dry run (`v1.5.0-rc.N`) passed, including the RC → RC auto-update test on Windows (and macOS/Linux if available) (1.1.g).
- [ ] Released by the pipeline only: `npm version 1.5.0` → `git push --follow-tags` → smoke-test the draft → Publish (follow `docs/RELEASING.md`).
- [ ] Release contains exactly one `.exe`, one universal macOS DMG + zip, AppImage/deb/tar.gz, `latest*.yml`, blockmaps and `SHA256SUMS.txt`.

---

# v2.0 — A Modern Local Anime & Media Tracker

v2 is big. Build the foundation first (2.0), make the brand decision before rebuilding the UI (2.1), then features (2.2–2.4), then the new UI shell and big-picture mode (2.5), then launch marketing (2.6).

## Phase 2.0 — Foundation

### 2.0.a Storage: move to SQLite
Watch history, intro markers, tracker sync state and stats all need real queries. `library.json` rewritten whole on each save won't scale.
1. `better-sqlite3` (synchronous, fast, fine in the main process); rebuilt by `electron-builder install-app-deps`.
2. Schema (first cut): `series`, `seasons`, `episodes`, `movies`, `media_files`, `watch_events` (append-only: media id, started_at, ended_at, from_pos, to_pos, completed), `markers` (intro/outro), `tracker_links`, `tracker_sync_state`, `settings` (or keep `settings.json`).
3. Versioned migrations (`src/main/db/migrations/NNN_*.sql`) run on startup.
4. **One-time importer** from `library.json` → SQLite, keep the JSON as a backup, never delete it.
5. `StorageService` keeps its public methods; internals swap to repositories. This keeps the IPC layer unchanged.

> Start recording `watch_events` **as early as possible** (even in a v1.5.x patch, as an append-only `watch_events.jsonl`) — "Heimdall Wrapped" (Phase 2.4) is only as good as the history you have.

### 2.0.b Renderer architecture
`App.tsx` (633 lines) holds all state; `SettingsModal.tsx` is 1,141 lines.
1. Add a router (`react-router` or TanStack Router): `/home`, `/series`, `/series/:id`, `/movies`, `/movies/:id`, `/calendar`, `/stats`, `/settings/:section`, `/big-picture`.
2. Add a store (`zustand`) for library/player state, and a query layer (TanStack Query) wrapping the preload IPC calls. **Isolate high-frequency player progress (`currentTime`, `state`) in a transient store slice** so 1.5 s polling updates never trigger re-renders of the episode or series grid.
3. Push events (player state, library changes) from main → renderer through one typed channel instead of ad-hoc listeners. Suspend UI streaming when the window is minimized or docked in the tray.
4. Rename `VlcController` / `VlcStateUpdate` → `PlayerManager` / `PlayerState` everywhere (the shim exists already).

### 2.0.c Player abstraction upgrades (needed by 2.2)
Extend `IMediaPlayerDriver` with: `observe(property)`, `loadSubtitle(path)`, `setTracks({ audio, sub })`, `showOsd(text, ms)`, `playlistNext()`, `getTrackList()`. mpv gets all of them; VLC implements what its HTTP API allows and reports unsupported capabilities via `capabilities` flags so the UI can hide features.

---

## Phase 2.1 — Brand decision (before any UI rebuild)

**Decision (owner): the rename, if any, ships together with v2.0.0** — new name, new look and the big features as one "this is the new product" release. v1.5.x keeps the name "Heimdall"; version numbers simply keep counting (e.g. v1.5.0 → v1.6.0 → **NewName 2.0.0**). Choose the name before the UI rebuild (2.5) and the landing relaunch (2.6), because the name touches the app id, the `userData` folder, the domain, the logo and every screen.

1. **Decide: keep "Heimdall" or rename.**
   - Problem: "Heimdall" is the well-known linuxserver.io self-hosted *application dashboard* — exactly the homelab/self-hosted audience — plus Heimdal Security. Search and recognition will be hard.
   - Option A — rename (recommended). Criteria: easy to spell and say, `.app`/`.com`/`.tv` domain available, free GitHub org + npm + social handles, no conflicting software product, works as a verb or a noun. Shortlist candidates and check each (e.g. "Gjallar" keeps the Norse lore; also brainstorm non-Norse names that say "remember where I left off").
   - Option B — keep the name, always with a qualifier ("Heimdall Media Tracker") and accept the SEO cost.
2. **If renaming — technical migration:**
   - New `appId` / `productName` changes the `userData` path. On first launch, detect the old folder (`…/Heimdall`) and migrate library, settings, caches.
   - Update the updater feed (repo rename keeps GitHub redirects, but update `publish` config), Discord RPC app name/assets, mpv pipe name, custom protocol (`heimdall-thumb` → new scheme, keep old as alias for one release).
   - Only the owner has data today, so migration only needs to work on the owner's machine (still do it properly: copy, never delete, the old folder). No public notice release is needed.
   - Rename the GitHub repo at release time (GitHub redirects the old URL); update `publish.owner/repo`, README badges and the landing page.
3. **Positioning statement** (drives all copy): *"The modern tracker for anime and shows you keep on your own drive. Remembers where you stopped, fixes out-of-sync subtitles, skips intros and filler."* Primary audience: anime fans with local libraries (today's alternative is Taiga — dated and Windows-only). Secondary: anyone with local TV/movie files who doesn't want a Plex/Jellyfin server.
4. **Visual identity brief:** one logo mark (explore the Bifrost "bridge from your library to your player" idea instead of the generic eye), one accent colour, one display typeface + one UI typeface, icon set (lucide is fine), app icon for all platforms, social preview image.

Deliverable: `docs/brand.md` (name, voice rules, colours, type, logo usage, words we don't use: "0ms", "100%", "razor-sharp", "military-grade").

---

## Phase 2.2 — Playback features

### 2.2.a Skip intro & outro
**Detection pipeline (per season, background job, cached):**
1. **Chapters first (free and exact).** `ffprobe -show_chapters -of json`. Titles matching `/^(op|opening|intro)\b/i` → intro; `/^(ed|ending|outro|credits)\b/i` → outro; `/^(preview|next)/i` → preview. Many BD/fansub releases already have these.
2. **Audio fingerprinting for the rest.**
   - Bundle **`fpcalc`** (Chromaprint, LGPL; prebuilt binaries for Windows/macOS/Linux) as a separate executable, same way as alass.
   - For each episode: fingerprint the first 35% (max 8 min) and last 5 min. `fpcalc -raw -length <s>` on an ffmpeg-cut temp WAV (or pipe PCM).
   - **Pairwise match:** compare episode N with N+1 (and a few others) — slide one fingerprint over the other, XOR 32-bit sub-fingerprints, popcount = Hamming distance; find the longest contiguous run below a distance threshold. Accept runs of 20–130 s as intro candidates.
   - **Season signature:** cluster candidates across ≥ 3 pairs; the consensus segment is the season's intro fingerprint. Then match every episode against the signature (O(n), also finds intros after a cold open). Same for outros (ending songs).
   - Handle seasons where the OP changes mid-season (two clusters → two signatures).
3. Run in a `worker_thread`, low priority, triggered on import and on new files (2.3.b). Show progress per series ("Finding intros… 7/24").
4. **Storage:** `markers` table: `{ episode_id, kind: intro|outro|preview|recap, start, end, source: chapter|fingerprint|manual, confidence }`.
5. **Manual override:** during playback, "Mark intro start / end" buttons (app + remote) → apply to this episode or the whole season.

**Playback behaviour:**
- **mpv:** ship a small Lua script `resources/mpv/heimdall.lua` loaded with `--script=`. Heimdall passes markers via `--script-opts` (or IPC `script-message`). The script shows an OSD "Skip Intro ⏎" prompt *inside the video window* (the user is usually fullscreen and can't see Heimdall's window) and binds a key; auto-skip if the series setting says so.
- **VLC:** no in-video overlay via HTTP, so: auto-skip (seek) if enabled, plus "Skip" buttons in the app and on the phone remote.
- Per-series setting: Off / Show button / Auto-skip (intro), and the same for outro (outro skip → next episode, see 2.2.b).

**Tests/bench:** label intros on 3 seasons by hand; detection within ±1.5 s on ≥ 90% of episodes; no false intro on movies (only run on series).

### 2.2.b Auto-play next episode
1. At outro start (marker) or at `duration − 30 s` if no marker: show a countdown card — "Up next: Ep 9 · Title — playing in 10 s · [Play now] [Cancel]" — in the app, on the phone remote, and as mpv OSD via the Lua script.
2. mpv already gets the season as a playlist; "Cancel" = pause at end (`keep-open=yes` + pause), "Play now" = `playlist-next`. VLC: drive via HTTP `pl_next`.
3. Skip fillers in autoplay (optional setting, uses filler data) — "Skipping 3 filler episodes".
4. Settings: autoplay on/off, countdown length, stop after N episodes ("Are you still watching?").

### 2.2.c Per-series audio & subtitle preferences
1. Series setting: preferred audio language(s), subtitle language(s), "subtitles: always / only for foreign audio / never", preferred subtitle track name contains (e.g. "Full", not "Signs & Songs").
2. mpv: `--alang=jpn,ja --slang=eng,en`, and for the "Signs & Songs" case pick the track by title via IPC after load. VLC: `--audio-language`, `--sub-language` at launch.
3. Global defaults in Settings; series overrides; remember the user's in-player track change as the new series preference (ask once).

### 2.2.d Ultra-lean "Stealth Watcher" & background memory throttling (sub-50MB RAM)
**Problem today:** In Task Manager, Heimdall consumes ~270 MB RAM across 4 processes (Renderer: 133 MB, GPU: 72 MB, Main: 57 MB, Broker: 7 MB) while VLC decoding 1080p video uses only ~140–170 MB. Over 75% of Heimdall's RAM (205 MB) is consumed by the Chromium renderer DOM, Acrylic GPU textures, and continuous 1.5 s React tree re-allocations while sitting hidden behind the player. A background tracker should never consume more memory than the media player it is tracking.

1. **Auto-minimize / Tray stealth mode during playback:**
   - Setting: "Stealth playback mode" in Settings → Playback (*Minimize to taskbar* / *Hide to system tray* / *Keep open* — default: *Minimize to tray*).
   - When playback starts (`state === 'playing'`), automatically minimize or hide the Heimdall window.
   - On Windows, minimizing commands Chromium and DWM to immediately drop Direct3D swapchains and surface textures, shedding ~50–60 MB from the GPU process.
2. **Headless tracking & suspended renderer IPC:**
   - While the window is hidden or minimized, `SyncWorker` suspends all 1.5 s `vlc:progress-update` IPC broadcasts to the renderer.
   - All playback tracking (timestamp updates, completion threshold detection, AniList scrobbling, Discord Rich Presence) executes strictly within the lightweight Node.js main process runtime (~5 MB active state).
   - The Chromium renderer V8 engine completely idles, allowing Windows and Chromium's background memory compression ("Efficiency mode") to reclaim renderer heap.
3. **State reconciliation on restore:**
   - When the user clicks the tray icon / unminimizes, or when playback ends, Heimdall sends a single consolidated state update to the renderer to refresh watch status and episode positions.
4. **Auto-restore on episode finish:**
   - When the episode finishes (or VLC/mpv exits), automatically restore and focus the window, showing the scrobbled status and next episode ready to watch (or triggering the autoplay countdown card, 2.2.b).

---

## Phase 2.3 — Library & tracking features

### 2.3.a Home screen
Replaces the "No Series Selected" empty state as the default route.
1. **Continue Watching** (in-progress episodes/movies, sorted by last watched, with progress bars and "Resume at 14:32").
2. **Up Next** (next unwatched episode of each recently active series; skip fillers if the setting is on).
3. **Recently Added** (from folder watching).
4. **Airing soon** strip (from 2.3.c).
5. First-run onboarding: pick player, add first folder, connect AniList (optional) — 3 steps.

### 2.3.b Folder watching
1. `chokidar` on all library roots; `awaitWriteFinish` so half-downloaded files are ignored; ignore `.part`, `.!qB`, `.crdownload`.
2. Network/NAS drives: fall back to polling (configurable interval) — native watchers are unreliable on SMB/NFS.
3. New file → parse → attach to the right series/season → queue thumbnail + intro detection + metadata.
4. OS notification: "Episode 8 of Frieren is ready" → click opens/plays it. Batch notifications ("3 new episodes").
5. Removed files → mark `fileMissing` (existing field), don't delete watch history.

### 2.3.c Airing calendar
1. AniList GraphQL: `Media.nextAiringEpisode` + `airingSchedule` for all linked series (and the user's AniList "Watching/Planning" list if logged in).
2. Calendar view (week/month) + Home strip: "Ep 9 airs in 2 days · you're caught up" / "you're 3 behind".
3. TMDB TV `next_episode_to_air` for non-anime series.
4. Optional reminder notification when an episode airs (and again when the file shows up, via 2.3.b).

### 2.3.d Tracker framework: AniList, MyAnimeList, Simkl, Kitsu, Trakt
1. Interface `TrackerProvider { auth(), search(), getEntry(), updateProgress(), getList() }`; move existing AniList code behind it.
2. Providers:
   - **MyAnimeList** — OAuth2 with PKCE (register a client id), `PATCH /anime/{id}/my_list_status`.
   - **Kitsu** — OAuth2 password/PKCE, JSON:API.
   - **Simkl** — PIN/device auth (good for desktop), covers anime + TV + movies.
   - **Trakt** — device code auth, scrobble API for TV + movies.
3. ID mapping across services (AniList ↔ MAL ↔ Kitsu ↔ TMDB): use AniList's `idMal` plus a mapping dataset (e.g. the community `anime-lists` / Fribb mappings) cached locally.
4. **Two-way sync:** periodic pull of each tracker's list; conflict rule = highest progress wins, never decrease remote progress without asking; log every change in `tracker_sync_state` with an "undo".
5. Offline queue: progress updates queue up and flush when online.
6. Store tokens with Electron `safeStorage` (OS keychain), not plain JSON — migrate the existing `aniListToken` too.

### 2.3.e Cmd/Ctrl+K command palette
1. `cmdk` component. Indexes series, episodes, movies, and actions ("Rescan library", "Sync subtitles", "Switch to mpv", "Open settings: Remote").
2. Fuzzy search (local, fast); recent items first; keyboard-only flow (↑↓ ⏎, `Tab` for actions on a result like "Play", "Mark watched", "Fix match").

---

## Phase 2.4 — Stats & "Wrapped"

1. **Stats page** from `watch_events`: hours watched (week/month/year), streaks, most-watched series, genres, completion rate, fillers skipped, intros skipped (time saved!).
2. **"Wrapped"** (December + on demand): a sequence of 5–7 cards rendered in the renderer and exported as PNG (canvas / `html-to-image`) at 1080×1920 and 1200×630. Share = save image; no upload, stays local-first.
3. For years with no `watch_events` (pre-2.0), derive a rough version from `lastWatchedAt` + `completed` + durations and label it "estimated".

---

## Phase 2.5 — UI redesign

### 2.5.a Design tokens & themes
1. Define semantic tokens as CSS variables: `--bg`, `--surface-1/2/3`, `--border`, `--text`, `--text-muted`, `--accent`, `--accent-contrast`, `--danger`, `--success`, `--radius-*`, `--shadow-*`, `--blur`. Map Tailwind colours to them in `tailwind.config.js` (`bg-surface-1`, `text-muted`, …).
2. Replace hardcoded `zinc-*`, `#0c0d12`, `bifrost-amber` etc. with tokens (codemod + manual pass).
3. Themes become token sets on `[data-theme]`: **Dark (default, opaque)**, **OLED**, **Light**, **Liquid Glass** (translucent surfaces + blur; transparency only in this theme). Respect OS light/dark ("System" option).
4. Delete the `.theme-* .liquid-glass-*` override cascade in `index.css`.

### 2.5.b Typography & density
1. Type scale (e.g. 12 / 13 / 14 / 16 / 20 / 24 / 32 / 40), minimum 12px. One display face for headings (brand typeface from 2.1) + one UI face (system or Inter-like).
2. Spacing scale + 2 density modes (Comfortable / Compact) for large libraries.

### 2.5.c App shell & information architecture
1. Sidebar becomes **navigation only**: Home, Series, Movies, Calendar, Stats, (divider) Settings, Remote. Collapsible to icons.
2. **Library views** for Series and Movies: poster grid (virtualised with `react-virtuoso` / TanStack Virtual for 1,000+ items), filters (status, genre, airing, has-filler, unwatched), sort (recent, A–Z, added, progress), list/grid toggle.
3. **Series detail page**: hero (backdrop, synopsis, progress, Resume/Next), season tabs, episode list with filler badges, intro markers, sync status; secondary actions in an overflow menu (not 8 buttons in the hero).
4. One toast system (top-right, stacked, max 3, action buttons like "Undo").

### 2.5.d Settings page
Split the 1,141-line modal into a routed page with sections: **General · Playback (player, Anime4K, autoplay, skip) · Subtitles · Library (folders, watching, scanning) · Trackers · Remote · Appearance · Storage & Backups · Advanced · About**. Each section is its own component file.

**About section (in Settings, quiet and small — like most apps):** the product name in the window title, sidebar and installers carries **no version number**; the version appears only here as small muted text ("Version 1.5.0"), next to a **Check for updates** button, the **Stable / Beta channel** switch, a small **What's new** link (opens this version's release notes; also offered once after an update), and **Open-source licenses** (`THIRD_PARTY_NOTICES.md`: FFmpeg, alass, Chromaprint, Anime4K…). Installer *file names* keep the version (`Heimdall-Setup-1.5.0.exe`) because the updater and download links depend on it. Add a settings search box.

### 2.5.e Big-picture (TV) mode
1. Full-screen route `/big-picture`, 10-foot UI: large posters, 2–3 rows (Continue, Up Next, Library), high-contrast focus ring.
2. Spatial navigation with arrow keys/Enter/Back (`@noriginmedia/norigin-spatial-navigation` or a small custom focus manager).
3. **Gamepad API** support (D-pad, A/B) and the phone remote as a D-pad.
4. Launch from tray/menu or `--big-picture` CLI flag; option to start in big-picture.

### 2.5.f Phone remote v2 (`remoteServer.ts` → separate PWA bundle)
1. Move the inline HTML/JS string into its own Vite-built mini app (`src/remote/`), served as static files — testable, themable with the same tokens.
2. Real **service worker + manifest** so "Add to Home Screen" works offline-shell.
3. Controls: skip intro, autoplay countdown actions, audio/sub track pickers, D-pad mode for big-picture.
4. **Lock-screen controls (Media Session API) — spike first.** Browsers only show media-session controls while the page itself is playing media; the usual trick is a silent looping `<audio>`. Works on Android Chrome; iOS Safari is unreliable. Ship only if the spike works on both; otherwise document as Android-only.

---

## Phase 2.6 — Brand & landing relaunch

1. Apply the brand from 2.1 to app icon, installer graphics (NSIS sidebar, DMG background), Discord RPC assets, remote PWA icon, README header.
2. **Domain:** buy one; point Vercel at it; redirect the `*.vercel.app` URL.
3. **Landing rewrite** (copy first, then design):
   - Hero: the one-line positioning statement + **OS-detecting Download button** (`navigator.userAgentData` / UA fallback → Windows/macOS arm64/macOS Intel/Linux) + "Other platforms".
   - A **20–30 s real screen recording** (WebM/MP4, muted autoplay, poster frame) instead of the 1,237-line hand-built `InteractiveAppMockup.tsx`.
   - Sections by outcome: *Never lose your place* · *Subtitles that just line up* · *Skip intros and filler* · *Your library, your drive* · *Control it from your phone*.
   - "vs" section: Plex/Jellyfin (no server needed), Taiga (modern, cross-platform), plain VLC/mpv (remembers everything).
   - Honest FAQ: what's local, what talks to the internet (AniList/TMDB/OpenSubtitles/animefillerlist, GitHub for updates), unsigned-build notes if still unsigned.
   - Remove "Aerospace Command Bar / Cyber Grid Matrix" styling language from code comments and copy.
4. Launch: GitHub release notes, r/anime-adjacent and r/selfhosted posts (lead with skip-intro + subtitle sync demo GIFs), a short demo video.
5. Lightweight, privacy-respecting landing analytics (e.g. Plausible) — app itself stays telemetry-free; optionally an opt-in, anonymous "crash report" toggle.

---

## Cross-cutting: definition of done (every phase)
- Tests for new logic; CI green.
- Works with **both** players, or the UI hides what a player can't do.
- Works offline (degrades quietly).
- README/landing updated **only** after the feature is merged.
- No new claim without code behind it.

## Backlog (not scheduled)
- Anime4K: switch shaders during playback over mpv IPC (`change-list glsl-shaders set …`) instead of on the next launch (from 1.3.b).
- Subtitle sync: Preview before applying, "apply to whole season" with verification on the next episodes, piecewise offsets for cut/recap edits, run the search in a worker thread, sync against the audio track the player selected.
- Subtitle sync: build a small private benchmark of real clips and tune the verifier thresholds on it.

## Decisions

**Made**
1. Rename (if any) is bundled with **v2.0.0**; v1.5.x stays "Heimdall" (Phase 2.1). Version numbers keep counting across the rename.
2. macOS ships as **one universal DMG** (Phase 1.1.f).
3. Heimdall has **no outside users yet**: no bridge release, no public migration notices.
4. App name is shown **without a version**; version lives in small text under Settings → About (Phase 2.5.d).
5. Auto-updates via `electron-updater` (Phase 1.1.f).
6. **No code signing and no paid services** — hobby project (Phase 1.1.i). Prefer free options in every future decision.

**Still open**
2. Ship a built-in TMDB key or require users to supply one.
3. Whether v1.5.x should already start logging `watch_events` (recommended: yes).
4. Whether to turn on branch protection for `main` (require CI before merging) — Phase 1.1.e.
5. Mirror the pinned ffmpeg binaries as assets of a release in this repo, so builds never depend on third-party sites — Phase 1.1.c.
