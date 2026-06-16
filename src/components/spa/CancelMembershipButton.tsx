'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { XCircle, Loader2, AlertTriangle } from 'lucide-react'
import type { PaymentMethod } from '@/types'

interface Props {
  membershipId: string
  planName: string
  clientName: string
}

const METHODS: PaymentMethod[] = ['cash', 'debit', 'credit']

export function CancelMembershipButton({ membershipId, planName, clientName }: Props) {
  const t = useTranslations('cancel_membership')
  const tPay = useTranslations('payment')
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [notes, setNotes] = useState('')
  const [applyFee, setApplyFee] = useState(false)
  const [feeAmount, setFeeAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function openModal() {
    setNotes('')
    setApplyFee(false)
    setFeeAmount('')
    setMethod(null)
    setError(null)
    setOpen(true)
  }

  function closeModal() {
    if (loading) return
    setOpen(false)
  }

  const feeUsd = applyFee ? parseFloat(feeAmount) : 0
  const feeValid = !applyFee || (feeAmount !== '' && !isNaN(feeUsd) && feeUsd > 0 && method !== null)

  async function handleConfirm() {
    if (!feeValid || loading) return
    setError(null)
    setLoading(true)

    const body: {
      notes?: string
      cancellation_fee_usd?: number
      payment_method?: PaymentMethod
    } = {}

    if (notes.trim()) body.notes = notes.trim()
    if (applyFee && feeUsd > 0 && method) {
      body.cancellation_fee_usd = feeUsd
      body.payment_method = method
    }

    try {
      const res = await fetch(`/api/memberships/${membershipId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        setError(t('error'))
        setLoading(false)
        return
      }

      setOpen(false)
      router.refresh()
    } catch {
      setError(t('error'))
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={openModal}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-red-200 bg-white text-xs font-semibold text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors"
      >
        <XCircle size={12} />
        {t('btn')}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">

            {/* Header */}
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-red-100 flex-shrink-0 mt-0.5">
                <AlertTriangle size={16} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">{t('modal_title')}</h3>
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                  {t('modal_body', { planName, clientName })}
                </p>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                {t('notes_label')}
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                disabled={loading}
                placeholder={t('notes_placeholder')}
                rows={3}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 transition-shadow resize-none disabled:opacity-50"
              />
            </div>

            {/* Fee toggle */}
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={applyFee}
                  onChange={e => setApplyFee(e.target.checked)}
                  disabled={loading}
                  className="w-4 h-4 rounded border-gray-300 accent-red-600 disabled:opacity-50"
                />
                <span className="text-sm font-medium text-gray-700">{t('fee_toggle')}</span>
              </label>

              {applyFee && (
                <div className="space-y-3 pl-7">
                  {/* Amount */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {t('fee_amount_label')}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={feeAmount}
                        onChange={e => setFeeAmount(e.target.value)}
                        disabled={loading}
                        placeholder={t('fee_amount_placeholder')}
                        className="w-full h-10 rounded-lg border border-gray-200 pl-7 pr-3 text-sm outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 transition-shadow disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {/* Payment method */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {t('method_label')}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {METHODS.map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setMethod(m)}
                          disabled={loading}
                          className={`h-9 rounded-lg text-sm font-semibold border transition-colors disabled:opacity-50 ${
                            method === m
                              ? 'bg-red-600 text-white border-red-600'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {tPay(`method_${m}` as Parameters<typeof tPay>[0])}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-1">
              <button
                onClick={closeModal}
                disabled={loading}
                className="h-9 px-4 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {t('cancel_btn')}
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading || !feeValid}
                className="h-9 px-4 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading && <Loader2 size={13} className="animate-spin" />}
                {loading ? t('cancelling') : t('confirm_btn')}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  )
}
