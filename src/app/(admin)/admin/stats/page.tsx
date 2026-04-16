import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import {
  DollarSign, Users, Activity, CreditCard,
  TrendingUp, BarChart3,
} from 'lucide-react'
import { getStatsData, type StatsPeriod } from '@/lib/supabase/queries/stats'
import {
  RevenueBarChart,
  NewClientsBarChart,
  BreakdownBars,
} from '@/components/spa/StatsCharts'

interface Props {
  searchParams: { period?: string }
}

const PERIODS: StatsPeriod[] = ['all_time', 'this_month', 'this_year']

function isValidPeriod(p: string | undefined): p is StatsPeriod {
  return PERIODS.includes(p as StatsPeriod)
}

export default async function StatsPage({ searchParams }: Props) {
  const rawPeriod = searchParams.period
  const period: StatsPeriod = isValidPeriod(rawPeriod) ? rawPeriod : 'all_time'

  const [t, data] = await Promise.all([
    getTranslations('stats'),
    getStatsData(period),
  ])

  const periodLabel: Record<StatsPeriod, string> = {
    all_time:   t('all_time'),
    this_month: t('this_month'),
    this_year:  t('this_year'),
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8 max-w-5xl">

      {/* Header + period selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <BarChart3 size={22} className="text-amber-500" />
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        </div>

        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-full sm:w-auto">
          {PERIODS.map((p) => (
            <Link
              key={p}
              href={`/admin/stats?period=${p}`}
              className={[
                'flex-1 sm:flex-none text-center px-3 sm:px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
                period === p
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700',
              ].join(' ')}
            >
              {periodLabel[p]}
            </Link>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* 1. REVENUE                                                     */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Section icon={DollarSign} title={t('revenue_section')} color="amber">

        {/* Total */}
        <BigStat
          label={t('revenue_total')}
          value={`$${data.revenueTotal.toFixed(0)}`}
          sub={periodLabel[period]}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* By concept */}
          <div>
            <SectionSubtitle>{t('by_concept')}</SectionSubtitle>
            {data.revenueByConcept.length === 0
              ? <Empty />
              : <BreakdownBars
                  items={data.revenueByConcept}
                  color="#f59e0b"
                  format="currency"
                />
            }
          </div>

          {/* By method */}
          <div>
            <SectionSubtitle>{t('by_method')}</SectionSubtitle>
            {data.revenueByMethod.length === 0
              ? <Empty />
              : <BreakdownBars
                  items={data.revenueByMethod}
                  color="#0ea5e9"
                  format="currency"
                />
            }
          </div>
        </div>

        {/* Chart — last 12 months always */}
        <div className="mt-6">
          <SectionSubtitle>{t('monthly_chart')}</SectionSubtitle>
          <RevenueBarChart data={data.revenueByMonth} />
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* 2. CLIENTS                                                     */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Section icon={Users} title={t('clients_section')} color="blue">

        {/* Totals row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MiniStat label={t('clients_total')}    value={data.totalClients}        />
          <MiniStat label={t('status_active')}    value={data.clientsActive}   color="green" />
          <MiniStat label={t('status_expired')}   value={data.clientsExpired}  color="red"   />
          <MiniStat label={t('status_no_plan')}   value={data.clientsNoPlan}   color="gray"  />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* How they heard */}
          <div>
            <SectionSubtitle>{t('how_heard')}</SectionSubtitle>
            {data.clientsByHowHeard.length === 0
              ? <Empty />
              : <BreakdownBars items={data.clientsByHowHeard} color="#64748b" />
            }
          </div>

          {/* Healthcare workers */}
          <div className="space-y-3">
            <SectionSubtitle>{t('healthcare_workers')}</SectionSubtitle>
            <div className="flex items-end gap-3">
              <span className="text-4xl font-bold text-blue-600">{data.healthcareWorkers}</span>
              <span className="text-gray-400 text-sm pb-1">
                / {data.totalClients} clients
                {data.totalClients > 0 && (
                  <> ({Math.round((data.healthcareWorkers / data.totalClients) * 100)}%)</>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* New clients chart — last 12 months always */}
        <div className="mt-6">
          <SectionSubtitle>{t('new_clients_chart')}</SectionSubtitle>
          <NewClientsBarChart data={data.newClientsByMonth} />
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* 3. VISITS                                                      */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Section icon={Activity} title={t('visits_section')} color="green">

        <div className="grid grid-cols-2 gap-4">
          <BigStat
            label={t('visits_total')}
            value={String(data.totalVisits)}
            sub={periodLabel[period]}
          />
          <BigStat
            label={t('avg_per_client')}
            value={data.totalClients > 0
              ? (data.totalVisits / data.totalClients).toFixed(1)
              : '0'}
            sub="per client"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div>
            <SectionSubtitle>{t('by_session_type')}</SectionSubtitle>
            {data.visitsBySessionType.length === 0
              ? <Empty />
              : <BreakdownBars items={data.visitsBySessionType} color="#22c55e" />
            }
          </div>
          <div>
            <SectionSubtitle>{t('by_service')}</SectionSubtitle>
            {data.visitsByService.length === 0
              ? <Empty />
              : <BreakdownBars items={data.visitsByService} color="#a855f7" />
            }
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* 4. MEMBERSHIPS                                                 */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Section icon={CreditCard} title={t('memberships_section')} color="purple">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <SectionSubtitle>{t('by_plan')}</SectionSubtitle>
            {data.membershipsByPlan.length === 0
              ? <Empty />
              : <BreakdownBars items={data.membershipsByPlan} color="#f59e0b" />
            }
          </div>

          <div className="space-y-3">
            <SectionSubtitle>{t('completed_commitments')}</SectionSubtitle>
            <div className="flex items-end gap-3">
              <span className="text-4xl font-bold text-purple-600">
                {data.completedCommitments}
              </span>
              <span className="text-gray-400 text-sm pb-1">3-month cycles</span>
            </div>
          </div>
        </div>
      </Section>

    </div>
  )
}

// ─── Layout helpers ───────────────────────────────────────────────────────────

type SectionColor = 'amber' | 'blue' | 'green' | 'purple'

function Section({
  icon: Icon, title, color, children,
}: {
  icon: React.ElementType
  title: string
  color: SectionColor
  children: React.ReactNode
}) {
  const palette: Record<SectionColor, { bg: string; icon: string }> = {
    amber:  { bg: 'bg-amber-50',  icon: 'text-amber-500'  },
    blue:   { bg: 'bg-blue-50',   icon: 'text-blue-500'   },
    green:  { bg: 'bg-green-50',  icon: 'text-green-500'  },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-500' },
  }
  const c = palette[color]
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Section header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50/50">
        <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${c.bg}`}>
          <Icon size={15} className={c.icon} />
        </div>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

function BigStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-4xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function MiniStat({
  label, value, color = 'default',
}: {
  label: string; value: number; color?: 'green' | 'red' | 'gray' | 'default'
}) {
  const textColor = {
    green:   'text-green-600',
    red:     'text-red-600',
    gray:    'text-gray-400',
    default: 'text-gray-900',
  }[color]
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
    </div>
  )
}

function SectionSubtitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
      {children}
    </p>
  )
}

function Empty() {
  return <p className="text-sm text-gray-300 py-2">No data</p>
}
