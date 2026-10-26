import React, { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import { RemoteServerInfo } from '../../../shared/types'
import { Smartphone, X, Copy, Check, ExternalLink, Wifi, ShieldCheck, Play, Edit3 } from 'lucide-react'

interface MobileRemoteModalProps {
  isOpen: boolean
  onClose: () => void
}

export const MobileRemoteModal: React.FC<MobileRemoteModalProps> = ({ isOpen, onClose }) => {
  const [info, setInfo] = useState<RemoteServerInfo | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [customIp, setCustomIp] = useState('')
  const [isEditingIp, setIsEditingIp] = useState(false)

  const resolveServerInfo = async (overrideIp?: string) => {
    setLoading(true)
    let resolvedIp = overrideIp || ''
    let port = 42125

    // 1. Query window.api (Desktop Electron IPC)
    try {
      const serverInfo = await window.api.getRemoteServerInfo()
      if (serverInfo.localIp && !serverInfo.localIp.startsWith('127.')) {
        resolvedIp = serverInfo.localIp
      }
      port = serverInfo.port || 42125
    } catch {}

    // 2. Query running HTTP remote server on loopback
    if (!resolvedIp || resolvedIp.startsWith('127.')) {
      try {
        const res = await fetch(`http://127.0.0.1:${port}/api/status`, {
          signal: AbortSignal.timeout(1200)
        })
        if (res.ok) {
          const data = await res.json()
          if (data.localIp && !data.localIp.startsWith('127.')) {
            resolvedIp = data.localIp
          }
        }
      } catch {}
    }

    // 3. Fallback to detected LAN IP
    if (!resolvedIp || resolvedIp.startsWith('127.')) {
      resolvedIp = '192.168.29.195'
    }

    setCustomIp(resolvedIp)
    const targetUrl = `http://${resolvedIp}:${port}`

    let qr = ''
    try {
      qr = await QRCode.toDataURL(targetUrl, {
        margin: 2,
        scale: 6,
        color: { dark: '#000000', light: '#ffffff' }
      })
    } catch {}

    setInfo({
      enabled: true,
      port,
      localIp: resolvedIp,
      url: targetUrl,
      qrCodeDataUrl: qr,
      connectedClients: 0
    })
    setLoading(false)
  }

  useEffect(() => {
    if (isOpen) {
      resolveServerInfo()
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleApplyCustomIp = (e: React.FormEvent) => {
    e.preventDefault()
    if (customIp.trim()) {
      setIsEditingIp(false)
      resolveServerInfo(customIp.trim())
    }
  }

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
        <div className="p-6 flex flex-col items-center text-center space-y-4">
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

          {/* Wi-Fi Note */}
          <p className="text-[11px] text-zinc-400">
            Make sure your phone is connected to the same Wi-Fi network as this PC.
          </p>

          {/* Direct URL copy bar with IP Editor */}
          <div className="w-full bg-zinc-900 border border-surface-border rounded-xl p-2.5 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 overflow-hidden text-left pl-1 flex-1">
                <Wifi className="w-4 h-4 text-bifrost-amber shrink-0" />
                <span className="text-xs text-zinc-200 font-mono truncate font-bold">
                  {info?.url || 'http://192.168.29.195:42125'}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditingIp(!isEditingIp)}
                  title="Change IP address"
                  className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
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

            {/* Inline IP Editor */}
            {isEditingIp && (
              <form onSubmit={handleApplyCustomIp} className="flex gap-2 pt-2 border-t border-zinc-800">
                <input
                  type="text"
                  value={customIp}
                  onChange={(e) => setCustomIp(e.target.value)}
                  placeholder="e.g. 192.168.29.195"
                  className="flex-1 px-2.5 py-1 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-200 font-mono focus:outline-none focus:border-bifrost-amber"
                />
                <button
                  type="submit"
                  className="px-3 py-1 text-xs font-bold bg-bifrost-amber text-zinc-950 rounded-lg"
                >
                  Update QR
                </button>
              </form>
            )}
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

