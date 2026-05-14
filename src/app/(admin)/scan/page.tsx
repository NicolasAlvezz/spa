'use client'

import { useState, useCallback, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { ScanLine, WifiOff, UserX, Loader2, CheckCircle2, Camera, RotateCcw, Star, CreditCard } from 'lucide-react'
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
  | 'confirming_split'
  | 'registering_postop'
  | 'service_visit'
  | 'registering_service'
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
  const [splitPaymentBlocked, setSplitPaymentBlocked] = useState(false)

  const reset = useCallback(() => {
    setResult(null)
    setSuccessInfo(null)
    setSplitPaymentBlocked(false)
    setPhase('scanning')
  }, [])

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
      setSplitPaymentBlocked(false)
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

      if (res.status === 402) {
        // Split payment required before 5th session
        setSplitPaymentBlocked(true)
        setPhase('result')
        return
      }

      if (!res.ok) {
        setErrorKey('network_error')
        setPhase('error')
        return
      }

      const data: {
        visit_id: string
        visited_at: string
        session_type: string
        split_payment_warning?: boolean
        sessions_remaining?: number | null
      } = await res.json()

      const sessionLabels: Record<string, string> = {
        included: tCheck('session_included'),
        rollover: tCheck('session_rollover'),
        additional: tCheck('session_additional'),
        welcome_offer: tCheck('session_welcome_offer'),
      }

      const isPack = result.membership?.membership_plans?.plan_type === 'pack'
      const detail = isPack && data.sessions_remaining !== null && data.sessions_remaining !== undefined
        ? `${tCheck('sessions_remaining')}: ${data.sessions_remaining}`
        : `${tCheck('session_type_label')}: ${sessionLabels[data.session_type] ?? data.session_type}`

      setSuccessInfo({
        title: tCheck('visit_registered'),
        detail,
      })
      setPhase('success')
    } catch {
      setErrorKey('network_error')
      setPhase('error')
    }
  }, [result, tCheck])

  const handlePostOpVisit = useCallback(async () => {
    if (!result) return
    setPhase('registering_postop')
    try {
      const res = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: result.client.id,
          membership_id: null,
          session_type: 'post_op',
        }),
      })
      if (!res.ok) {
        setErrorKey('network_error')
        setPhase('error')
        return
      }
      setSuccessInfo({
        title: tCheck('visit_registered'),
        detail: tCheck('post_op_visit'),
      })
      setPhase('success')
    } catch {
      setErrorKey('network_error')
      setPhase('error')
    }
  }, [result, tCheck])

  const handleConfirmSplitPayment = useCallback(async (method: PaymentMethod) => {
    if (!result?.membership) return
    try {
      const res = await fetch('/api/memberships/confirm-split-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          membership_id: result.membership.id,
          payment_method: method,
        }),
      })
      if (!res.ok) {
        setErrorKey('network_error')
        setPhase('error')
        return
      }
      setSplitPaymentBlocked(false)
      setSuccessInfo({
        title: tCheck('split_confirmed'),
        detail: tCheck('confirm_split'),
      })
      setPhase('success')
    } catch {
      setErrorKey('network_error')
      setPhase('error')
    }
  }, [result, tCheck])

  const handleAssignConfirm = useCallback(async (
    planId: string,
    method: PaymentMethod,
    amountUsd: number,
    splitPayment?: boolean,
  ) => {
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
          split_payment: splitPayment ?? false,
        }),
      })
      if (!res.ok) {
        setErrorKey('network_error')
        setPhase('error')
        return
      }
      const data: { expires_at: string; sessions_remaining?: number; is_pack?: boolean } = await res.json()
      setSuccessInfo({
        title: tCheck('assign_success'),
        detail: data.is_pack
          ? `${data.sessions_remaining} ${tCheck('pack_sessions_total')}`
          : `${tCheck('renew_expires')}: ${formatDate(data.expires_at, locale)}`,
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

  const handleServiceVisit = useCallback(async (serviceTypeId: string) => {
    if (!result) return
    setPhase('registering_service')
    try {
      const res = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: result.client.id,
          membership_id: null,
          service_type_id: serviceTypeId,
        }),
      })
      if (!res.ok) {
        setErrorKey('network_error')
        setPhase('error')
        return
      }
      setSuccessInfo({
        title: tCheck('visit_registered'),
        detail: tCheck('session_additional'),
      })
      setPhase('success')
    } catch {
      setErrorKey('network_error')
      setPhase('error')
    }
  }, [result, tCheck])

  const cameraPaused =
    phase === 'result' ||
    phase === 'registering' ||
    phase === 'registering_postop' ||
    phase === 'registering_service' ||
    phase === 'renewing' ||
    phase === 'assigning' ||
    phase === 'service_visit' ||
    phase === 'confirming_split' ||
    phase === 'success' ||
    phase === 'error'

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden bg-slate-900">

      {/* ── Top/Left: camera ───────────────────────────────────────────── */}
      <div className="relative w-full md:w-1/2 h-64 md:h-full bg-black flex-shrink-0">
        <QrScanner
          onScan={handleScan}
          onCameraError={handleCameraError}
          active={phase === 'scanning'}
        />

        {phase === 'loading' && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-4">
            <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
            <p className="text-white text-lg font-medium">{t('loading')}</p>
          </div>
        )}

        {cameraPaused && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <p className="text-slate-400 text-sm">{t('camera_paused')}</p>
          </div>
        )}
      </div>

      {/* ── Bottom/Right: status panel ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 md:px-10 py-6 md:py-8 overflow-y-auto">

        {phase === 'scanning' && (
          <div className="text-center space-y-5 select-none">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-brand-500/10 border border-brand-500/20 mb-1">
              <ScanLine size={36} className="text-brand-400" />
            </div>
            <div>
              <h1 className="text-xl md:text-3xl font-bold text-white tracking-tight">VM Integral Massage</h1>
              <p className="text-slate-400 text-sm md:text-base mt-2 max-w-xs leading-relaxed">{t('instructions')}</p>
            </div>
          </div>
        )}

        {phase === 'loading' && (
          <div className="text-center space-y-4">
            <Loader2 size={44} className="text-brand-400 animate-spin mx-auto" />
            <p className="text-slate-300 text-lg font-medium">{t('loading')}</p>
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
              onRegisterServiceVisit={() => setPhase('service_visit')}
              onConfirmSplitPayment={() => setPhase('confirming_split')}
              onPostOpVisit={handlePostOpVisit}
              splitPaymentBlocked={splitPaymentBlocked}
            />
          </div>
        )}

        {phase === 'service_visit' && result && (
          <div className="w-full max-w-md">
            <ServiceVisitPanel
              result={result}
              onConfirm={handleServiceVisit}
              onCancel={() => setPhase('result')}
            />
          </div>
        )}

        {(phase === 'registering' || phase === 'registering_postop' || phase === 'registering_service') && (
          <div className="text-center space-y-4">
            <Loader2 size={44} className="text-green-400 animate-spin mx-auto" />
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

        {phase === 'confirming_split' && result && (
          <div className="w-full max-w-md">
            <ConfirmSplitPanel
              result={result}
              onConfirm={handleConfirmSplitPayment}
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
              {errorKey === 'client_not_found'
                ? <UserX size={44} className="text-red-400 mx-auto mb-4" />
                : <WifiOff size={44} className="text-red-400 mx-auto mb-4" />
              }
              <h2 className="text-2xl font-bold text-white mb-2">
                {errorKey === 'client_not_found' ? t('client_not_found') : t('error_network')}
              </h2>
            </div>
            <button
              onClick={reset}
              className="w-full h-14 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-lg font-semibold transition-colors"
            >
              {t('scan_again')}
            </button>
          </div>
        )}

        {phase === 'camera_error' && (
          <div className="w-full max-w-md flex flex-col gap-6 text-center">
            <div>
              <Camera size={44} className="text-slate-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">{t('camera_error')}</h2>
              <p className="text-slate-400 leading-relaxed">{t('camera_error_body')}</p>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const METHODS: PaymentMethod[] = ['cash', 'debit', 'credit']
const methodKeys = { cash: 'method_cash', debit: 'method_debit', credit: 'method_credit' } as const

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

  const handleConfirm = async () => {
    if (!method || submitting) return
    setSubmitting(true)
    await onConfirm(method)
  }

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-brand-500/20">
          <RotateCcw size={18} className="text-brand-400" />
        </div>
        <span className="text-brand-400 text-lg font-semibold uppercase tracking-wide">
          {t('renewing_title')}
        </span>
      </div>

      <h2 className="text-2xl md:text-4xl font-bold text-white leading-tight">
        {result.client.first_name} {result.client.last_name}
      </h2>

      <div className="bg-slate-800 rounded-xl p-4">
        <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">{t('renew_plan')}</p>
        <p className="text-white text-xl font-semibold">{planName ?? '—'}</p>
        <p className="text-brand-400 text-3xl font-bold mt-2">
          ${amount}
          <span className="text-base font-normal text-slate-400 ml-1">
            {locale === 'es' ? '/mes' : '/month'}
          </span>
        </p>
      </div>

      <div>
        <p className="text-slate-400 text-xs uppercase tracking-wide mb-3">{t('renew_method')}</p>
        <div className="grid grid-cols-3 gap-3">
          {METHODS.map((m) => (
            <button key={m} onClick={() => setMethod(m)} disabled={submitting}
              className={`h-14 rounded-xl text-base font-semibold transition-colors disabled:opacity-50 ${method === m ? 'bg-brand-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
              {tPayment(methodKeys[m])}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 pt-2">
        <button onClick={handleConfirm} disabled={!method || submitting}
          className="w-full h-16 rounded-xl bg-brand-500 hover:bg-brand-400 active:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xl font-bold transition-colors">
          {submitting ? t('renewing') : t('renew_confirm')}
        </button>
        <button onClick={onCancel} disabled={submitting}
          className="w-full h-12 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-300 text-base font-medium transition-colors">
          {t('cancel')}
        </button>
      </div>
    </div>
  )
}

interface PlanOption {
  id: string
  name_en: string
  name_es: string
  price_usd: number
  plan_type: 'monthly' | 'pack'
  total_sessions: number | null
  allows_split_payment: boolean
  split_first_amount: number | null
}

interface AssignMembershipPanelProps {
  result: CheckinResult
  onConfirm: (planId: string, method: PaymentMethod, amountUsd: number, splitPayment?: boolean) => Promise<void>
  onCancel: () => void
}

function AssignMembershipPanel({ result, onConfirm, onCancel }: AssignMembershipPanelProps) {
  const t = useTranslations('checkin')
  const tPayment = useTranslations('payment')
  const locale = useLocale() as 'en' | 'es'

  const [plans, setPlans] = useState<PlanOption[]>([])
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [method, setMethod] = useState<PaymentMethod | null>(null)
  const [useSplitPayment, setUseSplitPayment] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch('/api/membership-plans')
      .then((r) => r.json())
      .then((data: PlanOption[]) => { setPlans(data); setLoadingPlans(false) })
      .catch(() => setLoadingPlans(false))
  }, [])

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? null

  const handleSelectPlan = (plan: PlanOption) => {
    setSelectedPlanId(plan.id)
    setUseSplitPayment(false)
  }

  const paymentAmount = selectedPlan
    ? useSplitPayment && selectedPlan.split_first_amount
      ? selectedPlan.split_first_amount
      : selectedPlan.price_usd
    : 0

  const handleConfirm = async () => {
    if (!selectedPlanId || !method || !selectedPlan || submitting) return
    setSubmitting(true)
    await onConfirm(selectedPlanId, method, paymentAmount, useSplitPayment)
  }

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-brand-500/20">
          <Star size={18} className="text-brand-400" />
        </div>
        <span className="text-brand-400 text-lg font-semibold uppercase tracking-wide">
          {t('assign_title')}
        </span>
      </div>

      <h2 className="text-2xl md:text-4xl font-bold text-white leading-tight">
        {result.client.first_name} {result.client.last_name}
      </h2>

      {/* Plan selector */}
      <div>
        <p className="text-slate-400 text-xs uppercase tracking-wide mb-3">{t('assign_plan')}</p>
        {loadingPlans ? (
          <p className="text-slate-400 text-sm">{t('loading_plans')}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {plans.map((plan) => {
              const isPack = plan.plan_type === 'pack'
              const isSelected = selectedPlanId === plan.id
              return (
                <button key={plan.id} onClick={() => handleSelectPlan(plan)} disabled={submitting}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-colors disabled:opacity-50 ${isSelected ? 'bg-brand-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                  <div>
                    <span className="font-semibold block">
                      {locale === 'es' ? plan.name_es : plan.name_en}
                    </span>
                    {isPack && (
                      <span className={`text-xs ${isSelected ? 'text-brand-100' : 'text-slate-400'}`}>
                        {plan.total_sessions} {t('pack_sessions_total')} · {t('pack_no_expiry')}
                      </span>
                    )}
                  </div>
                  <span className="text-lg font-bold ml-4 flex-shrink-0">
                    ${plan.price_usd}
                    {!isPack && (
                      <span className="text-xs font-normal opacity-75 ml-1">
                        {locale === 'es' ? '/mes' : '/mo'}
                      </span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Split payment option (only for eligible packs) */}
      {selectedPlan?.allows_split_payment && (
        <div>
          <p className="text-slate-400 text-xs uppercase tracking-wide mb-3">{tPayment('payment_option')}</p>
          <div className="flex flex-col gap-2">
            <button onClick={() => setUseSplitPayment(false)} disabled={submitting}
              className={`w-full px-4 py-3 rounded-xl text-left text-sm font-medium transition-colors disabled:opacity-50 ${!useSplitPayment ? 'bg-brand-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
              {t('pack_payment_full')} — ${selectedPlan.price_usd}
            </button>
            <button onClick={() => setUseSplitPayment(true)} disabled={submitting}
              className={`w-full px-4 py-3 rounded-xl text-left text-sm font-medium transition-colors disabled:opacity-50 ${useSplitPayment ? 'bg-brand-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
              {t('pack_payment_split')} — ${selectedPlan.split_first_amount} {locale === 'es' ? 'ahora' : 'now'}
            </button>
          </div>
          {useSplitPayment && (
            <p className="text-brand-400 text-xs mt-2 ml-1">
              {locale === 'es'
                ? `Cobrar ahora: $${selectedPlan.split_first_amount} · 2do pago: $${selectedPlan.price_usd - (selectedPlan.split_first_amount ?? 0)}`
                : `Charge now: $${selectedPlan.split_first_amount} · 2nd payment: $${selectedPlan.price_usd - (selectedPlan.split_first_amount ?? 0)}`
              }
            </p>
          )}
        </div>
      )}

      {/* Payment method */}
      <div>
        <p className="text-slate-400 text-xs uppercase tracking-wide mb-3">{tPayment('method')}</p>
        <div className="grid grid-cols-3 gap-3">
          {METHODS.map((m) => (
            <button key={m} onClick={() => setMethod(m)} disabled={submitting}
              className={`h-14 rounded-xl text-base font-semibold transition-colors disabled:opacity-50 ${method === m ? 'bg-brand-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
              {tPayment(methodKeys[m])}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 pt-2">
        <button onClick={handleConfirm} disabled={!selectedPlanId || !method || submitting}
          className="w-full h-16 rounded-xl bg-brand-500 hover:bg-brand-400 active:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xl font-bold transition-colors">
          {submitting ? t('assigning') : `${t('assign_confirm')} — $${paymentAmount}`}
        </button>
        <button onClick={onCancel} disabled={submitting}
          className="w-full h-12 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-300 text-base font-medium transition-colors">
          {t('cancel')}
        </button>
      </div>
    </div>
  )
}

interface ConfirmSplitPanelProps {
  result: CheckinResult
  onConfirm: (method: PaymentMethod) => Promise<void>
  onCancel: () => void
}

function ConfirmSplitPanel({ result, onConfirm, onCancel }: ConfirmSplitPanelProps) {
  const t = useTranslations('checkin')
  const tPayment = useTranslations('payment')

  const [method, setMethod] = useState<PaymentMethod | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const plan = result.membership?.membership_plans
  const secondAmount = plan ? plan.price_usd - (plan.split_first_amount ?? 0) : 400

  const handleConfirm = async () => {
    if (!method || submitting) return
    setSubmitting(true)
    await onConfirm(method)
  }

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-brand-500/20">
          <CreditCard size={18} className="text-brand-400" />
        </div>
        <span className="text-brand-400 text-lg font-semibold uppercase tracking-wide">
          {t('confirm_split')}
        </span>
      </div>

      <h2 className="text-2xl md:text-4xl font-bold text-white leading-tight">
        {result.client.first_name} {result.client.last_name}
      </h2>

      <div className="bg-slate-800 rounded-xl p-4">
        <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">
          {t('split_installment')}
        </p>
        <p className="text-brand-400 text-4xl font-bold">${secondAmount}</p>
      </div>

      <div>
        <p className="text-slate-400 text-xs uppercase tracking-wide mb-3">{tPayment('method')}</p>
        <div className="grid grid-cols-3 gap-3">
          {METHODS.map((m) => (
            <button key={m} onClick={() => setMethod(m)} disabled={submitting}
              className={`h-14 rounded-xl text-base font-semibold transition-colors disabled:opacity-50 ${method === m ? 'bg-brand-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
              {tPayment(methodKeys[m])}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 pt-2">
        <button onClick={handleConfirm} disabled={!method || submitting}
          className="w-full h-16 rounded-xl bg-brand-500 hover:bg-brand-400 active:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xl font-bold transition-colors">
          {submitting ? t('confirming_split') : t('confirm_split')}
        </button>
        <button onClick={onCancel} disabled={submitting}
          className="w-full h-12 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-300 text-base font-medium transition-colors">
          {t('cancel')}
        </button>
      </div>
    </div>
  )
}

interface ServiceType {
  id: string
  slug: string
  name_en: string
  name_es: string
  price_usd: number | null
  duration_minutes: number | null
}

interface ServiceVisitPanelProps {
  result: CheckinResult
  onConfirm: (serviceTypeId: string) => Promise<void>
  onCancel: () => void
}

function ServiceVisitPanel({ result, onConfirm, onCancel }: ServiceVisitPanelProps) {
  const t = useTranslations('checkin')
  const locale = useLocale() as 'en' | 'es'

  const [services, setServices] = useState<ServiceType[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch('/api/service-types')
      .then(r => r.json())
      .then((data: ServiceType[]) => { setServices(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const handleConfirm = async () => {
    if (!selectedId || submitting) return
    setSubmitting(true)
    await onConfirm(selectedId)
  }

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-brand-500/20">
          <Star size={18} className="text-brand-400" />
        </div>
        <span className="text-brand-400 text-lg font-semibold uppercase tracking-wide">
          {locale === 'es' ? 'Registrar visita' : 'Register visit'}
        </span>
      </div>

      <h2 className="text-2xl md:text-4xl font-bold text-white leading-tight">
        {result.client.first_name} {result.client.last_name}
      </h2>

      <div>
        <p className="text-slate-400 text-xs uppercase tracking-wide mb-3">
          {locale === 'es' ? '¿Qué servicio va a recibir?' : 'Which service will they receive?'}
        </p>
        {loading ? (
          <p className="text-slate-400 text-sm">{t('loading_plans')}</p>
        ) : services.length === 0 ? (
          <p className="text-slate-400 text-sm">
            {locale === 'es' ? 'No hay servicios activos.' : 'No active services found.'}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {services.map((s) => {
              const isSelected = selectedId === s.id
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  disabled={submitting}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-colors disabled:opacity-50 ${
                    isSelected
                      ? 'bg-brand-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  <div>
                    <span className="font-semibold block">
                      {locale === 'es' ? s.name_es : s.name_en}
                    </span>
                    {s.duration_minutes && (
                      <span className={`text-xs ${isSelected ? 'text-brand-100' : 'text-slate-400'}`}>
                        {s.duration_minutes} min
                      </span>
                    )}
                  </div>
                  {s.price_usd !== null && (
                    <span className="text-lg font-bold ml-4 flex-shrink-0">${s.price_usd}</span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 pt-2">
        <button
          onClick={handleConfirm}
          disabled={!selectedId || submitting}
          className="w-full h-16 rounded-xl bg-green-500 hover:bg-green-400 active:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xl font-bold transition-colors"
        >
          {submitting
            ? (locale === 'es' ? 'Registrando...' : 'Registering...')
            : (locale === 'es' ? 'Confirmar visita' : 'Confirm visit')}
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
      <div className="flex items-center justify-center w-20 h-20 rounded-full bg-green-500 shadow-lg shadow-green-900/40">
        <CheckCircle2 size={40} className="text-white" />
      </div>

      <div>
        <h2 className="text-3xl font-bold text-white mb-2">{info.title}</h2>
        <p className="text-slate-300 text-lg">{info.detail}</p>
      </div>

      <p className="text-slate-500 text-sm">
        {tCheck('reset_countdown')} {seconds}s…
      </p>

      <button onClick={onScanAgain}
        className="w-full h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors">
        {t('scan_again')}
      </button>
    </div>
  )
}
