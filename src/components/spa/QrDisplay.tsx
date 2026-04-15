'use client'

import QRCode from 'react-qr-code'
import { useTranslations, useLocale } from 'next-intl'
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

  const membership = getCurrentMembership(client.memberships)
  const plan = membership?.membership_plans

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 gap-6 max-w-sm mx-auto w-full">
      {/* Greeting */}
      <div className="text-center">
        <p className="text-sm text-gray-400 uppercase tracking-wider mb-1">
          VM Integral Massage
        </p>
        <h1 className="text-2xl font-bold text-gray-900">
          {client.first_name} {client.last_name}
        </h1>
      </div>

      {/* QR Code */}
      <div className="p-5 bg-white border-2 border-gray-900 rounded-2xl shadow-sm">
        <QRCode
          value={client.id}
          size={220}
          bgColor="#ffffff"
          fgColor="#0f172a"
        />
      </div>

      {/* Instruction */}
      <p className="text-sm text-gray-500 text-center leading-relaxed">
        {t('subtitle')}
      </p>

      {/* Membership info */}
      {membership && plan ? (
        <div className="w-full bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800">
              {locale === 'es' ? plan.name_es : plan.name_en}
            </p>
            <MembershipBadge membership={membership} locale={locale} />
          </div>
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>{tCheck('expires')}</span>
            <span className="font-medium text-gray-700">
              {formatDate(membership.expires_at, locale)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>{tCheck('sessions_used')}</span>
            <span className="font-medium text-gray-700">
              {membership.sessions_used_this_month} / {plan.sessions_per_month}
            </span>
          </div>
          {membership.rollover_sessions > 0 && (
            <p className="text-xs text-amber-600 font-medium">
              ✦ {tCheck('rollover')}
            </p>
          )}
        </div>
      ) : (
        <div className="w-full bg-gray-50 rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-sm text-gray-400">{t('no_membership')}</p>
        </div>
      )}

      {/* Member since */}
      <p className="text-xs text-gray-400">
        {t('member_since')} {formatDate(client.created_at, locale)}
      </p>
    </div>
  )
}
