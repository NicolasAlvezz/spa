'use client'

import QRCode from 'react-qr-code'
import Image from 'next/image'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import enMessages from '../../../messages/en.json'
import esMessages from '../../../messages/es.json'
import { useEffect, useState } from 'react'
import { CalendarDays, Activity, RotateCcw, Clock, ChevronRight } from 'lucide-react'
import { MembershipBadge } from './MembershipBadge'
import { BookingSection } from './BookingSection'
import { formatDate, formatDateTime } from '@/lib/utils/dates'
import { getCurrentMembership } from '@/lib/utils/membership'
import type { ClientDetail } from '@/types'
import type { ClientNextAppointment, ClientVisitRow } from '@/lib/supabase/queries/client-portal'
import type { ServiceTypeItem } from '@/lib/supabase/queries/clients'

interface Props {
  client: ClientDetail
  nextAppointment: ClientNextAppointment | null
  recentVisits: ClientVisitRow[]
  serviceTypes: ServiceTypeItem[]
}

const SESSION_LABELS: Record<string, { en: string; es: string }> = {
  included:      { en: 'Included',             es: 'Incluida' },
  rollover:      { en: 'Rollover',             es: 'Rollover' },
  additional:    { en: 'Additional',           es: 'Adicional' },
  welcome_offer: { en: 'Welcome offer',        es: 'Bienvenida' },
}

