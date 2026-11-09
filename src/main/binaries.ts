import { existsSync } from 'fs'
import { join } from 'path'

export type BundledBinary = 'ffmpeg' | 'alass-cli'

interface ResolveOptions {
  platform: NodeJS.Platform
  arch: string
  /** `process.resourcesPath` — only defined inside Electron. */
  resourcesPath?: string
  /** `process.defaultApp` — true when running unpackaged via the electron CLI. */
  defaultApp?: boolean
  /** Project root, used when running unpackaged. */
  projectRoot: string
  exists: (path: string) => boolean
}

const OS_NAMES: Partial<Record<NodeJS.Platform, string>> = {
  win32: 'win',
  darwin: 'mac',
  linux: 'linux'
}

function bundledCandidate(name: BundledBinary, opts: ResolveOptions): string {
  const exe = opts.platform === 'win32' ? `${name}.exe` : name
  const packaged = !!opts.resourcesPath && !opts.defaultApp

  return packaged
    ? join(opts.resourcesPath as string, 'bin', exe)
    : join(opts.projectRoot, 'resources', 'bin', `${OS_NAMES[opts.platform]}-${opts.arch}`, exe)
}

/**
 * Finds a program bundled with the app, or null if this build doesn't have it. Packaged builds
 * carry it in `<resources>/bin` (copied there by electron-builder); during development it comes
 * from `resources/bin/<os>-<arch>` (see scripts/fetch-binaries.mjs).
 */
export function findBundledBinary(name: BundledBinary, opts: ResolveOptions): string | null {
  const candidate = bundledCandidate(name, opts)
  return opts.exists(candidate) ? candidate : null
}

/**
 * Like `findBundledBinary`, but if the program isn't bundled returns the bare name so the system
 * PATH is used instead.
 */
export function resolveBinaryPath(name: BundledBinary, opts: ResolveOptions): string {
  return findBundledBinary(name, opts) ?? name
}

function currentOptions(): ResolveOptions {
  const proc = process as NodeJS.Process & { resourcesPath?: string; defaultApp?: boolean }
  return {
    platform: process.platform,
    arch: process.arch,
    resourcesPath: proc.resourcesPath,
    defaultApp: proc.defaultApp,
    // out/main/index.js (built) and src/main/*.ts (tests) are both two levels below the root.
    projectRoot: join(__dirname, '..', '..'),
    exists: existsSync
  }
}

/** The bundled program for this machine, or null (used for optional programs such as alass). */
export function getBundledBinary(name: BundledBinary): string | null {
  return findBundledBinary(name, currentOptions())
}

export function getBinaryPath(name: BundledBinary): string {
  return resolveBinaryPath(name, currentOptions())
}
