'use client'

import { useState, useTransition, useMemo } from 'react'
import { Loader2, Plus, Pencil, Trash2, X } from 'lucide-react'
import {
  createPlanAction,
  updatePlanAction,
  deletePlanAction,
  togglePlanAction,
} from './plan-actions'
import type { DbMembershipPlan } from '@/types'

// ── Form modal ────────────────────────────────────────────────────────────────
interface FormModalProps {
  plan: DbMembershipPlan | null
  onClose: () => void
  onSaved: (updated: DbMembershipPlan) => void
}

function PlanFormModal({ plan, onClose, onSaved }: FormModalProps) {
  const isEdit = plan !== null
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    plan_type:            (plan?.plan_type ?? 'monthly') as 'monthly' | 'pack',
    name_en:              plan?.name_en              ?? '',
    name_es:              plan?.name_es              ?? '',
    price_usd:            plan?.price_usd            ?? '',
    additional_price_usd: plan?.additional_price_usd ?? '',
    sessions_per_month:   plan?.sessions_per_month   ?? 4,
    rollover_max:         plan?.rollover_max          ?? 2,
    min_months:           plan?.min_months            ?? 3,
    total_sessions:       plan?.total_sessions        ?? 10,
    allows_split_payment: plan?.allows_split_payment  ?? false,
    extras_en:            (plan?.extras_en ?? []).join(', '),
    extras_es:            (plan?.extras_es ?? []).join(', '),
    is_active:            plan?.is_active             ?? true,
  })

  const isPack = form.plan_type === 'pack'

  function set(key: string, value: string | number | boolean) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => fd.set(k, String(v)))

    startTransition(async () => {
      const result = isEdit
        ? await updatePlanAction(plan!.id, fd)
        : await createPlanAction(fd)

      if (result.error) {
        setError(
          result.error === 'missing_required_fields' ? 'Please fill in all required fields.' :
          result.error === 'unauthorized'             ? 'Unauthorized.' :
          'Something went wrong. Try again.'
        )
        return
      }

      const extrasEnArr = form.extras_en ? form.extras_en.split(',').map((s) => s.trim()).filter(Boolean) : []
      const extrasEsArr = form.extras_es ? form.extras_es.split(',').map((s) => s.trim()).filter(Boolean) : []
      const updated: DbMembershipPlan = {
        ...(plan ?? {} as DbMembershipPlan),
        id:                   plan?.id ?? '',
        slug:                 plan?.slug ?? '',
        name_en:              form.name_en,
        name_es:              form.name_es,
        price_usd:            Number(form.price_usd),
        additional_price_usd: form.additional_price_usd !== '' ? Number(form.additional_price_usd) : null,
        plan_type:            form.plan_type,
        sessions_per_month:   isPack ? 0 : Number(form.sessions_per_month),
        rollover_max:         isPack ? 0 : Number(form.rollover_max),
        min_months:           isPack ? 0 : Number(form.min_months),
        total_sessions:       isPack ? Number(form.total_sessions) : null,
        allows_split_payment: isPack ? Boolean(form.allows_split_payment) : false,
        extras_en:            extrasEnArr,
        extras_es:            extrasEsArr,
        requires_healthcare:  plan?.requires_healthcare ?? false,
        split_first_amount:   plan?.split_first_amount ?? null,
        is_active:            Boolean(form.is_active),
        created_at:           plan?.created_at ?? new Date().toISOString(),
      }
      onSaved(updated)
      onClose()
    })
  }

  const inputCls = 'w-full h-9 rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-shadow disabled:opacity-60 bg-white mt-1.5'
  const labelCls = 'block text-xs font-semibold text-gray-700'
  const hintCls  = 'text-[11px] text-gray-400 mt-0.5 leading-snug'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92dvh] overflow-y-auto">

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-base font-semibold text-gray-900">
            {isEdit ? 'Edit plan' : 'New plan'}
          </h2>
          <button onClick={onClose} className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

          {/* ── Plan type selector ── */}
          <div>
            <label className={labelCls}>Plan type *</label>
            <p className={hintCls}>Choose whether this is a recurring monthly membership or a one-time session pack.</p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {([
                { value: 'monthly' as const, label: 'Monthly Membership', sub: 'Renews every month' },
                { value: 'pack'    as const, label: 'Session Pack',       sub: 'Fixed bundle of sessions' },
              ]).map(({ value, label, sub }) => (
                <button
                  key={value}
                  type="button"
                  disabled={isPending}
                  onClick={() => set('plan_type', value)}
                  className={[
                    'flex flex-col items-center justify-center gap-0.5 py-3 px-2 rounded-xl border-2 text-sm font-semibold transition-all disabled:opacity-50',
                    form.plan_type === value
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300',
                  ].join(' ')}
                >
                  <span>{label}</span>
                  <span className={`text-[11px] font-normal ${form.plan_type === value ? 'text-brand-500' : 'text-gray-400'}`}>{sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Names ── */}
          <div>
            <label className={labelCls}>Name (English) *</label>
            <p className={hintCls}>How this plan is displayed to English-speaking clients.</p>
            <input type="text" value={form.name_en} onChange={(e) => set('name_en', e.target.value)}
              required disabled={isPending} className={inputCls} placeholder="e.g. Healthcare Relief – Basic" />
          </div>

          <div>
            <label className={labelCls}>Nombre (Español) *</label>
            <p className={hintCls}>Cómo aparece este plan para clientes en español.</p>
            <input type="text" value={form.name_es} onChange={(e) => set('name_es', e.target.value)}
              required disabled={isPending} className={inputCls} placeholder="ej. Healthcare Relief – Básico" />
          </div>

          {/* ── Price ── */}
          <div>
            <label className={labelCls}>{isPack ? 'Pack price (USD) *' : 'Monthly price (USD) *'}</label>
            <p className={hintCls}>{isPack ? 'Total one-time price for the entire pack.' : 'Amount charged to the client each month.'}</p>
            <input type="number" min={0} step={0.01} value={form.price_usd}
              onChange={(e) => set('price_usd', e.target.value)}
              required disabled={isPending} className={inputCls} placeholder="80" />
          </div>

          {/* ── Additional visit price (monthly only) ── */}
          {!isPack && (
            <div>
              <label className={labelCls}>Additional visit price (USD)</label>
              <p className={hintCls}>Preferred price for extra visits in the same month. Leave empty to use the monthly price.</p>
              <input type="number" min={0} step={0.01} value={form.additional_price_usd}
                onChange={(e) => set('additional_price_usd', e.target.value)}
                disabled={isPending} className={inputCls} placeholder="e.g. 95" />
            </div>
          )}

          {/* ── Monthly-only fields ── */}
          {!isPack && (
            <>
              <div>
                <label className={labelCls}>Sessions per month *</label>
                <p className={hintCls}>Number of massage sessions included each month. Resets automatically on renewal.</p>
                <input type="number" min={1} value={form.sessions_per_month}
                  onChange={(e) => set('sessions_per_month', parseInt(e.target.value, 10))}
                  required disabled={isPending} className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Rollover max</label>
                <p className={hintCls}>Max sessions that carry over to the next month if unused. Set to 0 to disable rollover.</p>
                <input type="number" min={0} value={form.rollover_max}
                  onChange={(e) => set('rollover_max', parseInt(e.target.value, 10))}
                  disabled={isPending} className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Minimum months commitment</label>
                <p className={hintCls}>How many months a client must stay on this plan before cancelling (e.g. 3 = 3-month minimum).</p>
                <input type="number" min={1} value={form.min_months}
                  onChange={(e) => set('min_months', parseInt(e.target.value, 10))}
                  disabled={isPending} className={inputCls} />
              </div>
            </>
          )}

          {/* ── Pack-only fields ── */}
          {isPack && (
            <>
              <div>
                <label className={labelCls}>Total sessions in pack *</label>
                <p className={hintCls}>How many sessions are included. Once all are used, the pack is finished.</p>
                <input type="number" min={1} value={form.total_sessions}
                  onChange={(e) => set('total_sessions', parseInt(e.target.value, 10))}
                  required disabled={isPending} className={inputCls} />
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-xl border border-gray-200 mt-1.5">
                <button type="button" role="switch" aria-checked={form.allows_split_payment}
                  onClick={() => set('allows_split_payment', !form.allows_split_payment)}
                  disabled={isPending}
                  className={['mt-0.5 relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 disabled:opacity-50',
                    form.allows_split_payment ? 'bg-brand-500' : 'bg-gray-200'].join(' ')}>
                  <span className={['inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200',
                    form.allows_split_payment ? 'translate-x-5' : 'translate-x-0'].join(' ')} />
                </button>
                <div>
                  <p className="text-sm font-medium text-gray-700">Allow split payment</p>
                  <p className={hintCls}>Client can pay the pack in 2 installments. The second payment becomes due after the 4th session is used.</p>
                </div>
              </div>
            </>
          )}

          {/* ── Extras / benefits ── */}
          <div>
            <label className={labelCls}>Extras / included benefits (English)</label>
            <p className={hintCls}>Extra perks shown to clients. Separate each item with a comma.</p>
            <input type="text" value={form.extras_en}
              onChange={(e) => set('extras_en', e.target.value)}
              disabled={isPending} className={inputCls} placeholder="e.g. Aromatherapy, Hot Stones, Muscle Recovery" />
          </div>

          <div>
            <label className={labelCls}>Extras / beneficios incluidos (Español)</label>
            <p className={hintCls}>Los mismos beneficios en español, separados por coma.</p>
            <input type="text" value={form.extras_es}
              onChange={(e) => set('extras_es', e.target.value)}
              disabled={isPending} className={inputCls} placeholder="ej. Aromaterapia, Hot Stones, Recuperación muscular" />
          </div>

          {/* ── Active ── */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl border border-gray-200">
            <button type="button" role="switch" aria-checked={form.is_active}
              onClick={() => set('is_active', !form.is_active)}
              disabled={isPending}
              className={['mt-0.5 relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 disabled:opacity-50',
                form.is_active ? 'bg-brand-500' : 'bg-gray-200'].join(' ')}>
              <span className={['inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200',
                form.is_active ? 'translate-x-5' : 'translate-x-0'].join(' ')} />
            </button>
            <div>
              <p className="text-sm font-medium text-gray-700">Active</p>
              <p className={hintCls}>Inactive plans are hidden when assigning a membership to a new client. Use this to retire old plans without deleting them.</p>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={isPending}
              className="flex-1 h-10 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={isPending}
              className="flex-1 h-10 rounded-xl bg-brand-500 hover:bg-brand-400 text-white text-sm font-semibold transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
              {isPending && <Loader2 size={13} className="animate-spin" />}
              {isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Plans list ────────────────────────────────────────────────────────────────
interface Props {
  initialPlans: DbMembershipPlan[]
}

export function PlansClient({ initialPlans }: Props) {
  const [plans, setPlans] = useState(initialPlans)
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<DbMembershipPlan | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  function showToast(msg: string) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 3000)
  }

  function openCreate() { setEditTarget(null); setShowForm(true) }
  function openEdit(p: DbMembershipPlan) { setEditTarget(p); setShowForm(true) }

  function handleSaved(updated: DbMembershipPlan) {
    setPlans((prev) => {
      if (!updated.id) return [...prev, updated]
      const exists = prev.some((p) => p.id === updated.id)
      return exists ? prev.map((p) => p.id === updated.id ? updated : p) : [...prev, updated]
    })
  }

  function handleToggle(id: string, current: boolean) {
    setPlans((prev) => prev.map((p) => p.id === id ? { ...p, is_active: !current } : p))
    togglePlanAction(id, !current).then((r) => {
      if (r.error) {
        setPlans((prev) => prev.map((p) => p.id === id ? { ...p, is_active: current } : p))
        showToast('Could not toggle plan.')
      }
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this plan? If it has existing memberships, it will be deactivated instead.')) return
    setDeletingId(id)
    deletePlanAction(id).then((r) => {
      setDeletingId(null)
      if (r.error) { showToast('Could not delete plan.'); return }
      if (r.deactivated) {
        setPlans((prev) => prev.map((p) => p.id === id ? { ...p, is_active: false } : p))
        showToast('Plan has existing memberships — deactivated instead of deleted.')
      } else {
        setPlans((prev) => prev.filter((p) => p.id !== id))
        showToast('Plan deleted.')
      }
    })
  }

  const sorted = useMemo(() => [...plans].sort((a, b) => {
    if (a.plan_type !== b.plan_type) return a.plan_type === 'monthly' ? -1 : 1
    return a.price_usd - b.price_usd
  }), [plans])

  return (
    <div className="space-y-6">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Membership Plans</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {plans.length} plan{plans.length !== 1 ? 's' : ''} · inactive plans are hidden from new memberships
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-brand-500 hover:bg-brand-400 active:bg-brand-600 text-white text-sm font-semibold transition-colors shadow-sm"
        >
          <Plus size={14} />
          New plan
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="hidden sm:grid grid-cols-[1fr_90px_90px_110px_60px_88px] gap-3 px-5 py-2.5 border-b border-gray-100 bg-gray-50">
          {['Plan name', 'Type', 'Price', 'Sessions', 'Active', ''].map((h) => (
            <p key={h} className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{h}</p>
          ))}
        </div>

        {plans.length === 0 && (
          <div className="px-6 py-10 text-center text-sm text-gray-400">
            {'No plans yet. Click "New plan" to add one.'}
          </div>
        )}

        <div className="divide-y divide-gray-100">
          {sorted.map((p) => {
            const isPack = p.plan_type === 'pack'
            const sessionsLabel = isPack
              ? `${p.total_sessions ?? '—'} total`
              : `${p.sessions_per_month}/month`

            return (
              <div key={p.id} className="flex flex-col sm:grid sm:grid-cols-[1fr_90px_90px_110px_60px_88px] sm:items-center gap-2 sm:gap-3 px-5 py-3.5">

                <div>
                  <p className="text-sm font-semibold text-gray-900">{p.name_en}</p>
                  <p className="text-xs text-gray-400">{p.name_es}</p>
                </div>

                <div className="hidden sm:block">
                  <span className={[
                    'inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                    isPack
                      ? 'bg-violet-50 text-violet-600'
                      : 'bg-brand-50 text-brand-600',
                  ].join(' ')}>
                    {isPack ? 'Pack' : 'Monthly'}
                  </span>
                </div>

                <p className="text-sm font-semibold text-gray-700 hidden sm:block">
                  ${p.price_usd}{!isPack && '/mo'}
                </p>

                <p className="text-sm text-gray-500 hidden sm:block">{sessionsLabel}</p>

                <p className="sm:hidden text-xs text-gray-400">
                  {isPack ? 'Pack' : 'Monthly'} · ${p.price_usd}{!isPack && '/mo'} · {sessionsLabel}
                </p>

                <div className="hidden sm:flex">
                  <button
                    onClick={() => handleToggle(p.id, p.is_active)}
                    role="switch"
                    aria-checked={p.is_active}
                    className={['relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200',
                      p.is_active ? 'bg-brand-500' : 'bg-gray-200'].join(' ')}
                  >
                    <span className={['inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200',
                      p.is_active ? 'translate-x-5' : 'translate-x-0'].join(' ')} />
                  </button>
                </div>

                <div className="flex items-center gap-2 sm:justify-end">
                  <button onClick={() => openEdit(p)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                    aria-label="Edit">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(p.id)} disabled={deletingId === p.id}
                    className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                    aria-label="Delete">
                    {deletingId === p.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {showForm && (
        <PlanFormModal plan={editTarget} onClose={() => setShowForm(false)} onSaved={handleSaved} />
      )}

      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-lg">
          {toastMsg}
        </div>
      )}
    </div>
  )
}
