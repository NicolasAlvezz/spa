import { getTranslations } from 'next-intl/server'
import { Users, Activity, DollarSign, AlertTriangle, Clock } from 'lucide-react'
import {
  getDashboardStats,
  getTodayVisits,
  getTodayAppointments,
} from '@/lib/supabase/queries/dashboard'
import {
  getClientSelectList,
  getServiceTypes,
} from '@/lib/supabase/queries/clients'
import { AddAppointmentModal } from '@/components/spa/AddAppointmentModal'

export default async function AdminDashboardPage() {
  const [t, stats, visits, appointments, clients, serviceTypes] = await Promise.all([
    getTranslations('dashboard'),
    getDashboardStats(),
    getTodayVisits(),
    getTodayAppointments(),
    getClientSelectList(),
    getServiceTypes(),
  ])

  const tNav = await getTranslations('nav')

  return (
    <div className="p-8 space-y-8 max-w-5xl">

      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{tNav('dashboard')}</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            timeZone: 'America/New_York',
          })}
        </p>
      </div>

      {/* ── Stats cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label={t('active_clients')}
          value={String(stats.activeClients)}
          color="green"
        />
        <StatCard
          icon={Activity}
          label={t('visits_this_month')}
          value={String(stats.visitsThisMonth)}
          color="blue"
        />
        <StatCard
          icon={DollarSign}
          label={t('revenue_this_month')}
          value={`$${stats.revenueThisMonth.toFixed(0)}`}
          color="amber"
        />
        <StatCard
          icon={AlertTriangle}
          label={t('expiring_soon')}
          value={String(stats.expiringThisWeek)}
          color={stats.expiringThisWeek > 0 ? 'red' : 'gray'}
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
                      {v.service?.name_en ?? 'Session'} · {sessionLabel(v.session_type)}
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

        {/* Right: Appointments today */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-700">{t('today_appointments')}</h2>
            </div>
            <AddAppointmentModal clients={clients} serviceTypes={serviceTypes} />
          </div>

          {appointments.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-gray-400">{t('no_appointments_today')}</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {appointments.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 ${
                    a.status === 'scheduled'  ? 'bg-amber-50' :
                    a.status === 'completed'  ? 'bg-green-50' :
                    a.status === 'no_show'    ? 'bg-red-50'   : 'bg-gray-50'
                  }`}>
                    <Clock size={14} className={
                      a.status === 'scheduled'  ? 'text-amber-500' :
                      a.status === 'completed'  ? 'text-green-500' :
                      a.status === 'no_show'    ? 'text-red-400'   : 'text-gray-400'
                    } />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {a.client.first_name} {a.client.last_name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {a.service?.name_en ?? 'Appointment'}
                      {a.notes && ` · ${a.notes}`}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <time className="text-xs text-gray-400 tabular-nums">
                      {formatTime(a.scheduled_at)}
                    </time>
                    {a.status !== 'scheduled' && (
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                        a.status === 'completed' ? 'bg-green-100 text-green-700' :
                        a.status === 'no_show'   ? 'bg-red-100 text-red-600'    :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {t(`appointment_${a.status}` as Parameters<typeof t>[0])}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
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

function sessionLabel(type: string) {
  const map: Record<string, string> = {
    included: 'Included', rollover: 'Rollover',
    additional: 'Additional', welcome_offer: 'Welcome',
  }
  return map[type] ?? type
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

type Color = 'green' | 'blue' | 'amber' | 'red' | 'gray'

function StatCard({
  icon: Icon, label, value, color,
}: {
  icon: React.ElementType
  label: string
  value: string
  color: Color
}) {
  const palette: Record<Color, { bg: string; icon: string; val: string }> = {
    green:  { bg: 'bg-green-50',  icon: 'text-green-500',  val: 'text-green-700'  },
    blue:   { bg: 'bg-blue-50',   icon: 'text-blue-500',   val: 'text-gray-900'   },
    amber:  { bg: 'bg-amber-50',  icon: 'text-amber-500',  val: 'text-amber-700'  },
    red:    { bg: 'bg-red-50',    icon: 'text-red-500',    val: 'text-red-700'    },
    gray:   { bg: 'bg-gray-100',  icon: 'text-gray-400',   val: 'text-gray-700'   },
  }
  const c = palette[color]
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg ${c.bg} mb-3`}>
        <Icon size={17} className={c.icon} />
      </div>
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-3xl font-bold ${c.val}`}>{value}</p>
    </div>
  )
}
