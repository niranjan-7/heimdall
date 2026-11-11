import { useEffect, useState } from 'react'
import { FALLBACK_VERSION, REPO } from './site'

/** Latest published release, falling back to a baked-in version if GitHub is unreachable. */
export function useLatestVersion(): string {
  const [version, setVersion] = useState(FALLBACK_VERSION)
  useEffect(() => {
    const controller = new AbortController()
    fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { tag_name?: string } | null) => {
        const tag = data?.tag_name?.replace(/^v/, '')
        if (tag && /^\d+\.\d+\.\d+/.test(tag)) setVersion(tag)
      })
      .catch(() => {})
    return () => controller.abort()
  }, [])
  return version
}
