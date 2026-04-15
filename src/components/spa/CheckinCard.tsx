'use client'

import { useTranslations, useLocale } from 'next-intl'
import { formatDate } from '@/lib/utils/dates'
import { getAvailableSessions } from '@/lib/utils/membership'
import type { CheckinResult } from '@/types'

interface Props {
  data: CheckinResult
  onScanAgain: () => void
  onRegisterVisit: () => void
  onRenew: () => void
  onAssignMembership: () => void
}

export function CheckinCard({ data, onScanAgain, onRegisterVisit, onRenew, onAssignMembership }: Props) {
  const t = useTranslations('scan')
  const tCheck = useTranslations('checkin')
  const locale = useLocale() as 'en' | 'es'

  const { client, membership, membership_status } = data
  const plan = membership?.membership_plans
  const planName = plan ? (locale === 'es' ? plan.name_es : plan.name_en) : null
  const availableSessions = plan
    ? getAvailableSessions(membership, plan.sessions_per_month)
    : 0

  const clientName = `${client.first_name} ${client.last_name}`

  if (membership_status === 'active') {
    return (
      <div className="w-full flex flex-col gap-6">
        {/* Status badge */}
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-12 h-12 rounded-full bg-green-500 text-white text-2xl font-bold">
            ✓
          </span>
          <span className="text-green-400 text-lg font-semibold uppercase tracking-wide">
            {t('active_title')}
          </span>
        </div>

        {/* Client name */}
        <div>
          <h2 className="text-5xl font-bold text-white leading-tight">{clientName}</h2>
          {planName && (
            <p className="text-xl text-slate-300 mt-2">{planName}</p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <StatBox
            label={tCheck('expires')}
            value={formatDate(membership!.expires_at, locale)}
          />
          <StatBox
            label={tCheck('sessions_used')}
            value={`${membership!.sessions_used_this_month} / ${plan?.sessions_per_month}`}
          />
          <StatBox
            label={t('visits_this_month')}
            value={String(data.visits_this_month.length)}
          />
          <StatBox
            label={t('sessions_available')}
            value={String(availableSessions)}
            highlight={availableSessions === 0}
          />
        </div>

        {membership!.rollover_sessions > 0 && (
          <p className="text-amber-400 text-sm font-medium">✦ {tCheck('rollover')}</p>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-2">
          <button
            onClick={onRegisterVisit}
            className="w-full h-16 rounded-xl bg-green-500 hover:bg-green-400 active:bg-green-600 text-white text-xl font-bold transition-colors"
          >
            {tCheck('register_visit')}
          </button>
          <button
            onClick={onScanAgain}
            className="w-full h-12 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-base font-medium transition-colors"
          >
            {t('scan_again')}
          </button>
        </div>
      </div>
    )
  }

  if (membership_status === 'expired' || membership_status === 'cancelled') {
    return (
      <div className="w-full flex flex-col gap-6">
        {/* Status badge */}
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500 text-white text-2xl font-bold">
            ✗
          </span>
          <span className="text-red-400 text-lg font-semibold uppercase tracking-wide">
            {t('expired_title')}
          </span>
        </div>

        {/* Client name */}
        <div>
          <h2 className="text-5xl font-bold text-white leading-tight">{clientName}</h2>
          {planName && (
            <p className="text-xl text-slate-400 mt-2">{planName}</p>
          )}
        </div>

        {/* Expired date */}
        {membership && (
          <div className="bg-red-950/40 border border-red-800 rounded-xl p-4">
            <p className="text-red-300 text-sm">{tCheck('expired_on')}</p>
            <p className="text-red-200 text-2xl font-bold mt-1">
              {formatDate(membership.expires_at, locale)}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-2">
          <button
            onClick={onRenew}
            className="w-full h-16 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white text-xl font-bold transition-colors"
          >
            {tCheck('renew')}
          </button>
          <button
            onClick={onScanAgain}
            className="w-full h-12 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-base font-medium transition-colors"
          >
            {t('scan_again')}
          </button>
        </div>
      </div>
    )
  }

  // no_membership
  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <span className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-600 text-white text-2xl">
          –
        </span>
        <span className="text-slate-400 text-lg font-semibold uppercase tracking-wide">
          {t('no_plan_title')}
        </span>
      </div>

      <h2 className="text-5xl font-bold text-white leading-tight">{clientName}</h2>

      <div className="flex flex-col gap-3 pt-2">
        <button
          onClick={onAssignMembership}
          className="w-full h-16 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white text-xl font-bold transition-colors"
        >
          {tCheck('assign_button')}
        </button>
        <button
          onClick={onScanAgain}
          className="w-full h-12 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-base font-medium transition-colors"
        >
          {t('scan_again')}
        </button>
      </div>
    </div>
  )
}

function StatBox({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="bg-slate-800 rounded-xl p-4">
      <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-2xl font-bold ${highlight ? 'text-red-400' : 'text-white'}`}>
        {value}
      </p>
    </div>
  )
}
