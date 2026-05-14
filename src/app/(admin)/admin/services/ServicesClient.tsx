'use client'

import { useState, useTransition, useEffect, useMemo } from 'react'
import { Loader2, Plus, Pencil, Trash2, X } from 'lucide-react'
import {
  createServiceAction,
  updateServiceAction,
  deleteServiceAction,
  toggleServiceAction,
} from './actions'
import type { ServiceTypeAdminItem } from '@/lib/supabase/queries/clients'

// ── Slug helper ───────────────────────────────────────────────────────────────
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

const DURATIONS = [30, 60, 90, 120]

// ── Form modal ────────────────────────────────────────────────────────────────
interface FormModalProps {
  service: ServiceTypeAdminItem | null  // null = create
  onClose: () => void
  onSaved: (updated: ServiceTypeAdminItem[]) => void
}

function ServiceFormModal({ service, onClose, onSaved }: FormModalProps) {
  const isEdit = service !== null
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [slugManual, setSlugManual] = useState(isEdit)

  const [form, setForm] = useState({
    slug:             service?.slug           ?? '',
    name_en:          service?.name_en        ?? '',
    name_es:          service?.name_es        ?? '',
    price_usd:        service?.price_usd      ?? '',
    duration_minutes: service?.duration_minutes ?? 60,
    is_active:        service?.is_active      ?? true,
    description_en:   service?.description_en ?? '',
    description_es:   service?.description_es ?? '',
  })

  // Auto-generate slug from name_en if not manually edited
  useEffect(() => {
    if (!slugManual) {
      setForm((f) => ({ ...f, slug: toSlug(f.name_en) }))
    }
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
        ? await updateServiceAction(service!.id, fd)
        : await createServiceAction(fd)

      if (result.error) {
        setError(
          result.error === 'slug_taken'
            ? 'That slug is already in use. Choose a different one.'
            : result.error === 'missing_required_fields'
            ? 'Please fill in all required fields.'
            : result.error === 'unauthorized'
            ? 'Unauthorized.'
            : 'Something went wrong. Try again.'
        )
        return
      }

      // Pass the updated form data back so the parent can optimistically update
      const updated: ServiceTypeAdminItem = {
        id:               service?.id ?? '',
        slug:             form.slug,
        name_en:          form.name_en,
        name_es:          form.name_es,
        price_usd:        Number(form.price_usd),
        duration_minutes: Number(form.duration_minutes),
        description_en:   form.description_en || null,
        description_es:   form.description_es || null,
        is_active:        Boolean(form.is_active),
        created_at:       service?.created_at ?? new Date().toISOString(),
      }
      onSaved([updated])
      onClose()
    })
  }

  const inputCls = 'w-full h-9 rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-shadow disabled:opacity-60 bg-white'
  const textareaCls = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 resize-none disabled:opacity-60 bg-white'
  const labelCls = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92dvh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-base font-semibold text-gray-900">
            {isEdit ? 'Edit service' : 'New service'}
          </h2>
          <button onClick={onClose} className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

          {/* Name EN */}
          <div>
            <label className={labelCls}>Name (English) *</label>
            <input
              type="text"
              value={form.name_en}
              onChange={(e) => set('name_en', e.target.value)}
              required
              disabled={isPending}
              className={inputCls}
              placeholder="Deep tissue massage"
            />
          </div>

          {/* Name ES */}
          <div>
            <label className={labelCls}>Name (Español) *</label>
            <input
              type="text"
              value={form.name_es}
              onChange={(e) => set('name_es', e.target.value)}
              required
              disabled={isPending}
              className={inputCls}
              placeholder="Masaje descontracturante"
            />
          </div>

          {/* Slug */}
          <div>
            <label className={labelCls}>Slug *</label>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => { setSlugManual(true); set('slug', e.target.value) }}
              required
              disabled={isPending}
              className={inputCls + ' font-mono text-xs'}
              placeholder="deep_tissue"
            />
            {!slugManual && (
              <p className="text-[10px] text-gray-400 mt-1">Auto-generated from English name. Click to edit.</p>
            )}
          </div>

          {/* Price + Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Price (USD) *</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.price_usd}
                onChange={(e) => set('price_usd', e.target.value)}
                required
                disabled={isPending}
                className={inputCls}
                placeholder="100"
              />
            </div>
            <div>
              <label className={labelCls}>Duration *</label>
              <select
                value={form.duration_minutes}
                onChange={(e) => set('duration_minutes', parseInt(e.target.value, 10))}
                disabled={isPending}
                className={inputCls}
              >
                {DURATIONS.map((d) => (
                  <option key={d} value={d}>{d} min</option>
                ))}
              </select>
            </div>
          </div>

          {/* Active */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={form.is_active}
              onClick={() => set('is_active', !form.is_active)}
              disabled={isPending}
              className={[
                'relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 disabled:opacity-50',
                form.is_active ? 'bg-brand-500' : 'bg-gray-200',
              ].join(' ')}
            >
              <span className={[
                'inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200',
                form.is_active ? 'translate-x-5' : 'translate-x-0',
              ].join(' ')} />
            </button>
            <span className="text-sm text-gray-700">Active (visible to clients)</span>
          </div>

          {/* Description EN */}
          <div>
            <label className={labelCls}>Description (English)</label>
            <textarea
              value={form.description_en}
              onChange={(e) => set('description_en', e.target.value)}
              rows={2}
              disabled={isPending}
              className={textareaCls}
              placeholder="Optional description in English…"
            />
          </div>

          {/* Description ES */}
          <div>
            <label className={labelCls}>Descripción (Español)</label>
            <textarea
              value={form.description_es}
              onChange={(e) => set('description_es', e.target.value)}
              rows={2}
              disabled={isPending}
              className={textareaCls}
              placeholder="Descripción opcional en español…"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Footer */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 h-10 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 h-10 rounded-xl bg-brand-500 hover:bg-brand-400 text-white text-sm font-semibold transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {isPending && <Loader2 size={13} className="animate-spin" />}
              {isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Services list ─────────────────────────────────────────────────────────────
interface Props {
  initialServices: ServiceTypeAdminItem[]
}

type SortOrder = 'az' | 'za' | 'price_asc' | 'price_desc'

export function ServicesClient({ initialServices }: Props) {
  const [services, setServices] = useState(initialServices)
  const [sortOrder, setSortOrder] = useState<SortOrder>('az')
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<ServiceTypeAdminItem | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  function showToast(msg: string) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 3000)
  }

  function openCreate() {
    setEditTarget(null)
    setShowForm(true)
  }

  function openEdit(s: ServiceTypeAdminItem) {
    setEditTarget(s)
    setShowForm(true)
  }

  function handleSaved(updated: ServiceTypeAdminItem[]) {
    setServices((prev) => {
      const isCreate = updated[0].id === ''
      if (isCreate) {
        // Will get proper id after revalidation; just append optimistically
        return [...prev, updated[0]]
      }
      return prev.map((s) => s.id === updated[0].id ? updated[0] : s)
    })
  }

  function handleToggle(id: string, current: boolean) {
    setServices((prev) => prev.map((s) => s.id === id ? { ...s, is_active: !current } : s))
    toggleServiceAction(id, !current).then((r) => {
      if (r.error) {
        setServices((prev) => prev.map((s) => s.id === id ? { ...s, is_active: current } : s))
        showToast('Could not toggle service.')
      }
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this service? If it has existing visits or appointments, it will be deactivated instead.')) return
    setDeletingId(id)
    deleteServiceAction(id).then((r) => {
      setDeletingId(null)
      if (r.error) {
        showToast('Could not delete service.')
        return
      }
      if (r.deactivated) {
        setServices((prev) => prev.map((s) => s.id === id ? { ...s, is_active: false } : s))
        showToast('Service has existing records — deactivated instead of deleted.')
      } else {
        setServices((prev) => prev.filter((s) => s.id !== id))
        showToast('Service deleted.')
      }
    })
  }

  const sorted = useMemo(() => {
    return [...services].sort((a, b) => {
      if (sortOrder === 'za') return b.name_en.localeCompare(a.name_en)
      if (sortOrder === 'price_asc') return (a.price_usd ?? 0) - (b.price_usd ?? 0)
      if (sortOrder === 'price_desc') return (b.price_usd ?? 0) - (a.price_usd ?? 0)
      return a.name_en.localeCompare(b.name_en)
    })
  }, [services, sortOrder])

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Services</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {services.length} service{services.length !== 1 ? 's' : ''} · inactive types are hidden from client booking
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-brand-400 transition-colors"
          >
            <option value="az">Name A-Z</option>
            <option value="za">Name Z-A</option>
            <option value="price_asc">Price ↑</option>
            <option value="price_desc">Price ↓</option>
          </select>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-brand-500 hover:bg-brand-400 active:bg-brand-600 text-white text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus size={14} />
            New service
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Column headers */}
        <div className="hidden sm:grid grid-cols-[1fr_1fr_80px_80px_60px_88px] gap-3 px-5 py-2.5 border-b border-gray-100 bg-gray-50">
          {['Name EN', 'Name ES', 'Price', 'Duration', 'Active', ''].map((h) => (
            <p key={h} className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{h}</p>
          ))}
        </div>

        {services.length === 0 && (
          <div className="px-6 py-10 text-center text-sm text-gray-400">
            {'No services yet. Click "New service" to add one.'}
          </div>
        )}

        <div className="divide-y divide-gray-100">
          {sorted.map((s) => (
            <div key={s.id} className="flex flex-col sm:grid sm:grid-cols-[1fr_1fr_80px_80px_60px_88px] sm:items-center gap-2 sm:gap-3 px-5 py-3.5">

              {/* Name EN */}
              <div>
                <p className="text-sm font-semibold text-gray-900">{s.name_en}</p>
                <p className="text-[10px] text-gray-400 font-mono">{s.slug}</p>
              </div>

              {/* Name ES */}
              <p className="text-sm text-gray-500 hidden sm:block">{s.name_es}</p>

              {/* Price */}
              <p className="text-sm font-semibold text-gray-700 hidden sm:block">
                {s.price_usd !== null ? `$${s.price_usd}` : '—'}
              </p>

              {/* Duration */}
              <p className="text-sm text-gray-500 hidden sm:block">{s.duration_minutes} min</p>

              {/* Mobile: price + duration row */}
              <p className="sm:hidden text-xs text-gray-400">
                {s.name_es} · {s.price_usd !== null ? `$${s.price_usd}` : '—'} · {s.duration_minutes} min
              </p>

              {/* Active toggle */}
              <div className="hidden sm:flex">
                <button
                  onClick={() => handleToggle(s.id, s.is_active)}
                  role="switch"
                  aria-checked={s.is_active}
                  className={[
                    'relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200',
                    s.is_active ? 'bg-brand-500' : 'bg-gray-200',
                  ].join(' ')}
                >
                  <span className={[
                    'inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200',
                    s.is_active ? 'translate-x-5' : 'translate-x-0',
                  ].join(' ')} />
                </button>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 sm:justify-end">
                <button
                  onClick={() => openEdit(s)}
                  className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                  aria-label="Edit"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDelete(s.id)}
                  disabled={deletingId === s.id}
                  className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                  aria-label="Delete"
                >
                  {deletingId === s.id
                    ? <Loader2 size={14} className="animate-spin" />
                    : <Trash2 size={14} />
                  }
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Form modal */}
      {showForm && (
        <ServiceFormModal
          service={editTarget}
          onClose={() => setShowForm(false)}
          onSaved={handleSaved}
        />
      )}

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-lg">
          {toastMsg}
        </div>
      )}
    </div>
  )
}
