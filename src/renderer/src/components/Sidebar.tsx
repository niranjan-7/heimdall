import React from 'react'
import { Series } from '../../../shared/types'
import { Eye, FolderPlus, Settings as SettingsIcon, Film, Sparkles } from 'lucide-react'

interface SidebarProps {
  seriesList: Series[]
  activeSeriesId: string | null
  onSelectSeries: (seriesId: string) => void
  onAddSeries: () => void
  onOpenSettings: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({
  seriesList,
  activeSeriesId,
  onSelectSeries,
  onAddSeries,
  onOpenSettings
}) => {
  return (
    <aside className="w-72 h-screen flex flex-col bg-surface border-r border-surface-border select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-surface-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-bifrost-amber to-amber-700 flex items-center justify-center shadow-lg shadow-bifrost-amber/20 ring-1 ring-amber-400/30">
            <Eye className="w-6 h-6 text-zinc-950 font-bold stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-black tracking-wider text-zinc-100 uppercase">
                Heimdall
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-bifrost-amber/15 text-bifrost-amber border border-bifrost-amber/30">
                VLC
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">All-Seeing Media Tracker</p>
          </div>
        </div>

        {/* Add Series Button */}
        <button
          onClick={onAddSeries}
          className="mt-4 w-full py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-surface-border hover:border-bifrost-amber/40 transition-all flex items-center justify-center gap-2 group shadow-sm"
        >
          <FolderPlus className="w-4 h-4 text-bifrost-amber group-hover:scale-110 transition-transform" />
          <span className="text-xs font-semibold">Add Series Folder</span>
        </button>
      </div>

      {/* Series List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        <div className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase flex items-center justify-between">
          <span>Library ({seriesList.length})</span>
          {seriesList.length > 0 && <Sparkles className="w-3.5 h-3.5 text-zinc-600" />}
        </div>

        {seriesList.length === 0 ? (
          <div className="p-6 text-center text-zinc-500 space-y-2 mt-4">
            <Film className="w-8 h-8 mx-auto stroke-1 text-zinc-600" />
            <p className="text-xs">No series added yet.</p>
            <p className="text-[11px] text-zinc-600">
              Click &quot;Add Series Folder&quot; to import your anime or TV series.
            </p>
          </div>
        ) : (
          seriesList.map((series) => {
            const isSelected = series.id === activeSeriesId
            const totalEpisodes = series.episodes.length
            const completedEpisodes = series.episodes.filter((e) => e.completed).length
            const progressPercent =
              totalEpisodes > 0 ? Math.round((completedEpisodes / totalEpisodes) * 100) : 0

            return (
              <button
                key={series.id}
                onClick={() => onSelectSeries(series.id)}
                className={`w-full text-left p-3 rounded-xl transition-all relative overflow-hidden group ${
                  isSelected
                    ? 'bg-zinc-800/80 border border-bifrost-amber/40 shadow-md shadow-black/40'
                    : 'bg-zinc-900/40 hover:bg-zinc-900 border border-transparent hover:border-zinc-800'
                }`}
              >
                {isSelected && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-bifrost-amber to-amber-600" />
                )}
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`text-sm font-semibold truncate ${
                      isSelected ? 'text-zinc-100' : 'text-zinc-300 group-hover:text-zinc-100'
                    }`}
                    title={series.title}
                  >
                    {series.title}
                  </span>
                  <span className="text-[10px] font-mono shrink-0 px-1.5 py-0.5 rounded bg-zinc-950/70 border border-zinc-800 text-zinc-400">
                    {completedEpisodes}/{totalEpisodes}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mt-2.5 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800/60">
                    <div
                      className="h-full bg-gradient-to-r from-amber-600 to-bifrost-amber rounded-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-zinc-500 font-mono">
                    {progressPercent}%
                  </span>
                </div>
              </button>
            )
          })
        )}
      </div>

      {/* Footer / Settings Bar */}
      <div className="p-3 border-t border-surface-border bg-zinc-950/40">
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <SettingsIcon className="w-4 h-4 text-zinc-400" />
            <span className="text-xs font-medium">Settings</span>
          </div>
          <span className="text-[10px] text-zinc-600 font-mono">v1.0.0</span>
        </button>
      </div>
    </aside>
  )
}
