'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { MembershipBadge } from './MembershipBadge'
import { getMembershipStatus, getCurrentMembership } from '@/lib/utils/membership'
import { formatDate } from '@/lib/utils/dates'
import type { ClientListRow, MembershipStatus } from '@/types'

interface Props {
  clients: ClientListRow[]
}

type StatusFilter = MembershipStatus | 'all'

export function ClientsTable({ clients }: Props) {
  const locale = useLocale() as 'en' | 'es'
  const t = useTranslations('clients')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return clients.filter((c) => {
      const matchesSearch =
        !q ||
        c.first_name.toLowerCase().includes(q) ||
        c.last_name.toLowerCase().includes(q) ||
        c.phone.includes(q)

      const membership = getCurrentMembership(c.memberships)
      const status = getMembershipStatus(membership)
      const matchesStatus = statusFilter === 'all' || status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [clients, search, statusFilter])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder={t('search_placeholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 h-9 rounded-md border border-gray-200 bg-white px-3 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm outline-none focus:border-amber-400"
        >
          <option value="all">{t('filter_all')}</option>
          <option value="active">{locale === 'es' ? 'Activa' : 'Active'}</option>
          <option value="expired">{locale === 'es' ? 'Vencida' : 'Expired'}</option>
          <option value="no_membership">{locale === 'es' ? 'Sin plan' : 'No plan'}</option>
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">{t('no_clients')}</p>
      ) : (
        <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">{t('col_name')}</th>
                <th className="px-4 py-3 font-medium">{t('col_phone')}</th>
                <th className="px-4 py-3 font-medium">{t('col_plan')}</th>
                <th className="px-4 py-3 font-medium">{t('col_status')}</th>
                <th className="px-4 py-3 font-medium">{t('col_expires')}</th>
                <th className="px-4 py-3 font-medium text-center">{t('col_visits')}</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((client) => {
                const membership = getCurrentMembership(client.memberships)
                const plan = membership?.membership_plans
                return (
                  <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {client.first_name} {client.last_name}
                      {client.is_healthcare_worker && (
                        <span className="ml-2 text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">
                          HC
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{client.phone}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {plan
                        ? locale === 'es'
                          ? plan.name_es
                          : plan.name_en
                        : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <MembershipBadge membership={membership} locale={locale} />
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {membership
                        ? formatDate(membership.expires_at, locale)
                        : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {membership ? membership.sessions_used_this_month : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/clients/${client.id}`}
                        className="text-amber-600 hover:text-amber-700 font-medium text-xs"
                      >
                        {t('view')}
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-400">
        {filtered.length} / {clients.length} {locale === 'es' ? 'clientes' : 'clients'}
      </p>
    </div>
  )
}
