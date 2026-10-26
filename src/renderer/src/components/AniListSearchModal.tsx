import React, { useState } from 'react'
import { AniListMediaInfo, Series } from '../../../shared/types'
import { Search, Sparkles, X, Check, Film, ExternalLink } from 'lucide-react'

interface AniListSearchModalProps {
  isOpen: boolean
  series: Series
  onClose: () => void
  onLinked: (updatedSeries: Series) => void
}

export const AniListSearchModal: React.FC<AniListSearchModalProps> = ({
  isOpen,
  series,
  onClose,
  onLinked
}) => {
  const [query, setQuery] = useState(series.title)
  const [results, setResults] = useState<AniListMediaInfo[]>([])
  const [searching, setSearching] = useState(false)
  const [linkingId, setLinkingId] = useState<number | null>(null)

  if (!isOpen) return null

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!query.trim()) return

    setSearching(true)
    try {
      const data = await window.api.searchAniList(query)
      setResults(data)
    } finally {
      setSearching(false)
    }
  }

  const handleSelectMedia = async (media: AniListMediaInfo) => {
    setLinkingId(media.id)
    try {
      const updated = await window.api.linkAniListMedia(series.id, {
        id: media.id,
        title: media.title.english || media.title.romaji,
        coverImage: media.coverImage?.extraLarge || media.coverImage?.large,
        bannerImage: media.bannerImage
      })
      onLinked(updated)
      onClose()
    } finally {
      setLinkingId(null)
    }
  }

  const handleUnlink = async () => {
    const updated = await window.api.unlinkAniListMedia(series.id)
    onLinked(updated)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-surface-elevated border border-surface-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-bifrost-amber/15 text-bifrost-amber">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-100">Match with AniList</h3>
              <p className="text-xs text-zinc-400">
                Link this series for official cover art and auto-scrobbling
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

        {/* Search bar */}
        <form onSubmit={handleSearch} className="p-4 border-b border-surface-border bg-zinc-950/60">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search anime title on AniList..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-900 border border-surface-border rounded-xl text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-bifrost-amber"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="px-5 py-2 text-xs font-bold bg-bifrost-amber hover:bg-bifrost-glow text-zinc-950 rounded-xl transition-colors shadow-md disabled:opacity-50"
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>

        {/* Results list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {series.aniListId && (
            <div className="mb-4 p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
              <span className="text-xs text-zinc-400">
                Currently linked to ID: <span className="font-mono text-bifrost-amber font-bold">{series.aniListId}</span>
              </span>
              <button
                type="button"
                onClick={handleUnlink}
                className="text-xs text-red-400 hover:text-red-300 hover:underline"
              >
                Unlink Series
              </button>
            </div>
          )}

          {results.length === 0 && !searching && (
            <div className="p-8 text-center text-zinc-500 space-y-1">
              <Film className="w-8 h-8 mx-auto stroke-1 text-zinc-600 mb-2" />
              <p className="text-xs">Type a title and click &quot;Search&quot; to search AniList.</p>
            </div>
          )}

          {results.map((media) => {
            const isCurrentlyLinked = series.aniListId === media.id
            const displayTitle = media.title.english || media.title.romaji || 'Unknown Anime'

            return (
              <div
                key={media.id}
                className={`p-3 rounded-xl border flex items-center gap-3.5 transition-all ${
                  isCurrentlyLinked
                    ? 'bg-zinc-850 border-bifrost-amber/60'
                    : 'bg-zinc-900/60 border-surface-border hover:bg-zinc-850 hover:border-zinc-700'
                }`}
              >
                {media.coverImage?.large ? (
                  <img
                    src={media.coverImage.large}
                    alt={displayTitle}
                    className="w-12 h-16 object-cover rounded-lg shrink-0 border border-zinc-800"
                  />
                ) : (
                  <div className="w-12 h-16 bg-zinc-800 rounded-lg shrink-0 flex items-center justify-center">
                    <Film className="w-5 h-5 text-zinc-600" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-zinc-100 truncate">{displayTitle}</h4>
                  <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                    {media.seasonYear && <span>{media.seasonYear}</span>}
                    {media.format && <span>• {media.format}</span>}
                    {media.episodes && <span>• {media.episodes} Episodes</span>}
                    {media.status && <span>• {media.status}</span>}
                  </div>
                  {media.title.native && (
                    <p className="text-[11px] text-zinc-500 truncate mt-0.5">{media.title.native}</p>
                  )}
                </div>

                <div className="shrink-0">
                  {isCurrentlyLinked ? (
                    <span className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      Linked
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={linkingId === media.id}
                      onClick={() => handleSelectMedia(media)}
                      className="px-4 py-1.5 rounded-lg bg-bifrost-amber hover:bg-bifrost-glow text-zinc-950 font-bold text-xs transition-colors shadow-sm disabled:opacity-50"
                    >
                      {linkingId === media.id ? 'Linking...' : 'Select'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
