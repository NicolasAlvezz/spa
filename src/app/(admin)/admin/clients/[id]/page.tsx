import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Printer, Calendar, CreditCard, Activity, TrendingUp } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import {
  getClientById,
  getClientVisits,
  getClientPayments,
} from '@/lib/supabase/queries/clients'
import { getCurrentMembership } from '@/lib/utils/membership'
import { formatDate, formatDateTime } from '@/lib/utils/dates'
import { MembershipBadge } from '@/components/spa/MembershipBadge'
import { InviteClientButton } from '@/components/spa/InviteClientButton'

interface Props {
  params: { id: string }
}

export default async function ClientDetailPage({ params }: Props) {
  const [client, t, tPay, tCheck] = await Promise.all([
    getClientById(params.id),
    getTranslations('clients'),
    getTranslations('payment'),
    getTranslations('checkin'),
  ])

  if (!client) notFound()

  const [visits, payments] = await Promise.all([
    getClientVisits(client.id),
    getClientPayments(client.id),
  ])

  const membership = getCurrentMembership(client.memberships)
  const plan = membership?.membership_plans
  const locale: 'en' | 'es' = client.preferred_language === 'es' ? 'es' : 'en'

  const sessionTypeLabel: Record<string, string> = {
    included:      tCheck('session_included'),
    rollover:      tCheck('session_rollover'),
    additional:    tCheck('session_additional'),
    welcome_offer: tCheck('session_welcome_offer'),
  }

  const conceptKey: Record<string, Parameters<typeof tPay>[0]> = {
    monthly_membership: 'concept_membership',
    additional_visit:   'concept_additional',
    welcome_offer:      'concept_welcome',
  }

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount_usd), 0)

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl">

      {/* Back */}
      <Link
        href="/admin/clients"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft size={14} />
        {t('back_to_clients')}
      </Link>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">
              {client.first_name} {client.last_name}
            </h1>
            <MembershipBadge membership={membership} locale={locale} />
            {client.is_healthcare_worker && (
              <span className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full font-semibold">
                Healthcare{client.work_id_verified && ' · ID ✓'}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-400">
            <span>{client.phone}</span>
            {client.email && <><span>·</span><span>{client.email}</span></>}
            <span>·</span>
            <span>{t('member_since')} {formatDate(client.created_at, locale)}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:flex-shrink-0">
          <InviteClientButton
            clientId={client.id}
            clientEmail={client.email}
            isLinked={!!client.user_id}
            className="w-full sm:w-auto justify-center"
          />
          <Link
            href={`/admin/clients/${client.id}/qr`}
            target="_blank"
            className="inline-flex items-center justify-center gap-2 h-9 px-3 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors w-full sm:w-auto"
          >
            <Printer size={13} />
            {t('print_qr')}
          </Link>
        </div>
      </div>

      {/* ── Stats row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          icon={Calendar}
          label={tCheck('sessions_used')}
          value={`${membership?.sessions_used_this_month ?? 0} / ${plan?.sessions_per_month ?? '—'}`}
          color="amber"
        />
        <StatCard
          icon={Activity}
          label={t('visit_history')}
          value={String(visits.length)}
          color="green"
        />
        <StatCard
          icon={CreditCard}
          label={t('payment_history')}
          value={String(payments.length)}
          color="blue"
        />
        <StatCard
          icon={TrendingUp}
          label="Total paid"
          value={`USD ${totalPaid.toFixed(0)}`}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Personal info ─────────────────────────────────────────────── */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {t('personal_info')}
          </h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <InfoRow label="Phone"         value={client.phone} />
            <InfoRow label="Email"         value={client.email ?? '—'} />
            <InfoRow label="Address"       value={client.address} />
            <InfoRow label="Heard from"    value={client.how_did_you_hear ?? '—'} />
            <InfoRow
              label="First visit"
              value={client.first_visit_date ? formatDate(client.first_visit_date, locale) : '—'}
            />
            <InfoRow
              label="Language"
              value={client.preferred_language === 'es' ? 'Español' : 'English'}
            />
          </dl>
          {client.notes && (
            <div className="pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1.5">Notes</p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{client.notes}</p>
            </div>
          )}
        </div>

        {/* ── Current membership ─────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {t('current_membership')}
          </h2>

          {membership && plan ? (
            <div className="space-y-4">
              <div>
                <p className="font-semibold text-gray-900 text-base">
                  {locale === 'es' ? plan.name_es : plan.name_en}
                </p>
                <p className="text-2xl font-bold text-amber-600 mt-1">
                  USD {plan.price_usd}
                  <span className="text-sm font-normal text-gray-400">
                    /{locale === 'es' ? 'mes' : 'mo'}
                  </span>
                </p>
              </div>

              <div className="space-y-2.5 text-sm border-t border-gray-100 pt-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">{tCheck('expires')}</span>
                  <span className="font-medium text-gray-700">
                    {formatDate(membership.expires_at, locale)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">{tCheck('sessions_used')}</span>
                  <span className="font-medium text-gray-700">
                    {membership.sessions_used_this_month} / {plan.sessions_per_month}
                  </span>
                </div>
                {membership.rollover_sessions > 0 && (
                  <p className="text-xs text-amber-600 font-medium pt-1">
                    {tCheck('rollover')}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <CreditCard size={18} className="text-gray-300" />
              </div>
              <p className="text-sm text-gray-400">{t('no_membership')}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Visit history ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
          <Activity size={14} className="text-gray-400" />
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {t('visit_history')}
          </h2>
          <span className="ml-auto text-xs text-gray-400 font-medium">{visits.length}</span>
        </div>
        {visits.length === 0 ? (
          <p className="text-sm text-gray-400 px-6 py-10 text-center">{t('no_visits')}</p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="bg-gray-50/80 text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Service</th>
                <th className="px-6 py-3 font-medium">Type</th>
                <th className="px-6 py-3 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {visits.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-6 py-3.5 text-gray-700 tabular-nums">
                    {formatDateTime(v.visited_at, locale)}
                  </td>
                  <td className="px-6 py-3.5 text-gray-600">
                    {v.service_types
                      ? (locale === 'es' ? v.service_types.name_es : v.service_types.name_en)
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-6 py-3.5">
                    <SessionTypeBadge label={sessionTypeLabel[v.session_type] ?? v.session_type} type={v.session_type} />
                  </td>
                  <td className="px-6 py-3.5 text-gray-400 text-xs">{v.notes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* ── Payment history ────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
          <CreditCard size={14} className="text-gray-400" />
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {t('payment_history')}
          </h2>
          <span className="ml-auto text-xs font-semibold text-amber-600">
            USD {totalPaid.toFixed(0)} total
          </span>
        </div>
        {payments.length === 0 ? (
          <p className="text-sm text-gray-400 px-6 py-10 text-center">{t('no_payments')}</p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[520px]">
            <thead>
              <tr className="bg-gray-50/80 text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Concept</th>
                <th className="px-6 py-3 font-medium">Method</th>
                <th className="px-6 py-3 font-medium text-right">Amount</th>
                <th className="px-6 py-3 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-6 py-3.5 text-gray-700 tabular-nums">
                    {formatDate(p.paid_at, locale)}
                  </td>
                  <td className="px-6 py-3.5 text-gray-600">
                    {tPay(conceptKey[p.concept] ?? 'concept_membership')}
                  </td>
                  <td className="px-6 py-3.5 text-gray-600">
                    {tPay(`method_${p.method}` as Parameters<typeof tPay>[0])}
                  </td>
                  <td className="px-6 py-3.5 font-semibold text-right text-gray-900 tabular-nums">
                    USD {p.amount_usd}
                  </td>
                  <td className="px-6 py-3.5 text-gray-400 text-xs">{p.notes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-gray-400 text-xs uppercase tracking-wide">{label}</dt>
      <dd className="text-gray-800 font-medium text-sm">{value}</dd>
    </>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType
  label: string
  value: string
  color: 'amber' | 'green' | 'blue' | 'purple'
}) {
  const colors = {
    amber:  { bg: 'bg-amber-50',  icon: 'text-amber-500' },
    green:  { bg: 'bg-green-50',  icon: 'text-green-500' },
    blue:   { bg: 'bg-blue-50',   icon: 'text-blue-500' },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-500' },
  }
  const c = colors[color]
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${c.bg} mb-3`}>
        <Icon size={15} className={c.icon} />
      </div>
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

function SessionTypeBadge({ label, type }: { label: string; type: string }) {
  const styles: Record<string, string> = {
    included:      'bg-green-50 text-green-700',
    rollover:      'bg-amber-50 text-amber-700',
    additional:    'bg-blue-50 text-blue-700',
    welcome_offer: 'bg-purple-50 text-purple-700',
  }
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${styles[type] ?? 'bg-gray-50 text-gray-600'}`}>
      {label}
    </span>
  )
}
