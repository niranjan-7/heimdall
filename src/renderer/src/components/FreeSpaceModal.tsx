import React, { useState } from 'react'
import { FreeSpacePreview } from '../../../shared/types'
import { Trash2, X, HardDrive, ShieldCheck, Archive } from 'lucide-react'

interface FreeSpaceModalProps {
  isOpen: boolean
  onClose: () => void
  seriesId: string
  seriesTitle: string
  preview: FreeSpacePreview | null
  onSuccess: () => void
}

export const FreeSpaceModal: React.FC<FreeSpaceModalProps> = ({
  isOpen,
  onClose,
  seriesId,
  seriesTitle,
  preview,
  onSuccess
}) => {
  const [deleting, setDeleting] = useState(false)

  if (!isOpen || !preview) return null

  const isFiller = preview.type === 'fillers'

  const handleConfirmDelete = async (): Promise<void> => {
    if (deleting || !preview || preview.episodeIds.length === 0) return
    setDeleting(true)
    try {
      const res = await window.api.deleteEpisodesFromDisk(seriesId, preview.episodeIds)
      if (res.success) {
        onSuccess()
        onClose()
      }
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md liquid-glass border border-surface-border rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-surface-border">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl ${
                isFiller
                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              }`}
            >
              {isFiller ? <Trash2 className="w-5 h-5" /> : <HardDrive className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-100">
                {isFiller ? 'Delete Complete Fillers' : 'Free Watched Space'}
              </h3>
              <p className="text-xs text-zinc-400 truncate max-w-[240px]">{seriesTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Highlight metrics banner */}
          <div
            className={`p-4 rounded-xl border flex items-center justify-between ${
              isFiller
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
            }`}
          >
            <div>
              <span className="text-[11px] uppercase tracking-wider font-bold opacity-80 block">
                {isFiller ? 'Filler Episodes' : 'Watched Episodes'}
              </span>
              <span className="text-2xl font-black">{preview.count} files</span>
            </div>
            <div className="text-right">
              <span className="text-[11px] uppercase tracking-wider font-bold opacity-80 block">
                Space to Reclaim
              </span>
              <span className="text-2xl font-black font-mono">~{preview.totalFormatted}</span>
            </div>
          </div>

          <p className="text-xs text-zinc-300 leading-relaxed">
            {isFiller ? (
              <>
                You are about to delete <strong>{preview.count} non-manga filler episodes</strong> from{' '}
                <span className="text-rose-300 font-semibold">{seriesTitle}</span>. This will immediately free up{' '}
                <span className="font-mono font-bold text-zinc-100">{preview.totalFormatted}</span> of disk space.
              </>
            ) : (
              <>
                You are about to delete video files for <strong>{preview.count} completed episodes</strong> from{' '}
                <span className="text-amber-300 font-semibold">{seriesTitle}</span>. Your watch history, checkmarks,
                and timestamps in Heimdall will remain 100% preserved.
              </>
            )}
          </p>

          {/* Recycle Bin Guarantee */}
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-start gap-2.5 text-xs">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            <div className="leading-snug">
              <span className="font-semibold text-zinc-200 block mb-0.5">Safe Recycle Bin Operation</span>
              Files are safely moved to your Windows Recycle Bin. You can restore them anytime if deleted by mistake.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-surface-border bg-black/20">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-white/5 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmDelete}
            disabled={deleting || preview.count === 0}
            className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-2 transition-all shadow-lg disabled:opacity-50 ${
              isFiller
                ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20'
                : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-amber-500/20'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            {deleting
              ? 'Cleaning...'
              : `Move to Recycle Bin (~${preview.totalFormatted})`}
          </button>
        </div>
      </div>
    </div>
  )
}
