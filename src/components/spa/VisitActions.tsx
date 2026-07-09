'use client'

import { useState, useTransition } from 'react'
import { Trash2, Link2, Loader2, X, AlertTriangle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { deleteVisit, assignVisitToMembership } from '@/app/(admin)/admin/clients/[id]/visit-actions'

interface Props {
  visitId: string
  clientId: string
  visitDate: string
  sessionType: string
  isStandalone: boolean       // membership_id === null
  activeMembershipId: string | null
}

type Dialog = 'delete' | 'assign' | null

export function VisitActions({
  visitId,
  clientId,
  visitDate,
  sessionType,
  isStandalone,
  activeMembershipId,
}: Props) {
  const t = useTranslations('clients')
  const [dialog, setDialog] = useState<Dialog>(null)
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  function open(d: Dialog) { setDialog(d); setErrorMsg(null) }
  function close() { if (!isPending) { setDialog(null); setErrorMsg(null) } }

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteVisit(visitId, clientId)
        setDialog(null)
      } catch {
        setErrorMsg(t('visit_action_error'))
      }
    })
  }

  function handleAssign() {
    if (!activeMembershipId) return
    startTransition(async () => {
      try {
        await assignVisitToMembership(visitId, clientId, activeMembershipId)
        setDialog(null)
      } catch {
        setErrorMsg(t('visit_action_error'))
      }
    })
  }

  return (
    <>
      <div className="flex items-center gap-1">
        {isStandalone && activeMembershipId && (
          <button
            onClick={() => open('assign')}
            title={t('visit_assign_to_membership')}
            className="inline-flex items-center justify-center w-7 h-7 rounded-md text-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <Link2 size={13} />
          </button>
        )}
        <button
          onClick={() => open('delete')}
          title={t('visit_delete')}
          className="inline-flex items-center justify-center w-7 h-7 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {dialog && (
        <div
          className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && close()}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className={dialog === 'delete' ? 'text-red-500' : 'text-blue-500'} />
                <h3 className="text-base font-bold text-gray-900">
                  {dialog === 'delete' ? t('visit_delete_title') : t('visit_assign_title')}
                </h3>
              </div>
              <button onClick={close} disabled={isPending} className="text-gray-400 hover:text-gray-600 disabled:opacity-50">
                <X size={18} />
              </button>
            </div>

            <p className="text-sm text-gray-500 leading-relaxed">
              {dialog === 'delete' ? t('visit_delete_body', { date: visitDate }) : t('visit_assign_body')}
            </p>

            {errorMsg && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{errorMsg}</p>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={close}
                disabled={isPending}
                className="h-9 px-4 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {t('cancel')}
              </button>
              <button
                onClick={dialog === 'delete' ? handleDelete : handleAssign}
                disabled={isPending}
                className={`h-9 px-4 rounded-lg text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2 ${
                  dialog === 'delete'
                    ? 'bg-red-600 hover:bg-red-500'
                    : 'bg-blue-600 hover:bg-blue-500'
                }`}
              >
                {isPending && <Loader2 size={13} className="animate-spin" />}
                {dialog === 'delete' ? t('visit_delete_confirm') : t('visit_assign_confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
