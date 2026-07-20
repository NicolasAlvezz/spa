'use client'

import { useState, useTransition } from 'react'
import { Loader2, X, Check, Plus, Minus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { adjustClientCredit } from '@/app/(admin)/admin/clients/[id]/edit-actions'

const QUICK_AMOUNTS = [5, 10, 20]

interface Props {
  clientId: string
  currentBalance: number
}

export function AddCreditButton({ clientId, currentBalance }: Props) {
  const t = useTranslations('clients')
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [balance, setBalance] = useState(currentBalance)
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [activeSign, setActiveSign] = useState<1 | -1 | null>(null)
  const [saved, setSaved] = useState(false)

  function openDialog() {
    setAmount('')
    setBalance(currentBalance)
    setErrorMsg(null)
    setActiveSign(null)
    setSaved(false)
    setOpen(true)
  }

  function closeDialog() {
    if (isPending) return
    setOpen(false)
  }

  function submit(sign: 1 | -1) {
    const value = parseFloat(amount)
    if (!Number.isFinite(value) || value <= 0) {
      setErrorMsg(t('credit_invalid_amount'))
      return
    }
    setErrorMsg(null)
    setActiveSign(sign)
    startTransition(async () => {
      try {
        const res = await adjustClientCredit(clientId, sign * value)
        setBalance(res.credit_balance)
        setSaved(true)
        setTimeout(() => setOpen(false), 900)
      } catch {
        setErrorMsg(t('credit_error'))
        setActiveSign(null)
      }
    })
  }

  const parsed = parseFloat(amount)
  const validAmount = Number.isFinite(parsed) && parsed > 0

  return (
    <>
      <button
        onClick={openDialog}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-500 transition-colors flex-shrink-0"
      >
        <Plus size={13} />
        {t('credit_add')}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && closeDialog()}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">{t('credit_modal_title')}</h3>
              <button
                onClick={closeDialog}
                disabled={isPending}
                className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            {/* Current balance */}
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">
                {t('credit_current')}
              </span>
              <span className="text-lg font-bold text-green-800 tabular-nums">
                USD {balance.toFixed(2)}
              </span>
            </div>

            {/* Quick amounts */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                {t('credit_quick')}
              </label>
              <div className="flex gap-2">
                {QUICK_AMOUNTS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAmount(String(a))}
                    disabled={isPending}
                    className={`flex-1 h-9 rounded-lg border text-sm font-semibold transition-colors disabled:opacity-50 ${
                      parsed === a
                        ? 'border-brand-400 bg-brand-50 text-brand-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    ${a}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom amount */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                {t('credit_amount_label')}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isPending}
                placeholder="0.00"
                className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-shadow disabled:bg-gray-50"
              />
            </div>

            {errorMsg && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {errorMsg}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => submit(-1)}
                disabled={isPending || !validAmount}
                className="flex-1 h-10 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                {isPending && activeSign === -1 ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : saved && activeSign === -1 ? (
                  <Check size={14} />
                ) : (
                  <Minus size={14} />
                )}
                {t('credit_action_subtract')}
              </button>
              <button
                onClick={() => submit(1)}
                disabled={isPending || !validAmount}
                className="flex-1 h-10 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                {isPending && activeSign === 1 ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : saved && activeSign === 1 ? (
                  <Check size={14} />
                ) : (
                  <Plus size={14} />
                )}
                {t('credit_action_add')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
