import { getTranslations, getLocale } from 'next-intl/server'
import { Users, Activity, DollarSign, AlertTriangle } from 'lucide-react'
import {
  getDashboardStats,
  getTodayVisits,
  getCalendarAppointments,
} from '@/lib/supabase/queries/dashboard'
import {
  getClientSelectList,
  getServiceTypes,
} from '@/lib/supabase/queries/clients'
import { DayCalendar } from '@/components/spa/DayCalendar'
import { DashboardDateFilter } from '@/components/spa/DashboardDateFilter'
import { InfoPopover } from '@/components/spa/InfoPopover'

interface Props {
  searchParams: { from?: string; to?: string }
}

export default async function AdminDashboardPage({ searchParams }: Props) {
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date())
  const defaultFrom = todayStr.slice(0, 7) + '-01'
  const defaultTo   = todayStr

  const from = searchParams.from ?? defaultFrom
  const to   = searchParams.to   ?? defaultTo

  const [t, tNav, locale, stats, visits, appointments, clients, serviceTypes] = await Promise.all([
    getTranslations('dashboard'),
    getTranslations('nav'),
    getLocale(),
    getDashboardStats({ from, to }),
    getTodayVisits(),
    getCalendarAppointments(todayStr),
    getClientSelectList(),
    getServiceTypes(),
  ])

  const sessionLabels: Record<string, string> = {
    included:      t('session_included'),
    rollover:      t('session_rollover'),
    additional:    t('session_additional'),
    welcome_offer: t('session_welcome'),
    post_op:       t('session_post_op'),
  }

  const isCustomRange = from !== defaultFrom || to !== defaultTo

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8 max-w-5xl">

      {/* Page title */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{tNav('dashboard')}</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {new Date().toLocaleDateString(locale === 'es' ? 'es-US' : 'en-US', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
              timeZone: 'America/New_York',
            })}
          </p>
        </div>
        <DashboardDateFilter
          from={from}
          to={to}
          defaultFrom={defaultFrom}
          defaultTo={defaultTo}
        />
      </div>

      {/* ── Stats cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label={t('active_clients')}
          value={String(stats.activeClients)}
          color="green"
          info={{
            title: 'Clients with membership',
            description: 'Number of clients who currently have an active membership — not expired and not cancelled.',
          }}
        />
        <StatCard
          icon={Activity}
          label={isCustomRange ? t('visits_in_range') : t('visits_this_month')}
          value={String(stats.visitsThisMonth)}
          color="blue"
          info={{
            title: 'Visits',
            description: 'Total service sessions registered in the selected date range, regardless of session type or membership status.',
          }}
        />
        <StatCard
          icon={DollarSign}
          label={isCustomRange ? t('revenue_in_range') : t('revenue_this_month')}
          value={`$${stats.revenueThisMonth.toFixed(0)}`}
          color="brand"
          info={{
            title: 'Revenue',
            description: 'Sum of all membership payments recorded in the system, plus the price of individual service sessions (visits not linked to a membership) in the selected date range.',
          }}
        />
        <StatCard
          icon={AlertTriangle}
          label={t('expiring_soon')}
          value={String(stats.expiringThisWeek)}
          color={stats.expiringThisWeek > 0 ? 'red' : 'gray'}
          info={{
            title: 'Expiring this week',
            description: 'Active memberships whose expiration date falls within the next 7 days. These clients will need to renew soon.',
          }}
        />
      </div>

      {/* ── Today's calendar ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left: Visits today */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-700">{t('today_visits')}</h2>
            </div>
            <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {visits.length}
            </span>
          </div>

          {visits.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-gray-400">{t('no_visits_today')}</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {visits.map((v) => (
                <li key={v.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-50 flex-shrink-0">
                    <Activity size={14} className="text-green-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {v.client.first_name} {v.client.last_name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {(locale === 'es' ? v.service?.name_es : v.service?.name_en) ?? t('service_session')} · {sessionLabels[v.session_type] ?? v.session_type}
                    </p>
                  </div>
                  <time className="text-xs text-gray-400 tabular-nums flex-shrink-0">
                    {formatTime(v.visited_at)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Right: Day Calendar */}
        <DayCalendar
          initialAppointments={appointments}
          initialDateStr={todayStr}
          clients={clients}
          serviceTypes={serviceTypes}
        />
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
    timeZone: 'America/New_York',
  })
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

type Color = 'green' | 'blue' | 'brand' | 'red' | 'gray'

function StatCard({
  icon: Icon, label, value, color, info,
}: {
  icon: React.ElementType
  label: string
  value: string
  color: Color
  info?: { title: string; description: string }
}) {
  const palette: Record<Color, { bg: string; icon: string; val: string }> = {
    green:  { bg: 'bg-green-50',  icon: 'text-green-500',  val: 'text-green-700'  },
    blue:   { bg: 'bg-blue-50',   icon: 'text-blue-500',   val: 'text-gray-900'   },
    brand:  { bg: 'bg-brand-50',  icon: 'text-brand-500',  val: 'text-brand-700'  },
    red:    { bg: 'bg-red-50',    icon: 'text-red-500',    val: 'text-red-700'    },
    gray:   { bg: 'bg-gray-100',  icon: 'text-gray-400',   val: 'text-gray-700'   },
  }
  const c = palette[color]
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg ${c.bg} mb-3`}>
        <Icon size={17} className={c.icon} />
      </div>
      <div className="flex items-center gap-1.5 mb-1">
        <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
        {info && <InfoPopover title={info.title} description={info.description} />}
      </div>
      <p className={`text-3xl font-bold ${c.val}`}>{value}</p>
    </div>
  )
}
