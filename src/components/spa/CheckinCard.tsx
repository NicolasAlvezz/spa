'use client'

import { useTranslations, useLocale } from 'next-intl'
import { CheckCircle2, XCircle, MinusCircle, Calendar, Activity, RotateCcw, Star, AlertTriangle, CreditCard, Scissors } from 'lucide-react'
import { formatDate, formatDateTime } from '@/lib/utils/dates'
import { getAvailableSessions } from '@/lib/utils/membership'
import type { CheckinResult } from '@/types'

interface Props {
  data: CheckinResult
  onScanAgain: () => void
  onRegisterVisit: () => void
  onRenew: () => void
  onAssignMembership: () => void
  onConfirmSplitPayment?: () => void
  onPostOpVisit?: () => void
  splitPaymentBlocked?: boolean
}

export function CheckinCard({
  data,
  onScanAgain,
  onRegisterVisit,
  onRenew,
  onAssignMembership,
  onConfirmSplitPayment,
  onPostOpVisit,
  splitPaymentBlocked = false,
}: Props) {
  const t = useTranslations('scan')
  const tCheck = useTranslations('checkin')
  const locale = useLocale() as 'en' | 'es'

  const { client, membership, membership_status, today_appointment } = data
  const plan = membership?.membership_plans
  const planName = plan ? (locale === 'es' ? plan.name_es : plan.name_en) : null
  const isPack = plan?.plan_type === 'pack'

  const availableSessions = plan
    ? getAvailableSessions(
        membership as Parameters<typeof getAvailableSessions>[0],
        plan.sessions_per_month,
      )
    : 0

  const sessionsRemaining = membership?.sessions_remaining ?? 0
  const splitPending = membership?.split_payment_pending ?? false

  const clientName = `${client.first_name} ${client.last_name}`

  if (membership_status === 'active') {
    const totalSessions = plan?.total_sessions ?? 0
    const sessionsUsed = isPack ? totalSessions - sessionsRemaining : data.sessions_used_this_month

    // Show split warning after 4th session on a split-payment pack
    const showSplitWarning = isPack && splitPending && sessionsUsed === 4

    return (
      <div className="w-full flex flex-col gap-5">
        {/* Status badge */}
        <div className="flex items-center gap-2.5">
          <CheckCircle2 size={20} className="text-green-400 flex-shrink-0" />
          <span className="text-green-400 text-sm font-semibold uppercase tracking-widest">
            {t('active_title')}
          </span>
        </div>

        {/* Client name + plan */}
        <div>
          <h2 className="text-3xl md:text-5xl font-bold text-white leading-none tracking-tight">{clientName}</h2>
          {planName && (
            <p className="text-slate-400 text-lg mt-2">{planName}</p>
          )}
        </div>

        {/* Today's appointment */}
        {today_appointment && (
          <TodayAppointmentBox appointment={today_appointment} locale={locale} tCheck={tCheck} />
        )}

        {/* Split payment warning */}
        {showSplitWarning && (
          <div className="bg-amber-950/40 border border-amber-700/60 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-amber-300 text-sm font-medium">{tCheck('split_payment_warning')}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          {isPack ? (
            <>
              <StatBox icon={Star} label={tCheck('sessions_remaining')} value={String(sessionsRemaining)} highlight={sessionsRemaining === 0} />
              <StatBox icon={Activity} label={tCheck('sessions_used')} value={`${sessionsUsed} / ${totalSessions}`} />
              <StatBox icon={Activity} label={t('visits_this_month')} value={String(data.visits_this_month.length)} />
              <StatBox icon={Calendar} label={tCheck('no_expiry')} value="∞" />
            </>
          ) : (
            <>
              <StatBox icon={Calendar} label={tCheck('expires')} value={formatDate(membership!.expires_at, locale)} />
              <StatBox icon={Activity} label={tCheck('sessions_used')} value={`${membership!.sessions_used_this_month} / ${plan?.sessions_per_month}`} />
              <StatBox icon={Activity} label={t('visits_this_month')} value={String(data.visits_this_month.length)} />
              <StatBox
                icon={Star}
                label={t('sessions_available')}
                value={String(availableSessions)}
                highlight={availableSessions === 0}
              />
            </>
          )}
        </div>

        {!isPack && membership!.rollover_sessions > 0 && (
          <p className="text-amber-400 text-sm font-medium flex items-center gap-1.5">
            <RotateCcw size={13} />
            {tCheck('rollover')}
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-1">
          {splitPaymentBlocked ? (
            <>
              <div className="bg-red-950/40 border border-red-800/60 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-300 text-sm font-medium">{tCheck('split_payment_blocked')}</p>
              </div>
              <button
                onClick={onConfirmSplitPayment}
                className="w-full h-16 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white text-xl font-bold transition-colors shadow-lg shadow-amber-900/30 flex items-center justify-center gap-2"
              >
                <CreditCard size={20} />
                {tCheck('confirm_split')}
              </button>
            </>
          ) : (
            <button
              onClick={onRegisterVisit}
              className="w-full h-16 rounded-xl bg-green-500 hover:bg-green-400 active:bg-green-600 text-white text-xl font-bold transition-colors shadow-lg shadow-green-900/30"
            >
              {tCheck('register_visit')}
            </button>
          )}
          <button
            onClick={onScanAgain}
            className="w-full h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
          >
            {t('scan_again')}
          </button>
        </div>
      </div>
    )
  }

  if (membership_status === 'expired' || membership_status === 'cancelled') {
    return (
      <div className="w-full flex flex-col gap-5">
        {/* Status badge */}
        <div className="flex items-center gap-2.5">
          <XCircle size={20} className="text-red-400 flex-shrink-0" />
          <span className="text-red-400 text-sm font-semibold uppercase tracking-widest">
            {t('expired_title')}
          </span>
        </div>

        {/* Client name + plan */}
        <div>
          <h2 className="text-3xl md:text-5xl font-bold text-white leading-none tracking-tight">{clientName}</h2>
          {planName && (
            <p className="text-slate-500 text-lg mt-2">{planName}</p>
          )}
        </div>

        {/* Today's appointment */}
        {today_appointment && (
          <TodayAppointmentBox appointment={today_appointment} locale={locale} tCheck={tCheck} />
        )}

        {/* Expired date (only for monthly plans) */}
        {membership && !isPack && (
          <div className="bg-red-950/40 border border-red-800/60 rounded-xl p-4">
            <p className="text-red-400 text-xs uppercase tracking-wide mb-1">{tCheck('expired_on')}</p>
            <p className="text-red-200 text-2xl font-bold">
              {formatDate(membership.expires_at, locale)}
            </p>
          </div>
        )}

        {isPack && (
          <div className="bg-red-950/40 border border-red-800/60 rounded-xl p-4">
            <p className="text-red-400 text-xs uppercase tracking-wide mb-1">{tCheck('sessions_remaining')}</p>
            <p className="text-red-200 text-2xl font-bold">0</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-1">
          <button
            onClick={onRenew}
            className="w-full h-16 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white text-xl font-bold transition-colors shadow-lg shadow-amber-900/30"
          >
            {tCheck('renew')}
          </button>
          <button
            onClick={onScanAgain}
            className="w-full h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
          >
            {t('scan_again')}
          </button>
        </div>
      </div>
    )
  }

  // no_membership
  return (
    <div className="w-full flex flex-col gap-5">
      <div className="flex items-center gap-2.5">
        <MinusCircle size={20} className="text-slate-500 flex-shrink-0" />
        <span className="text-slate-400 text-sm font-semibold uppercase tracking-widest">
          {t('no_plan_title')}
        </span>
      </div>

      <h2 className="text-5xl font-bold text-white leading-none tracking-tight">{clientName}</h2>

      {/* Today's appointment */}
      {today_appointment && (
        <TodayAppointmentBox appointment={today_appointment} locale={locale} tCheck={tCheck} />
      )}

      <div className="flex flex-col gap-3 pt-1">
        <button
          onClick={onAssignMembership}
          className="w-full h-16 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white text-xl font-bold transition-colors shadow-lg shadow-amber-900/30"
        >
          {tCheck('assign_button')}
        </button>
        <button
          onClick={onPostOpVisit}
          className="w-full h-12 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-semibold transition-colors"
        >
          {tCheck('post_op_visit')}
        </button>
        <button
          onClick={onScanAgain}
          className="w-full h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
        >
          {t('scan_again')}
        </button>
      </div>
    </div>
  )
}

function TodayAppointmentBox({
  appointment,
  locale,
  tCheck,
}: {
  appointment: NonNullable<CheckinResult['today_appointment']>
  locale: 'en' | 'es'
  tCheck: ReturnType<typeof useTranslations>
}) {
  const serviceName = locale === 'es' ? appointment.service_name_es : appointment.service_name_en
  const time = new Date(appointment.scheduled_at).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })

  return (
    <div className="bg-amber-950/30 border border-amber-600/50 rounded-xl p-4 flex items-start gap-3">
      <Scissors size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-amber-400 text-xs font-semibold uppercase tracking-wide mb-1">
          {tCheck('today_appointment')} · {time}
        </p>
        {serviceName && (
          <p className="text-white text-sm font-semibold">{serviceName}</p>
        )}
        {appointment.notes && (
          <p className="text-slate-400 text-xs mt-0.5">{appointment.notes}</p>
        )}
      </div>
    </div>
  )
}

function StatBox({
  icon: Icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ElementType
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="bg-slate-800/80 rounded-xl p-4">
      <div className="flex items-center gap-1.5 mb-2">
        <Icon size={12} className="text-slate-500" />
        <p className="text-slate-500 text-xs uppercase tracking-wide">{label}</p>
      </div>
      <p className={`text-2xl font-bold ${highlight ? 'text-red-400' : 'text-white'}`}>
        {value}
      </p>
    </div>
  )
}
