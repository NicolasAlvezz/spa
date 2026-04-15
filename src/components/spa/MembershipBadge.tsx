import { cn } from '@/lib/utils'
import { getMembershipStatus } from '@/lib/utils/membership'
import type { MembershipWithPlan, MembershipStatus } from '@/types'

const styles: Record<MembershipStatus, string> = {
  active:       'bg-green-100 text-green-700 ring-1 ring-green-200',
  expired:      'bg-red-100 text-red-700 ring-1 ring-red-200',
  cancelled:    'bg-gray-100 text-gray-500 ring-1 ring-gray-200',
  no_membership:'bg-gray-100 text-gray-400 ring-1 ring-gray-200',
}

const labels: Record<MembershipStatus, { en: string; es: string }> = {
  active:       { en: 'Active',     es: 'Activa' },
  expired:      { en: 'Expired',    es: 'Vencida' },
  cancelled:    { en: 'Cancelled',  es: 'Cancelada' },
  no_membership:{ en: 'No plan',    es: 'Sin plan' },
}

interface Props {
  membership: MembershipWithPlan | null
  locale?: 'en' | 'es'
}

export function MembershipBadge({ membership, locale = 'en' }: Props) {
  const status = getMembershipStatus(membership)
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap',
        styles[status]
      )}
    >
      {status === 'active' && (
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5" />
      )}
      {labels[status][locale]}
    </span>
  )
}
