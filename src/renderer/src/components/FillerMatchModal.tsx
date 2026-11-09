import React, { useEffect, useState } from 'react'
import { FillerShowOption, FillerShowPreview, Series } from '../../../shared/types'
import { BookOpen, Check, Search, Unlink, X } from 'lucide-react'

const safeDecode = (s: string): string => {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

interface FillerMatchModalProps {
  isOpen: boolean
  series: Series
  onClose: () => void
  onMatched: (updatedSeries: Series) => void
}

export const FillerMatchModal: React.FC<FillerMatchModalProps> = ({
  isOpen,
  series,
  onClose,
  onMatched
}) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FillerShowOption[]>([])
  const [searching, setSearching] = useState(false)
  const [searchedOnce, setSearchedOnce] = useState(false)
  const [selectedSlug, setSelectedSlug] = useState<string | null>(series.fillerSlug ?? null)
  const [preview, setPreview] = useState<FillerShowPreview | null>(null)
  const [previewState, setPreviewState] = useState<'idle' | 'loading' | 'unavailable'>('idle')
  const [offset, setOffset] = useState<string>(String(series.fillerEpisodeOffset ?? 0))
  const [saving, setSaving] = useState(false)

  const runSearch = async (q: string): Promise<void> => {
    setSearching(true)
    try {
      setResults(await window.api.searchFillerShows(series.id, q))
    } catch {
      setResults([])
    } finally {
      setSearching(false)
      setSearchedOnce(true)
    }
  }

  useEffect(() => {
    if (!isOpen) return
    setSelectedSlug(series.fillerSlug ?? null)
    setOffset(String(series.fillerEpisodeOffset ?? 0))
    setQuery('')
    runSearch('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, series.id])

  useEffect(() => {
    if (!isOpen || !selectedSlug) {
      setPreview(null)
      setPreviewState('idle')
      return
    }
    let cancelled = false
    setPreviewState('loading')
    window.api
      .previewFillerShow(selectedSlug)
      .then((p) => {
        if (cancelled) return
        setPreview(p)
        setPreviewState(p ? 'idle' : 'unavailable')
      })
      .catch(() => {
        if (!cancelled) setPreviewState('unavailable')
      })
    return () => {
      cancelled = true
    }
  }, [isOpen, selectedSlug])

  if (!isOpen) return null

  const parsedOffset = Number.isFinite(parseInt(offset, 10)) ? parseInt(offset, 10) : 0
  const localNumbers = series.episodes
    .map((e) => e.episodeNumber)
    .filter((n): n is number => typeof n === 'number')
  const firstLocal = localNumbers.length > 0 ? Math.min(...localNumbers) : 1

  const save = async (slug: string | null): Promise<void> => {
    setSaving(true)
    try {
      const updated = await window.api.setFillerMatch(series.id, {
        slug,
        episodeOffset: slug ? parsedOffset : 0
      })
      if (updated) onMatched(updated)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const selectedTitle =
    results.find((r) => r.slug === selectedSlug)?.title ??
    (selectedSlug === series.fillerSlug ? series.fillerSlug : selectedSlug)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl liquid-glass border border-white/10 shadow-2xl overflow-hidden backdrop-blur-2xl">
        {/* Header */}
        <div className="p-5 border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/15 text-rose-300">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-100">Fix filler match</h3>
              <p className="text-xs text-zinc-400 truncate max-w-md">
                {series.fillerSlug ? (
                  <>
                    Linked to <span className="font-mono text-zinc-300">{series.fillerSlug}</span>
                    {series.fillerMatchSource === 'auto'
                      ? ' (picked automatically)'
                      : ' (picked by you)'}
                  </>
                ) : series.fillerMatchSource === 'manual' ? (
                  'Filler guide unlinked'
                ) : (
                  'No filler guide linked yet'
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            runSearch(query.trim())
          }}
          className="p-4 border-b border-surface-border bg-zinc-950/60 flex gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search AnimeFillerList shows..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-900 border border-surface-border rounded-xl text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-rose-400"
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="px-5 py-2 text-xs font-bold bg-bifrost-amber hover:bg-bifrost-glow text-zinc-950 rounded-xl transition-colors shadow-md disabled:opacity-50"
          >
            {searching ? 'Searching...' : 'Search'}
          </button>
        </form>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {searchedOnce && !searching && results.length === 0 && (
            <div className="p-8 text-center text-zinc-500 text-xs">
              {query.trim() ? 'No shows found.' : 'Filler data unavailable right now.'}
            </div>
          )}
          {results.map((r) => {
            const isSelected = r.slug === selectedSlug
            const isCurrent = r.slug === series.fillerSlug
            return (
              <button
                type="button"
                key={r.slug}
                onClick={() => setSelectedSlug(r.slug)}
                className={`w-full text-left p-3 rounded-xl border flex items-center gap-3 transition-all ${
                  isSelected
                    ? 'bg-zinc-850 border-rose-400/60'
                    : 'bg-zinc-900/60 border-surface-border hover:bg-zinc-850 hover:border-zinc-700'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-zinc-100 truncate">{r.title}</div>
                  <div className="text-[11px] text-zinc-500 font-mono truncate">
                    {safeDecode(r.slug)}
                  </div>
                </div>
                {typeof r.score === 'number' && (
                  <span className="text-[10px] font-mono text-zinc-400">
                    {Math.round(r.score * 100)}%
                  </span>
                )}
                {isCurrent && (
                  <span className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Current
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Selected show preview + offset */}
        <div className="p-4 border-t border-surface-border bg-zinc-950/60 space-y-3">
          {selectedSlug ? (
            <div className="text-xs text-zinc-300">
              <span className="font-semibold text-zinc-100">{selectedTitle}</span>
              {' — '}
              {previewState === 'loading' && (
                <span className="text-zinc-500">loading episode list…</span>
              )}
              {previewState === 'unavailable' && (
                <span className="text-zinc-500">filler data unavailable</span>
              )}
              {previewState === 'idle' && preview && (
                <span>
                  {preview.totalEpisodes} episodes, {preview.fillerCount} filler (
                  {preview.fillerPercentage}%), {preview.mixedCanonCount} mixed
                </span>
              )}
            </div>
          ) : (
            <div className="text-xs text-zinc-500">Pick a show above.</div>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-xs text-zinc-300 flex items-center gap-2">
              Episode offset
              <input
                type="number"
                value={offset}
                onChange={(e) => setOffset(e.target.value)}
                className="w-20 px-2 py-1 text-xs bg-zinc-900 border border-surface-border rounded-lg text-zinc-200 focus:outline-none focus:border-rose-400"
              />
            </label>
            <span className="text-[11px] text-zinc-500">
              Your episode {firstLocal} → list episode {firstLocal + parsedOffset}. Use this when
              files are numbered per season but the list counts from the first season.
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            {series.fillerSlug ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => save(null)}
                className="px-3 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-red-950/60 text-zinc-300 hover:text-red-300 border border-zinc-700/60 text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Unlink className="w-3.5 h-3.5" />
                Unlink
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              disabled={saving || !selectedSlug}
              onClick={() => save(selectedSlug)}
              className="px-5 py-1.5 rounded-lg bg-bifrost-amber hover:bg-bifrost-glow text-zinc-950 font-bold text-xs transition-colors shadow-sm disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
