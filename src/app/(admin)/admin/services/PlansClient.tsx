'use client'

import { useState, useTransition, useEffect, useMemo } from 'react'
import { Loader2, Plus, Pencil, Trash2, X } from 'lucide-react'
import {
  createPlanAction,
  updatePlanAction,
  deletePlanAction,
  togglePlanAction,
} from './plan-actions'
import type { DbMembershipPlan } from '@/types'

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

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
  const [slugManual, setSlugManual] = useState(isEdit)

  const [form, setForm] = useState({
    slug:               plan?.slug               ?? '',
    name_en:            plan?.name_en            ?? '',
    name_es:            plan?.name_es            ?? '',
    price_usd:          plan?.price_usd          ?? '',
    sessions_per_month: plan?.sessions_per_month ?? 1,
    rollover_max:       plan?.rollover_max       ?? 1,
    min_months:         plan?.min_months         ?? 3,
    extras_en:          (plan?.extras_en ?? []).join(', '),
    extras_es:          (plan?.extras_es ?? []).join(', '),
    requires_healthcare: plan?.requires_healthcare ?? false,
    is_active:          plan?.is_active          ?? true,
  })

  useEffect(() => {
    if (!slugManual) setForm((f) => ({ ...f, slug: toSlug(f.name_en) }))
  }, [form.name_en, slugManual])

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
          result.error === 'slug_taken'         ? 'That slug is already in use.' :
          result.error === 'missing_required_fields' ? 'Please fill in all required fields.' :
          result.error === 'unauthorized'        ? 'Unauthorized.' :
          'Something went wrong. Try again.'
        )
        return
      }

      const extrasEnArr = form.extras_en ? form.extras_en.split(',').map((s) => s.trim()).filter(Boolean) : []
      const extrasEsArr = form.extras_es ? form.extras_es.split(',').map((s) => s.trim()).filter(Boolean) : []
      const updated: DbMembershipPlan = {
        ...(plan ?? {} as DbMembershipPlan),
        id:                 plan?.id ?? '',
        slug:               form.slug,
        name_en:            form.name_en,
        name_es:            form.name_es,
        price_usd:          Number(form.price_usd),
        sessions_per_month: Number(form.sessions_per_month),
        rollover_max:       Number(form.rollover_max),
        min_months:         Number(form.min_months),
        extras_en:          extrasEnArr,
        extras_es:          extrasEsArr,
        requires_healthcare: Boolean(form.requires_healthcare),
        is_active:          Boolean(form.is_active),
        created_at:         plan?.created_at ?? new Date().toISOString(),
      }
      onSaved(updated)
      onClose()
    })
  }

  const inputCls = 'w-full h-9 rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-shadow disabled:opacity-60 bg-white'
  const labelCls = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1'

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

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

          <div>
            <label className={labelCls}>Name (English) *</label>
            <input type="text" value={form.name_en} onChange={(e) => set('name_en', e.target.value)}
              required disabled={isPending} className={inputCls} placeholder="Healthcare Relief – Basic" />
          </div>

          <div>
            <label className={labelCls}>Name (Español) *</label>
            <input type="text" value={form.name_es} onChange={(e) => set('name_es', e.target.value)}
              required disabled={isPending} className={inputCls} placeholder="Healthcare Relief – Básico" />
          </div>

          <div>
            <label className={labelCls}>Slug *</label>
            <input type="text" value={form.slug}
              onChange={(e) => { setSlugManual(true); set('slug', e.target.value) }}
              required disabled={isPending} className={inputCls + ' font-mono text-xs'} placeholder="healthcare_basic" />
            {!slugManual && <p className="text-[10px] text-gray-400 mt-1">Auto-generated from English name. Click to edit.</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Price (USD/mo) *</label>
              <input type="number" min={0} step={0.01} value={form.price_usd}
                onChange={(e) => set('price_usd', e.target.value)}
                required disabled={isPending} className={inputCls} placeholder="80" />
            </div>
            <div>
              <label className={labelCls}>Sessions/month *</label>
              <input type="number" min={1} value={form.sessions_per_month}
                onChange={(e) => set('sessions_per_month', parseInt(e.target.value, 10))}
                required disabled={isPending} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Rollover max</label>
              <input type="number" min={0} value={form.rollover_max}
                onChange={(e) => set('rollover_max', parseInt(e.target.value, 10))}
                disabled={isPending} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Min. months</label>
              <input type="number" min={1} value={form.min_months}
                onChange={(e) => set('min_months', parseInt(e.target.value, 10))}
                disabled={isPending} className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Extras (English) — comma separated</label>
            <input type="text" value={form.extras_en}
              onChange={(e) => set('extras_en', e.target.value)}
              disabled={isPending} className={inputCls} placeholder="Aromatherapy, Hot Stones" />
          </div>

          <div>
            <label className={labelCls}>Extras (Español) — separados por coma</label>
            <input type="text" value={form.extras_es}
              onChange={(e) => set('extras_es', e.target.value)}
              disabled={isPending} className={inputCls} placeholder="Aromaterapia, Hot Stones" />
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <button type="button" role="switch" aria-checked={form.requires_healthcare}
                onClick={() => set('requires_healthcare', !form.requires_healthcare)}
                disabled={isPending}
                className={['relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 disabled:opacity-50',
                  form.requires_healthcare ? 'bg-brand-500' : 'bg-gray-200'].join(' ')}>
                <span className={['inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200',
                  form.requires_healthcare ? 'translate-x-5' : 'translate-x-0'].join(' ')} />
              </button>
              <span className="text-sm text-gray-700">Requires healthcare worker ID</span>
            </div>

            <div className="flex items-center gap-3">
              <button type="button" role="switch" aria-checked={form.is_active}
                onClick={() => set('is_active', !form.is_active)}
                disabled={isPending}
                className={['relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 disabled:opacity-50',
                  form.is_active ? 'bg-brand-500' : 'bg-gray-200'].join(' ')}>
                <span className={['inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200',
                  form.is_active ? 'translate-x-5' : 'translate-x-0'].join(' ')} />
              </button>
              <span className="text-sm text-gray-700">Active (available for new memberships)</span>
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

  const sorted = useMemo(() => [...plans].sort((a, b) => a.price_usd - b.price_usd), [plans])

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
        <div className="hidden sm:grid grid-cols-[1fr_1fr_80px_80px_60px_88px] gap-3 px-5 py-2.5 border-b border-gray-100 bg-gray-50">
          {['Name EN', 'Name ES', 'Price', 'Sessions', 'Active', ''].map((h) => (
            <p key={h} className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{h}</p>
          ))}
        </div>

        {plans.length === 0 && (
          <div className="px-6 py-10 text-center text-sm text-gray-400">
            {'No plans yet. Click "New plan" to add one.'}
          </div>
        )}

        <div className="divide-y divide-gray-100">
          {sorted.map((p) => (
            <div key={p.id} className="flex flex-col sm:grid sm:grid-cols-[1fr_1fr_80px_80px_60px_88px] sm:items-center gap-2 sm:gap-3 px-5 py-3.5">

              <div>
                <p className="text-sm font-semibold text-gray-900">{p.name_en}</p>
                <p className="text-[10px] text-gray-400 font-mono">{p.slug}</p>
              </div>

              <p className="text-sm text-gray-500 hidden sm:block">{p.name_es}</p>
              <p className="text-sm font-semibold text-gray-700 hidden sm:block">${p.price_usd}/mo</p>
              <p className="text-sm text-gray-500 hidden sm:block">{p.sessions_per_month}/mo</p>

              <p className="sm:hidden text-xs text-gray-400">
                {p.name_es} · ${p.price_usd}/mo · {p.sessions_per_month} session{p.sessions_per_month !== 1 ? 's' : ''}/mo
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
          ))}
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
