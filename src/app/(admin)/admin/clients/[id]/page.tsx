import { notFound } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
import { ArrowLeft, Printer, Calendar, CreditCard, Activity, TrendingUp, BadgeCheck, FileText, Gift } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import {
  getClientById,
  getClientVisits,
  getClientPayments,
  getClientHistorySummary,
  type PaymentWithContract,
} from '@/lib/supabase/queries/clients'
import { DangerZone } from '@/components/spa/DangerZone'
import { EditClientInfoButton } from '@/components/spa/EditClientInfoButton'
import { VisitActions } from '@/components/spa/VisitActions'
import { CancelMembershipButton } from '@/components/spa/CancelMembershipButton'
import { getCurrentMembership } from '@/lib/utils/membership'
import { formatDate, formatDateTime } from '@/lib/utils/dates'
import { MembershipBadge } from '@/components/spa/MembershipBadge'
import { InviteClientButton } from '@/components/spa/InviteClientButton'

interface Props {
  params: { id: string }
  searchParams: { period?: string }
}

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

export default async function ClientDetailPage({ params, searchParams }: Props) {
  const period: Period = (PERIODS as readonly string[]).includes(searchParams.period ?? '')
    ? (searchParams.period as Period)
    : '1m'

  const [client, t, tPay, tCheck] = await Promise.all([
    getClientById(params.id),
    getTranslations('clients'),
    getTranslations('payment'),
    getTranslations('checkin'),
  ])

  if (!client) notFound()

  const since = periodSince(period)

  const [visits, payments, history] = await Promise.all([
    getClientVisits(client.id, since),
    getClientPayments(client.id),
    getClientHistorySummary(client.id),
  ])

  const membership = getCurrentMembership(client.memberships)
  const plan = membership?.membership_plans
  const isPack = plan?.plan_type === 'pack'
  const locale: 'en' | 'es' = client.preferred_language === 'es' ? 'es' : 'en'

  const sessionTypeLabel: Record<string, string> = {
    included:      tCheck('session_included'),
    rollover:      tCheck('session_rollover'),
    additional:    locale === 'es' ? 'Individual' : 'Individual',
    welcome_offer: tCheck('session_welcome_offer'),
    post_op:       locale === 'es' ? 'Post-op' : 'Post-op',
  }

  const conceptKey: Record<string, Parameters<typeof tPay>[0]> = {
    monthly_membership: 'concept_membership',
    additional_visit:   'concept_additional',
    welcome_offer:      'concept_welcome',
    cancellation_fee:   'concept_cancellation_fee',
    pack_purchase:      'concept_pack_purchase',
    pack_split_second:  'concept_pack_split_second',
  }

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount_usd), 0)

  const periodLabels: Record<Period, string> = {
    '1m':  t('period_1m'),
    '3m':  t('period_3m'),
    '6m':  t('period_6m'),
    '1y':  t('period_1y'),
    'all': t('period_all'),
  }

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
            <EditClientInfoButton
              clientId={client.id}
              firstName={client.first_name}
              lastName={client.last_name}
              phone={client.phone}
              compact
            />
            <MembershipBadge membership={membership} locale={locale} />
            {client.is_healthcare_worker && (
              <span className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full font-semibold inline-flex items-center gap-1">
                {t('healthcare_worker')}
                {client.work_id_verified && (
                  <>
                    <span>·</span>
                    <BadgeCheck size={12} />
                    {t('id_verified_badge')}
                  </>
                )}
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
            clientPhone={client.phone}
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
          label={isPack ? tCheck('sessions_used_total') : tCheck('sessions_used')}
          value={isPack
            ? `${(plan?.total_sessions ?? 0) - (membership?.sessions_remaining ?? 0)} / ${plan?.total_sessions ?? '—'}`
            : `${membership?.sessions_used_this_month ?? 0} / ${plan?.sessions_per_month ?? '—'}`}
          color="brand"
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
          label={t('total_paid')}
          value={`USD ${totalPaid.toFixed(0)}`}
          color="purple"
        />
      </div>

      {(client.credit_balance ?? 0) > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 flex items-center gap-3">
          <Gift size={18} className="text-green-600 flex-shrink-0" />
          <p className="text-green-800 text-sm font-semibold">
            {t('credit_balance_label')}: <span className="font-bold">USD {Number(client.credit_balance).toFixed(2)}</span>
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Personal info ─────────────────────────────────────────────── */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {t('personal_info')}
            </h2>
            <EditClientInfoButton
              clientId={client.id}
              firstName={client.first_name}
              lastName={client.last_name}
              phone={client.phone}
            />
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <InfoRow label={t('detail_phone')}      value={client.phone} />
            <InfoRow label={t('detail_email')}      value={client.email ?? '—'} />
            <InfoRow label={t('detail_address')}    value={client.address} />
            <InfoRow label={t('detail_heard')}      value={client.how_did_you_hear ?? '—'} />
            <InfoRow
              label={t('detail_first_visit')}
              value={client.first_visit_date ? formatDate(client.first_visit_date, locale) : '—'}
            />
            <InfoRow
              label={t('detail_language')}
              value={client.preferred_language === 'es' ? 'Español' : 'English'}
            />
          </dl>
          {client.notes && (
            <div className="pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1.5">{t('detail_notes')}</p>
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
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900 text-base">
                    {locale === 'es' ? plan.name_es : plan.name_en}
                  </p>
                  <p className="text-2xl font-bold text-brand-600 mt-1">
                    USD {plan.price_usd}
                    <span className="text-sm font-normal text-gray-400">
                      /{locale === 'es' ? 'mes' : 'mo'}
                    </span>
                  </p>
                </div>
                {membership.status === 'active' && (
                  <CancelMembershipButton
                    membershipId={membership.id}
                    planName={locale === 'es' ? plan.name_es : plan.name_en}
                    clientName={`${client.first_name} ${client.last_name}`}
                  />
                )}
              </div>

              <div className="space-y-2.5 text-sm border-t border-gray-100 pt-3">
                {isPack ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-400">{tCheck('sessions_used')}</span>
                      <span className="font-medium text-gray-700">
                        {(plan.total_sessions ?? 0) - (membership.sessions_remaining ?? 0)} / {plan.total_sessions}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">{tCheck('sessions_remaining')}</span>
                      <span className="font-medium text-gray-700">{membership.sessions_remaining}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">{tCheck('no_expiry')}</span>
                      <span className="font-medium text-gray-700">∞</span>
                    </div>
                  </>
                ) : (
                  <>
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
                      <p className="text-xs text-brand-600 font-medium pt-1">
                        {tCheck('rollover')}
                      </p>
                    )}
                  </>
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
        <div className="flex flex-wrap items-center gap-2 px-6 py-4 border-b border-gray-100">
          <Activity size={14} className="text-gray-400 flex-shrink-0" />
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {t('visit_history')}
          </h2>
          <div className="ml-auto flex items-center gap-1 flex-wrap">
            {PERIODS.map(p => (
              <Link
                key={p}
                href={`/admin/clients/${params.id}?period=${p}`}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  period === p
                    ? 'bg-brand-100 text-brand-700'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                }`}
              >
                {periodLabels[p]}
              </Link>
            ))}
            <span className="ml-2 text-xs text-gray-400 font-medium">{visits.length}</span>
          </div>
        </div>
        {visits.length === 0 ? (
          <p className="text-sm text-gray-400 px-6 py-10 text-center">{t('no_visits')}</p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="bg-gray-50/80 text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                <th className="px-6 py-3 font-medium">{t('visit_col_date')}</th>
                <th className="px-6 py-3 font-medium">{t('visit_col_service')}</th>
                <th className="px-6 py-3 font-medium">{t('visit_col_therapist')}</th>
                <th className="px-6 py-3 font-medium">{t('visit_col_type')}</th>
                <th className="px-6 py-3 font-medium">{locale === 'es' ? 'Precio' : 'Price'}</th>
                <th className="px-6 py-3 font-medium">{t('visit_col_notes')}</th>
                <th className="px-6 py-3 font-medium">{t('visit_col_contract')}</th>
                <th className="px-2 py-3"></th>
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
                  <td className="px-6 py-3.5 text-gray-600">
                    {v.therapist_name ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-6 py-3.5">
                    <SessionTypeBadge label={sessionTypeLabel[v.session_type] ?? v.session_type} type={v.session_type} />
                  </td>
                  <td className="px-6 py-3.5 text-gray-700 text-sm font-medium">
                    {(() => {
                      if (v.session_type === 'additional') {
                        const price = v.memberships?.membership_plans?.additional_price_usd ?? v.memberships?.membership_plans?.price_usd
                        return price != null ? `$${price}` : <span className="text-gray-300">—</span>
                      }
                      if (v.session_type === 'post_op' && v.service_types?.price_usd != null) {
                        return `$${v.service_types.price_usd}`
                      }
                      return <span className="text-gray-300">—</span>
                    })()}
                  </td>
                  <td className="px-6 py-3.5 text-gray-400 text-xs">{v.notes ?? '—'}</td>
                  <td className="px-6 py-3.5">
                    {v.consent_acceptance?.[0] ? (
                      <a
                        href={`/api/visits/${v.id}/contract.pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-800 transition-colors"
                      >
                        <FileText size={12} />
                        {t('contract_download', {
                          date: formatDate(v.consent_acceptance[0].accepted_at, locale),
                        })}
                      </a>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-2 py-3">
                    <VisitActions
                      visitId={v.id}
                      clientId={client.id}
                      visitDate={formatDateTime(v.visited_at, locale)}
                      sessionType={v.session_type}
                      isStandalone={v.membership_id === null}
                      activeMembershipId={membership?.status === 'active' ? membership.id : null}
                    />
                  </td>
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
          <span className="ml-auto text-xs font-semibold text-brand-600">
            USD {totalPaid.toFixed(0)} total
          </span>
        </div>
        {(() => {
          const membershipPayments = payments.filter(p =>
            p.concept !== 'additional_visit' && p.concept !== 'post_op_visit'
          )
          return membershipPayments.length === 0 ? (
          <p className="text-sm text-gray-400 px-6 py-10 text-center">{t('no_payments')}</p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[520px]">
            <thead>
              <tr className="bg-gray-50/80 text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                <th className="px-6 py-3 font-medium">{tPay('col_date')}</th>
                <th className="px-6 py-3 font-medium">{tPay('col_concept')}</th>
                <th className="px-6 py-3 font-medium text-right">{tPay('col_amount')}</th>
                <th className="px-6 py-3 font-medium">{tPay('col_notes')}</th>
                <th className="px-6 py-3 font-medium">{t('visit_col_contract')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {membershipPayments.map((p: PaymentWithContract) => (
                <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-6 py-3.5 text-gray-700 tabular-nums">
                    {formatDate(p.paid_at, locale)}
                  </td>
                  <td className="px-6 py-3.5 text-gray-600">
                    {tPay(conceptKey[p.concept] ?? 'concept_membership')}
                  </td>
                  <td className="px-6 py-3.5 font-semibold text-right text-gray-900 tabular-nums">
                    USD {p.amount_usd}
                  </td>
                  <td className="px-6 py-3.5 text-gray-400 text-xs">{p.notes ?? '—'}</td>
                  <td className="px-6 py-3.5">
                    {p.membership_request_id ? (
                      <a
                        href={`/api/membership-requests/${p.membership_request_id}/contract.pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-800 transition-colors"
                      >
                        <FileText size={12} />
                        {locale === 'es' ? 'Contrato' : 'Contract'}
                      </a>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )
        })()}
      </div>
      {/* ── Danger Zone ────────────────────────────────────────────────── */}
      <DangerZone
        clientId={client.id}
        clientName={`${client.first_name} ${client.last_name}`}
        clientPhone={client.phone}
        isActive={client.is_active}
        history={history}
      />

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
  color: 'brand' | 'green' | 'blue' | 'purple'
}) {
  const colors = {
    brand:  { bg: 'bg-brand-50',  icon: 'text-brand-500' },
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
    rollover:      'bg-brand-50 text-brand-700',
    additional:    'bg-gray-50 text-gray-500',
    welcome_offer: 'bg-purple-50 text-purple-700',
    post_op:       'bg-orange-50 text-orange-700',
  }
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${styles[type] ?? 'bg-gray-50 text-gray-600'}`}>
      {label}
    </span>
  )
}
