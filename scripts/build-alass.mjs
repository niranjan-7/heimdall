// Builds alass-cli from source for the platforms where its author publishes no binary (macOS).
// The source is fetched from the exact commit pinned in scripts/binaries.lock.json and compiled
// with cargo; the result goes to resources/bin/<os>-<arch>/ like every other bundled program.
//
//   node scripts/build-alass.mjs --host
//   node scripts/build-alass.mjs --target mac-arm64 --target mac-x64
//
//   --force   build again even if the file is already there
//
// Needs git and a Rust toolchain (https://rustup.rs). With both Apple targets installed
// (`rustup target add aarch64-apple-darwin x86_64-apple-darwin`) one Mac builds both.

import { execFileSync } from 'node:child_process'
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync
} from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const lock = JSON.parse(readFileSync(join(root, 'scripts', 'binaries.lock.json'), 'utf8'))
const binDir = join(root, 'resources', 'bin')
// Inside node_modules so it is ignored by git and easy to cache in CI.
const cacheDir = join(root, 'node_modules', '.cache', 'heimdall-alass')

const OS_NAMES = { win32: 'win', darwin: 'mac', linux: 'linux' }

function parseArgs(argv) {
  const opts = { targets: [], host: false, force: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--target') opts.targets.push(argv[++i])
    else if (arg === '--host') opts.host = true
    else if (arg === '--force') opts.force = true
    else throw new Error(`Unknown argument: ${arg}`)
  }
  return opts
}

function run(cmd, args, options = {}) {
  console.log(`  $ ${cmd} ${args.join(' ')}`)
  return execFileSync(cmd, args, { stdio: 'inherit', ...options })
}

/** Fetches exactly `commit` (shallow) into `dir` and checks it out. */
function checkoutSource(dir, repo, commit) {
  if (!existsSync(join(dir, '.git'))) {
    mkdirSync(dir, { recursive: true })
    run('git', ['init', '-q'], { cwd: dir })
    run('git', ['remote', 'add', 'origin', repo], { cwd: dir })
  }
  const head = () =>
    execFileSync('git', ['rev-parse', 'HEAD'], { cwd: dir, encoding: 'utf8' }).trim()
  try {
    if (head() === commit) return
  } catch {
    // nothing checked out yet
  }
  run('git', ['fetch', '-q', '--depth', '1', 'origin', commit], { cwd: dir })
  run('git', ['checkout', '-q', '--detach', 'FETCH_HEAD'], { cwd: dir })
  if (head() !== commit) throw new Error(`Fetched source is not commit ${commit}`)
}

function buildOne(target, entry, force) {
  const outDir = join(binDir, target)
  const outFile = join(outDir, entry.output)
  const stateFile = join(binDir, '.state', `alass-${target}.json`)
  const { repo, commit, rustTarget } = entry.build

  if (!force && existsSync(outFile) && existsSync(stateFile)) {
    const state = JSON.parse(readFileSync(stateFile, 'utf8'))
    if (state.commit === commit) {
      console.log(`  ok       alass ${target} (already built)`)
      return
    }
  }

  console.log(`  build    alass ${target} ${entry.version} (${commit.slice(0, 8)})`)
  const src = join(cacheDir, commit)
  checkoutSource(src, repo, commit)
  run('cargo', ['build', '--release', '--locked', '-p', 'alass-cli', '--target', rustTarget], {
    cwd: src
  })

  const built = join(src, 'target', rustTarget, 'release', 'alass-cli')
  if (!existsSync(built)) throw new Error(`cargo did not produce ${built}`)

  mkdirSync(outDir, { recursive: true })
  mkdirSync(dirname(stateFile), { recursive: true })
  const partial = `${outFile}.partial`
  copyFileSync(built, partial)
  chmodSync(partial, 0o755)
  renameSync(partial, outFile)
  writeFileSync(stateFile, JSON.stringify({ commit, rustTarget }, null, 2))
  console.log(`  done     ${outFile}`)
}

function main() {
  const opts = parseArgs(process.argv.slice(2))
  const targets = [...opts.targets]
  if (opts.host) {
    const os = OS_NAMES[process.platform]
    targets.push(`${os}-${process.arch}`)
  }
  if (targets.length === 0) throw new Error('Nothing to do: pass --host or --target <os-arch>')

  for (const target of new Set(targets)) {
    const entry = lock.alass.targets[target]
    if (!entry) throw new Error(`Unknown target "${target}"`)
    if (!entry.build) {
      console.log(`  skip     alass ${target} (a published binary is used: npm run binaries)`)
      continue
    }
    buildOne(target, entry, opts.force)
  }
}

try {
  main()
} catch (err) {
  console.error(`\n[build-alass] ${err.message}`)
  process.exit(1)
}
