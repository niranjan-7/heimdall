#!/usr/bin/env node
// Downloads the third-party programs Heimdall bundles (currently ffmpeg) into
// resources/bin/<os>-<arch>/, checking each download against the SHA-256 pinned in
// scripts/binaries.lock.json. electron-builder then copies the matching folder into the app
// (see extraResources in electron-builder.yml).
//
//   node scripts/fetch-binaries.mjs --host                      this machine only
//   node scripts/fetch-binaries.mjs --target mac-x64 --target mac-arm64
//   node scripts/fetch-binaries.mjs --all
//
//   --force   download again even if the file is already there
//   --soft    print a warning instead of failing (used by `npm install`)

import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const lock = JSON.parse(readFileSync(join(root, 'scripts', 'binaries.lock.json'), 'utf8'))
const binDir = join(root, 'resources', 'bin')

const OS_NAMES = { win32: 'win', darwin: 'mac', linux: 'linux' }

function hostTarget() {
  const os = OS_NAMES[process.platform]
  return os ? `${os}-${process.arch}` : null
}

function parseArgs(argv) {
  const opts = { targets: [], all: false, host: false, force: false, soft: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--target') opts.targets.push(argv[++i])
    else if (arg === '--all') opts.all = true
    else if (arg === '--host') opts.host = true
    else if (arg === '--force') opts.force = true
    else if (arg === '--soft') opts.soft = true
    else throw new Error(`Unknown argument: ${arg}`)
  }
  return opts
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

function extractZipMember(zipPath, member, destDir) {
  // Windows ships bsdtar, which reads zip files; macOS and Linux runners have unzip.
  if (process.platform === 'win32') {
    execFileSync('tar', ['-xf', zipPath, '-C', destDir, member], { stdio: 'inherit' })
  } else {
    execFileSync('unzip', ['-o', '-q', zipPath, member, '-d', destDir], { stdio: 'inherit' })
  }
  return join(destDir, member)
}

async function fetchOne(name, target, entry, force) {
  const outDir = join(binDir, target)
  const outFile = join(outDir, entry.output)
  const stateFile = join(binDir, '.state', `${name}-${target}.json`)

  if (!force && existsSync(outFile) && existsSync(stateFile)) {
    const state = JSON.parse(readFileSync(stateFile, 'utf8'))
    if (state.sha256 === entry.sha256) {
      console.log(`  ok       ${name} ${target} (already downloaded)`)
      return
    }
  }

  console.log(`  fetch    ${name} ${target} ${entry.version}`)
  const res = await fetch(entry.url)
  if (!res.ok) throw new Error(`${entry.url} -> HTTP ${res.status}`)
  const archive = Buffer.from(await res.arrayBuffer())

  const actual = sha256(archive)
  if (actual !== entry.sha256) {
    throw new Error(
      `Checksum mismatch for ${name} ${target}\n  expected ${entry.sha256}\n  got      ${actual}\n  ${entry.url}`
    )
  }

  mkdirSync(outDir, { recursive: true })
  mkdirSync(dirname(stateFile), { recursive: true })
  const tmp = mkdtempSync(join(tmpdir(), 'heimdall-bin-'))
  try {
    let extracted
    if (entry.archive === 'gz') {
      extracted = join(tmp, entry.output)
      writeFileSync(extracted, gunzipSync(archive))
    } else if (entry.archive === 'zip') {
      const zipPath = join(tmp, 'archive.zip')
      writeFileSync(zipPath, archive)
      extracted = extractZipMember(zipPath, entry.member, tmp)
    } else {
      throw new Error(`Unsupported archive type: ${entry.archive}`)
    }
    chmodSync(extracted, 0o755)
    renameSync(extracted, outFile)
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }

  writeFileSync(stateFile, JSON.stringify({ sha256: entry.sha256, url: entry.url }, null, 2))
  console.log(`  done     ${outFile}`)
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))

  let wanted = [...opts.targets]
  if (opts.host) {
    const host = hostTarget()
    if (!host) throw new Error(`Unsupported platform: ${process.platform}-${process.arch}`)
    wanted.push(host)
  }

  const known = new Set()
  for (const program of Object.values(lock))
    for (const t of Object.keys(program.targets)) known.add(t)
  if (opts.all) wanted = [...known]
  if (wanted.length === 0)
    throw new Error('Nothing to do: pass --host, --all or --target <os-arch>')

  for (const target of wanted) {
    if (!known.has(target))
      throw new Error(`Unknown target "${target}". Known: ${[...known].join(', ')}`)
  }

  for (const [name, program] of Object.entries(lock)) {
    for (const target of new Set(wanted)) {
      const entry = program.targets[target]
      if (entry) await fetchOne(name, target, entry, opts.force)
    }
  }
}

const soft = process.argv.includes('--soft')
main().catch((err) => {
  if (soft) {
    console.warn(`\n[fetch-binaries] Skipped: ${err.message}`)
    console.warn(
      '[fetch-binaries] Run "npm run binaries" later; the app falls back to ffmpeg on PATH.'
    )
    return
  }
  console.error(`\n[fetch-binaries] ${err.message}`)
  process.exit(1)
})
