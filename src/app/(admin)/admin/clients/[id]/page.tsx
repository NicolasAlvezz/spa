import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import {
  getClientById,
  getClientVisits,
  getClientPayments,
} from '@/lib/supabase/queries/clients'
import { getCurrentMembership } from '@/lib/utils/membership'
import { formatDate, formatDateTime } from '@/lib/utils/dates'
import { MembershipBadge } from '@/components/spa/MembershipBadge'
import { Button } from '@/components/ui/button'

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

  // Derive locale from client preference for display
  const locale: 'en' | 'es' = client.preferred_language === 'es' ? 'es' : 'en'

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      {/* Back */}
      <Link href="/admin/clients" className="text-sm text-gray-400 hover:text-gray-600">
        ← {t('back_to_clients')}
      </Link>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {client.first_name} {client.last_name}
          </h1>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <span className="text-gray-500">{client.phone}</span>
            {client.email && <span className="text-gray-400">·</span>}
            {client.email && <span className="text-gray-500">{client.email}</span>}
            {client.is_healthcare_worker && (
              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                Healthcare worker
                {client.work_id_verified && ' ✓'}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {t('member_since')} {formatDate(client.created_at, locale)}
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button asChild variant="outline" size="lg" className="h-9 text-xs px-3">
            <Link href={`/admin/clients/${client.id}/qr`} target="_blank">
              🖨 {t('print_qr')}
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Personal info ─────────────────────────────────────────────── */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            {t('personal_info')}
          </h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <InfoRow label="Phone" value={client.phone} />
            <InfoRow label="Email" value={client.email ?? '—'} />
            <InfoRow label="Address" value={client.address} />
            <InfoRow
              label="How did you hear"
              value={client.how_did_you_hear ?? '—'}
            />
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
            <div className="pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-1">Notes</p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{client.notes}</p>
            </div>
          )}
        </div>

        {/* ── Current membership ─────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            {t('current_membership')}
          </h2>

          {membership && plan ? (
            <div className="space-y-3">
              <MembershipBadge membership={membership} locale={locale} />
              <p className="font-semibold text-gray-900">
                {locale === 'es' ? plan.name_es : plan.name_en}
              </p>
              <p className="text-2xl font-bold text-amber-600">
                USD {plan.price_usd}
                <span className="text-sm font-normal text-gray-400">
                  /{locale === 'es' ? 'mes' : 'mo'}
                </span>
              </p>

              <div className="pt-3 border-t border-gray-100 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">{tCheck('expires')}</span>
                  <span className="font-medium">{formatDate(membership.expires_at, locale)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{tCheck('sessions_used')}</span>
                  <span className="font-medium">
                    {membership.sessions_used_this_month} / {plan.sessions_per_month}
                  </span>
                </div>
                {membership.rollover_sessions > 0 && (
                  <p className="text-xs text-amber-600">{tCheck('rollover')}</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">{t('no_membership')}</p>
          )}
        </div>
      </div>

      {/* ── Visit history ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            {t('visit_history')}
          </h2>
        </div>
        {visits.length === 0 ? (
          <p className="text-sm text-gray-400 px-6 py-8 text-center">{t('no_visits')}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Service</th>
                <th className="px-6 py-3 font-medium">Type</th>
                <th className="px-6 py-3 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visits.map((v) => (
                <tr key={v.id}>
                  <td className="px-6 py-3 text-gray-700">
                    {formatDateTime(v.visited_at, locale)}
                  </td>
                  <td className="px-6 py-3 text-gray-600">
                    {v.service_types
                      ? locale === 'es'
                        ? v.service_types.name_es
                        : v.service_types.name_en
                      : '—'}
                  </td>
                  <td className="px-6 py-3 text-gray-600 capitalize">{v.session_type}</td>
                  <td className="px-6 py-3 text-gray-400 text-xs">{v.notes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Payment history ────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            {t('payment_history')}
          </h2>
        </div>
        {payments.length === 0 ? (
          <p className="text-sm text-gray-400 px-6 py-8 text-center">{t('no_payments')}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Concept</th>
                <th className="px-6 py-3 font-medium">Method</th>
                <th className="px-6 py-3 font-medium text-right">Amount</th>
                <th className="px-6 py-3 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="px-6 py-3 text-gray-700">{formatDate(p.paid_at, locale)}</td>
                  <td className="px-6 py-3 text-gray-600">
                    {tPay(`concept_${p.concept.replace('monthly_membership', 'membership').replace('additional_visit', 'additional').replace('welcome_offer', 'welcome')}` as Parameters<typeof tPay>[0])}
                  </td>
                  <td className="px-6 py-3 text-gray-600">
                    {tPay(`method_${p.method}` as Parameters<typeof tPay>[0])}
                  </td>
                  <td className="px-6 py-3 font-semibold text-right text-gray-900">
                    USD {p.amount_usd}
                  </td>
                  <td className="px-6 py-3 text-gray-400 text-xs">{p.notes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-gray-400">{label}</dt>
      <dd className="text-gray-700 font-medium">{value}</dd>
    </>
  )
}
