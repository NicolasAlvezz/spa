'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, ChevronRight, X, CreditCard, Loader2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { MembershipBadge } from './MembershipBadge'
import { getMembershipStatus, getCurrentMembership } from '@/lib/utils/membership'
import { formatDate } from '@/lib/utils/dates'
import type { ClientListRow, MembershipStatus, DbMembershipPlan } from '@/types'

interface Props {
  clients: ClientListRow[]
  plans: DbMembershipPlan[]
}

type StatusFilter = MembershipStatus | 'all'
type SortOrder = 'recent' | 'name_az' | 'name_za'

// ── Plan panel ────────────────────────────────────────────────────────────────

function PlanPanel({
  client,
  plans,
  locale,
  onClose,
  onAssigned,
}: {
  client: ClientListRow
  plans: DbMembershipPlan[]
  locale: 'en' | 'es'
  onClose: () => void
  onAssigned: () => void
}) {
  const membership = getCurrentMembership(client.memberships)
  const plan = membership?.membership_plans

  const [selectedPlanId, setSelectedPlanId] = useState(plans[0]?.id ?? '')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'debit' | 'credit'>('cash')
  const [amount, setAmount] = useState(() => {
    const first = plans[0]
    return first ? String(first.price_usd ?? '') : ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handlePlanChange(id: string) {
    setSelectedPlanId(id)
    const p = plans.find(p => p.id === id)
    if (p) setAmount(String(p.price_usd ?? ''))
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/memberships/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: client.id,
          plan_id: selectedPlanId,
          payment_method: paymentMethod,
          amount_usd: Number(amount),
        }),
      })
      if (!res.ok) {
        const body = await res.json()
        setError(body.error ?? 'Something went wrong.')
        return
      }
      onAssigned()
      onClose()
    } catch {
      setError('Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  const methodBtn = (method: 'cash' | 'debit' | 'credit', label: string) => (
    <button
      type="button"
      onClick={() => setPaymentMethod(method)}
      className={`flex-1 h-9 rounded-lg border text-sm font-medium transition-colors ${
        paymentMethod === method
          ? 'border-brand-500 bg-brand-50 text-brand-700'
          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
      }`}
    >
      {label}
    </button>
  )

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm bg-white shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
              {locale === 'es' ? 'Plan de' : 'Plan for'}
            </p>
            <h2 className="text-base font-semibold text-gray-900">
              {client.first_name} {client.last_name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Current plan */}
          {plan && membership ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900 text-base">
                    {locale === 'es' ? plan.name_es : plan.name_en}
                  </p>
                  <p className="text-2xl font-bold text-brand-600 mt-0.5">
                    USD {plan.price_usd}
                    <span className="text-sm font-normal text-gray-400">
                      /{locale === 'es' ? 'mes' : 'mo'}
                    </span>
                  </p>
                </div>
                <MembershipBadge membership={membership} locale={locale} />
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-2.5 text-sm">
                <Row
                  label={locale === 'es' ? 'Vence' : 'Expires'}
                  value={formatDate(membership.expires_at, locale)}
                />
                <Row
                  label={locale === 'es' ? 'Sesiones usadas' : 'Sessions used'}
                  value={`${membership.sessions_used_this_month} / ${plan.sessions_per_month}`}
                />
                {membership.rollover_sessions > 0 && (
                  <Row
                    label={locale === 'es' ? 'Rollover' : 'Rollover'}
                    value={String(membership.rollover_sessions)}
                  />
                )}
                <Row
                  label={locale === 'es' ? 'Tipo' : 'Type'}
                  value={plan.plan_type === 'pack'
                    ? (locale === 'es' ? 'Pack de sesiones' : 'Session pack')
                    : (locale === 'es' ? 'Mensual' : 'Monthly')}
                />
              </div>

              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  {locale === 'es' ? 'Asignar nuevo plan' : 'Assign new plan'}
                </p>
                <AssignForm
                  plans={plans}
                  locale={locale}
                  selectedPlanId={selectedPlanId}
                  amount={amount}
                  submitting={submitting}
                  error={error}
                  onPlanChange={handlePlanChange}
                  onAmountChange={setAmount}
                  onSubmit={handleAssign}
                  methodBtn={methodBtn}
                  label={locale === 'es' ? 'Renovar / cambiar plan' : 'Renew / change plan'}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <CreditCard size={20} className="text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-500">
                  {locale === 'es' ? 'Sin plan activo' : 'No active plan'}
                </p>
              </div>
              <AssignForm
                plans={plans}
                locale={locale}
                selectedPlanId={selectedPlanId}
                amount={amount}
                submitting={submitting}
                error={error}
                onPlanChange={handlePlanChange}
                onAmountChange={setAmount}
                onSubmit={handleAssign}
                methodBtn={methodBtn}
                label={locale === 'es' ? 'Asignar plan' : 'Assign plan'}
              />
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{label}</span>
      <span className="font-medium text-gray-700">{value}</span>
    </div>
  )
}