export function QrDisplay({ client, nextAppointment, recentVisits, serviceTypes }: Props) {
  const t = useTranslations('myqr')
  const tCheck = useTranslations('checkin')
  const locale = useLocale() as 'en' | 'es'
  const [consented, setConsented] = useState(false)
  const [qrSize, setQrSize] = useState(200)

  useEffect(() => {
    function update() {
      setQrSize(window.innerWidth < 640 ? 200 : 256)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const membership = getCurrentMembership(client.memberships)
  const plan = membership?.membership_plans

  function sessionLabel(type: string) {
    return SESSION_LABELS[type]?.[locale] ?? type
  }

  function serviceName(row: ClientVisitRow) {
    return locale === 'es' ? row.service_name_es : row.service_name_en
  }

  function appointmentServiceName(appt: ClientNextAppointment) {
    return locale === 'es' ? appt.service_name_es : appt.service_name_en
  }

  if (!consented) {
    return (
      <div className="flex-1 flex flex-col px-5 py-8 max-w-sm mx-auto w-full gap-5">

        {/* Logo + title */}
        <div className="text-center">
          <Image src="/images/logo.png" alt="VM" width={80} height={80} className="mx-auto mb-3 drop-shadow" />
          <h1 className="text-lg font-bold text-gray-900">VM Integral Massage</h1>
          <p className="text-xs text-gray-400 mt-0.5">Kissimmee, Florida</p>
        </div>

        {/* Consent text — always shown bilingual by design */}
        <div className="flex-1 overflow-y-auto bg-gray-50 rounded-2xl border border-gray-200 p-5 space-y-5 text-sm leading-relaxed text-gray-600">

          <div className="space-y-1">
            <h2 className="font-bold text-gray-800 text-sm">{enMessages.consent.medical_title}</h2>
            <p>{enMessages.consent.medical_body}</p>
          </div>

          <div className="space-y-1">
            <h2 className="font-bold text-gray-800 text-sm">{esMessages.consent.medical_title}</h2>
            <p>{esMessages.consent.medical_body}</p>
          </div>

          <div className="border-t border-gray-200 pt-4 space-y-1">
            <h2 className="font-bold text-gray-800 text-sm">{enMessages.consent.agreement_title}</h2>
            <p>{enMessages.consent.agreement_body}</p>
          </div>

          <div className="space-y-1">
            <h2 className="font-bold text-gray-800 text-sm">{esMessages.consent.agreement_title}</h2>
            <p>{esMessages.consent.agreement_body}</p>
          </div>

        </div>

        {/* Accept button */}
        <button
          onClick={() => setConsented(true)}
          className="w-full h-14 rounded-xl bg-brand-500 hover:bg-brand-400 active:bg-brand-600 text-white font-bold text-base transition-colors shadow-lg shadow-brand-900/20"
        >
          {enMessages.consent.accept_button} &nbsp;/&nbsp; {esMessages.consent.accept_button}
        </button>

      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col items-center px-4 sm:px-6 py-8 sm:py-12 gap-6 sm:gap-7 max-w-sm mx-auto w-full">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="text-center">
        <p className="text-xs text-gray-400 uppercase tracking-widest mb-2 font-medium">
          VM Integral Massage
        </p>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          {client.first_name} {client.last_name}
        </h1>
        {membership && (
          <div className="flex justify-center mt-2">
            <MembershipBadge membership={membership} locale={locale} />
          </div>
        )}
      </div>

      {/* ── QR Code ────────────────────────────────────────────────────── */}
      <div className="relative">
        <div className="absolute -inset-3 rounded-3xl bg-brand-500/10" />
        <div className="relative p-5 bg-white border border-gray-200 rounded-2xl shadow-md">
          <QRCode
            value={client.id}
            size={qrSize}
            bgColor="#ffffff"
            fgColor="#0f172a"
          />
        </div>
      </div>

      <p className="text-sm text-gray-500 text-center leading-relaxed max-w-xs">
        {t('subtitle')}
      </p>

      {/* ── Membership card ────────────────────────────────────────────── */}
      {membership && plan ? (
        <div className="w-full bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-800">
              {locale === 'es' ? plan.name_es : plan.name_en}
            </p>
          </div>
          <div className="divide-y divide-gray-50">
            <div className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <CalendarDays size={14} />
                {tCheck('expires')}
              </div>
              <span className="text-sm font-semibold text-gray-700">
                {formatDate(membership.expires_at, locale)}
              </span>
            </div>
            <div className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Activity size={14} />
                {tCheck('sessions_used')}
              </div>
              <span className="text-sm font-semibold text-gray-700">
                {membership.sessions_used_this_month} / {plan.sessions_per_month}
              </span>
            </div>
            {membership.rollover_sessions > 0 && (
              <div className="flex items-center gap-2 px-5 py-3 text-sm text-brand-600 font-medium">
                <RotateCcw size={13} />
                {tCheck('rollover')}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="w-full bg-gray-50 rounded-2xl border border-gray-200 p-5 text-center">
          <p className="text-sm text-gray-400">{t('no_membership')}</p>
        </div>
      )}

      {/* ── Next appointment ───────────────────────────────────────────── */}
      <div className="w-full">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
          {t('next_appointment')}
        </p>
        {nextAppointment ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-brand-50 flex-shrink-0">
              <Clock size={16} className="text-brand-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">
                {formatDateTime(nextAppointment.scheduled_at, locale)}
              </p>
              {(appointmentServiceName(nextAppointment) ?? nextAppointment.notes) && (
                <p className="text-xs text-gray-400 mt-0.5 truncate">
                  {appointmentServiceName(nextAppointment) ?? nextAppointment.notes}
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-300 py-1">{t('no_upcoming')}</p>
        )}
      </div>

      {/* ── Recent visits ──────────────────────────────────────────────── */}
      <div className="w-full">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            {t('recent_visits')}
          </p>
          {recentVisits.length > 0 && (
            <Link
              href="/visits"
              className="text-xs font-medium text-brand-600 hover:text-brand-700 flex items-center gap-0.5"
            >
              {t('view_all')}
              <ChevronRight size={13} />
            </Link>
          )}
        </div>

        {recentVisits.length === 0 ? (
          <p className="text-sm text-gray-300 py-1">{t('no_recent_visits')}</p>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-50">
            {recentVisits.map((v) => (
              <div key={v.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-xs font-medium text-gray-700">
                    {formatDate(v.visited_at, locale)}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {serviceName(v) ?? sessionLabel(v.session_type)}
                  </p>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                  {sessionLabel(v.session_type)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Book an appointment ────────────────────────────────────────── */}
      <BookingSection locale={locale} serviceTypes={serviceTypes} />

      {/* ── Member since ───────────────────────────────────────────────── */}
      <p className="text-xs text-gray-300 font-medium">
        {t('member_since')} {formatDate(client.created_at, locale)}
      </p>
    </div>
  )
}
