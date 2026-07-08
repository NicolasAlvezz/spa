'use client'

import { useState, useTransition } from 'react'
import { Pencil, Loader2, X, Check } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { updateClientInfo } from '@/app/(admin)/admin/clients/[id]/edit-actions'

interface Props {
  clientId: string
  firstName: string
  lastName: string
  phone: string
  compact?: boolean
}

export function EditClientInfoButton({ clientId, firstName, lastName, phone, compact = false }: Props) {
  const t = useTranslations('clients')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ first_name: firstName, last_name: lastName, phone })
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function openDialog() {
    setForm({ first_name: firstName, last_name: lastName, phone })
    setErrorMsg(null)
    setSaved(false)
    setOpen(true)
  }

  function closeDialog() {
    if (isPending) return
    setOpen(false)
  }

  function handleSubmit() {
    setErrorMsg(null)
    startTransition(async () => {
      try {
        await updateClientInfo(clientId, form)
        setSaved(true)
        setTimeout(() => setOpen(false), 800)
      } catch {
        setErrorMsg(t('edit_error'))
      }
    })
  }

  const changed =
    form.first_name.trim() !== firstName ||
    form.last_name.trim() !== lastName ||
    form.phone.trim() !== phone

  return (
    <>
      <button
        onClick={openDialog}
        title={t('edit_info')}
        className={
          compact
            ? 'inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-brand-600 hover:border-brand-200 hover:bg-brand-50 transition-colors'
            : 'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-500 hover:text-brand-600 hover:border-brand-200 hover:bg-brand-50 transition-colors'
        }
      >
        <Pencil size={13} />
        {!compact && t('edit_info')}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && closeDialog()}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">{t('edit_info_title')}</h3>
              <button
                onClick={closeDialog}
                disabled={isPending}
                className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    {t('edit_first_name')}
                  </label>
                  <input
                    type="text"
                    value={form.first_name}
                    onChange={(e) => setForm(f => ({ ...f, first_name: e.target.value }))}
                    autoComplete="given-name"
                    disabled={isPending}
                    className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-shadow disabled:bg-gray-50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    {t('edit_last_name')}
                  </label>
                  <input
                    type="text"
                    value={form.last_name}
                    onChange={(e) => setForm(f => ({ ...f, last_name: e.target.value }))}
                    autoComplete="family-name"
                    disabled={isPending}
                    className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-shadow disabled:bg-gray-50"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  {t('edit_phone')}
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                  autoComplete="tel"
                  inputMode="tel"
                  disabled={isPending}
                  className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-shadow disabled:bg-gray-50"
                />
              </div>
            </div>

            {errorMsg && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {errorMsg}
              </p>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={closeDialog}
                disabled={isPending}
                className="h-9 px-4 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleSubmit}
                disabled={isPending || !changed || !form.first_name.trim() || !form.last_name.trim() || !form.phone.trim()}
                className="h-9 px-4 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isPending && <Loader2 size={13} className="animate-spin" />}
                {saved && <Check size={13} />}
                {t('edit_save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
