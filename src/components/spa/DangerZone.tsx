'use client'

import { useState, useTransition } from 'react'
import { AlertTriangle, Loader2, ShieldOff, ShieldCheck, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
  deactivateClient,
  reactivateClient,
  deleteClientPermanently,
} from '@/app/(admin)/admin/clients/[id]/delete-actions'
import type { ClientHistorySummary } from '@/lib/supabase/queries/clients'

interface Props {
  clientId: string
  clientName: string
  isActive: boolean
  history: ClientHistorySummary
}

type OpenDialog = 'deactivate' | 'reactivate' | 'delete' | null

export function DangerZone({ clientId, clientName, isActive, history }: Props) {
  const t = useTranslations('clients')
  const [openDialog, setOpenDialog] = useState<OpenDialog>(null)
  const [confirmName, setConfirmName] = useState('')
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const hasHistory = history.memberships > 0 || history.visits > 0 || history.payments > 0

  function closeDialog() {
    setOpenDialog(null)
    setConfirmName('')
    setErrorMsg(null)
  }

  function handleDeactivate() {
    setErrorMsg(null)
    startTransition(async () => {
      try {
        await deactivateClient(clientId)
        closeDialog()
      } catch {
        setErrorMsg(t('danger_action_error'))
      }
    })
  }

  function handleReactivate() {
    setErrorMsg(null)
    startTransition(async () => {
      try {
        await reactivateClient(clientId)
        closeDialog()
      } catch {
        setErrorMsg(t('danger_action_error'))
      }
    })
  }

  function handleDelete() {
    setErrorMsg(null)
    startTransition(async () => {
      try {
        await deleteClientPermanently(clientId)
      } catch {
        setErrorMsg(t('danger_action_error'))
      }
    })
  }

  return (
    <>
      {/* ── Danger Zone card ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-red-200 bg-red-50 overflow-hidden">
        <div className="px-6 py-4 border-b border-red-200">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-red-500" />
            <h2 className="text-xs font-semibold text-red-600 uppercase tracking-wide">
              {t('danger_zone')}
            </h2>
          </div>
        </div>

        <div className="px-6 py-5 flex flex-col sm:flex-row gap-4 sm:items-start sm:justify-between">
          {/* Deactivate / Reactivate */}
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium text-gray-800">
              {isActive ? t('deactivate') : t('reactivate')}
            </p>
            <p className="text-xs text-gray-400 leading-relaxed">
              {isActive ? t('deactivate_desc') : t('reactivate_desc')}
            </p>
          </div>
          <button
            onClick={() => setOpenDialog(isActive ? 'deactivate' : 'reactivate')}
            className={[
              'flex-shrink-0 inline-flex items-center gap-2 h-9 px-4 rounded-lg border text-sm font-semibold transition-colors',
              isActive
                ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
                : 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100',
            ].join(' ')}
          >
            {isActive
              ? <><ShieldOff size={14} />{t('deactivate_btn')}</>
              : <><ShieldCheck size={14} />{t('reactivate_btn')}</>
            }
          </button>
        </div>

        <div className="border-t border-red-200 px-6 py-5 flex flex-col sm:flex-row gap-4 sm:items-start sm:justify-between">
          {/* Delete permanently */}
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium text-gray-800">{t('delete_permanently')}</p>
            <p className="text-xs text-gray-400 leading-relaxed">{t('delete_permanently_desc')}</p>
          </div>
          <button
            onClick={() => setOpenDialog('delete')}
            className="flex-shrink-0 inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-red-300 bg-white text-sm font-semibold text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors"
          >
            <Trash2 size={14} />
            {t('delete_btn')}
          </button>
        </div>
      </div>

      {/* ── Dialog backdrop ───────────────────────────────────────────────── */}
      {openDialog && (
        <div
          className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && closeDialog()}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">

            {/* ── Deactivate dialog ─────────────────────────────────────── */}
            {openDialog === 'deactivate' && (
              <>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-gray-900">
                    {t('deactivate_title', { name: clientName })}
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {t('deactivate_body')}
                  </p>
                </div>
                {errorMsg && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{errorMsg}</p>}
                <div className="flex gap-3 justify-end">
                  <button onClick={closeDialog} disabled={isPending} className="h-9 px-4 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
                    {t('cancel')}
                  </button>
                  <button onClick={handleDeactivate} disabled={isPending} className="h-9 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2">
                    {isPending && <Loader2 size={13} className="animate-spin" />}
                    {t('deactivate_confirm')}
                  </button>
                </div>
              </>
            )}

            {/* ── Reactivate dialog ─────────────────────────────────────── */}
            {openDialog === 'reactivate' && (
              <>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-gray-900">
                    {t('reactivate_title', { name: clientName })}
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {t('reactivate_body')}
                  </p>
                </div>
                {errorMsg && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{errorMsg}</p>}
                <div className="flex gap-3 justify-end">
                  <button onClick={closeDialog} disabled={isPending} className="h-9 px-4 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
                    {t('cancel')}
                  </button>
                  <button onClick={handleReactivate} disabled={isPending} className="h-9 px-4 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2">
                    {isPending && <Loader2 size={13} className="animate-spin" />}
                    {t('reactivate_confirm')}
                  </button>
                </div>
              </>
            )}

            {/* ── Delete dialog ─────────────────────────────────────────── */}
            {openDialog === 'delete' && !hasHistory && (
              <>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-gray-900">
                    {t('delete_title', { name: clientName })}
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {t('delete_body')}
                  </p>
                </div>
                {errorMsg && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{errorMsg}</p>}
                <div className="flex gap-3 justify-end">
                  <button onClick={closeDialog} disabled={isPending} className="h-9 px-4 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
                    {t('cancel')}
                  </button>
                  <button onClick={handleDelete} disabled={isPending} className="h-9 px-4 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2">
                    {isPending && <Loader2 size={13} className="animate-spin" />}
                    {t('delete_confirm')}
                  </button>
                </div>
              </>
            )}

            {/* ── Delete dialog with history ─────────────────────────────── */}
            {openDialog === 'delete' && hasHistory && (
              <>
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-9 h-9 rounded-full bg-red-100 flex-shrink-0 mt-0.5">
                    <AlertTriangle size={16} className="text-red-600" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-gray-900">
                      {t('delete_history_title', { name: clientName })}
                    </h3>
                    <p className="text-sm text-gray-500">{t('delete_history_warning')}</p>
                  </div>
                </div>

                {/* History counts */}
                <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 space-y-1.5">
                  {history.memberships > 0 && (
                    <p className="text-sm text-red-700">• {t('delete_history_memberships', { count: history.memberships })}</p>
                  )}
                  {history.visits > 0 && (
                    <p className="text-sm text-red-700">• {t('delete_history_visits', { count: history.visits })}</p>
                  )}
                  {history.payments > 0 && (
                    <p className="text-sm text-red-700">• {t('delete_history_payments', { count: history.payments })}</p>
                  )}
                </div>

                <p className="text-sm text-gray-500 leading-relaxed">{t('delete_history_body')}</p>

                {/* Confirmation input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    {t('delete_history_confirm_label')}
                  </label>
                  <input
                    type="text"
                    value={confirmName}
                    onChange={(e) => setConfirmName(e.target.value)}
                    placeholder={clientName}
                    autoComplete="off"
                    className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-shadow"
                  />
                </div>

                {errorMsg && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{errorMsg}</p>}

                <div className="flex gap-3 justify-end">
                  <button onClick={closeDialog} disabled={isPending} className="h-9 px-4 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
                    {t('cancel')}
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isPending || confirmName.trim() !== clientName}
                    className="h-9 px-4 rounded-lg bg-red-700 hover:bg-red-600 text-white text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isPending && <Loader2 size={13} className="animate-spin" />}
                    <Trash2 size={13} />
                    {t('delete_history_confirm_btn')}
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </>
  )
}
