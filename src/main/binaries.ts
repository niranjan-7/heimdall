import { existsSync } from 'fs'
import { join } from 'path'

export type BundledBinary = 'ffmpeg'

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

/**
 * Finds a program bundled with the app. Packaged builds carry it in `<resources>/bin`
 * (copied there by electron-builder); during development it comes from
 * `resources/bin/<os>-<arch>` (see scripts/fetch-binaries.mjs). If it isn't found, returns the
 * bare name so the system PATH is used instead.
 */
export function resolveBinaryPath(name: BundledBinary, opts: ResolveOptions): string {
  const exe = opts.platform === 'win32' ? `${name}.exe` : name
  const packaged = !!opts.resourcesPath && !opts.defaultApp

  const candidate = packaged
    ? join(opts.resourcesPath as string, 'bin', exe)
    : join(opts.projectRoot, 'resources', 'bin', `${OS_NAMES[opts.platform]}-${opts.arch}`, exe)

  return opts.exists(candidate) ? candidate : name
}

export function getBinaryPath(name: BundledBinary): string {
  const proc = process as NodeJS.Process & { resourcesPath?: string; defaultApp?: boolean }
  return resolveBinaryPath(name, {
    platform: process.platform,
    arch: process.arch,
    resourcesPath: proc.resourcesPath,
    defaultApp: proc.defaultApp,
    // out/main/index.js (built) and src/main/*.ts (tests) are both two levels below the root.
    projectRoot: join(__dirname, '..', '..'),
    exists: existsSync
  })
}
