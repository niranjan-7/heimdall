// Stand-in for alass-cli in tests. Same arguments: <reference> <subtitle> <output> [options].
// FAKE_ALASS=shift:<seconds>  moves every line by that many seconds
// FAKE_ALASS=fail             exits with an error
// FAKE_ALASS=drop             writes one line fewer than it was given
// FAKE_ALASS=reverse          writes the lines in reverse order (as alass may when times overlap)
// FAKE_ALASS=hang             never finishes
const fs = require('fs')

const mode = process.env.FAKE_ALASS || 'shift:0'
const [, , , subtitlePath, outPath] = process.argv

if (mode === 'fail') {
  console.error('fake alass: failing on purpose')
  process.exit(3)
}
if (mode === 'hang') setInterval(() => {}, 1000)
else {
  const shift = mode.startsWith('shift:') ? Number(mode.slice(6)) : 0
  const stamp = (t) => {
    const ms = Math.max(0, Math.round(t * 1000))
    const p = (n, w) => String(n).padStart(w, '0')
    return `${p(Math.floor(ms / 3600000), 2)}:${p(Math.floor((ms % 3600000) / 60000), 2)}:${p(Math.floor((ms % 60000) / 1000), 2)},${p(ms % 1000, 3)}`
  }
  const secs = (h, m, s, ms) => +h * 3600 + +m * 60 + +s + +ms / 1000
  const re = /(\d+):(\d+):(\d+),(\d+) --> (\d+):(\d+):(\d+),(\d+)/g
  let text = fs.readFileSync(subtitlePath, 'utf8')
  text = text.replace(
    re,
    (_m, a, b, c, d, e, f, g, h) =>
      `${stamp(secs(a, b, c, d) + shift)} --> ${stamp(secs(e, f, g, h) + shift)}`
  )
  if (mode === 'reverse') text = text.trimEnd().split('\n\n').reverse().join('\n\n') + '\n'
  if (mode === 'drop') text = text.trimEnd().split('\n\n').slice(0, -1).join('\n\n') + '\n'
  fs.writeFileSync(outPath, text)
}
