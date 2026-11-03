import { describe, expect, it } from 'vitest'
import { join } from 'path'
import {
  ANIME4K_SHADER_FILES,
  buildVideoQualityArgs,
  normalizePreset,
  parseMpvVersion,
  qualityProfile,
  shaderFilesFor,
  shadersAvailable
} from '../src/main/player/anime4k'

const bundledDir = join(__dirname, '..', 'resources', 'shaders', 'anime4k')

describe('Anime4K shader chains', () => {
  it('bundles every shader file a preset can use', () => {
    expect(shadersAvailable(bundledDir)).toBe(true)
  })

  it('uses the official Mode A (HQ) chain', () => {
    expect(shaderFilesFor('anime4k_a', 'high')).toEqual([
      'Anime4K_Clamp_Highlights.glsl',
      'Anime4K_Restore_CNN_VL.glsl',
      'Anime4K_Upscale_CNN_x2_VL.glsl',
      'Anime4K_AutoDownscalePre_x2.glsl',
      'Anime4K_AutoDownscalePre_x4.glsl',
      'Anime4K_Upscale_CNN_x2_M.glsl'
    ])
  })

  it('uses smaller shaders for weaker GPUs', () => {
    const low = shaderFilesFor('anime4k_c', 'low')
    expect(low).toContain('Anime4K_Upscale_Denoise_CNN_x2_M.glsl')
    expect(low.some((f) => f.includes('_VL'))).toBe(false)
  })

  it('uses no shaders for the non-Anime4K presets', () => {
    expect(shaderFilesFor('hq_lanczos')).toEqual([])
    expect(shaderFilesFor('fast')).toEqual([])
  })

  it('lists 12 distinct bundled files', () => {
    expect(ANIME4K_SHADER_FILES).toHaveLength(12)
  })
})

describe('mpv version and profile', () => {
  it('reads release and git versions', () => {
    expect(
      parseMpvVersion('mpv 0.38.0 Copyright © 2000-2024 mpv/MPlayer/mplayer2 projects')
    ).toEqual([0, 38])
    expect(parseMpvVersion('mpv v0.36.0-512-gabc Copyright')).toEqual([0, 36])
    expect(parseMpvVersion('not mpv')).toBeNull()
  })

  it('uses high-quality from 0.37, gpu-hq before, and nothing when unknown', () => {
    expect(qualityProfile([0, 37])).toBe('high-quality')
    expect(qualityProfile([1, 0])).toBe('high-quality')
    expect(qualityProfile([0, 36])).toBe('gpu-hq')
    expect(qualityProfile(null)).toBeNull()
  })
})

describe('buildVideoQualityArgs', () => {
  it('appends each shader as its own option, in order', () => {
    const args = buildVideoQualityArgs({
      preset: 'anime4k_b',
      gpu: 'high',
      shaderDir: '/shaders',
      mpvVersion: [0, 38]
    })
    expect(args[0]).toBe('--profile=high-quality')
    const shaders = args.filter((a) => a.startsWith('--glsl-shaders-append='))
    expect(shaders).toHaveLength(6)
    expect(shaders[1]).toBe(
      `--glsl-shaders-append=${join('/shaders', 'Anime4K_Restore_CNN_Soft_VL.glsl')}`
    )
  })

  it('keeps HQ scaling without shaders', () => {
    const args = buildVideoQualityArgs({
      preset: 'hq_lanczos',
      shaderDir: '/s',
      mpvVersion: [0, 35]
    })
    expect(args).toContain('--profile=gpu-hq')
    expect(args).toContain('--scale=ewa_lanczossharp')
    expect(args.some((a) => a.includes('glsl'))).toBe(false)
  })

  it('uses the fast profile for low power', () => {
    expect(buildVideoQualityArgs({ preset: 'fast', shaderDir: '/s', mpvVersion: null })).toEqual([
      '--hwdec=auto-safe',
      '--profile=fast'
    ])
  })
})

describe('normalizePreset', () => {
  it('moves the old shader-less "anime4k" value to Mode A', () => {
    expect(normalizePreset('anime4k')).toBe('anime4k_a')
  })

  it('keeps valid values and defaults the rest', () => {
    expect(normalizePreset('anime4k_c')).toBe('anime4k_c')
    expect(normalizePreset('fast')).toBe('fast')
    expect(normalizePreset(undefined)).toBe('hq_lanczos')
    expect(normalizePreset('bogus')).toBe('hq_lanczos')
  })
})