function AssignForm({
  plans, locale, selectedPlanId, amount, submitting, error,
  onPlanChange, onAmountChange, onSubmit, methodBtn, label,
}: {
  plans: DbMembershipPlan[]
  locale: 'en' | 'es'
  selectedPlanId: string
  amount: string
  submitting: boolean
  error: string | null
  onPlanChange: (id: string) => void
  onAmountChange: (v: string) => void
  onSubmit: (e: React.FormEvent) => void
  methodBtn: (m: 'cash' | 'debit' | 'credit', label: string) => React.ReactNode
  label: string
}) {
  const inputCls = 'w-full h-9 rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-shadow bg-white'
  const fieldLabel = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1'

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className={fieldLabel}>{locale === 'es' ? 'Plan' : 'Plan'}</label>
        <select
          value={selectedPlanId}
          onChange={e => onPlanChange(e.target.value)}
          disabled={submitting}
          className={inputCls}
        >
          {plans.map(p => (
            <option key={p.id} value={p.id}>
              {locale === 'es' ? p.name_es : p.name_en} — USD {p.price_usd}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={fieldLabel}>{locale === 'es' ? 'Método de pago' : 'Payment method'}</label>
        <div className="flex gap-2">
          {methodBtn('cash', locale === 'es' ? 'Efectivo' : 'Cash')}
          {methodBtn('debit', locale === 'es' ? 'Débito' : 'Debit')}
          {methodBtn('credit', locale === 'es' ? 'Crédito' : 'Credit')}
        </div>
      </div>

      <div>
        <label className={fieldLabel}>{locale === 'es' ? 'Monto (USD)' : 'Amount (USD)'}</label>
        <input
          type="number"
          min={0}
          step={0.01}
          value={amount}
          onChange={e => onAmountChange(e.target.value)}
          required
          disabled={submitting}
          className={inputCls}
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || !selectedPlanId}
        className="w-full h-10 rounded-xl bg-brand-500 hover:bg-brand-400 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {submitting && <Loader2 size={14} className="animate-spin" />}
        {label}
      </button>
    </form>
  )
}

// ── Main table ────────────────────────────────────────────────────────────────

export function ClientsTable({ clients, plans }: Props) {
  const locale = useLocale() as 'en' | 'es'
  const t = useTranslations('clients')
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortOrder, setSortOrder] = useState<SortOrder>('recent')
  const [showInactive, setShowInactive] = useState(false)
  const [planClient, setPlanClient] = useState<ClientListRow | null>(null)

  const activeCount = useMemo(() => clients.filter(c => c.is_active).length, [clients])
  const inactiveCount = useMemo(() => clients.filter(c => !c.is_active).length, [clients])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    const result = clients.filter((c) => {
      if (!showInactive && !c.is_active) return false

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

    return result.sort((a, b) => {
      if (sortOrder === 'name_az') return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
      if (sortOrder === 'name_za') return `${b.first_name} ${b.last_name}`.localeCompare(`${a.first_name} ${a.last_name}`)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [clients, search, statusFilter, sortOrder])

  return (
    <div className="space-y-4">

      {/* ── Filters ── */}
      <div className="flex flex-col md:flex-row gap-2 md:gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder={t('search_placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-gray-200 bg-white text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-shadow"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="w-full md:w-auto h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-brand-400 transition-colors"
        >
          <option value="all">{t('filter_all')}</option>
          <option value="active">{locale === 'es' ? 'Activa' : 'Active'}</option>
          <option value="expired">{locale === 'es' ? 'Vencida' : 'Expired'}</option>
          <option value="no_membership">{locale === 'es' ? 'Sin plan' : 'No plan'}</option>
        </select>
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as SortOrder)}
          className="w-full md:w-auto h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-brand-400 transition-colors"
        >
          <option value="recent">{locale === 'es' ? 'Más recientes' : 'Most recent'}</option>
          <option value="name_az">{locale === 'es' ? 'Nombre A-Z' : 'Name A-Z'}</option>
          <option value="name_za">{locale === 'es' ? 'Nombre Z-A' : 'Name Z-A'}</option>
        </select>
        {inactiveCount > 0 && (
          <button
            onClick={() => setShowInactive(v => !v)}
            className={[
              'w-full md:w-auto h-10 px-3 rounded-lg border text-sm font-medium transition-colors whitespace-nowrap',
              showInactive
                ? 'border-gray-400 bg-gray-100 text-gray-700'
                : 'border-gray-200 bg-white text-gray-400 hover:text-gray-600 hover:border-gray-300',
            ].join(' ')}
          >
            {showInactive
              ? (locale === 'es' ? `Ocultar inactivos (${inactiveCount})` : `Hide inactive (${inactiveCount})`)
              : (locale === 'es' ? `Mostrar inactivos (${inactiveCount})` : `Show inactive (${inactiveCount})`)}
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white py-16 text-center">
          <p className="text-sm text-gray-400">{t('no_clients')}</p>
        </div>
      ) : (
        <>
          {/* ── MOBILE CARDS ── */}
          <div className="md:hidden space-y-2">
            {filtered.map((client) => {
              const membership = getCurrentMembership(client.memberships)
              const plan = membership?.membership_plans
              const planName = plan ? (locale === 'es' ? plan.name_es : plan.name_en) : null

              return (
                <div key={client.id} className="bg-white rounded-xl border border-gray-200 px-4 py-3.5 shadow-sm">
                  <div className="flex items-center gap-3">
                    {/* Initials avatar */}
                    <div className="flex items-center justify-center w-11 h-11 rounded-full bg-brand-50 border border-brand-100 flex-shrink-0">
                      <span className="text-brand-700 text-sm font-bold leading-none">
                        {client.first_name[0]}{client.last_name[0]}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900 leading-tight">
                          {client.first_name} {client.last_name}
                        </p>
                        {client.is_healthcare_worker && (
                          <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-semibold leading-none">HC</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 tabular-nums mt-0.5">{client.phone}</p>
                      {planName && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{planName}</p>
                      )}
                    </div>

                    {/* Badge + chevron */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!client.is_active
                        ? <span className="text-[10px] bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full font-semibold">{locale === 'es' ? 'Inactivo' : 'Inactive'}</span>
                        : <MembershipBadge membership={membership} locale={locale} />
                      }
                      <Link href={`/admin/clients/${client.id}`} className="text-gray-300 hover:text-brand-600">
                        <ChevronRight size={15} />
                      </Link>
                    </div>
                  </div>

                  {/* Ver plan button */}
                  <button
                    onClick={() => setPlanClient(client)}
                    className="mt-3 w-full h-8 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-brand-300 hover:text-brand-700 transition-colors"
                  >
                    {locale === 'es' ? 'Ver plan' : 'View plan'}
                  </button>
                </div>
              )
            })}
          </div>

          {/* ── DESKTOP TABLE ── */}
          <div className="hidden md:block rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80 text-left text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-5 py-3.5 font-medium">{t('col_name')}</th>
                  <th className="hidden xl:table-cell px-5 py-3.5 font-medium">{t('col_phone')}</th>
                  <th className="hidden xl:table-cell px-5 py-3.5 font-medium">{t('col_expires')}</th>
                  <th className="hidden xl:table-cell px-5 py-3.5 font-medium text-center">{t('col_visits')}</th>
                  <th className="px-5 py-3.5 font-medium">{t('col_plan')}</th>
                  <th className="px-5 py-3.5 font-medium">{t('col_status')}</th>
                  <th className="px-5 py-3.5 font-medium w-24">
                    {locale === 'es' ? 'Ver plan' : 'View plan'}
                  </th>
                  <th className="px-5 py-3.5 font-medium w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((client) => {
                  const membership = getCurrentMembership(client.memberships)
                  const plan = membership?.membership_plans
                  return (
                    <tr key={client.id} className="hover:bg-brand-50/40 transition-colors group">
                      {/* Name */}
                      <td className="px-5 py-3.5 font-medium text-gray-900">
                        <span className="group-hover:text-brand-700 transition-colors">
                          {client.first_name} {client.last_name}
                        </span>
                        {client.is_healthcare_worker && (
                          <span className="ml-2 text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-semibold">HC</span>
                        )}
                      </td>
                      {/* Phone */}
                      <td className="hidden xl:table-cell px-5 py-3.5 text-gray-500 tabular-nums">
                        {client.phone}
                      </td>
                      {/* Expires */}
                      <td className="hidden xl:table-cell px-5 py-3.5 text-gray-500 tabular-nums">
                        {membership
                          ? formatDate(membership.expires_at, locale)
                          : <span className="text-gray-300">—</span>}
                      </td>
                      {/* Visits */}
                      <td className="hidden xl:table-cell px-5 py-3.5 text-center tabular-nums text-gray-500">
                        {membership ? membership.sessions_used_this_month : <span className="text-gray-300">—</span>}
                      </td>
                      {/* Plan */}
                      <td className="px-5 py-3.5 text-gray-600">
                        {plan
                          ? (locale === 'es' ? plan.name_es : plan.name_en)
                          : <span className="text-gray-300">—</span>}
                      </td>
                      {/* Status */}
                      <td className="px-5 py-3.5">
                        {!client.is_active
                          ? <span className="text-xs bg-gray-100 text-gray-400 px-2.5 py-1 rounded-full font-semibold">{locale === 'es' ? 'Inactivo' : 'Inactive'}</span>
                          : <MembershipBadge membership={membership} locale={locale} />
                        }
                      </td>
                      {/* Ver plan */}
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => setPlanClient(client)}
                          className="h-8 px-3 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-brand-50 hover:border-brand-300 hover:text-brand-700 transition-colors whitespace-nowrap"
                        >
                          {locale === 'es' ? 'Ver plan' : 'View plan'}
                        </button>
                      </td>
                      {/* Detail link */}
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/admin/clients/${client.id}`}
                          className="flex items-center justify-center w-7 h-7 rounded-md text-gray-300 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                        >
                          <ChevronRight size={16} />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <p className="text-xs text-gray-400">
        {filtered.length} / {activeCount} {locale === 'es' ? 'clientes activos' : 'active clients'}
        {inactiveCount > 0 && (
          <span className="ml-2 text-gray-300">· {inactiveCount} {locale === 'es' ? 'inactivos' : 'inactive'}</span>
        )}
      </p>

      {/* Plan panel */}
      {planClient && (
        <PlanPanel
          client={planClient}
          plans={plans}
          locale={locale}
          onClose={() => setPlanClient(null)}
          onAssigned={() => router.refresh()}
        />
      )}
    </div>
  )
}
