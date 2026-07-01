'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { Clock, CheckCircle2, XCircle, AlertTriangle, Calendar, Loader2 } from 'lucide-react'
import { getBasicContractTemplate } from '@/lib/constants/membership-contract-templates'
import { BASIC_CONTRACT_VERSION } from '@/lib/constants/membership-contract'

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
  version: string
  language: 'en' | 'es'
  admin_signature_image: string | null
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
  clientProfile: {
    first_name: string
    last_name: string
    phone: string
    email: string | null
    address: string
  }
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
  clientProfile,
}: {
  request: PendingContractData
  locale: 'en' | 'es'
  clientProfile: Props['clientProfile']
}) {
  const t = useTranslations('membership_contract')
  const contractLocale = request.language ?? locale
  const isBasic = request.version === BASIC_CONTRACT_VERSION
  const template = isBasic ? getBasicContractTemplate(contractLocale) : null

  const [contractState, setContractState] = useState<ContractState>('pending')
  const [error, setError] = useState<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [signature, setSignature] = useState<string | null>(null)
  const [signatureError, setSignatureError] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  // Editable fields — pre-filled from client profile
  const [fullName, setFullName] = useState(
    `${clientProfile.first_name} ${clientProfile.last_name}`.trim()
  )
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [phone, setPhone] = useState(clientProfile.phone ?? '')
  const [email, setEmail] = useState(clientProfile.email ?? '')
  const [address, setAddress] = useState(clientProfile.address ?? '')
  const [cityState, setCityState] = useState('')
  const [startDate, setStartDate] = useState(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date())
  )
  const [paymentMethod, setPaymentMethod] = useState<'credit' | 'debit'>('credit')
  const [cardLast4, setCardLast4] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({})

  const plan = request.membership_plans
  const planName = contractLocale === 'es' ? plan.name_es : plan.name_en

  // Countdown
  useEffect(() => {
    function tick() {
      const remaining = Math.max(0, Math.floor((new Date(request.expires_at).getTime() - Date.now()) / 1000))
      setSecondsLeft(remaining)
      if (remaining === 0) setContractState(prev => prev === 'pending' ? 'expired' : prev)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [request.expires_at])

  function validateFields(): boolean {
    if (!isBasic) return true
    const errors: Record<string, boolean> = {}
    if (!fullName.trim()) errors.fullName = true
    if (!email.trim()) errors.email = true
    if (!address.trim()) errors.address = true
    if (!cityState.trim()) errors.cityState = true
    if (!startDate.trim()) errors.startDate = true
    if (!cardLast4 || !/^\d{4}$/.test(cardLast4)) errors.cardLast4 = true
    if (!signature) errors.signature = true
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSign() {
    if (!signature) { setSignatureError(true); return }
    setSignatureError(false)
    if (!validateFields()) return
    setError(null)
    setContractState('signing')

    const body: Record<string, unknown> = { signature_image: signature }
    if (isBasic) {
      body.contract_fields = {
        full_name: fullName,
        date_of_birth: dateOfBirth,
        phone,
        email,
        address,
        city_state: cityState,
        start_date: startDate,
      }
      body.payment_method = paymentMethod
      body.card_last4 = cardLast4
    }

    const res = await fetch(`/api/membership-requests/${request.id}/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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
    if (res.ok) setContractState('declined')
    else { setError(t('error_decline')); setContractState('pending') }
  }

  async function handleDownloadPdf() {
    setDownloadingPdf(true)
    try {
      const res = await fetch(`/api/membership-requests/${request.id}/contract.pdf`)
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'membership-contract.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloadingPdf(false)
    }
  }

  if (contractState === 'signed') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 size={22} className="text-green-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-green-800">{t('signed_title')}</p>
            <p className="text-sm text-green-700 mt-0.5">{t('signed_body')}</p>
          </div>
        </div>
        <button
          onClick={handleDownloadPdf}
          disabled={downloadingPdf}
          className="h-10 w-full rounded-xl border border-green-300 bg-green-50 hover:bg-green-100 text-green-800 text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {downloadingPdf ? <Loader2 size={14} className="animate-spin" /> : null}
          {t('download_pdf')}
        </button>
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
  const inputCls = (err?: boolean) =>
    `w-full h-10 rounded-lg border px-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-brand-100 ${err ? 'border-red-400 focus:border-red-400' : 'border-gray-200 focus:border-brand-400'}`

  return (
    <div className="bg-white border border-brand-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Badge */}
      <div className="bg-brand-500 px-4 py-2.5 flex items-center gap-2">
        <Clock size={14} className="text-brand-100" />
        <span className="text-sm font-semibold text-white">{t('pending_contract_badge')}</span>
        <span className={`ml-auto text-sm font-mono font-semibold ${secondsLeft < 300 ? 'text-red-200' : 'text-brand-100'}`}>
          {secondsLeft > 0 ? formatCountdown(secondsLeft) : t('expires_expired')}
        </span>
      </div>

      <div className="px-5 pt-4 pb-5 flex flex-col gap-5">
        {/* Header */}
        <div>
          <p className="text-base font-bold text-gray-900">{planName}</p>
          <p className="text-sm text-gray-500 mt-0.5">${plan.price_usd}/mo</p>
        </div>

        {/* ── BASIC CONTRACT: full 6-page content ── */}
        {isBasic && template && (
          <>
            {/* Slide 2: Marketing */}
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-bold text-gray-700 mb-1">{template.slide2_wellness_title}</p>
              <p className="text-xs text-gray-600 leading-relaxed mb-2">{template.slide2_description}</p>
              <p className="text-xs font-bold text-gray-700">{template.slide2_cost_label}: <span className="text-brand-600">{template.slide2_cost_value}</span></p>
            </div>

            {/* Slide 3: Client info — editable */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                {template.slide3_client_info_title}
              </p>
              <div className="grid gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">{template.slide3_label_full_name}</label>
                  <input value={fullName} onChange={e => setFullName(e.target.value)} disabled={isBusy}
                    className={inputCls(fieldErrors.fullName)} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">{template.slide3_label_dob}</label>
                  <input type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} disabled={isBusy}
                    className={inputCls()} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">{template.slide3_label_phone}</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} disabled={isBusy}
                    className={inputCls()} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">{template.slide3_label_email} *</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={isBusy}
                    className={inputCls(fieldErrors.email)} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">{template.slide3_label_address} *</label>
                  <input value={address} onChange={e => setAddress(e.target.value)} disabled={isBusy}
                    className={inputCls(fieldErrors.address)} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">{template.slide3_label_city_state} *</label>
                  <input value={cityState} onChange={e => setCityState(e.target.value)} disabled={isBusy}
                    className={inputCls(fieldErrors.cityState)} />
                </div>
              </div>
            </div>

            {/* Slide 4: Benefits (read-only scrollable) */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                {template.slide4_title}
              </p>
              <div className="bg-gray-50 rounded-xl p-4 max-h-40 overflow-y-auto">
                <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{template.slide4_benefits}</p>
              </div>
            </div>

            {/* Slide 5: Terms (read-only scrollable) */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                {template.slide5_title}
              </p>
              <div className="bg-gray-50 rounded-xl p-4 max-h-40 overflow-y-auto">
                <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{template.slide5_terms}</p>
              </div>
            </div>

            {/* Slide 6: Payment details */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                {template.slide6_title}
              </p>
              {/* Non-editable */}
              <div className="bg-gray-50 rounded-xl p-4 mb-3 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">{template.slide6_type_label}</span>
                  <span className="font-semibold text-gray-800">{template.slide6_type_value}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">{template.slide6_monthly_label}</span>
                  <span className="font-semibold text-gray-800">{template.slide6_monthly_value}</span>
                </div>
              </div>

              {/* Start date — editable */}
              <div className="mb-3">
                <label className="text-xs text-gray-500 mb-1 block">{template.slide6_start_date_label} *</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} disabled={isBusy}
                  className={inputCls(fieldErrors.startDate)} />
              </div>

              {/* Payment method */}
              <div className="mb-3">
                <p className="text-xs text-gray-500 mb-2">{template.slide6_payment_method_label}</p>
                <div className="grid grid-cols-2 gap-2">
                  {(['credit', 'debit'] as const).map(m => (
                    <button key={m} onClick={() => setPaymentMethod(m)} disabled={isBusy} type="button"
                      className={`h-10 rounded-lg border text-sm font-medium transition-colors disabled:opacity-50 ${paymentMethod === m ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}>
                      {m === 'credit' ? template.slide6_credit : template.slide6_debit}
                    </button>
                  ))}
                </div>
              </div>

              {/* Card last 4 */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">{template.slide6_card_last4_label} *</label>
                <input
                  value={cardLast4}
                  onChange={e => setCardLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  disabled={isBusy}
                  maxLength={4}
                  inputMode="numeric"
                  placeholder="0000"
                  className={inputCls(fieldErrors.cardLast4)}
                />
              </div>
            </div>
          </>
        )}

        {/* ── LEGACY CONTRACT: terms only ── */}
        {!isBasic && (
          <div className="bg-gray-50 rounded-xl p-4 max-h-48 overflow-y-auto">
            <p className="text-sm font-semibold text-gray-800 mb-2">{request.terms_title}</p>
            <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{request.terms_body}</p>
          </div>
        )}

        {/* Signature */}
        <div className="space-y-1">
          <SignaturePad
            label={t('signature_label')}
            clearLabel={t('signature_clear')}
            onSignature={(dataUrl) => {
              setSignature(dataUrl)
              if (dataUrl) {
                setSignatureError(false)
                setFieldErrors(p => ({ ...p, signature: false }))
              }
            }}
          />
          {(signatureError || fieldErrors.signature) && (
            <p className="text-xs text-red-500">{t('signature_required')}</p>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        {/* Buttons */}
        <div className="flex flex-col gap-2.5 pt-1">
          <button
            onClick={handleSign}
            disabled={isBusy || secondsLeft === 0}
            className="h-12 w-full rounded-xl bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {contractState === 'signing' ? (
              <><Loader2 size={16} className="animate-spin" />{t('accepting')}</>
            ) : (
              t('close_and_sign')
            )}
          </button>
          <button onClick={handleDecline} disabled={isBusy || secondsLeft === 0}
            className="h-10 w-full rounded-xl border border-gray-200 hover:bg-gray-50 active:bg-gray-100 text-gray-600 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {contractState === 'declining' ? (
              <><Loader2 size={14} className="animate-spin" />{t('declining')}</>
            ) : t('decline')}
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

export function MembershipsClient({ pendingRequest, memberships, locale, clientProfile }: Props) {
  const t = useTranslations('membership_contract')

  return (
    <div className="flex flex-col gap-6">
      {pendingRequest ? (
        <PendingContractCard request={pendingRequest} locale={locale} clientProfile={clientProfile} />
      ) : (
        memberships.every(m => m.status !== 'active') && (
          <p className="text-sm text-gray-400">{t('no_pending')}</p>
        )
      )}

      <MembershipHistoryList memberships={memberships} locale={locale} />
    </div>
  )
}
