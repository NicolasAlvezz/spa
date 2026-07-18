import { Calendar, Star } from 'lucide-react'
import { getCurrentMembership, getPackExpiryDate, getPackServiceLabel } from '@/lib/utils/membership'
import { formatDate } from '@/lib/utils/dates'

interface Props {
  plan: NonNullable<ReturnType<typeof getCurrentMembership>>['membership_plans']
  membership: NonNullable<ReturnType<typeof getCurrentMembership>>
  locale: 'en' | 'es'
  tCheck: (key: string) => string
}

export function PackMembershipDetails({ plan, membership, locale, tCheck }: Props) {
  const total = plan?.total_sessions ?? 0
  const remaining = membership.sessions_remaining ?? 0
  const used = Math.max(0, total - remaining)
  const progress = total > 0 ? Math.round((used / total) * 100) : 0

  return (
    <div className="space-y-3 border-t border-gray-100 pt-3">
      <div className="rounded-xl bg-orange-50 border border-orange-100 px-3.5 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-orange-600">
          {tCheck('pack_service_included')}
        </p>
        <p className="text-sm font-semibold text-orange-900 mt-1">
          {getPackServiceLabel(locale)}
        </p>
      </div>

      <div className="rounded-xl bg-gray-50 border border-gray-100 px-3.5 py-3 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Star size={14} className="text-brand-500" />
            {tCheck('sessions_used_total')}
          </div>
          <span className="text-sm font-bold text-gray-900 tabular-nums">
            {used} / {total}
          </span>
        </div>
        <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-brand-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-gray-500">
          {tCheck('sessions_remaining')}:{' '}
          <span className="font-bold text-gray-800 tabular-nums">{remaining}</span>
        </p>
      </div>

      <div className="rounded-xl bg-amber-50 border border-amber-100 px-3.5 py-3 flex items-start gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 flex-shrink-0">
          <Calendar size={15} className="text-amber-700" />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">
            {tCheck('expires')}
          </p>
          <p className="text-sm font-bold text-amber-900 mt-0.5">
            {formatDate(getPackExpiryDate(membership), locale)}
          </p>
          <p className="text-xs text-amber-700/80 mt-1">
            {tCheck('pack_expires_in_2_months')}
          </p>
        </div>
      </div>
    </div>
  )
}
