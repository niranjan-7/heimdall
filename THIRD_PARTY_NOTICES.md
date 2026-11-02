# Third-party notices

Heimdall itself is MIT licensed (see `LICENSE`). It bundles the following separate programs.
They are run as their own processes and are not linked into Heimdall.

## FFmpeg

Heimdall runs `ffmpeg` to extract subtitles, read file details and make thumbnails.

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
