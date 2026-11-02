// Release helper used by .github/workflows/release.yml (and by you, to preview a release).
//
//   node scripts/release-info.mjs v1.5.0                    check the tag, print the release notes
//   node scripts/release-info.mjs v1.5.0 --notes-out n.md   also write the notes to a file
//   node scripts/release-info.mjs --package                 no tag (branch build): print the version
//   node scripts/release-info.mjs --check-assets 1.5.0 names.txt
//                                                           fail if a release file is missing
//
// When GITHUB_OUTPUT is set (inside GitHub Actions) it also writes version / prerelease outputs.

import { appendFileSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const TAG_PATTERN = /^v(\d+\.\d+\.\d+)(-[0-9A-Za-z.-]+)?$/

/** "v1.5.0" -> { version: "1.5.0", base: "1.5.0", prerelease: false }; "v2.0.0-beta.1" -> prerelease. */
export function parseTag(tag) {
  const match = TAG_PATTERN.exec(tag)
  if (!match) {
    throw new Error(
      `"${tag}" is not a release tag. Use vX.Y.Z, or vX.Y.Z-beta.N for a pre-release.`
    )
  }
  return { version: match[1] + (match[2] ?? ''), base: match[1], prerelease: !!match[2] }
}

/** Text of the "## [version]" section of a Keep a Changelog file, or null if absent/empty. */
export function extractSection(changelog, version) {
  const lines = changelog.split(/\r?\n/)
  const heading = (line) => /^##\s+\[/.test(line)
  const start = lines.findIndex((line) => {
    const m = /^##\s+\[([^\]]+)\]/.exec(line)
    return m !== null && m[1] === version
  })
  if (start === -1) return null

  let end = lines.length
  for (let i = start + 1; i < lines.length; i++) {
    if (heading(lines[i])) {
      end = i
      break
    }
  }
  const body = lines
    .slice(start + 1, end)
    .join('\n')
    .trim()
  return body === '' ? null : body
}

/**
 * Validates a release and returns what the workflow needs.
 * `tag` may be omitted for branch builds, which only report the package version.
 */
export function buildReleaseInfo({ tag, packageVersion, changelog }) {
  if (!tag) return { version: packageVersion, prerelease: false, notes: '' }

  const parsed = parseTag(tag)
  if (parsed.version !== packageVersion) {
    throw new Error(
      `Tag ${tag} does not match package.json version ${packageVersion}.\n` +
        `Create releases with "npm version ${parsed.version}", which updates package.json and the tag together.`
    )
  }

  if (parsed.prerelease) {
    const notes =
      extractSection(changelog, parsed.version) ??
      extractSection(changelog, parsed.base) ??
      'Pre-release build for testing. Not for everyday use.'
    return { version: parsed.version, prerelease: true, notes }
  }

  const notes = extractSection(changelog, parsed.version)
  if (!notes) {
    throw new Error(
      `CHANGELOG.md has no "## [${parsed.version}]" section with content.\n` +
        `Move the entries from "## [Unreleased]" under a new "## [${parsed.version}] - <date>" heading.`
    )
  }
  return { version: parsed.version, prerelease: false, notes }
}

/** Files every release must contain (installers, update metadata and their block maps). */
export function expectedAssets(version) {
  return [
    `Heimdall-Setup-${version}.exe`,
    `Heimdall-Setup-${version}.exe.blockmap`,
    `Heimdall-${version}-mac-universal.dmg`,
    `Heimdall-${version}-mac-universal.dmg.blockmap`,
    `Heimdall-${version}-mac-universal.zip`,
    `Heimdall-${version}-mac-universal.zip.blockmap`,
    `Heimdall-${version}-linux-x86_64.AppImage`,
    `Heimdall-${version}-linux-amd64.deb`,
    `Heimdall-${version}-linux-x64.tar.gz`,
    'latest.yml',
    'latest-mac.yml',
    'latest-linux.yml'
  ]
}

export function missingAssets(version, names) {
  const present = new Set(names)
  return expectedAssets(version).filter((name) => !present.has(name))
}

function main(argv) {
  const packageVersion = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version

  if (argv[0] === '--check-assets') {
    const [, version, namesFile] = argv
    const names = readFileSync(namesFile, 'utf8').split(/\r?\n/).filter(Boolean)
    const missing = missingAssets(version, names)
    if (missing.length > 0) {
      throw new Error(
        `The release is missing ${missing.length} file(s):\n  ${missing.join('\n  ')}`
      )
    }
    console.log(`All ${expectedAssets(version).length} expected files are present.`)
    return
  }

  const tag = argv[0] === '--package' ? undefined : argv[0]
  if (argv[0] !== '--package' && !tag) throw new Error('Pass a tag (v1.5.0) or --package')

  const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8')
  const info = buildReleaseInfo({ tag, packageVersion, changelog })

  const outIndex = argv.indexOf('--notes-out')
  if (outIndex !== -1) writeFileSync(argv[outIndex + 1], info.notes + '\n')

  console.log(`version:    ${info.version}`)
  console.log(`pre-release: ${info.prerelease}`)
  if (info.notes) console.log(`\nRelease notes:\n${info.notes}`)

  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      `version=${info.version}\nprerelease=${info.prerelease}\n`
    )
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main(process.argv.slice(2))
  } catch (err) {
    console.error(`\n[release-info] ${err.message}`)
    process.exit(1)
  }
}
