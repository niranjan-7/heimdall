import { existsSync } from 'fs'
import { join } from 'path'
import { Anime4KGpu, Anime4KPreset } from '../../shared/types'

type Anime4KMode = 'a' | 'b' | 'c'

/**
 * Shader chains from the official Anime4K v4.0 mpv templates (md/Template/GLSL_*). Mode A suits
 * most 1080p anime, B is softer for blurry sources, C denoises low-quality sources.
 * The files live in resources/shaders/anime4k (MIT, see the LICENSE file there).
 */
const CHAINS: Record<Anime4KGpu, Record<Anime4KMode, string[]>> = {
  high: {
    a: [
      'Clamp_Highlights',
      'Restore_CNN_VL',
      'Upscale_CNN_x2_VL',
      'AutoDownscalePre_x2',
      'AutoDownscalePre_x4',
      'Upscale_CNN_x2_M'
    ],
    b: [
      'Clamp_Highlights',
      'Restore_CNN_Soft_VL',
      'Upscale_CNN_x2_VL',
      'AutoDownscalePre_x2',
      'AutoDownscalePre_x4',
      'Upscale_CNN_x2_M'
    ],
    c: [
      'Clamp_Highlights',
      'Upscale_Denoise_CNN_x2_VL',
      'AutoDownscalePre_x2',
      'AutoDownscalePre_x4',
      'Upscale_CNN_x2_M'
    ]
  },
  low: {
    a: [
      'Clamp_Highlights',
      'Restore_CNN_M',
      'Upscale_CNN_x2_M',
      'AutoDownscalePre_x2',
      'AutoDownscalePre_x4',
      'Upscale_CNN_x2_S'
    ],
    b: [
      'Clamp_Highlights',
      'Restore_CNN_Soft_M',
      'Upscale_CNN_x2_M',
      'AutoDownscalePre_x2',
      'AutoDownscalePre_x4',
      'Upscale_CNN_x2_S'
    ],
    c: [
      'Clamp_Highlights',
      'Upscale_Denoise_CNN_x2_M',
      'AutoDownscalePre_x2',
      'AutoDownscalePre_x4',
      'Upscale_CNN_x2_S'
    ]
  }
}

const MODE_OF: Partial<Record<Anime4KPreset, Anime4KMode>> = {
  anime4k_a: 'a',
  anime4k_b: 'b',
  anime4k_c: 'c'
}

/** Every shader file name any preset uses (the bundled set). */
export const ANIME4K_SHADER_FILES: string[] = [
  ...new Set(
    Object.values(CHAINS).flatMap((modes) =>
      Object.values(modes).flatMap((chain) => chain.map((s) => `Anime4K_${s}.glsl`))
    )
  )
].sort()

/** Shader files for a preset, in order; empty for presets that use no shaders. */
export function shaderFilesFor(preset: Anime4KPreset, gpu: Anime4KGpu = 'high'): string[] {
  const mode = MODE_OF[preset]
  if (!mode) return []
  return CHAINS[gpu][mode].map((s) => `Anime4K_${s}.glsl`)
}

/** Reads "mpv 0.38.0" / "mpv v0.37.0-..." from `mpv --version` output. */
export function parseMpvVersion(output: string): [number, number] | null {
  const m = /\bmpv v?(\d+)\.(\d+)/.exec(output)
  return m ? [Number(m[1]), Number(m[2])] : null
}

/**
 * mpv 0.37 renamed the "gpu-hq" profile to "high-quality" (the old name is deprecated). When the
 * version is unknown we skip the profile and rely on the explicit scaler options below.
 */
export function qualityProfile(version: [number, number] | null): string | null {
  if (!version) return null
  const [major, minor] = version
  return major > 0 || minor >= 37 ? 'high-quality' : 'gpu-hq'
}

interface VideoQualityOptions {
  preset: Anime4KPreset
  gpu?: Anime4KGpu
  shaderDir: string
  mpvVersion: [number, number] | null
}

/** mpv arguments for the "Video quality" setting. */
export function buildVideoQualityArgs(opts: VideoQualityOptions): string[] {
  if (opts.preset === 'fast') {
    return ['--hwdec=auto-safe', '--profile=fast']
  }

  const args: string[] = []
  const profile = qualityProfile(opts.mpvVersion)
  if (profile) args.push(`--profile=${profile}`)
  args.push(
    '--scale=ewa_lanczossharp',
    '--cscale=ewa_lanczossharp',
    '--dscale=mitchell',
    '--correct-downscaling=yes',
    '--linear-downscaling=yes',
    '--hwdec=auto-safe'
  )

  // One option per file avoids the list separator, which differs between Windows (;) and others (:).
  for (const file of shaderFilesFor(opts.preset, opts.gpu)) {
    args.push(`--glsl-shaders-append=${join(opts.shaderDir, file)}`)
  }
  return args
}

/** Old settings files stored 'anime4k', which used to apply no shaders at all. */
export function normalizePreset(preset: string | undefined): Anime4KPreset {
  switch (preset) {
    case 'anime4k':
      return 'anime4k_a'
    case 'anime4k_a':
    case 'anime4k_b':
    case 'anime4k_c':
    case 'fast':
      return preset
    default:
      return 'hq_lanczos'
  }
}

/** Packaged: `<resources>/shaders/anime4k`; unpackaged: `resources/shaders/anime4k` in the repo. */
export function getShaderDir(): string {
  const proc = process as NodeJS.Process & { resourcesPath?: string; defaultApp?: boolean }
  const packaged = !!proc.resourcesPath && !proc.defaultApp
  const dir = packaged
    ? join(proc.resourcesPath as string, 'shaders', 'anime4k')
    : join(__dirname, '..', '..', 'resources', 'shaders', 'anime4k')
  return dir
}

export function shadersAvailable(dir: string): boolean {
  return ANIME4K_SHADER_FILES.every((f) => existsSync(join(dir, f)))
}
