'use client'

import { useEffect, useState, useTransition } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Plus, X, Loader2, CheckCircle2 } from 'lucide-react'
import type { ClientSelectItem, ServiceTypeItem } from '@/lib/supabase/queries/clients'

const WEEKDAY_SLOTS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]
const SATURDAY_SLOTS = [8, 9, 10, 11, 12, 13]

interface Props {
  clients: ClientSelectItem[]
  serviceTypes: ServiceTypeItem[]
}

export function AddAppointmentModal({ clients, serviceTypes }: Props) {
  const t      = useTranslations('dashboard')
  const locale = useLocale() as 'en' | 'es'
  const router = useRouter()

  const [open, setOpen]           = useState(false)
  const [success, setSuccess]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Form fields
  const [clientId, setClientId]         = useState('')
  const [serviceId, setServiceId]       = useState('')
  const [dateStr, setDateStr]           = useState(todayLocal())
  const [timeStr, setTimeStr]           = useState('10:00')
  const [notes, setNotes]               = useState('')
  const [occupiedExactHours, setOccupiedExactHours] = useState<number[]>([])
  const [loadingAvailability, setLoadingAvailability] = useState(false)

  function todayLocal() {
    return new Date().toLocaleDateString('en-CA') // 'YYYY-MM-DD'
  }

  function reset() {
    setClientId(''); setServiceId(''); setDateStr(todayLocal()); setTimeStr('10:00'); setNotes('')
    setOccupiedExactHours([])
    setError(null); setSuccess(false)
  }

  function handleOpen() { reset(); setOpen(true) }
  function handleClose() { setOpen(false) }

  function getCandidateSlots(date: string): number[] {
    const parsed = new Date(`${date}T00:00:00`)
    if (parsed.getDay() === 0) return []
    return parsed.getDay() === 6 ? SATURDAY_SLOTS : WEEKDAY_SLOTS
  }

  function toTimeString(hour: number): string {
    return `${String(hour).padStart(2, '0')}:00`
  }

  function formatHourLabel(hour: number): string {
    const d = new Date()
    d.setHours(hour, 0, 0, 0)
    return d.toLocaleTimeString(locale === 'es' ? 'es-US' : 'en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const candidateSlots = getCandidateSlots(dateStr)
  const availableHours = candidateSlots.filter((hour) => !occupiedExactHours.includes(hour))

  useEffect(() => {
    if (!availableHours.length) return
    if (!availableHours.includes(Number(timeStr.split(':')[0]))) {
      setTimeStr(toTimeString(availableHours[0]))
    }
  }, [availableHours, timeStr])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoadingAvailability(true)

    fetch(`/api/appointments/availability?date=${dateStr}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('availability_fetch_failed')
        return res.json()
      })
      .then((data: { occupied_exact_hours?: number[] }) => {
        if (cancelled) return
        const occupied = data.occupied_exact_hours ?? []
        setOccupiedExactHours(occupied)
        const selectedHour = Number(timeStr.split(':')[0])
        if (occupied.includes(selectedHour)) {
          const nextHour = getCandidateSlots(dateStr).find((hour) => !occupied.includes(hour))
          setTimeStr(nextHour !== undefined ? toTimeString(nextHour) : '')
        }
      })
      .catch(() => {
        if (!cancelled) setOccupiedExactHours([])
      })
      .finally(() => {
        if (!cancelled) setLoadingAvailability(false)
      })

    return () => {
      cancelled = true
    }
  }, [dateStr, open, timeStr])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clientId) { setError('Please select a client'); return }
    if (!serviceId) { setError('Please select a service type'); return }
    if (!timeStr) { setError(t('no_slots_available')); return }
    setError(null)

    // Build ISO timestamp from local date + time (Eastern Time — admin is on-site)
    // We store "as-is" and interpret in ET when displaying
    const scheduledAt = new Date(`${dateStr}T${timeStr}:00`).toISOString()

    startTransition(async () => {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id:       clientId,
          service_type_id: serviceId || null,
          scheduled_at:    scheduledAt,
          notes:           notes || null,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        console.error('[AddAppointmentModal] error:', res.status, body)
        if (res.status === 409) {
          setError(t('conflict_retry'))
        } else {
          setError('Could not save appointment. Try again.')
        }
        return
      }

      setSuccess(true)
      router.refresh()
      setTimeout(() => { setOpen(false); reset() }, 1500)
    })
  }

  const selectCls = 'w-full h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-shadow disabled:opacity-60'
  const inputCls  = 'w-full h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-shadow disabled:opacity-60'

  return (
    <>
      {/* Trigger */}
      <button
        onClick={handleOpen}
        className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg bg-brand-500 hover:bg-brand-400 active:bg-brand-600 text-white text-sm font-semibold transition-colors shadow-sm"
      >
        <Plus size={15} />
        <span className="hidden sm:inline">{t('add_appointment')}</span>
      </button>

      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

          {/* Dialog — bottom sheet on mobile, centered card on sm+ */}
          <div className="relative z-10 w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92dvh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">{t('add_appointment')}</h2>
              <button
                onClick={handleClose}
                className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            {success ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <CheckCircle2 size={40} className="text-green-500" />
                <p className="text-sm font-medium text-green-700">{t('appointment_saved')}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

                {/* Client */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block">
                    {t('select_client')} *
                  </label>
                  <select
                    value={clientId}
                    onChange={e => setClientId(e.target.value)}
                    required
                    disabled={isPending}
                    className={selectCls}
                  >
                    <option value="">— {t('select_client')} —</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.first_name} {c.last_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Service type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block">
                    {t('select_service')}
                  </label>
                  <select
                    value={serviceId}
                    onChange={e => setServiceId(e.target.value)}
                    required
                    disabled={isPending}
                    className={selectCls}
                  >
                    <option value="">— {t('select_service')} —</option>
                    {serviceTypes.map(s => (
                      <option key={s.id} value={s.id}>
                        {locale === 'es' ? s.name_es : s.name_en}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date + Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block">
                      {t('date_label')} *
                    </label>
                    <input
                      type="date"
                      value={dateStr}
                      onChange={e => setDateStr(e.target.value)}
                      required
                      disabled={isPending}
                      className={inputCls}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block">
                      {t('time_label')} *
                    </label>
                    <select
                      value={timeStr}
                      onChange={e => setTimeStr(e.target.value)}
                      required
                      disabled={isPending || loadingAvailability || availableHours.length === 0}
                      className={inputCls}
                    >
                      {availableHours.length === 0 ? (
                        <option value="">{t('no_slots_available')}</option>
                      ) : (
                        availableHours.map((hour) => (
                          <option key={hour} value={toTimeString(hour)}>
                            {formatHourLabel(hour)}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                {availableHours.length === 0 && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                    {t('no_slots_available')}
                  </p>
                )}

                {/* Notes */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block">
                    {t('notes_label')}
                  </label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={2}
                    disabled={isPending}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 resize-none disabled:opacity-60"
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
                    onClick={handleClose}
                    disabled={isPending}
                    className="flex-1 h-10 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || !clientId || !serviceId || !timeStr}
                    className="flex-1 h-10 rounded-xl bg-brand-500 hover:bg-brand-400 active:bg-brand-600 text-white text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isPending && <Loader2 size={14} className="animate-spin" />}
                    {isPending ? t('saving') : t('save_appointment')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
