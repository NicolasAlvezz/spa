'use client'

import { useTranslations, useLocale } from 'next-intl'
import { CheckCircle2, MinusCircle, Calendar, Activity, RotateCcw, Star, AlertTriangle, CreditCard, Scissors, Phone, Clock, FileText, ShieldAlert, Gift } from 'lucide-react'
import { formatDate, formatDateTime } from '@/lib/utils/dates'
import { getAvailableSessions } from '@/lib/utils/membership'
import { TherapistSelector } from '@/components/spa/TherapistSelector'
import type { CheckinResult } from '@/types'

interface Props {
  data: CheckinResult
  therapistName: string
  onTherapistChange: (name: string) => void
  onScanAgain: () => void
  onRegisterVisit: () => void
  onAssignMembership: () => void
  onChangePlan?: () => void
  onRegisterServiceVisit?: () => void
  onConfirmSplitPayment?: () => void
  onSendContract?: () => void
  onRegisterAdditionalVisit?: () => void
  splitPaymentBlocked?: boolean
}

export function CheckinCard({
  data,
  therapistName,
  onTherapistChange,
  onScanAgain,
  onRegisterVisit,
  onAssignMembership,
  onChangePlan,
  onRegisterServiceVisit,
  onConfirmSplitPayment,
  onSendContract,
  onRegisterAdditionalVisit,
  splitPaymentBlocked = false,
}: Props) {
  const t = useTranslations('scan')
  const tCheck = useTranslations('checkin')
  const tContract = useTranslations('membership_contract')
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
  const splitSecondAmount = plan ? plan.price_usd - (plan.split_first_amount ?? 0) : 0

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
          {isPack && (
            <p className="text-brand-400 text-xs font-semibold uppercase tracking-wide mt-1">
              {locale === 'es' ? 'Post-operatorio únicamente' : 'Post-operative massages only'}
            </p>
          )}
        </div>

        <ClientInfoBar client={client} lastVisit={data.last_visit} locale={locale} />

        {/* Today's appointment */}
        {today_appointment && (
          <TodayAppointmentBox appointment={today_appointment} locale={locale} tCheck={tCheck} />
        )}

        {/* Split payment warning */}
        {showSplitWarning && (
          <div className="bg-brand-950/40 border border-brand-700/60 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle size={18} className="text-brand-400 flex-shrink-0 mt-0.5" />
            <p className="text-brand-300 text-sm font-medium">
              {t('split_payment_warning')}
              {splitSecondAmount > 0 && ` — $${splitSecondAmount}`}
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          {isPack ? (
            <>
              <StatBox icon={Star} label={tCheck('sessions_remaining')} value={String(sessionsRemaining)} highlight={sessionsRemaining === 0} />
              <StatBox icon={Activity} label={tCheck('sessions_used_total')} value={`${sessionsUsed} / ${totalSessions}`} />
              <StatBox icon={Activity} label={t('visits_this_month')} value={String(data.visits_this_month.length)} />
              <StatBox icon={Calendar} label={tCheck('expires')} value={formatDate(membership!.expires_at, locale)} />
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
          <p className="text-brand-400 text-sm font-medium flex items-center gap-1.5">
            <RotateCcw size={13} />
            {tCheck('rollover')}
          </p>
        )}

        {client.credit_balance > 0 && (
          <div className="bg-green-950/40 border border-green-700/60 rounded-xl px-4 py-3 flex items-center gap-3">
            <Gift size={16} className="text-green-400 flex-shrink-0" />
            <p className="text-green-300 text-sm font-semibold">
              {tCheck('credit_available', { amount: client.credit_balance })}
            </p>
          </div>
        )}

        <TherapistSelector value={therapistName} onChange={onTherapistChange} />

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-1">
          {!data.has_active_consent ? (
            <div className="bg-amber-950/40 border border-amber-700/60 rounded-xl p-4 flex items-start gap-3">
              <ShieldAlert size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-300 text-sm font-semibold mb-1">
                  {locale === 'es' ? 'Consentimiento requerido' : 'Consent required'}
                </p>
                <p className="text-amber-400/80 text-xs leading-relaxed">
                  {locale === 'es'
                    ? 'El cliente debe abrir su app y aceptar el formulario antes de registrar la visita. Pedile que lo haga y luego escanéa el QR de nuevo.'
                    : 'The client must open their app and accept the consent form before the visit can be registered. Ask them to do so, then scan again.'}
                </p>
              </div>
            </div>
          ) : splitPaymentBlocked ? (
            <>
              <div className="bg-red-950/40 border border-red-800/60 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-300 text-sm font-medium">{t('split_payment_blocked')}</p>
              </div>
              <button
                onClick={onConfirmSplitPayment}
                className="w-full h-16 rounded-xl bg-brand-500 hover:bg-brand-400 active:bg-brand-600 text-white text-xl font-bold transition-colors shadow-lg shadow-brand-900/30 flex items-center justify-center gap-2"
              >
                <CreditCard size={20} />
                {t('confirm_split')}{splitSecondAmount > 0 && ` ($${splitSecondAmount})`}
              </button>
            </>
          ) : !isPack && availableSessions === 0 && onRegisterAdditionalVisit ? (
            <>
              <div className="bg-amber-950/40 border border-amber-700/60 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-amber-300 text-sm font-medium">
                  {locale === 'es'
                    ? 'Sesiones del mes agotadas — la próxima visita se cobra aparte'
                    : 'Monthly sessions used — next visit will be charged separately'}
                </p>
              </div>
              <button
                onClick={onRegisterAdditionalVisit}
                className="w-full h-16 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white text-xl font-bold transition-colors shadow-lg shadow-amber-900/30 flex items-center justify-center gap-2"
              >
                <CreditCard size={20} />
                {locale === 'es' ? 'Registrar visita extra' : 'Register additional visit'}
                {plan ? ` — $${plan.additional_price_usd ?? plan.price_usd}` : ''}
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
          {onChangePlan && (
            <button
              onClick={onChangePlan}
              className="w-full h-12 rounded-xl bg-brand-500 hover:bg-brand-400 active:bg-brand-600 text-white text-sm font-semibold transition-colors shadow-lg shadow-brand-900/30"
            >
              {locale === 'es' ? 'Cambiar plan' : 'Change Plan'}
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

      <ClientInfoBar client={client} lastVisit={data.last_visit} locale={locale} />

      {/* Today's appointment */}
      {today_appointment && (
        <TodayAppointmentBox appointment={today_appointment} locale={locale} tCheck={tCheck} />
      )}

      {client.credit_balance > 0 && (
        <div className="bg-green-950/40 border border-green-700/60 rounded-xl px-4 py-3 flex items-center gap-3">
          <Gift size={16} className="text-green-400 flex-shrink-0" />
          <p className="text-green-300 text-sm font-semibold">
            {tCheck('credit_available', { amount: client.credit_balance })}
          </p>
        </div>
      )}

      <TherapistSelector value={therapistName} onChange={onTherapistChange} />

      <div className="flex flex-col gap-3 pt-1">
        {!data.has_active_consent ? (
          <div className="bg-amber-950/40 border border-amber-700/60 rounded-xl p-4 flex items-start gap-3">
            <ShieldAlert size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-300 text-sm font-semibold mb-1">
                {locale === 'es' ? 'Consentimiento requerido' : 'Consent required'}
              </p>
              <p className="text-amber-400/80 text-xs leading-relaxed">
                {locale === 'es'
                  ? 'El cliente debe abrir su app y aceptar el formulario antes de registrar la visita. Pedile que lo haga y luego escanéa el QR de nuevo.'
                  : 'The client must open their app and accept the consent form before the visit can be registered. Ask them to do so, then scan again.'}
              </p>
            </div>
          </div>
        ) : (
          <button
            onClick={onRegisterServiceVisit}
            className="w-full h-16 rounded-xl bg-green-500 hover:bg-green-400 active:bg-green-600 text-white text-xl font-bold transition-colors shadow-lg shadow-green-900/30"
          >
            {locale === 'es' ? 'Registrar visita' : 'Register visit'}
          </button>
        )}
        {onSendContract && (
          <button
            onClick={onSendContract}
            className="w-full h-12 rounded-xl bg-brand-500 hover:bg-brand-400 active:bg-brand-600 text-white text-sm font-semibold transition-colors shadow-lg shadow-brand-900/30"
          >
            {tContract('send_contract')}
          </button>
        )}
        <button
          onClick={onAssignMembership}
          className="w-full h-12 rounded-xl bg-slate-700 hover:bg-slate-600 active:bg-slate-800 text-white text-sm font-semibold transition-colors"
        >
          {tCheck('assign_button')}
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
    timeZone: 'America/New_York',
  })

  return (
    <div className="bg-brand-950/30 border border-brand-600/50 rounded-xl p-4 flex items-start gap-3">
      <Scissors size={16} className="text-brand-400 flex-shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-brand-400 text-xs font-semibold uppercase tracking-wide mb-1">
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

function ClientInfoBar({
  client,
  lastVisit,
  locale,
}: {
  client: CheckinResult['client']
  lastVisit: CheckinResult['last_visit']
  locale: 'en' | 'es'
}) {
  const lastVisitLabel = lastVisit
    ? formatDateTime(lastVisit.visited_at, locale)
    : (locale === 'es' ? 'Sin visitas previas' : 'No previous visits')

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-slate-400 text-sm">
        <Phone size={13} className="flex-shrink-0" />
        <span>{client.phone}</span>
      </div>
      <div className="flex items-center gap-2 text-slate-400 text-sm">
        <Clock size={13} className="flex-shrink-0" />
        <span>{locale === 'es' ? 'Última visita: ' : 'Last visit: '}{lastVisitLabel}</span>
      </div>
      {client.notes && (
        <div className="flex items-start gap-2 bg-slate-800/60 rounded-lg px-3 py-2 mt-1">
          <FileText size={13} className="text-slate-400 flex-shrink-0 mt-0.5" />
          <p className="text-slate-300 text-xs leading-relaxed">{client.notes}</p>
        </div>
      )}
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
