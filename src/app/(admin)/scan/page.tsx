'use client'

import { useState, useCallback, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { QrScanner } from '@/components/spa/QrScanner'
import { CheckinCard } from '@/components/spa/CheckinCard'
import { formatDate } from '@/lib/utils/dates'
import type { CheckinResult, PaymentMethod } from '@/types'

type Phase =
  | 'scanning'
  | 'loading'
  | 'result'
  | 'registering'
  | 'renewing'
  | 'assigning'
  | 'success'
  | 'error'
  | 'camera_error'

interface SuccessInfo {
  title: string
  detail: string
}

export default function ScanPage() {
  const t = useTranslations('scan')
  const tCheck = useTranslations('checkin')
  const locale = useLocale() as 'en' | 'es'

  const [phase, setPhase] = useState<Phase>('scanning')
  const [result, setResult] = useState<CheckinResult | null>(null)
  const [errorKey, setErrorKey] = useState<'client_not_found' | 'network_error'>('network_error')
  const [successInfo, setSuccessInfo] = useState<SuccessInfo | null>(null)

  const reset = useCallback(() => {
    setResult(null)
    setSuccessInfo(null)
    setPhase('scanning')
  }, [])

  // Auto-reset to scanning after success
  useEffect(() => {
    if (phase !== 'success') return
    const id = setTimeout(reset, 3000)
    return () => clearTimeout(id)
  }, [phase, reset])

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

  const handleRegisterVisit = useCallback(async () => {
    if (!result) return
    setPhase('registering')
    try {
      const res = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: result.client.id,
          membership_id: result.membership?.id ?? null,
        }),
      })
      if (!res.ok) {
        setErrorKey('network_error')
        setPhase('error')
        return
      }
      const data: { visit_id: string; visited_at: string; session_type: string } = await res.json()

      const sessionLabels: Record<string, string> = {
        included: tCheck('session_included'),
        rollover: tCheck('session_rollover'),
        additional: tCheck('session_additional'),
        welcome_offer: tCheck('session_welcome_offer'),
      }
      setSuccessInfo({
        title: tCheck('visit_registered'),
        detail: `${tCheck('session_type_label')}: ${sessionLabels[data.session_type] ?? data.session_type}`,
      })
      setPhase('success')
    } catch {
      setErrorKey('network_error')
      setPhase('error')
    }
  }, [result, tCheck])

  const handleAssignConfirm = useCallback(async (planId: string, method: PaymentMethod, amountUsd: number) => {
    if (!result) return
    try {
      const res = await fetch('/api/memberships/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: result.client.id,
          plan_id: planId,
          payment_method: method,
          amount_usd: amountUsd,
        }),
      })
      if (!res.ok) {
        setErrorKey('network_error')
        setPhase('error')
        return
      }
      const data: { expires_at: string } = await res.json()
      setSuccessInfo({
        title: tCheck('assign_success'),
        detail: `${tCheck('renew_expires')}: ${formatDate(data.expires_at, locale)}`,
      })
      setPhase('success')
    } catch {
      setErrorKey('network_error')
      setPhase('error')
    }
  }, [result, tCheck, locale])

  const handleRenewConfirm = useCallback(async (method: PaymentMethod) => {
    if (!result?.membership) return
    const plan = result.membership.membership_plans
    try {
      const res = await fetch('/api/memberships/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: result.client.id,
          plan_id: result.membership.plan_id,
          payment_method: method,
          amount_usd: plan?.price_usd ?? 80,
        }),
      })
      if (!res.ok) {
        setErrorKey('network_error')
        setPhase('error')
        return
      }
      const data: { expires_at: string } = await res.json()
      setSuccessInfo({
        title: tCheck('renew_success'),
        detail: `${tCheck('renew_expires')}: ${formatDate(data.expires_at, locale)}`,
      })
      setPhase('success')
    } catch {
      setErrorKey('network_error')
      setPhase('error')
    }
  }, [result, tCheck, locale])

  const cameraPaused =
    phase === 'result' ||
    phase === 'registering' ||
    phase === 'renewing' ||
    phase === 'assigning' ||
    phase === 'success' ||
    phase === 'error'

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

        {/* Paused overlay */}
        {cameraPaused && (
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
              onRenew={() => setPhase('renewing')}
              onAssignMembership={() => setPhase('assigning')}
            />
          </div>
        )}

        {phase === 'registering' && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 border-4 border-slate-600 border-t-green-400 rounded-full animate-spin mx-auto" />
            <p className="text-slate-300 text-xl font-medium">{tCheck('registering')}</p>
          </div>
        )}

        {phase === 'renewing' && result && (
          <div className="w-full max-w-md">
            <RenewPanel
              result={result}
              onConfirm={handleRenewConfirm}
              onCancel={() => setPhase('result')}
            />
          </div>
        )}

        {phase === 'assigning' && result && (
          <div className="w-full max-w-md">
            <AssignMembershipPanel
              result={result}
              onConfirm={handleAssignConfirm}
              onCancel={() => setPhase('result')}
            />
          </div>
        )}

        {phase === 'success' && successInfo && (
          <div className="w-full max-w-md">
            <SuccessPanel info={successInfo} onScanAgain={reset} />
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

// ─── Sub-components ───────────────────────────────────────────────────────────

interface RenewPanelProps {
  result: CheckinResult
  onConfirm: (method: PaymentMethod) => Promise<void>
  onCancel: () => void
}

function RenewPanel({ result, onConfirm, onCancel }: RenewPanelProps) {
  const t = useTranslations('checkin')
  const tPayment = useTranslations('payment')
  const locale = useLocale() as 'en' | 'es'

  const [method, setMethod] = useState<PaymentMethod | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const plan = result.membership?.membership_plans
  const planName = plan ? (locale === 'es' ? plan.name_es : plan.name_en) : null
  const amount = plan?.price_usd ?? 80

  const METHODS: PaymentMethod[] = ['cash', 'debit', 'credit']
  const methodKeys = {
    cash: 'method_cash',
    debit: 'method_debit',
    credit: 'method_credit',
  } as const

  const handleConfirm = async () => {
    if (!method || submitting) return
    setSubmitting(true)
    await onConfirm(method)
    // component transitions away on success/error — no need to reset submitting
  }

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Title */}
      <div className="flex items-center gap-3">
        <span className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 text-xl">
          ↻
        </span>
        <span className="text-amber-400 text-lg font-semibold uppercase tracking-wide">
          {t('renewing_title')}
        </span>
      </div>

      {/* Client name */}
      <h2 className="text-4xl font-bold text-white leading-tight">
        {result.client.first_name} {result.client.last_name}
      </h2>

      {/* Plan + amount */}
      <div className="bg-slate-800 rounded-xl p-4">
        <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">{t('renew_plan')}</p>
        <p className="text-white text-xl font-semibold">{planName ?? '—'}</p>
        <p className="text-amber-400 text-3xl font-bold mt-2">
          ${amount}
          <span className="text-base font-normal text-slate-400 ml-1">
            {locale === 'es' ? '/mes' : '/month'}
          </span>
        </p>
      </div>

      {/* Payment method */}
      <div>
        <p className="text-slate-400 text-xs uppercase tracking-wide mb-3">{t('renew_method')}</p>
        <div className="grid grid-cols-3 gap-3">
          {METHODS.map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              disabled={submitting}
              className={`h-14 rounded-xl text-base font-semibold transition-colors disabled:opacity-50 ${
                method === m
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {tPayment(methodKeys[m])}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 pt-2">
        <button
          onClick={handleConfirm}
          disabled={!method || submitting}
          className="w-full h-16 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xl font-bold transition-colors"
        >
          {submitting ? t('renewing') : t('renew_confirm')}
        </button>
        <button
          onClick={onCancel}
          disabled={submitting}
          className="w-full h-12 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-300 text-base font-medium transition-colors"
        >
          {t('cancel')}
        </button>
      </div>
    </div>
  )
}

interface AssignMembershipPanelProps {
  result: CheckinResult
  onConfirm: (planId: string, method: PaymentMethod, amountUsd: number) => Promise<void>
  onCancel: () => void
}

interface PlanOption {
  id: string
  name_en: string
  name_es: string
  price_usd: number
}

function AssignMembershipPanel({ result, onConfirm, onCancel }: AssignMembershipPanelProps) {
  const t = useTranslations('checkin')
  const tPayment = useTranslations('payment')
  const locale = useLocale() as 'en' | 'es'

  const [plans, setPlans] = useState<PlanOption[]>([])
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [method, setMethod] = useState<PaymentMethod | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch('/api/membership-plans')
      .then((r) => r.json())
      .then((data: PlanOption[]) => {
        setPlans(data)
        setLoadingPlans(false)
      })
      .catch(() => setLoadingPlans(false))
  }, [])

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? null

  const METHODS: PaymentMethod[] = ['cash', 'debit', 'credit']
  const methodKeys = {
    cash: 'method_cash',
    debit: 'method_debit',
    credit: 'method_credit',
  } as const

  const handleConfirm = async () => {
    if (!selectedPlanId || !method || !selectedPlan || submitting) return
    setSubmitting(true)
    await onConfirm(selectedPlanId, method, selectedPlan.price_usd)
  }

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Title */}
      <div className="flex items-center gap-3">
        <span className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 text-xl">
          ★
        </span>
        <span className="text-amber-400 text-lg font-semibold uppercase tracking-wide">
          {t('assign_title')}
        </span>
      </div>

      {/* Client name */}
      <h2 className="text-4xl font-bold text-white leading-tight">
        {result.client.first_name} {result.client.last_name}
      </h2>

      {/* Plan selector */}
      <div>
        <p className="text-slate-400 text-xs uppercase tracking-wide mb-3">{t('assign_plan')}</p>
        {loadingPlans ? (
          <p className="text-slate-400 text-sm">{t('loading_plans')}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {plans.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlanId(plan.id)}
                disabled={submitting}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-colors disabled:opacity-50 ${
                  selectedPlanId === plan.id
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <span className="font-semibold">
                  {locale === 'es' ? plan.name_es : plan.name_en}
                </span>
                <span className="text-lg font-bold ml-4">
                  ${plan.price_usd}
                  <span className="text-xs font-normal opacity-75 ml-1">
                    {locale === 'es' ? '/mes' : '/mo'}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Payment method */}
      <div>
        <p className="text-slate-400 text-xs uppercase tracking-wide mb-3">{tPayment('method')}</p>
        <div className="grid grid-cols-3 gap-3">
          {METHODS.map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              disabled={submitting}
              className={`h-14 rounded-xl text-base font-semibold transition-colors disabled:opacity-50 ${
                method === m
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {tPayment(methodKeys[m])}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 pt-2">
        <button
          onClick={handleConfirm}
          disabled={!selectedPlanId || !method || submitting}
          className="w-full h-16 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xl font-bold transition-colors"
        >
          {submitting ? t('assigning') : t('assign_confirm')}
        </button>
        <button
          onClick={onCancel}
          disabled={submitting}
          className="w-full h-12 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-300 text-base font-medium transition-colors"
        >
          {t('cancel')}
        </button>
      </div>
    </div>
  )
}

interface SuccessPanelProps {
  info: SuccessInfo
  onScanAgain: () => void
}

function SuccessPanel({ info, onScanAgain }: SuccessPanelProps) {
  const t = useTranslations('scan')
  const tCheck = useTranslations('checkin')
  const [seconds, setSeconds] = useState(3)

  useEffect(() => {
    if (seconds <= 0) return
    const id = setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => clearTimeout(id)
  }, [seconds])

  return (
    <div className="w-full flex flex-col items-center gap-6 text-center">
      <span className="flex items-center justify-center w-20 h-20 rounded-full bg-green-500 text-white text-5xl">
        ✓
      </span>

      <div>
        <h2 className="text-3xl font-bold text-white mb-2">{info.title}</h2>
        <p className="text-slate-300 text-lg">{info.detail}</p>
      </div>

      <p className="text-slate-500 text-sm">
        {tCheck('reset_countdown')} {seconds}s…
      </p>

      <button
        onClick={onScanAgain}
        className="w-full h-12 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-base font-medium transition-colors"
      >
        {t('scan_again')}
      </button>
    </div>
  )
}
