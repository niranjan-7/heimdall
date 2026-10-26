import React, { useState, useEffect } from 'react'
import { RemoteServerInfo } from '../../../shared/types'
import { Smartphone, X, Copy, Check, ExternalLink, Wifi, ShieldCheck, Play } from 'lucide-react'

interface MobileRemoteModalProps {
  isOpen: boolean
  onClose: () => void
}

export const MobileRemoteModal: React.FC<MobileRemoteModalProps> = ({ isOpen, onClose }) => {
  const [info, setInfo] = useState<RemoteServerInfo | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      window.api.getRemoteServerInfo().then((serverInfo) => {
        setInfo(serverInfo)
        setLoading(false)
      })
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleCopy = () => {
    if (info?.url) {
      navigator.clipboard.writeText(info.url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleOpenLocal = () => {
    if (info?.url) {
      window.open(info.url, '_blank')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-md rounded-2xl bg-zinc-950 border border-surface-border shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100">Mobile Couch Remote</h2>
              <p className="text-xs text-zinc-400">Scan QR Code on your Phone or Tablet</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col items-center text-center space-y-5">
          {/* QR Code Container */}
          <div className="p-3 bg-white rounded-2xl shadow-xl flex items-center justify-center border border-zinc-200">
            {loading ? (
              <div className="w-48 h-48 flex items-center justify-center text-zinc-500 text-xs">
                Generating QR code...
              </div>
            ) : info?.qrCodeDataUrl ? (
              <img
                src={info.qrCodeDataUrl}
                alt="Heimdall Mobile Pairing QR Code"
                className="w-48 h-48 block"
              />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center text-zinc-500 text-xs">
                QR Unavailable
              </div>
            )}
          </div>

          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Remote Server Active on Port {info?.port || 42125}</span>
          </div>

          {/* Direct URL copy bar */}
          <div className="w-full bg-zinc-900 border border-surface-border rounded-xl p-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 overflow-hidden text-left pl-1">
              <Wifi className="w-4 h-4 text-bifrost-amber shrink-0" />
              <span className="text-xs text-zinc-200 font-mono truncate">
                {info?.url || 'http://127.0.0.1:42125'}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleCopy}
                className="px-2.5 py-1 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg flex items-center gap-1 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                type="button"
                onClick={handleOpenLocal}
                title="Test remote in browser tab"
                className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Feature Highlights */}
          <div className="w-full grid grid-cols-2 gap-2 text-left pt-1">
            <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
              <div className="text-[11px] font-bold text-zinc-200 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-bifrost-amber" />
                Zero Installs
              </div>
              <p className="text-[10px] text-zinc-400 mt-0.5 leading-tight">
                Runs directly in Safari or Chrome over local WiFi
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
              <div className="text-[11px] font-bold text-zinc-200 flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5 text-cyan-400" />
                Play on PC
              </div>
              <p className="text-[10px] text-zinc-400 mt-0.5 leading-tight">
                Tap any episode or movie on your phone to launch on TV
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-zinc-900/50 border-t border-surface-border flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
