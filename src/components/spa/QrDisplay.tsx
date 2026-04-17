'use client'

import QRCode from 'react-qr-code'
import { useTranslations, useLocale } from 'next-intl'
import { useEffect, useState } from 'react'
import { CalendarDays, Activity, RotateCcw } from 'lucide-react'
import { MembershipBadge } from './MembershipBadge'
import { formatDate } from '@/lib/utils/dates'
import { getCurrentMembership } from '@/lib/utils/membership'
import type { ClientDetail } from '@/types'

interface Props {
  client: ClientDetail
}

export function QrDisplay({ client }: Props) {
  const t = useTranslations('myqr')
  const tCheck = useTranslations('checkin')
  const locale = useLocale() as 'en' | 'es'
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

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-8 sm:py-12 gap-6 sm:gap-7 max-w-sm mx-auto w-full">

      {/* Header */}
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

      {/* QR Code */}
      <div className="relative">
        {/* Outer glow ring */}
        <div className="absolute -inset-3 rounded-3xl bg-amber-500/10" />
        <div className="relative p-5 bg-white border border-gray-200 rounded-2xl shadow-md">
          <QRCode
            value={client.id}
            size={qrSize}
            bgColor="#ffffff"
            fgColor="#0f172a"
          />
        </div>
      </div>

      {/* Instruction */}
      <p className="text-sm text-gray-500 text-center leading-relaxed max-w-xs">
        {t('subtitle')}
      </p>

      {/* Membership card */}
      {membership && plan ? (
        <div className="w-full bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Plan header */}
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-800">
              {locale === 'es' ? plan.name_es : plan.name_en}
            </p>
          </div>

          {/* Stats */}
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
              <div className="flex items-center gap-2 px-5 py-3 text-sm text-amber-600 font-medium">
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

      {/* Member since */}
      <p className="text-xs text-gray-300 font-medium">
        {t('member_since')} {formatDate(client.created_at, locale)}
      </p>
    </div>
  )
}
