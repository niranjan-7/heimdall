import React, { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import { RemoteServerInfo } from '../../../shared/types'
import {
  Smartphone,
  X,
  Copy,
  Check,
  ExternalLink,
  Wifi,
  ShieldCheck,
  Play,
  Edit3,
  Power,
  RotateCcw
} from 'lucide-react'

interface MobileRemoteModalProps {
  isOpen: boolean
  onClose: () => void
}

function pairingUrl(ip: string, port: number, token: string): string {
  return `http://${ip}:${port}/#t=${token}`
}

export const MobileRemoteModal: React.FC<MobileRemoteModalProps> = ({ isOpen, onClose }) => {
  const [info, setInfo] = useState<RemoteServerInfo | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [customIp, setCustomIp] = useState('')
  const [isEditingIp, setIsEditingIp] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const applyInfo = (next: RemoteServerInfo): void => {
    setInfo(next)
    setCustomIp(next.localIp)
  }

  const loadInfo = async (): Promise<void> => {
    setLoading(true)
    try {
      applyInfo(await window.api.getRemoteServerInfo())
    } catch {
      setInfo(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      setNotice(null)
      loadInfo()
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleToggle = async (enabled: boolean): Promise<void> => {
    setBusy(true)
    setNotice(null)
    try {
      applyInfo(await window.api.setRemoteEnabled(enabled))
    } finally {
      setBusy(false)
    }
  }

  const handleResetPairing = async (): Promise<void> => {
    setBusy(true)
    try {
      applyInfo(await window.api.resetRemotePairing())
      setNotice('New pairing code created. Phones paired before need to scan the new QR code.')
    } finally {
      setBusy(false)
    }
  }

  // When the detected address is wrong (several network adapters), the user can type the right one.
  const handleApplyCustomIp = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    const ip = customIp.trim()
    if (!ip || !info) return
    setIsEditingIp(false)
    const url = pairingUrl(ip, info.port, info.token)
    let qrCodeDataUrl = ''
    try {
      qrCodeDataUrl = await QRCode.toDataURL(url, {
        margin: 2,
        scale: 6,
        color: { dark: '#000000', light: '#ffffff' }
      })
    } catch {}
    setInfo({ ...info, localIp: ip, url, qrCodeDataUrl })
  }

  const handleCopy = (): void => {
    if (info?.url) {
      navigator.clipboard.writeText(info.url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleOpenLocal = (): void => {
    if (info?.url) {
      window.open(info.url, '_blank')
    }
  }

  const enabled = !!info?.enabled

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-md rounded-2xl liquid-glass border border-white/10 shadow-2xl overflow-hidden flex flex-col backdrop-blur-2xl">
        {/* Header */}
        <div className="p-5 border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100">Phone Remote</h2>
              <p className="text-xs text-zinc-400">
                {enabled
                  ? 'Scan the QR code on your phone or tablet'
                  : 'Control playback from your phone'}
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

        {/* Content */}
        <div className="p-6 flex flex-col items-center text-center space-y-4">
          {loading ? (
            <div className="w-48 h-48 flex items-center justify-center text-zinc-500 text-xs">
              Loading...
            </div>
          ) : !enabled ? (
            <div className="w-full space-y-4 py-2">
              <p className="text-sm text-zinc-300 leading-relaxed">
                The phone remote is off. When it is on, a phone on the same Wi-Fi that scans the QR
                code here can browse your library and control playback.
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => handleToggle(true)}
                className="px-5 py-2 text-sm font-bold bg-bifrost-amber text-zinc-950 rounded-xl inline-flex items-center gap-2 disabled:opacity-50"
              >
                <Power className="w-4 h-4" />
                Turn on phone remote
              </button>
            </div>
          ) : (
            <>
              {/* QR Code Container */}
              <div className="p-3 bg-white rounded-2xl shadow-xl flex items-center justify-center border border-zinc-200">
                {info?.qrCodeDataUrl ? (
                  <img
                    src={info.qrCodeDataUrl}
                    alt="Heimdall phone remote pairing QR code"
                    className="w-48 h-48 block"
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-zinc-500 text-xs">
                    QR code unavailable
                  </div>
                )}
              </div>

              <p className="text-xs text-zinc-400">
                Your phone must be on the same Wi-Fi as this computer. The QR code contains a
                pairing code: anyone who has it can control playback, so only share it with your own
                devices.
              </p>

              {notice && (
                <p className="w-full text-xs px-3 py-2 rounded-lg bg-zinc-900 border border-surface-border text-zinc-300">
                  {notice}
                </p>
              )}

              {/* Address bar with IP editor */}
              <div className="w-full bg-zinc-900 border border-surface-border rounded-xl p-2.5 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 overflow-hidden text-left pl-1 flex-1">
                    <Wifi className="w-4 h-4 text-bifrost-amber shrink-0" />
                    <span className="text-xs text-zinc-200 font-mono truncate font-bold">
                      {info ? `http://${info.localIp}:${info.port}` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsEditingIp(!isEditingIp)}
                      title="Use a different IP address"
                      className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleCopy}
                      title="Copy the pairing link"
                      className="px-2.5 py-1 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg flex items-center gap-1 transition-colors"
                    >
                      {copied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copied ? 'Copied' : 'Copy link'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenLocal}
                      title="Open the remote in your browser"
                      className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {isEditingIp && (
                  <form
                    onSubmit={handleApplyCustomIp}
                    className="flex gap-2 pt-2 border-t border-zinc-800"
                  >
                    <input
                      type="text"
                      value={customIp}
                      onChange={(e) => setCustomIp(e.target.value)}
                      placeholder="This computer's Wi-Fi IP, e.g. 192.168.1.20"
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

              {/* Status and pairing controls */}
              <div className="w-full flex items-center justify-between text-xs text-zinc-400">
                <span>
                  {info?.connectedClients === 1
                    ? '1 phone connected'
                    : `${info?.connectedClients ?? 0} phones connected`}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleResetPairing}
                    title="Create a new pairing code. Every paired phone must scan again."
                    className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg inline-flex items-center gap-1 disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset pairing
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleToggle(false)}
                    className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg inline-flex items-center gap-1 disabled:opacity-50"
                  >
                    <Power className="w-3.5 h-3.5" />
                    Turn off
                  </button>
                </div>
              </div>

              {/* Feature highlights */}
              <div className="w-full grid grid-cols-2 gap-2 text-left pt-1">
                <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
                  <div className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-bifrost-amber" />
                    Paired phones only
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5 leading-tight">
                    Runs in Safari or Chrome. No app to install.
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
                  <div className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                    <Play className="w-3.5 h-3.5 text-cyan-400" />
                    Play on PC
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5 leading-tight">
                    Tap an episode or movie on your phone to play it here.
                  </p>
                </div>
              </div>
            </>
          )}
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
