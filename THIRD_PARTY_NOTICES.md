# Third-party notices

Heimdall itself is MIT licensed (see `LICENSE`). It bundles the following third-party files.

## FFmpeg

Heimdall runs `ffmpeg` as a separate process (it is not linked into Heimdall) to extract subtitles,
read file details and make thumbnails.

FFmpeg is licensed under the GNU General Public License. The bundled builds are GPL builds
(`--enable-gpl`); they contain no non-free components. They are unmodified third-party builds,
pinned by SHA-256 in `scripts/binaries.lock.json`:

| Platform | FFmpeg version | Built by |
| :--- | :--- | :--- |
| Windows x64 | 6.1.1 | [gyan.dev](https://www.gyan.dev/ffmpeg/builds/) |
| Linux x64 | 7.0.2 | [John Van Sickle](https://johnvansickle.com/ffmpeg/) |
| macOS (Apple Silicon and Intel) | 9.0.2 | [Martin Riedl](https://ffmpeg.martin-riedl.de/) |

- FFmpeg source code: <https://ffmpeg.org/download.html> (release tarballs for the versions above)
- gyan.dev builds: source commit is stated in the build's README; see the link above.
- Martin Riedl's build scripts: <https://git.martin-riedl.de/ffmpeg/build-script>
- GPL v3 text: <https://www.gnu.org/licenses/gpl-3.0.html>

To use your own ffmpeg instead, remove the bundled one and put `ffmpeg` on your PATH: Heimdall
falls back to the system `ffmpeg` when it cannot find the bundled file.

## alass

Subtitle auto-sync can use [alass](https://github.com/kaegi/alass) v2.0.0 by kaegi (Automatic
Language-Agnostic Subtitle Synchronization), released under the GNU General Public License v3.
Heimdall runs `alass-cli` as a separate process (it is not linked into Heimdall) and gives it
subtitle files only. The license text is in `resources/licenses/alass-LICENSE.txt` (packaged as
`licenses/alass-LICENSE.txt`).

- Windows x64 and Linux x64: the unmodified binaries from the v2.0.0 release, pinned by SHA-256 in
  `scripts/binaries.lock.json`.
- macOS (Apple Silicon and Intel): alass publishes no macOS binary, so it is compiled by
  `scripts/build-alass.mjs` from the unmodified source at commit
  `c438ff6344b24319e6804ed42cceb606d63961ea` (the v2.0.0 tag).
- Source code: <https://github.com/kaegi/alass/tree/v2.0.0>
- GPL v3 text: <https://www.gnu.org/licenses/gpl-3.0.html>

## Anime4K

The mpv video shaders in `resources/shaders/anime4k/` (packaged as `shaders/anime4k/`) are
unmodified files from [Anime4K](https://github.com/bloc97/Anime4K) v4.0.1 by bloc97, released
under the MIT License. The license text is in `resources/shaders/anime4k/LICENSE` and at the top
of each `.glsl` file. They are only loaded by mpv, and only when an Anime4K mode is chosen in
Settings.
