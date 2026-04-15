'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { QrScanner } from '@/components/spa/QrScanner'
import { CheckinCard } from '@/components/spa/CheckinCard'
import type { CheckinResult } from '@/types'

type Phase = 'scanning' | 'loading' | 'result' | 'error' | 'camera_error'

export default function ScanPage() {
  const t = useTranslations('scan')

  const [phase, setPhase] = useState<Phase>('scanning')
  const [result, setResult] = useState<CheckinResult | null>(null)
  const [errorKey, setErrorKey] = useState<'client_not_found' | 'network_error'>('network_error')

  const handleScan = useCallback(async (uuid: string) => {
    setPhase('loading')
    try {
      const res = await fetch(`/api/clients/${encodeURIComponent(uuid)}/checkin`)
      if (res.status === 404) {
        setErrorKey('client_not_found')
        setPhase('error')
        return
      }
      if (!res.ok) {
        setErrorKey('network_error')
        setPhase('error')
        return
      }
      const data: CheckinResult = await res.json()
      setResult(data)
      setPhase('result')
    } catch {
      setErrorKey('network_error')
      setPhase('error')
    }
  }, [])

  const handleCameraError = useCallback(() => {
    setPhase('camera_error')
  }, [])

  const reset = useCallback(() => {
    setResult(null)
    setPhase('scanning')
  }, [])

  // Step 6 handlers — placeholder
  const handleRegisterVisit = useCallback(() => {
    // Implemented in Step 6
  }, [])

  const handleRenew = useCallback(() => {
    // Implemented in Step 6
  }, [])

  return (
    <div className="flex h-full overflow-hidden bg-slate-900">

      {/* ── Left: camera ───────────────────────────────────────────────── */}
      <div className="relative w-1/2 bg-black flex-shrink-0">
        <QrScanner
          onScan={handleScan}
          onCameraError={handleCameraError}
          active={phase === 'scanning'}
        />

        {/* Loading overlay */}
        {phase === 'loading' && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-4">
            <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
            <p className="text-white text-lg font-medium">{t('loading')}</p>
          </div>
        )}

        {/* Paused overlay (while showing result) */}
        {(phase === 'result' || phase === 'error') && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <p className="text-slate-400 text-sm">{t('camera_paused')}</p>
          </div>
        )}
      </div>

      {/* ── Right: status panel ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-10 py-8 overflow-hidden">

        {phase === 'scanning' && (
          <div className="text-center space-y-4 select-none">
            <div className="text-7xl mb-2">⬡</div>
            <h1 className="text-3xl font-bold text-white">VM Integral Massage</h1>
            <p className="text-slate-400 text-lg max-w-xs">{t('instructions')}</p>
          </div>
        )}

        {phase === 'loading' && (
          <div className="text-center space-y-3">
            <div className="w-14 h-14 border-4 border-slate-600 border-t-amber-400 rounded-full animate-spin mx-auto" />
            <p className="text-slate-300 text-xl font-medium">{t('loading')}</p>
          </div>
        )}

        {phase === 'result' && result && (
          <div className="w-full max-w-md">
            <CheckinCard
              data={result}
              onScanAgain={reset}
              onRegisterVisit={handleRegisterVisit}
              onRenew={handleRenew}
            />
          </div>
        )}

        {phase === 'error' && (
          <div className="w-full max-w-md flex flex-col gap-6 text-center">
            <div>
              <span className="flex items-center justify-center w-16 h-16 rounded-full bg-red-900/50 text-4xl mx-auto mb-4">
                ⚠
              </span>
              <h2 className="text-2xl font-bold text-white mb-2">
                {errorKey === 'client_not_found' ? t('client_not_found') : t('error_network')}
              </h2>
            </div>
            <button
              onClick={reset}
              className="w-full h-14 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-lg font-medium transition-colors"
            >
              {t('scan_again')}
            </button>
          </div>
        )}

        {phase === 'camera_error' && (
          <div className="w-full max-w-md flex flex-col gap-6 text-center">
            <div>
              <span className="text-5xl block mb-4">📷</span>
              <h2 className="text-2xl font-bold text-white mb-2">{t('camera_error')}</h2>
              <p className="text-slate-400">{t('camera_error_body')}</p>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
