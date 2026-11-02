# Releasing Heimdall

A release is made by **pushing a tag**. GitHub Actions then builds every installer on clean machines and
puts them in a **draft** release. Nothing is public until you click **Publish release**.

```
you                         GitHub Actions                                    you
───                         ──────────────                                    ───
merge a "release" PR   ──▶  check tag = package.json = CHANGELOG
push tag v1.5.0              run tests
                             build Windows · macOS · Linux (in parallel)
                             upload everything to a DRAFT release
                             add SHA256SUMS.txt, check no file is missing  ──▶  open the draft,
                                                                               try the installers,
                                                                               click Publish
```

Every file in a release is built from exactly the tagged commit, so it always matches the source code.

## Version numbers

`MAJOR.MINOR.PATCH` ([semver](https://semver.org/)):

| Change | Example | Bump |
| :--- | :--- | :--- |
| Bug fixes only | 1.5.0 → 1.5.1 | patch |
| New features | 1.5.1 → 1.6.0 | minor |
| Big or breaking change | 1.6.0 → 2.0.0 | major |
| Test build | `1.5.0-rc.1`, `2.0.0-beta.1` | add `-rc.N` / `-beta.N` |

A tag with a `-` in it becomes a **pre-release** automatically. The app's stable update check ignores
pre-releases.

## Making a release

1. **Start a branch** from an up-to-date `main`:
   ```bash
   git switch main && git pull
   git switch -c release-1.5.0
   ```
2. **Write the changelog.** In `CHANGELOG.md`, move everything under `## [Unreleased]` into a new
   `## [1.5.0] - 2026-11-20` section (keep an empty `## [Unreleased]` above it). This text becomes the release
   notes, so write it for users.
3. **Set the version** without creating a tag yet:
   ```bash
   npm version 1.5.0 --no-git-tag-version
   ```
4. **Preview** what the release workflow will check (this should print your notes, not an error):
   ```bash
   node scripts/release-info.mjs v1.5.0
   ```
5. **Commit, push, open a PR, wait for green checks, squash-merge.**
   ```bash
   git commit -am "chore(release): v1.5.0" && git push -u origin release-1.5.0
   ```
6. **Tag the merged commit** (after the merge, on `main`) and push the tag:
   ```bash
   git switch main && git pull
   git tag v1.5.0
   git push origin v1.5.0
   ```
   Tag *after* merging: a squash merge creates a new commit, and the tag must point at that one.
7. **Watch it** in the repository's **Actions** tab (about 10–15 minutes). The `Release` workflow has five
   steps: *Check version*, *Tests*, *Create draft release*, *Build* (three at once), *Add checksums and verify*.
8. **Open the draft** under **Releases**, try the installers (checklist below), then click **Publish release**.

## Trying a release first (recommended for the first time)

A release candidate goes through the same pipeline but is marked **pre-release**. Do it from your branch,
before merging anything:

```bash
npm version 1.5.0-rc.1 --no-git-tag-version
git commit -am "chore: 1.5.0-rc.1" && git push
git tag v1.5.0-rc.1 && git push origin v1.5.0-rc.1
```

When you are done, delete it completely (the draft **and** the tag):

```bash
gh release delete v1.5.0-rc.1 --cleanup-tag --yes
```

You can also run the **Release** workflow by hand from the Actions tab (**Run workflow**). That builds every
installer and keeps them as downloadable workflow artifacts for 3 days, without creating a release. The same
build runs on any pull request that changes packaging (`electron-builder.yml`, the ffmpeg scripts, or the
workflow itself).

## Checking the draft before publishing

The draft should contain these files (the workflow fails if one is missing):

- `Heimdall-Setup-<version>.exe` (Windows installer)
- `Heimdall-<version>-mac-universal.dmg` and `.zip` (macOS, Apple Silicon and Intel)
- `Heimdall-<version>-linux-x86_64.AppImage`, `…-linux-amd64.deb`, `…-linux-x64.tar.gz`
- `latest.yml`, `latest-mac.yml`, `latest-linux.yml` and the `.blockmap` files (used by auto-update)
- `SHA256SUMS.txt`

Then try it:

- **Windows:** install it over the previous version. Open the app, play an episode in VLC and in mpv, open
  Settings.
- **macOS:** open the DMG, drag the app to Applications, open it (see "Unsigned builds" below).
- **Linux:** `chmod +x` the AppImage and run it.
- Compare a download with `SHA256SUMS.txt`: `shasum -a 256 <file>` (macOS/Linux) or
  `Get-FileHash <file>` (Windows).

## If something goes wrong

| Problem | What to do |
| :--- | :--- |
| *Check version* fails | The message says what to fix: the tag does not match `package.json`, or `CHANGELOG.md` has no section for that version. Delete the tag (`git push origin :refs/tags/v1.5.0` and `git tag -d v1.5.0`), fix, tag again. |
| One build fails | Open the failed job's log. After fixing, push the fix and either delete and re-push the tag, or use **Re-run failed jobs**. |
| The draft is wrong | `gh release delete v1.5.0 --cleanup-tag --yes`, fix, tag again. |
| Already published a bad release | Publish a fixed patch release (`1.5.1`). Do not reuse a version number. |

## Unsigned builds

The installers are not code-signed yet (signing needs paid certificates), so:

- **Windows** shows a SmartScreen warning: *More info → Run anyway*.
- **macOS** may say the app is damaged or from an unidentified developer. Right-click → *Open*, or run:
  ```bash
  xattr -dr com.apple.quarantine /Applications/Heimdall.app
  ```
- macOS cannot install updates by itself while unsigned. The app shows the new version and opens the download.
- When certificates exist, add them as repository secrets (`CSC_LINK`, `CSC_KEY_PASSWORD`, and the Apple ones),
  never in the code.
