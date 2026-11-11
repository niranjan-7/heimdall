export const REPO = 'niranjan-7/heimdall'
export const REPO_URL = `https://github.com/${REPO}`
export const RELEASES_URL = `${REPO_URL}/releases/latest`
export const FALLBACK_VERSION = '1.5.0'

export type Os = 'windows' | 'mac' | 'linux'

export const OS_LABEL: Record<Os, string> = {
  windows: 'Windows',
  mac: 'macOS',
  linux: 'Linux'
}

export function detectOs(): Os {
  if (typeof navigator === 'undefined') return 'windows'
  const ua = navigator.userAgent.toLowerCase()
  if (ua.includes('mac')) return 'mac'
  if (ua.includes('linux') && !ua.includes('android')) return 'linux'
  return 'windows'
}
