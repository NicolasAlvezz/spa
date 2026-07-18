'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useTranslations, useLocale } from 'next-intl'
import { ScanLine, WifiOff, UserX, Loader2, CheckCircle2, Camera, RotateCcw, Star, CreditCard, FileText, AlertTriangle, Gift, Search, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { QrScanner } from '@/components/spa/QrScanner'
import { CheckinCard } from '@/components/spa/CheckinCard'
import { TherapistSelector } from '@/components/spa/TherapistSelector'
import { formatDate } from '@/lib/utils/dates'
import { getDefaultTherapistName, THERAPIST_NAMES } from '@/lib/constants/therapists'
import { parseVisitApiError, type ScanErrorKey } from '@/lib/visit-api-errors'
import { getBasicContractTemplate } from '@/lib/constants/membership-contract-templates'
import type { CheckinResult } from '@/types'

const SignaturePad = dynamic(
  () => import('@/components/spa/SignaturePad').then(m => m.SignaturePad),
  { ssr: false, loading: () => <div className="h-[160px] rounded-xl border-2 border-dashed border-slate-600" /> }
)

const THERAPIST_STORAGE_KEY = 'scan_selected_therapist'

type Phase =
  | 'scanning'
  | 'loading'
  | 'result'
  | 'registering'
  | 'renewing'
  | 'referral'
  | 'assigning'
  | 'assign_pack'
  | 'confirming_split'
  | 'waiting_signature'
  | 'membership_applied'
  | 'service_visit'
  | 'confirm_service'
  | 'registering_service'
  | 'additional_visit'
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
  const tContract = useTranslations('membership_contract')
  const locale = useLocale() as 'en' | 'es'

  const [phase, setPhase] = useState<Phase>('scanning')
  const [result, setResult] = useState<CheckinResult | null>(null)
  const [errorKey, setErrorKey] = useState<ScanErrorKey>('network_error')
  const [resultError, setResultError] = useState<ScanErrorKey | null>(null)
  const [successInfo, setSuccessInfo] = useState<SuccessInfo | null>(null)
  const [splitPaymentBlocked, setSplitPaymentBlocked] = useState(false)
  const [therapistName, setTherapistName] = useState(getDefaultTherapistName)
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null)
  const [contractPlanId, setContractPlanId] = useState<string | null>(null)
  const [contractExpiresAt, setContractExpiresAt] = useState<string | null>(null)
  const [contractPlanName, setContractPlanName] = useState<string>('')
  const [contractPlanPrice, setContractPlanPrice] = useState<number | null>(null)
  const [referralChecked, setReferralChecked] = useState(false)
  const [selectedService, setSelectedService] = useState<{ id: string; name_en: string; name_es: string; price_usd: number | null } | null>(null)
  const [preselectedPlanId, setPreselectedPlanId] = useState<string | null>(null)
  const [packPlan, setPackPlan] = useState<PlanOption | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem(THERAPIST_STORAGE_KEY)
    if (stored && THERAPIST_NAMES.includes(stored as (typeof THERAPIST_NAMES)[number])) {
      setTherapistName(stored)
    }
  }, [])

  useEffect(() => {
    sessionStorage.setItem(THERAPIST_STORAGE_KEY, therapistName)
  }, [therapistName])

  const reset = useCallback(() => {
    setResult(null)
    setSuccessInfo(null)
    setSplitPaymentBlocked(false)
    setPendingRequestId(null)
    setContractPlanId(null)
    setContractExpiresAt(null)
    setContractPlanName('')
    setContractPlanPrice(null)
    setResultError(null)
    setReferralChecked(false)
    setSelectedService(null)
    setPreselectedPlanId(null)
    setPackPlan(null)
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
      setResultError(null)
      setPhase('result')
    } catch {
      setErrorKey('network_error')
      setPhase('error')
    }
  }, [])

  const fetchCheckin = useCallback(async (clientId: string): Promise<CheckinResult | null> => {
    try {
      const res = await fetch(`/api/clients/${encodeURIComponent(clientId)}/checkin`)
      if (!res.ok) return null
      return await res.json() as CheckinResult
    } catch {
      return null
    }
  }, [])

  const handleCameraError = useCallback(() => {
    setPhase('camera_error')
  }, [])

  function scanErrorMessage(key: ScanErrorKey): string {
    const map: Record<ScanErrorKey, string> = {
      client_not_found: t('client_not_found'),
      network_error: t('error_network'),
      consent_required: t('error_consent_required'),
      visit_register_failed: t('error_visit_register_failed'),
      membership_update_failed: t('error_membership_update_failed'),
    }
    return map[key]
  }

  const handleRegisterVisit = useCallback(async () => {
    if (!result) return
    setResultError(null)
    setPhase('registering')
    try {
      const freshData = await fetchCheckin(result.client.id)
      if (!freshData) {
        setErrorKey('network_error')
        setPhase('error')
        return
      }
      setResult(freshData)

      if (!freshData.has_active_consent) {
        setErrorKey('consent_required')
        setPhase('error')
        return
      }

      const res = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: freshData.client.id,
          membership_id: freshData.membership?.id ?? null,
          therapist_name: therapistName,
        }),
      })

      if (res.status === 402) {
        setSplitPaymentBlocked(true)
        setPhase('result')
        return
      }

      if (!res.ok) {
        const key = await parseVisitApiError(res)
        if (key === 'consent_required') {
          setErrorKey('consent_required')
          setPhase('error')
          return
        }
        setErrorKey(key)
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

      const isPack = freshData.membership?.membership_plans?.plan_type === 'pack'
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
  }, [result, tCheck, therapistName, fetchCheckin])

  const handleAdditionalVisitConfirm = useCallback(async (useCredit = false) => {
    if (!result?.membership) return
    const plan = result.membership.membership_plans
    const planPrice = plan?.additional_price_usd ?? plan?.price_usd
    if (!planPrice) return
    const creditApplied = useCredit ? result.client.credit_balance : 0
    const finalPrice = Math.max(0, planPrice - creditApplied)
    setPhase('registering')
    try {
      const res = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: result.client.id,
          membership_id: result.membership.id,
          amount_usd: planPrice,
          therapist_name: therapistName,
          use_credit: useCredit,
        }),
      })
      if (!res.ok) {
        const key = await parseVisitApiError(res)
        if (key === 'consent_required') { setResultError(key); setPhase('result'); return }
        setErrorKey(key)
        setPhase('error')
        return
      }
      const detail = creditApplied > 0
        ? `${tCheck('session_additional', { price: finalPrice })} ${tCheck('credit_applied_label', { credit: creditApplied })}`
        : tCheck('session_additional', { price: planPrice })
      setSuccessInfo({ title: tCheck('visit_registered'), detail })
      setPhase('success')
    } catch {
      setErrorKey('network_error')
      setPhase('error')
    }
  }, [result, tCheck, therapistName])

  const handleConfirmSplitPayment = useCallback(async () => {
    if (!result?.membership) return
    try {
      const res = await fetch('/api/memberships/confirm-split-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ membership_id: result.membership.id }),
      })
      if (!res.ok) {
        setErrorKey('network_error')
        setPhase('error')
        return
      }
      setSplitPaymentBlocked(false)
      setSuccessInfo({
        title: t('split_confirmed'),
        detail: t('confirm_split'),
      })
      setPhase('success')
    } catch {
      setErrorKey('network_error')
      setPhase('error')
    }
  }, [result, t])

  const handleAssignConfirm = useCallback(async (
    planId: string,
    amountUsd: number,
    splitPayment?: boolean,
    useCredit?: boolean,
  ) => {
    if (!result) return

    const post = (confirmLose: boolean) =>
      fetch('/api/memberships/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: result.client.id,
          plan_id: planId,
          amount_usd: amountUsd,
          split_payment: splitPayment ?? false,
          confirm_lose_unused_sessions: confirmLose,
          membership_request_id: pendingRequestId ?? null,
          use_credit: useCredit ?? false,
        }),
      })

    try {
      let res = await post(false)

      if (res.status === 409) {
        const body: { error?: string; sessions_remaining?: number } = await res.json().catch(() => ({}))
        if (body.error === 'unused_sessions_warning') {
          const ok = window.confirm(t('lose_sessions_body', { count: body.sessions_remaining ?? 0 }))
          if (!ok) {
            setPhase('result')
            return
          }
          res = await post(true)
        }
      }

      if (!res.ok) {
        setErrorKey('network_error')
        setPhase('error')
        return
      }
      // Re-fetch client data so result has the new active membership
      const fresh = await fetch(`/api/clients/${encodeURIComponent(result.client.id)}/checkin`)
      if (fresh.ok) {
        const freshData: CheckinResult = await fresh.json()
        setResult(freshData)
      }
      setPendingRequestId(null)
      setContractPlanId(null)
      setPhase('result')
    } catch {
      setErrorKey('network_error')
      setPhase('error')
    }
  }, [result, t, pendingRequestId])

  const handleRenewConfirm = useCallback(async () => {
    if (!result?.membership) return
    const plan = result.membership.membership_plans
    if (!plan?.price_usd) {
      setErrorKey('network_error')
      setPhase('error')
      return
    }
    try {
      const res = await fetch('/api/memberships/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: result.client.id,
          plan_id: result.membership.plan_id,
          amount_usd: plan.price_usd,
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

  const handleServiceVisit = useCallback(async (serviceTypeId: string, serviceName: string, priceUsd: number | null) => {
    if (!result) return
    setResultError(null)
    setPhase('registering_service')
    try {
      const res = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: result.client.id,
          membership_id: null,
          service_type_id: serviceTypeId,
          therapist_name: therapistName,
          ...(priceUsd !== null && priceUsd > 0 ? { amount_usd: priceUsd } : {}),
        }),
      })

      if (res.status === 402) {
        setSplitPaymentBlocked(true)
        setPhase('result')
        return
      }

      if (!res.ok) {
        const key = await parseVisitApiError(res)
        if (key === 'consent_required') {
          setResultError(key)
          setPhase('result')
          return
        }
        setErrorKey(key)
        setPhase('error')
        return
      }
      setSuccessInfo({
        title: tCheck('visit_registered'),
        detail: priceUsd !== null ? `${serviceName} — $${priceUsd}` : serviceName,
      })
      setPhase('success')
    } catch {
      setErrorKey('network_error')
      setPhase('error')
    }
  }, [result, tCheck, therapistName])

  const handleReferralComplete = useCallback(async (referrerId: string | null) => {
    if (!result) return
    setReferralChecked(true)
    try {
      await fetch(`/api/clients/${encodeURIComponent(result.client.id)}/referral`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referred_by_client_id: referrerId }),
      })
    } catch {
      // Non-fatal — proceed to assigning even if referral save fails
    }
    setPhase('assigning')
  }, [result])

  const handleContractSent = useCallback((
    requestId: string,
    planId: string,
    expiresAt: string,
    planName: string,
    planPrice: number,
  ) => {
    setPendingRequestId(requestId)
    setContractPlanId(planId)
    setContractExpiresAt(expiresAt)
    setContractPlanName(planName)
    setContractPlanPrice(planPrice)
    setPhase('waiting_signature')
  }, [])

  const handleContractSigned = useCallback(async () => {
    if (!result || !contractPlanId || contractPlanPrice === null || !pendingRequestId) {
      setPhase('result')
      return
    }
    setPhase('registering')
    try {
      const res = await fetch('/api/memberships/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: result.client.id,
          plan_id: contractPlanId,
          amount_usd: contractPlanPrice,
          split_payment: false,
          confirm_lose_unused_sessions: false,
          membership_request_id: pendingRequestId,
          use_credit: false,
        }),
      })
      setPendingRequestId(null)
      setContractPlanId(null)
      setContractExpiresAt(null)
      setContractPlanName('')
      setContractPlanPrice(null)
      if (!res.ok) {
        setErrorKey('network_error')
        setPhase('error')
        return
      }
      const freshData = await fetchCheckin(result.client.id)
      if (freshData) {
        setResult(freshData)
      }
      setPhase('membership_applied')
    } catch {
      setErrorKey('network_error')
      setPhase('error')
    }
  }, [result, contractPlanId, contractPlanPrice, pendingRequestId, fetchCheckin])

  const handleContractDeclined = useCallback(() => {
    setPendingRequestId(null)
    setContractPlanId(null)
    setContractExpiresAt(null)
    setContractPlanName('')
    setContractPlanPrice(null)
    setPhase('result')
  }, [])

  const handleContractExpired = useCallback(() => {
    setPendingRequestId(null)
    setContractPlanId(null)
    setContractExpiresAt(null)
    setContractPlanName('')
    setContractPlanPrice(null)
    setSuccessInfo({
      title: tContract('expired_notify_title'),
      detail: tContract('expired_notify_body', { name: result?.client.first_name ?? '' }),
    })
    setPhase('success')
  }, [tContract, result])

  const cameraPaused =
    phase === 'result' ||
    phase === 'registering' ||
    phase === 'registering_service' ||
    phase === 'renewing' ||
    phase === 'referral' ||
    phase === 'assigning' ||
    phase === 'assign_pack' ||
    phase === 'service_visit' ||
    phase === 'confirm_service' ||
    phase === 'confirming_split' ||
    phase === 'waiting_signature' ||
    phase === 'membership_applied' ||
    phase === 'additional_visit' ||
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
            {resultError && (
              <div className="mb-4 bg-amber-950/40 border border-amber-700/60 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-amber-300 text-sm leading-relaxed">{scanErrorMessage(resultError)}</p>
              </div>
            )}
            {result.membership_status !== 'active' ? (
              <UnifiedSelectPanel
                result={result}
                onScanAgain={reset}
                onContinue={(selection) => {
                  if (selection.type === 'plan') {
                    if (selection.isPack && selection.plan) {
                      // Packs: no contract needed — go directly to payment
                      setPackPlan(selection.plan)
                      setPhase('assign_pack')
                    } else {
                      setPreselectedPlanId(selection.planId)
                      if (result.is_first_membership && !referralChecked) {
                        setPhase('referral')
                      } else {
                        setPhase('assigning')
                      }
                    }
                  } else {
                    setSelectedService(selection.service)
                    setPhase('confirm_service')
                  }
                }}
              />
            ) : (
              <CheckinCard
                data={result}
                therapistName={therapistName}
                onTherapistChange={setTherapistName}
                onScanAgain={reset}
                onRegisterVisit={handleRegisterVisit}
                onAssignMembership={() => result?.is_first_membership && !referralChecked ? setPhase('referral') : setPhase('assigning')}
                onChangePlan={() => setPhase('assigning')}
                onRegisterServiceVisit={() => setPhase('service_visit')}
                onConfirmSplitPayment={() => setPhase('confirming_split')}
                onRegisterAdditionalVisit={() => setPhase('additional_visit')}
                splitPaymentBlocked={splitPaymentBlocked}
              />
            )}
          </div>
        )}

        {phase === 'confirm_service' && result && selectedService && (
          <div className="w-full max-w-md">
            <ConfirmServicePanel
              result={result}
              service={selectedService}
              therapistName={therapistName}
              onTherapistChange={setTherapistName}
              onConfirm={() => handleServiceVisit(selectedService.id, locale === 'es' ? selectedService.name_es : selectedService.name_en, selectedService.price_usd)}
              onCancel={() => { setSelectedService(null); setPhase('result') }}
            />
          </div>
        )}

        {phase === 'service_visit' && result && (
          <div className="w-full max-w-md">
            <ServiceVisitPanel
              result={result}
              therapistName={therapistName}
              onTherapistChange={setTherapistName}
              onConfirm={handleServiceVisit}
              onCancel={() => setPhase('result')}
            />
          </div>
        )}

        {(phase === 'registering' || phase === 'registering_service') && (
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

        {phase === 'referral' && result && (
          <div className="w-full max-w-md">
            <ReferralPanel
              result={result}
              onComplete={handleReferralComplete}
            />
          </div>
        )}

        {phase === 'assigning' && result && (
          <div className="w-full max-w-md">
            <RequestContractPanel
              result={result}
              initialPlanId={preselectedPlanId}
              onSent={handleContractSent}
              onCancel={() => setPhase('result')}
            />
          </div>
        )}

        {phase === 'assign_pack' && result && packPlan && (
          <div className="w-full max-w-md">
            <AssignPackPanel
              result={result}
              plan={packPlan}
              onConfirm={handleAssignConfirm}
              onCancel={() => { setPackPlan(null); setPhase('result') }}
            />
          </div>
        )}

        {phase === 'membership_applied' && result && (
          <div className="w-full max-w-md flex flex-col items-center gap-6 text-center">
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-green-500 shadow-lg shadow-green-900/40">
              <CheckCircle2 size={40} className="text-white" />
            </div>
            <div>
              <p className="text-green-400 text-sm font-semibold uppercase tracking-widest mb-1">
                {locale === 'es' ? 'Membresía aplicada' : 'Membership applied'}
              </p>
              <h2 className="text-3xl font-bold text-white">
                {result.client.first_name} {result.client.last_name}
              </h2>
              <p className="text-slate-400 text-base mt-1">{contractPlanName}</p>
            </div>
            <p className="text-slate-300 text-base">
              {locale === 'es' ? '¿Querés registrar una visita ahora?' : 'Do you want to register a visit now?'}
            </p>
            {!result.has_active_consent && (
              <div className="w-full bg-amber-950/40 border border-amber-700/60 rounded-xl p-4 flex items-start gap-3 text-left">
                <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-amber-300 text-sm leading-relaxed">
                  {scanErrorMessage('consent_required')}
                </p>
              </div>
            )}
            <div className="w-full flex flex-col gap-3">
              <button
                onClick={handleRegisterVisit}
                disabled={!result.has_active_consent}
                className="w-full h-16 rounded-xl bg-green-500 hover:bg-green-400 active:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xl font-bold transition-colors"
              >
                {locale === 'es' ? 'Registrar visita' : 'Register visit'}
              </button>
              <button
                onClick={reset}
                className="w-full h-12 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-base font-medium transition-colors"
              >
                {locale === 'es' ? 'Escanear otro' : 'Scan another'}
              </button>
            </div>
          </div>
        )}

        {phase === 'waiting_signature' && result && pendingRequestId && contractExpiresAt && (
          <div className="w-full max-w-md">
            <WaitingSignaturePanel
              requestId={pendingRequestId}
              expiresAt={contractExpiresAt}
              clientName={`${result.client.first_name} ${result.client.last_name}`}
              planName={contractPlanName}
              onSigned={handleContractSigned}
              onDeclined={handleContractDeclined}
              onExpired={handleContractExpired}
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

        {phase === 'additional_visit' && result && (
          <div className="w-full max-w-md">
            <AdditionalVisitPanel
              result={result}
              onConfirm={handleAdditionalVisitConfirm}
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
              {errorKey === 'client_not_found' ? (
                <UserX size={44} className="text-red-400 mx-auto mb-4" />
              ) : errorKey === 'network_error' ? (
                <WifiOff size={44} className="text-red-400 mx-auto mb-4" />
              ) : (
                <AlertTriangle size={44} className="text-red-400 mx-auto mb-4" />
              )}
              <h2 className="text-2xl font-bold text-white mb-2">
                {scanErrorMessage(errorKey)}
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
            <button
              onClick={() => window.location.reload()}
              className="w-full h-14 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-lg font-semibold transition-colors"
            >
              {t('camera_reload')}
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface RenewPanelProps {
  result: CheckinResult
  onConfirm: () => Promise<void>
  onCancel: () => void
}

function RenewPanel({ result, onConfirm, onCancel }: RenewPanelProps) {
  const t = useTranslations('checkin')
  const tScan = useTranslations('scan')
  const locale = useLocale() as 'en' | 'es'

  const [submitting, setSubmitting] = useState(false)

  const plan = result.membership?.membership_plans
  const planName = plan ? (locale === 'es' ? plan.name_es : plan.name_en) : null
  const amount = plan?.price_usd ?? 80

  const handleConfirm = async () => {
    if (submitting) return
    setSubmitting(true)
    await onConfirm()
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
            {tScan('per_month_short')}
          </span>
        </p>
      </div>

      <div className="flex flex-col gap-3 pt-2">
        <button onClick={handleConfirm} disabled={submitting}
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


// ─── Additional Visit Panel ───────────────────────────────────────────────────

interface AdditionalVisitPanelProps {
  result: CheckinResult
  onConfirm: (useCredit: boolean) => Promise<void>
  onCancel: () => void
}

function AdditionalVisitPanel({ result, onConfirm, onCancel }: AdditionalVisitPanelProps) {
  const t = useTranslations('checkin')
  const locale = useLocale() as 'en' | 'es'

  const [submitting, setSubmitting] = useState(false)
  const [useCredit, setUseCredit] = useState(false)

  const plan = result.membership?.membership_plans
  const planName = plan ? (locale === 'es' ? plan.name_es : plan.name_en) : ''
  const price = plan?.additional_price_usd ?? plan?.price_usd ?? 0
  const creditBalance = result.client.credit_balance
  const creditApplied = useCredit ? Math.min(creditBalance, price) : 0
  const finalPrice = Math.max(0, price - creditApplied)

  const handleConfirm = async () => {
    if (submitting) return
    setSubmitting(true)
    await onConfirm(useCredit)
  }

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-500/20">
          <CreditCard size={18} className="text-amber-400" />
        </div>
        <span className="text-amber-400 text-lg font-semibold uppercase tracking-wide">
          {locale === 'es' ? 'Visita extra' : 'Additional visit'}
        </span>
      </div>

      <h2 className="text-2xl md:text-4xl font-bold text-white leading-tight">
        {result.client.first_name} {result.client.last_name}
      </h2>

      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 flex items-center justify-between">
        <span className="font-semibold text-white">{planName}</span>
        <span className="text-lg font-bold text-amber-300 ml-4 flex-shrink-0">${price}</span>
      </div>

      {creditBalance > 0 && (
        <button
          onClick={() => setUseCredit(v => !v)}
          disabled={submitting}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${useCredit ? 'bg-green-600/30 border border-green-500/60 text-green-300' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
        >
          <span className="flex items-center gap-2">
            <Gift size={16} className={useCredit ? 'text-green-400' : 'text-slate-400'} />
            {t('credit_use', { amount: creditBalance })}
          </span>
          {useCredit && <Check size={16} className="text-green-400 flex-shrink-0" />}
        </button>
      )}

      <div className="flex flex-col gap-3 pt-2">
        <button onClick={handleConfirm} disabled={submitting}
          className="w-full h-16 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xl font-bold transition-colors">
          {submitting ? t('assigning') : `${locale === 'es' ? 'Confirmar — $' : 'Confirm — $'}${finalPrice}`}
        </button>
        <button onClick={onCancel} disabled={submitting}
          className="w-full h-12 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-300 text-base font-medium transition-colors">
          {t('cancel')}
        </button>
      </div>
    </div>
  )
}

// ─── Referral Panel ───────────────────────────────────────────────────────────

interface MemberSearchResult {
  id: string
  first_name: string
  last_name: string
  plan_name_en: string
  plan_name_es: string
}

interface ReferralPanelProps {
  result: CheckinResult
  onComplete: (referrerId: string | null) => Promise<void>
}

function ReferralPanel({ result, onComplete }: ReferralPanelProps) {
  const t = useTranslations('checkin')
  const locale = useLocale() as 'en' | 'es'

  const [query, setQuery] = useState('')
  const [members, setMembers] = useState<MemberSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<MemberSearchResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (query.trim().length < 2) { setMembers([]); setSearching(false); return }
    setSearching(true)
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/clients/members-search?q=${encodeURIComponent(query.trim())}&exclude=${encodeURIComponent(result.client.id)}`)
        const data: MemberSearchResult[] = res.ok ? await res.json() : []
        setMembers(data)
      } catch {
        setMembers([])
      } finally {
        setSearching(false)
      }
    }, 350)
  }, [query, result.client.id])

  const handleSubmit = async (referrerId: string | null) => {
    if (submitting) return
    setSubmitting(true)
    await onComplete(referrerId)
  }

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-500/20">
          <Gift size={18} className="text-purple-400" />
        </div>
        <span className="text-purple-400 text-lg font-semibold uppercase tracking-wide">
          {t('referral_title')}
        </span>
      </div>

      <h2 className="text-2xl md:text-4xl font-bold text-white leading-tight">
        {result.client.first_name} {result.client.last_name}
      </h2>

      <p className="text-slate-400 text-sm leading-relaxed">{t('referral_subtitle')}</p>

      {/* Search input */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setSelected(null) }}
          placeholder={t('referral_search_placeholder')}
          disabled={submitting}
          className="w-full h-12 bg-slate-700 rounded-xl pl-9 pr-4 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50"
        />
      </div>

      {/* Search results */}
      {searching && (
        <p className="text-slate-400 text-sm">{t('referral_searching')}</p>
      )}
      {!searching && query.trim().length >= 2 && members.length === 0 && (
        <p className="text-slate-500 text-sm">{t('referral_no_results')}</p>
      )}
      {members.length > 0 && (
        <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-1">
          {members.map(m => {
            const isSelected = selected?.id === m.id
            const planName = locale === 'es' ? m.plan_name_es : m.plan_name_en
            return (
              <button
                key={m.id}
                onClick={() => setSelected(isSelected ? null : m)}
                disabled={submitting}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-colors disabled:opacity-50 ${isSelected ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
              >
                <div>
                  <span className="font-semibold block">{m.first_name} {m.last_name}</span>
                  <span className={`text-xs ${isSelected ? 'text-purple-200' : 'text-slate-400'}`}>{planName}</span>
                </div>
                {isSelected && <Check size={16} className="text-white flex-shrink-0" />}
              </button>
            )
          })}
        </div>
      )}

      <div className="flex flex-col gap-3 pt-2">
        {selected && (
          <button
            onClick={() => handleSubmit(selected.id)}
            disabled={submitting}
            className="w-full h-16 rounded-xl bg-purple-600 hover:bg-purple-500 active:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-base font-bold transition-colors"
          >
            {submitting ? <Loader2 size={20} className="animate-spin mx-auto" /> : t('referral_confirm', { name: `${selected.first_name} ${selected.last_name}` })}
          </button>
        )}
        <button
          onClick={() => handleSubmit(null)}
          disabled={submitting}
          className="w-full h-12 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-300 text-sm font-medium transition-colors"
        >
          {t('referral_continue_no_referral')}
        </button>
      </div>
    </div>
  )
}

interface ConfirmSplitPanelProps {
  result: CheckinResult
  onConfirm: () => Promise<void>
  onCancel: () => void
}

function ConfirmSplitPanel({ result, onConfirm, onCancel }: ConfirmSplitPanelProps) {
  const t = useTranslations('checkin')
  const tScan = useTranslations('scan')

  const [submitting, setSubmitting] = useState(false)

  const plan = result.membership?.membership_plans
  const secondAmount =
    plan && plan.split_first_amount != null ? plan.price_usd - plan.split_first_amount : 0

  const handleConfirm = async () => {
    if (submitting) return
    setSubmitting(true)
    await onConfirm()
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

      <div className="flex flex-col gap-3 pt-2">
        <button onClick={handleConfirm} disabled={submitting}
          className="w-full h-16 rounded-xl bg-brand-500 hover:bg-brand-400 active:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xl font-bold transition-colors">
          {submitting ? tScan('confirming_split') : tScan('confirm_split')}
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
  therapistName: string
  onTherapistChange: (name: string) => void
  onConfirm: (serviceTypeId: string, serviceName: string, priceUsd: number | null) => Promise<void>
  onCancel: () => void
}

function ServiceVisitPanel({ result, therapistName, onTherapistChange, onConfirm, onCancel }: ServiceVisitPanelProps) {
  const t = useTranslations('checkin')
  const tScan = useTranslations('scan')
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
    const service = services.find(s => s.id === selectedId)
    if (!service) return
    setSubmitting(true)
    await onConfirm(selectedId, locale === 'es' ? service.name_es : service.name_en, service.price_usd)
  }

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-brand-500/20">
          <Star size={18} className="text-brand-400" />
        </div>
        <span className="text-brand-400 text-lg font-semibold uppercase tracking-wide">
          {tScan('register_visit')}
        </span>
      </div>

      <h2 className="text-2xl md:text-4xl font-bold text-white leading-tight">
        {result.client.first_name} {result.client.last_name}
      </h2>

      <TherapistSelector
        value={therapistName}
        onChange={onTherapistChange}
        disabled={submitting}
      />

      <div>
        <p className="text-slate-400 text-xs uppercase tracking-wide mb-3">
          {tScan('service_question')}
        </p>
        {loading ? (
          <p className="text-slate-400 text-sm">{t('loading_plans')}</p>
        ) : services.length === 0 ? (
          <p className="text-slate-400 text-sm">{tScan('no_services')}</p>
        ) : (
          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
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
          {submitting ? tScan('registering_visit') : tScan('confirm_visit')}
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

// ─── Request Contract Panel ───────────────────────────────────────────────────

interface RequestContractPanelProps {
  result: CheckinResult
  initialPlanId?: string | null
  onSent: (requestId: string, planId: string, expiresAt: string, planName: string, planPrice: number) => void
  onCancel: () => void
}

function RequestContractPanel({ result, initialPlanId, onSent, onCancel }: RequestContractPanelProps) {
  const t = useTranslations('checkin')
  const tScan = useTranslations('scan')
  const tContract = useTranslations('membership_contract')
  const loc = useLocale() as 'en' | 'es'

  const [plans, setPlans] = useState<PlanOption[]>([])
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(initialPlanId ?? null)
  const [language, setLanguage] = useState<'en' | 'es'>(
    result.client.preferred_language === 'es' ? 'es' : 'en'
  )
  const [showContractPreview, setShowContractPreview] = useState(false)
  const [adminSignature, setAdminSignature] = useState<string | null>(null)
  const [adminSigError, setAdminSigError] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/membership-plans')
      .then(r => r.json())
      // Contract flow is only for monthly plans — packs are assigned directly without contract
      .then((data: PlanOption[]) => { setPlans(data.filter(p => p.plan_type !== 'pack')); setLoadingPlans(false) })
      .catch(() => setLoadingPlans(false))
  }, [])

  const selectedPlan = plans.find(p => p.id === selectedPlanId) ?? null

  async function handleSend() {
    if (!selectedPlanId || !selectedPlan || sending) return
    if (!adminSignature) {
      setAdminSigError(true)
      return
    }
    setAdminSigError(false)
    setError(null)
    setSending(true)
    try {
      const res = await fetch('/api/membership-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: result.client.id,
          plan_id: selectedPlanId,
          language,
          admin_signature_image: adminSignature,
        }),
      })
      if (res.status === 409) {
        setError(tContract('conflict_pending'))
        setSending(false)
        return
      }
      if (!res.ok) {
        setError(tContract('error_send'))
        setSending(false)
        return
      }
      const data: { id: string; expires_at: string } = await res.json()
      const planName = loc === 'es' ? selectedPlan.name_es : selectedPlan.name_en
      onSent(data.id, selectedPlanId, data.expires_at, planName, selectedPlan.price_usd)
    } catch {
      setError(tContract('error_send'))
      setSending(false)
    }
  }

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-brand-500/20">
          <FileText size={18} className="text-brand-400" />
        </div>
        <span className="text-brand-400 text-lg font-semibold uppercase tracking-wide">
          {tContract('send_contract')}
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
            {plans.map(plan => {
              const isPack = plan.plan_type === 'pack'
              const isSelected = selectedPlanId === plan.id
              return (
                <button key={plan.id} onClick={() => setSelectedPlanId(plan.id)} disabled={sending}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-colors disabled:opacity-50 ${isSelected ? 'bg-brand-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                  <div>
                    <span className="font-semibold block">
                      {loc === 'es' ? plan.name_es : plan.name_en}
                    </span>
                    {isPack && (
                      <span className={`text-xs ${isSelected ? 'text-brand-100' : 'text-slate-400'}`}>
                        {t('pack_sessions_post_op', { count: plan.total_sessions ?? 0 })} · {t('pack_expires_in_2_months')}
                      </span>
                    )}
                  </div>
                  <span className="text-lg font-bold ml-4 flex-shrink-0">
                    ${plan.price_usd}
                    {!isPack && (
                      <span className="text-xs font-normal opacity-75 ml-1">{tScan('per_month_short')}</span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Language selector */}
      <div>
        <p className="text-slate-400 text-xs uppercase tracking-wide mb-3">Contract language</p>
        <div className="grid grid-cols-2 gap-2">
          {(['en', 'es'] as const).map(lang => (
            <button key={lang} onClick={() => setLanguage(lang)} disabled={sending}
              className={`h-11 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 ${language === lang ? 'bg-brand-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
              {lang === 'en' ? 'English' : 'Español'}
            </button>
          ))}
        </div>
      </div>

      {/* Contract preview (collapsible) */}
      {selectedPlan && (
        <div>
          <button
            onClick={() => setShowContractPreview(v => !v)}
            className="text-brand-400 text-xs underline underline-offset-2"
          >
            {showContractPreview
              ? tContract('contract_preview_hide')
              : tContract('contract_preview_show')}
          </button>
          {showContractPreview && (() => {
            const tmpl = getBasicContractTemplate(language)
            return (
              <div className="mt-3 bg-slate-800 rounded-xl p-4 max-h-64 overflow-y-auto space-y-3">
                <p className="text-white text-xs font-bold uppercase">{tmpl.slide3_contract_title}</p>
                <p className="text-slate-400 text-xs leading-relaxed">{tmpl.slide3_preamble}</p>
                <p className="text-white text-xs font-bold uppercase">{tmpl.slide4_title}</p>
                <p className="text-slate-400 text-xs leading-relaxed whitespace-pre-wrap">{tmpl.slide4_benefits}</p>
                <p className="text-white text-xs font-bold uppercase">{tmpl.slide5_title}</p>
                <p className="text-slate-400 text-xs leading-relaxed whitespace-pre-wrap">{tmpl.slide5_terms}</p>
              </div>
            )
          })()}
        </div>
      )}

      {/* Admin signature */}
      <div className="space-y-2">
        <p className="text-slate-400 text-xs uppercase tracking-wide">
          {tContract('admin_sig_label')}
        </p>
        <div className="rounded-xl overflow-hidden border border-slate-600">
          <SignaturePad
            label=""
            clearLabel={tContract('admin_sig_clear')}
            onSignature={(dataUrl) => {
              setAdminSignature(dataUrl)
              if (dataUrl) setAdminSigError(false)
            }}
          />
        </div>
        {adminSigError && (
          <p className="text-red-400 text-xs">{tContract('admin_sig_required')}</p>
        )}
      </div>

      {error && (
        <p className="text-red-400 text-sm bg-red-950/40 border border-red-800/60 rounded-xl px-4 py-3">{error}</p>
      )}

      <div className="flex flex-col gap-3 pt-2">
        <button onClick={handleSend} disabled={!selectedPlanId || !adminSignature || sending}
          className="w-full h-16 rounded-xl bg-brand-500 hover:bg-brand-400 active:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xl font-bold transition-colors flex items-center justify-center gap-2">
          {sending ? (
            <><Loader2 size={20} className="animate-spin" />{tContract('sending_contract')}</>
          ) : tContract('send_contract')}
        </button>
        <button onClick={onCancel} disabled={sending}
          className="w-full h-12 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-300 text-base font-medium transition-colors">
          {t('cancel')}
        </button>
      </div>
    </div>
  )
}

// ─── Waiting Signature Panel ──────────────────────────────────────────────────

interface WaitingSignaturePanelProps {
  requestId: string
  expiresAt: string
  clientName: string
  planName: string
  onSigned: () => void
  onDeclined: () => void
  onExpired: () => void
}

function WaitingSignaturePanel({
  requestId,
  expiresAt,
  clientName,
  planName,
  onSigned,
  onDeclined,
  onExpired,
}: WaitingSignaturePanelProps) {
  const tContract = useTranslations('membership_contract')
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    function tick() {
      const remaining = Math.max(
        0,
        Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)
      )
      setSecondsLeft(remaining)
      if (remaining === 0) onExpired()
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [expiresAt, onExpired])

  useEffect(() => {
    const supabase = createClient()

    // Realtime subscription
    const channel = supabase
      .channel(`membership_request:${requestId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'membership_requests', filter: `id=eq.${requestId}` },
        (payload: { new: Record<string, unknown> }) => {
          const status = payload.new['status'] as string
          if (status === 'signed') onSigned()
          if (status === 'declined') onDeclined()
          if (status === 'expired') onExpired()
        }
      )
      .subscribe()

    // Polling fallback every 2s in case Realtime misses the event
    let active = true
    const pollId = setInterval(async () => {
      if (!active) return
      const { data } = await supabase
        .from('membership_requests')
        .select('status')
        .eq('id', requestId)
        .single()
      if (!active) return
      if (data?.status === 'signed')   { onSigned();  active = false }
      if (data?.status === 'declined') { onDeclined(); active = false }
      if (data?.status === 'expired')  { onExpired();  active = false }
    }, 2000)

    return () => {
      active = false
      clearInterval(pollId)
      supabase.removeChannel(channel)
    }
  }, [requestId, onSigned, onDeclined, onExpired])

  function formatCountdown(s: number): string {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  async function handleCancel() {
    setCancelling(true)
    try {
      await fetch(`/api/membership-requests/${requestId}`, { method: 'DELETE' })
    } catch {
      // ignore — proceed anyway
    }
    onDeclined()
  }

  return (
    <div className="w-full flex flex-col items-center gap-6 text-center">
      {/* Animated waiting icon */}
      <div className="relative flex items-center justify-center w-20 h-20">
        <div className="absolute inset-0 rounded-full bg-brand-500/20 animate-ping" />
        <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-brand-500/10 border border-brand-500/30">
          <FileText size={32} className="text-brand-400" />
        </div>
      </div>

      <div>
        <p className="text-brand-400 text-sm font-semibold uppercase tracking-widest mb-1">
          {tContract('waiting_title')}
        </p>
        <h2 className="text-2xl md:text-4xl font-bold text-white leading-tight">{clientName}</h2>
        <p className="text-slate-400 text-base mt-1">{planName}</p>
      </div>

      <p className="text-slate-300 text-base leading-relaxed max-w-xs">
        {tContract('waiting_body', { name: clientName })}
      </p>

      {/* Countdown */}
      <div className="bg-slate-800 rounded-xl px-6 py-4">
        <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">
          {tContract('waiting_expires_in')}
        </p>
        <p className={`text-3xl font-mono font-bold ${secondsLeft < 300 ? 'text-red-400' : 'text-brand-400'}`}>
          {formatCountdown(secondsLeft)}
        </p>
      </div>

      <button
        onClick={handleCancel}
        disabled={cancelling}
        className="w-full max-w-xs h-12 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-300 text-sm font-medium transition-colors flex items-center justify-center gap-2"
      >
        {cancelling ? (
          <><Loader2 size={14} className="animate-spin" />{tContract('cancelling_request')}</>
        ) : tContract('cancel_request')}
      </button>
    </div>
  )
}

// ─── Unified Select Panel ─────────────────────────────────────────────────────

type UnifiedSelection =
  | { type: 'plan'; planId: string; isPack: boolean; plan: PlanOption | null }
  | { type: 'service'; service: { id: string; name_en: string; name_es: string; price_usd: number | null } }

interface UnifiedSelectPanelProps {
  result: CheckinResult
  onScanAgain: () => void
  onContinue: (selection: UnifiedSelection) => void
}

function UnifiedSelectPanel({ result, onScanAgain, onContinue }: UnifiedSelectPanelProps) {
  const t = useTranslations('checkin')
  const tScan = useTranslations('scan')
  const locale = useLocale() as 'en' | 'es'

  const [plans, setPlans] = useState<PlanOption[]>([])
  const [services, setServices] = useState<ServiceType[]>([])
  const [loading, setLoading] = useState(true)
  const [selection, setSelection] = useState<UnifiedSelection | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/membership-plans').then(r => r.json()).catch(() => []),
      fetch('/api/service-types').then(r => r.json()).catch(() => []),
    ]).then(([p, s]: [PlanOption[], ServiceType[]]) => {
      setPlans(p)
      setServices(s)
      setLoading(false)
    })
  }, [])

  const isPlanSelected = (id: string) => selection?.type === 'plan' && selection.planId === id
  const isServiceSelected = (id: string) => selection?.type === 'service' && selection.service.id === id

  return (
    <div className="w-full flex flex-col gap-5">
      <h2 className="text-2xl md:text-4xl font-bold text-white leading-tight">
        {result.client.first_name} {result.client.last_name}
      </h2>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 size={32} className="text-brand-400 animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-1 max-h-[52vh] overflow-y-auto pr-1">

          {/* Memberships section */}
          {plans.length > 0 && (
            <>
              <p className="text-slate-400 text-xs uppercase tracking-wide mb-2 mt-1">
                {locale === 'es' ? 'Membresías' : 'Memberships'}
              </p>
              {plans.map(plan => {
                const isSelected = isPlanSelected(plan.id)
                const isPack = plan.plan_type === 'pack'
                return (
                  <button
                    key={plan.id}
                    onClick={() => setSelection({ type: 'plan', planId: plan.id, isPack: plan.plan_type === 'pack', plan })}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-colors mb-1 ${
                      isSelected ? 'bg-brand-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    <div>
                      <span className="font-semibold block">{locale === 'es' ? plan.name_es : plan.name_en}</span>
                      {isPack && plan.total_sessions && (
                        <span className={`text-xs ${isSelected ? 'text-brand-100' : 'text-slate-400'}`}>
                          {t('pack_sessions_post_op', { count: plan.total_sessions })}
                        </span>
                      )}
                    </div>
                    <span className="text-lg font-bold ml-4 flex-shrink-0">
                      ${plan.price_usd}
                      {!isPack && <span className="text-xs font-normal opacity-75 ml-1">{tScan('per_month_short')}</span>}
                    </span>
                  </button>
                )
              })}
            </>
          )}

          {/* Services section */}
          {services.length > 0 && (
            <>
              <p className="text-slate-400 text-xs uppercase tracking-wide mb-2 mt-3">
                {locale === 'es' ? 'Servicios' : 'Services'}
              </p>
              {services.map(s => {
                const isSelected = isServiceSelected(s.id)
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelection({ type: 'service', service: { id: s.id, name_en: s.name_en, name_es: s.name_es, price_usd: s.price_usd } })}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-colors mb-1 ${
                      isSelected ? 'bg-slate-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    <div>
                      <span className="font-semibold block">{locale === 'es' ? s.name_es : s.name_en}</span>
                      {s.duration_minutes && (
                        <span className={`text-xs ${isSelected ? 'text-slate-200' : 'text-slate-400'}`}>
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
            </>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 pt-1">
        <button
          onClick={() => selection && onContinue(selection)}
          disabled={!selection}
          className="w-full h-16 rounded-xl bg-brand-500 hover:bg-brand-400 active:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xl font-bold transition-colors"
        >
          {locale === 'es' ? 'Continuar' : 'Continue'}
        </button>
        <button
          onClick={onScanAgain}
          className="w-full h-12 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-base font-medium transition-colors"
        >
          {tScan('scan_again')}
        </button>
      </div>
    </div>
  )
}

// ─── Confirm Service Panel ────────────────────────────────────────────────────

interface ConfirmServicePanelProps {
  result: CheckinResult
  service: { id: string; name_en: string; name_es: string; price_usd: number | null }
  therapistName: string
  onTherapistChange: (name: string) => void
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmServicePanel({ result, service, therapistName, onTherapistChange, onConfirm, onCancel }: ConfirmServicePanelProps) {
  const tScan = useTranslations('scan')
  const tCheck = useTranslations('checkin')
  const locale = useLocale() as 'en' | 'es'
  const [submitting, setSubmitting] = useState(false)

  const serviceName = locale === 'es' ? service.name_es : service.name_en

  const handleConfirm = () => {
    if (submitting) return
    setSubmitting(true)
    onConfirm()
  }

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-500/20">
          <CheckCircle2 size={18} className="text-green-400" />
        </div>
        <span className="text-green-400 text-lg font-semibold uppercase tracking-wide">
          {locale === 'es' ? 'Confirmar visita' : 'Confirm visit'}
        </span>
      </div>

      <h2 className="text-2xl md:text-4xl font-bold text-white leading-tight">
        {result.client.first_name} {result.client.last_name}
      </h2>

      <div className="bg-slate-800 rounded-xl px-4 py-3 flex items-center justify-between">
        <span className="font-semibold text-white">{serviceName}</span>
        {service.price_usd !== null && (
          <span className="text-lg font-bold text-green-400 ml-4 flex-shrink-0">${service.price_usd}</span>
        )}
      </div>

      <TherapistSelector
        value={therapistName}
        onChange={onTherapistChange}
        disabled={submitting}
      />

      <div className="flex flex-col gap-3 pt-2">
        <button
          onClick={handleConfirm}
          disabled={submitting}
          className="w-full h-16 rounded-xl bg-green-500 hover:bg-green-400 active:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xl font-bold transition-colors flex items-center justify-center gap-2"
        >
          {submitting
            ? <><Loader2 size={20} className="animate-spin" />{tScan('registering_visit')}</>
            : service.price_usd !== null
              ? `${tScan('confirm_visit')} — $${service.price_usd}`
              : tScan('confirm_visit')
          }
        </button>
        <button
          onClick={onCancel}
          disabled={submitting}
          className="w-full h-12 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-300 text-base font-medium transition-colors"
        >
          {tCheck('cancel')}
        </button>
      </div>
    </div>
  )
}

// ─── Assign Pack Panel ────────────────────────────────────────────────────────

interface AssignPackPanelProps {
  result: CheckinResult
  plan: PlanOption
  onConfirm: (planId: string, amountUsd: number, splitPayment?: boolean, useCredit?: boolean) => Promise<void>
  onCancel: () => void
}

function AssignPackPanel({ result, plan, onConfirm, onCancel }: AssignPackPanelProps) {
  const tCheck = useTranslations('checkin')
  const locale = useLocale() as 'en' | 'es'
  const [submitting, setSubmitting] = useState(false)
  const [useCredit, setUseCredit] = useState(false)

  const planName = locale === 'es' ? plan.name_es : plan.name_en
  const creditBalance = result.client.credit_balance
  const creditApplied = useCredit ? Math.min(creditBalance, plan.price_usd) : 0
  const paymentAmount = Math.max(0, plan.price_usd - creditApplied)

  const handleConfirm = async () => {
    if (submitting) return
    setSubmitting(true)
    await onConfirm(plan.id, plan.price_usd, false, useCredit)
  }

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-brand-500/20">
          <Star size={18} className="text-brand-400" />
        </div>
        <span className="text-brand-400 text-lg font-semibold uppercase tracking-wide">
          {locale === 'es' ? 'Comprar pack' : 'Buy pack'}
        </span>
      </div>

      <h2 className="text-2xl md:text-4xl font-bold text-white leading-tight">
        {result.client.first_name} {result.client.last_name}
      </h2>

      {/* Pack summary */}
      <div className="bg-slate-800 rounded-xl p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-white">{planName}</span>
          <span className="text-2xl font-bold text-brand-400">${plan.price_usd}</span>
        </div>
        {plan.total_sessions && (
          <p className="text-slate-400 text-sm">
            {tCheck('pack_sessions_post_op', { count: plan.total_sessions })} · {tCheck('pack_expires_in_2_months')}
          </p>
        )}
      </div>

      {/* Credit toggle */}
      {creditBalance > 0 && (
        <button
          onClick={() => setUseCredit(v => !v)}
          disabled={submitting}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${useCredit ? 'bg-green-600/30 border border-green-500/60 text-green-300' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
        >
          <span className="flex items-center gap-2">
            <Gift size={16} className={useCredit ? 'text-green-400' : 'text-slate-400'} />
            {tCheck('credit_use', { amount: creditBalance })}
          </span>
          {useCredit && <Check size={16} className="text-green-400 flex-shrink-0" />}
        </button>
      )}

      <div className="flex flex-col gap-3 pt-2">
        <button
          onClick={handleConfirm}
          disabled={submitting}
          className="w-full h-16 rounded-xl bg-brand-500 hover:bg-brand-400 active:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xl font-bold transition-colors"
        >
          {submitting ? tCheck('assigning') : `${tCheck('assign_confirm')} — $${paymentAmount}`}
        </button>
        <button
          onClick={onCancel}
          disabled={submitting}
          className="w-full h-12 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-300 text-base font-medium transition-colors"
        >
          {tCheck('cancel')}
        </button>
      </div>
    </div>
  )
}

// ─── Success Panel ────────────────────────────────────────────────────────────

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
