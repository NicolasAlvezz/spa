'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { Clock, CheckCircle2, XCircle, AlertTriangle, Calendar, Loader2 } from 'lucide-react'

const SignaturePad = dynamic(
  () => import('@/components/spa/SignaturePad').then(m => m.SignaturePad),
  { ssr: false, loading: () => <div className="h-[160px] rounded-xl border-2 border-dashed border-gray-200 bg-gray-50" /> }
)

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PendingContractData {
  id: string
  terms_title: string
  terms_body: string
  expires_at: string
  membership_plans: {
    name_en: string
    name_es: string
    price_usd: number
    plan_type: string
  }
}

export interface MembershipHistoryItem {
  id: string
  status: 'active' | 'expired' | 'cancelled'
  started_at: string
  expires_at: string
  sessions_remaining: number | null
  membership_plans: {
    name_en: string
    name_es: string
    price_usd: number
    plan_type: string
  }
}

interface Props {
  pendingRequest: PendingContractData | null
  memberships: MembershipHistoryItem[]
  locale: 'en' | 'es'
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatDate(iso: string, locale: 'en' | 'es'): string {
  return new Date(iso).toLocaleDateString(locale === 'es' ? 'es-US' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// ─── Pending contract card ────────────────────────────────────────────────────

type ContractState = 'pending' | 'signing' | 'signed' | 'declining' | 'declined' | 'expired' | 'error'

function PendingContractCard({
  request,
  locale,
}: {
  request: PendingContractData
  locale: 'en' | 'es'
}) {
  const t = useTranslations('membership_contract')
  const [contractState, setContractState] = useState<ContractState>('pending')
  const [error, setError] = useState<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [signature, setSignature] = useState<string | null>(null)
  const [signatureError, setSignatureError] = useState(false)

  const plan = request.membership_plans
  const planName = locale === 'es' ? plan.name_es : plan.name_en

  useEffect(() => {
    function tick() {
      const remaining = Math.max(
        0,
        Math.floor((new Date(request.expires_at).getTime() - Date.now()) / 1000)
      )
      setSecondsLeft(remaining)
      if (remaining === 0) setContractState(prev => (prev === 'pending' ? 'expired' : prev))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [request.expires_at])

  async function handleSign() {
    if (!signature) {
      setSignatureError(true)
      return
    }
    setSignatureError(false)
    setError(null)
    setContractState('signing')
    const res = await fetch(`/api/membership-requests/${request.id}/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signature_image: signature }),
    })
    if (res.ok) {
      setContractState('signed')
    } else if (res.status === 410) {
      setContractState('expired')
    } else {
      setError(t('error_sign'))
      setContractState('pending')
    }
  }

  async function handleDecline() {
    setError(null)
    setContractState('declining')
    const res = await fetch(`/api/membership-requests/${request.id}/decline`, { method: 'POST' })
    if (res.ok) {
      setContractState('declined')
    } else {
      setError(t('error_decline'))
      setContractState('pending')
    }
  }

  if (contractState === 'signed') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <CheckCircle2 size={22} className="text-green-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-green-800">{t('signed_title')}</p>
            <p className="text-sm text-green-700 mt-0.5">{t('signed_body')}</p>
          </div>
        </div>
      </div>
    )
  }

  if (contractState === 'declined') {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <XCircle size={22} className="text-gray-500 flex-shrink-0" />
          <div>
            <p className="font-semibold text-gray-700">{t('declined_title')}</p>
            <p className="text-sm text-gray-500 mt-0.5">{t('declined_body')}</p>
          </div>
        </div>
      </div>
    )
  }

  if (contractState === 'expired') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <AlertTriangle size={22} className="text-amber-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-amber-800">{t('expired_title')}</p>
            <p className="text-sm text-amber-700 mt-0.5">{t('expired_body')}</p>
          </div>
        </div>
      </div>
    )
  }

  const isBusy = contractState === 'signing' || contractState === 'declining'

  return (
    <div className="bg-white border border-brand-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Badge header */}
      <div className="bg-brand-500 px-4 py-2.5 flex items-center gap-2">
        <Clock size={14} className="text-brand-100" />
        <span className="text-sm font-semibold text-white">{t('pending_contract_badge')}</span>
      </div>

      <div className="px-5 pt-4 pb-5 flex flex-col gap-4">
        {/* Title + subtitle */}
        <div>
          <p className="text-base font-bold text-gray-900">{t('pending_contract_title')}</p>
          <p className="text-sm text-gray-500 mt-1">{t('pending_contract_subtitle')}</p>
        </div>

        {/* Plan info */}
        <div className="bg-gray-50 rounded-xl px-4 py-3 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 uppercase tracking-wide">{t('plan_label')}</span>
            <span className="text-sm font-semibold text-gray-800">{planName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 uppercase tracking-wide">{t('price_label')}</span>
            <span className="text-sm font-semibold text-gray-800">${plan.price_usd}/mo</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 uppercase tracking-wide">{t('expires_label')}</span>
            <span className={`text-sm font-mono font-semibold ${secondsLeft < 300 ? 'text-red-600' : 'text-amber-600'}`}>
              {secondsLeft > 0 ? formatCountdown(secondsLeft) : t('expires_expired')}
            </span>
          </div>
        </div>

        {/* Contract terms */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            {t('terms_section_title')}
          </p>
          <div className="bg-gray-50 rounded-xl p-4 max-h-48 overflow-y-auto">
            <p className="text-sm font-semibold text-gray-800 mb-2">{request.terms_title}</p>
            <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">
              {request.terms_body}
            </p>
          </div>
        </div>

        {/* Signature pad */}
        <div className="space-y-1">
          <SignaturePad
            label={t('signature_label')}
            clearLabel={t('signature_clear')}
            onSignature={(dataUrl) => {
              setSignature(dataUrl)
              if (dataUrl) setSignatureError(false)
            }}
          />
          {signatureError && (
            <p className="text-xs text-red-500">{t('signature_required')}</p>
          )}
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-2.5 pt-1">
          <button
            onClick={handleSign}
            disabled={isBusy || secondsLeft === 0}
            className="h-12 w-full rounded-xl bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {contractState === 'signing' ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {t('accepting')}
              </>
            ) : (
              t('accept_sign')
            )}
          </button>

          <button
            onClick={handleDecline}
            disabled={isBusy || secondsLeft === 0}
            className="h-10 w-full rounded-xl border border-gray-200 hover:bg-gray-50 active:bg-gray-100 text-gray-600 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {contractState === 'declining' ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                {t('declining')}
              </>
            ) : (
              t('decline')
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Membership history card ──────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  active:    'bg-green-100 text-green-700',
  expired:   'bg-gray-100 text-gray-500',
  cancelled: 'bg-red-50 text-red-600',
}

function MembershipHistoryList({
  memberships,
  locale,
}: {
  memberships: MembershipHistoryItem[]
  locale: 'en' | 'es'
}) {
  const t = useTranslations('membership_contract')

  const statusLabel = (s: string) => {
    if (s === 'active')    return t('status_active')
    if (s === 'expired')   return t('status_expired')
    if (s === 'cancelled') return t('status_cancelled')
    return s
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-semibold text-gray-700">{t('history_title')}</p>

      {memberships.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">{t('no_history')}</p>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-50">
          {memberships.map(m => {
            const plan = m.membership_plans
            const planName = locale === 'es' ? plan.name_es : plan.name_en

            return (
              <div key={m.id} className="px-4 py-3.5 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-800 truncate">{planName}</p>
                  <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-400">
                    <Calendar size={11} />
                    <span>{t('started_label')}: {formatDate(m.started_at, locale)}</span>
                  </div>
                  {m.expires_at && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {t('expires_on_label')}: {formatDate(m.expires_at, locale)}
                    </p>
                  )}
                  {m.sessions_remaining !== null && m.sessions_remaining > 0 && (
                    <p className="text-xs text-brand-600 mt-0.5">
                      {m.sessions_remaining} {t('pack_sessions_label')}
                    </p>
                  )}
                </div>
                <span className={`flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[m.status] ?? 'bg-gray-100 text-gray-500'}`}>
                  {statusLabel(m.status)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function MembershipsClient({ pendingRequest, memberships, locale }: Props) {
  const t = useTranslations('membership_contract')

  return (
    <div className="flex flex-col gap-6">
      {/* Pending contract */}
      {pendingRequest ? (
        <PendingContractCard request={pendingRequest} locale={locale} />
      ) : (
        memberships.every(m => m.status !== 'active') && (
          <p className="text-sm text-gray-400">{t('no_pending')}</p>
        )
      )}

      {/* History */}
      <MembershipHistoryList memberships={memberships} locale={locale} />
    </div>
  )
}
