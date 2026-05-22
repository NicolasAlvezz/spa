import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Activity, ChevronLeft, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getClientByUserId } from '@/lib/supabase/queries/clients'
import { getClientVisitsPaginated } from '@/lib/supabase/queries/client-portal'
import { VisitsList } from './VisitsList'

interface Props {
  searchParams: { page?: string; period?: string }
}

const PAGE_SIZE = 20

const PERIODS = ['1m', '3m', '6m', '1y', 'all'] as const
type Period = typeof PERIODS[number]

function periodSince(period: string): string | undefined {
  if (period === 'all') return undefined
  const days: Record<string, number> = { '1m': 30, '3m': 90, '6m': 180, '1y': 365 }
  const d = days[period] ?? 30
  const since = new Date()
  since.setDate(since.getDate() - d)
  return since.toISOString()
}

export default async function VisitsPage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const client = await getClientByUserId(user.id)
  if (!client) redirect('/my-qr')

  const period: Period = (PERIODS as readonly string[]).includes(searchParams.period ?? '')
    ? (searchParams.period as Period)
    : '1m'

  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1)
  const since = periodSince(period)

  const [t, { visits, total }] = await Promise.all([
    getTranslations('clientvisits'),
    getClientVisitsPaginated(client.id, page, PAGE_SIZE, since),
  ])

  const locale: 'en' | 'es' = client.preferred_language === 'es' ? 'es' : 'en'
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const periodLabels: Record<Period, string> = {
    '1m':  t('period_1m'),
    '3m':  t('period_3m'),
    '6m':  t('period_6m'),
    '1y':  t('period_1y'),
    'all': t('period_all'),
  }

  return (
    <div className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 py-6 gap-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-green-50">
          <Activity size={18} className="text-green-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          {total > 0 && (
            <p className="text-sm text-gray-400">
              {t('total_visits', { count: total })}
            </p>
          )}
        </div>
      </div>

      {/* Period filter */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {PERIODS.map(p => (
          <Link
            key={p}
            href={`/visits?page=1&period=${p}`}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              period === p
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {periodLabels[p]}
          </Link>
        ))}
      </div>

      {/* Visits list / empty */}
      {visits.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-20 text-center">
          <p className="text-sm text-gray-400">{t('no_visits')}</p>
        </div>
      ) : (
        <VisitsList visits={visits} locale={locale} />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <Link
            href={`/visits?page=${page - 1}&period=${period}`}
            aria-disabled={page <= 1}
            className={[
              'inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-sm font-medium border transition-colors',
              page <= 1
                ? 'pointer-events-none opacity-40 border-gray-200 text-gray-400'
                : 'border-gray-200 text-gray-700 hover:bg-gray-50',
            ].join(' ')}
          >
            <ChevronLeft size={15} />
            {t('prev_page')}
          </Link>

          <p className="text-sm text-gray-400">
            {t('page_info', { current: page, total: totalPages })}
          </p>

          <Link
            href={`/visits?page=${page + 1}&period=${period}`}
            aria-disabled={page >= totalPages}
            className={[
              'inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-sm font-medium border transition-colors',
              page >= totalPages
                ? 'pointer-events-none opacity-40 border-gray-200 text-gray-400'
                : 'border-gray-200 text-gray-700 hover:bg-gray-50',
            ].join(' ')}
          >
            {t('next_page')}
            <ChevronRight size={15} />
          </Link>
        </div>
      )}

    </div>
  )
}
