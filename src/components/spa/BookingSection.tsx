'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronLeft, ChevronRight, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { bookAppointmentAction } from '@/app/(client)/my-qr/book-action'
import type { ServiceTypeItem } from '@/lib/supabase/queries/clients'

// ─── Spa schedule ─────────────────────────────────────────────────────────────
// Mon–Fri: 8 am – 7 pm (last slot 6 pm)
// Sat:     8 am – 2 pm (last slot 1 pm)
// Sun:     closed
// Timezone: America/New_York (spa is in Kissimmee, FL)
const WEEKDAY_SLOTS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]
const SATURDAY_SLOTS = [8, 9, 10, 11, 12, 13]

function isWorkingDay(date: Date): boolean {
  return date.getDay() !== 0 // Sunday is 0
}

function isPast(date: Date): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date < today
}

function getSlots(date: Date): number[] {
  return date.getDay() === 6 ? SATURDAY_SLOTS : WEEKDAY_SLOTS
}

// Build an ISO string that treats the selected date+hour as Eastern Time,
// regardless of the client's browser timezone.
function toEasternISO(date: Date, hour: number): string {
  const year = date.getFullYear()
  const month = date.getMonth()
  const day = date.getDate()

  // Probe UTC noon to determine whether Eastern is on EST (-5) or EDT (-4)
  const probe = new Date(Date.UTC(year, month, day, 12, 0, 0))
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    })
      .formatToParts(probe)
      .map((p) => [p.type, p.value])
  )

  // Eastern hour when UTC is noon; diff gives the UTC offset (e.g. -4 or -5)
  const easternHour = parseInt(parts.hour, 10) % 24
  const offsetHours = easternHour - 12 // e.g. -4 (EDT) or -5 (EST)
  const sign = offsetHours >= 0 ? '+' : '-'
  const offsetStr = `${sign}${String(Math.abs(offsetHours)).padStart(2, '0')}:00`

  const mm = String(month + 1).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  const hh = String(hour).padStart(2, '0')

  return `${year}-${mm}-${dd}T${hh}:00:00${offsetStr}`
}

function formatHour(h: number, locale: 'en' | 'es'): string {
  const d = new Date()
  d.setHours(h, 0, 0, 0)
  return d.toLocaleTimeString(locale === 'es' ? 'es-US' : 'en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  locale: 'en' | 'es'
  serviceTypes: ServiceTypeItem[]
}

export function BookingSection({ locale, serviceTypes }: Props) {
  const t = useTranslations('booking')

  const now = new Date()
  const [month, setMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedHour, setSelectedHour] = useState<number | null>(null)
  const [selectedServiceTypeId, setSelectedServiceTypeId] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [isPending, startTransition] = useTransition()
  const [bookStatus, setBookStatus] = useState<'idle' | 'success' | 'error' | 'occupied'>('idle')
  const [occupiedHours, setOccupiedHours] = useState<number[]>([])
  const [loadingAvailability, setLoadingAvailability] = useState(false)
  // Ref so the availability effect can check selectedHour without triggering re-runs
  const selectedHourRef = useRef(selectedHour)
  selectedHourRef.current = selectedHour

  const year = month.getFullYear()
  const monthIdx = month.getMonth()

  // Calendar grid — pad start with nulls so day 1 lands on correct weekday
  const firstDayOfWeek = new Date(year, monthIdx, 1).getDay()
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate()
  const cells: (Date | null)[] = [
    ...Array<null>(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, monthIdx, i + 1)),
  ]

  const monthLabel = new Intl.DateTimeFormat(locale === 'es' ? 'es-US' : 'en-US', {
    month: 'long',
    year: 'numeric',
  }).format(month)

  const dayLabels = locale === 'es'
    ? ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa']
    : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  function resetForm() {
    setSelectedDate(null)
    setSelectedHour(null)
    setSelectedServiceTypeId(null)
    setBookStatus('idle')
  }

  function prevMonth() {
    const prev = new Date(year, monthIdx - 1, 1)
    if (prev < currentMonthStart) return
    setMonth(prev)
    resetForm()
  }

  function nextMonth() {
    setMonth(new Date(year, monthIdx + 1, 1))
    resetForm()
  }

  function handleDayClick(date: Date) {
    if (isPast(date) || !isWorkingDay(date)) return
    setSelectedDate(date)
    setSelectedHour(null)
    setSelectedServiceTypeId(null)
    setBookStatus('idle')
  }

  function handleHourClick(h: number) {
    setSelectedHour(h)
    // Keep service type selection if already picked
    setBookStatus('idle')
  }

  function handleSubmit() {
    if (!selectedDate || selectedHour === null || !selectedServiceTypeId) return
    // Always send the appointment time as Eastern Time (spa timezone)
    const scheduledAt = toEasternISO(selectedDate, selectedHour)
    startTransition(async () => {
      const err = await bookAppointmentAction(scheduledAt, selectedServiceTypeId, notes.trim() || null)
      setBookStatus(err ? (err === 'slot_occupied' ? 'occupied' : 'error') : 'success')
      if (!err) {
        setSelectedDate(null)
        setSelectedHour(null)
        setSelectedServiceTypeId(null)
        setNotes('')
      }
    })
  }

  const isPrevDisabled = new Date(year, monthIdx - 1, 1) < currentMonthStart
  const slots = selectedDate ? getSlots(selectedDate) : []
  const hasAvailableSlots = slots.some((h) => !occupiedHours.includes(h))

  const selectedDateLabel = selectedDate
    ? selectedDate.toLocaleDateString(locale === 'es' ? 'es-US' : 'en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
    : ''

  const canSubmit = selectedHour !== null && selectedServiceTypeId !== null && !isPending

  const selectedDateKey = useMemo(() => {
    if (!selectedDate) return null
    const yearPart = selectedDate.getFullYear()
    const monthPart = String(selectedDate.getMonth() + 1).padStart(2, '0')
    const dayPart = String(selectedDate.getDate()).padStart(2, '0')
    return `${yearPart}-${monthPart}-${dayPart}`
  }, [selectedDate])

  useEffect(() => {
    if (!selectedDateKey) {
      setOccupiedHours([])
      return
    }

    let cancelled = false
    setLoadingAvailability(true)

    fetch(`/api/appointments/availability?date=${selectedDateKey}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('availability_fetch_failed')
        return res.json()
      })
      .then((data: { occupied_hours?: number[] }) => {
        if (cancelled) return
        const nextOccupied = data.occupied_hours ?? []
        setOccupiedHours(nextOccupied)
        // Read via ref — avoids including selectedHour in deps and causing a double-fetch
        const currentHour = selectedHourRef.current
        if (currentHour !== null && nextOccupied.includes(currentHour)) {
          setSelectedHour(null)
          setSelectedServiceTypeId(null)
          setBookStatus('occupied')
        }
      })
      .catch(() => {
        if (!cancelled) setOccupiedHours([])
      })
      .finally(() => {
        if (!cancelled) setLoadingAvailability(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedDateKey])  // selectedHour removed — read via ref to avoid double-fetch

  return (
    <div className="w-full">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
        {t('title')}
      </p>

      {/* ── Calendar card ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

        {/* Month navigation */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <button
            onClick={prevMonth}
            disabled={isPrevDisabled}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label={t('prev_month')}
          >
            <ChevronLeft size={15} className="text-gray-500" />
          </button>
          <p className="text-sm font-semibold text-gray-800 capitalize">{monthLabel}</p>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label={t('next_month')}
          >
            <ChevronRight size={15} className="text-gray-500" />
          </button>
        </div>

        {/* Day-of-week header */}
        <div className="grid grid-cols-7 px-2 pt-3">
          {dayLabels.map((d) => (
            <div
              key={d}
              className="text-center text-[10px] font-semibold text-gray-300 uppercase pb-1"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 px-2 pb-3 gap-y-0.5">
          {cells.map((date, i) => {
            if (!date) return <div key={`e-${i}`} />
            const past = isPast(date)
            const working = isWorkingDay(date)
            const isSelected = selectedDate?.toDateString() === date.toDateString()
            const isToday = now.toDateString() === date.toDateString()
            const clickable = !past && working

            return (
              <button
                key={date.toDateString()}
                onClick={() => clickable && handleDayClick(date)}
                disabled={!clickable}
                className={[
                  'flex items-center justify-center h-9 w-full rounded-lg text-sm font-medium transition-colors',
                  isSelected
                    ? 'bg-brand-500 text-white shadow-sm'
                    : clickable && isToday
                    ? 'bg-brand-50 text-brand-700 hover:bg-brand-100'
                    : clickable
                    ? 'text-gray-700 hover:bg-gray-100'
                    : working
                    ? 'text-gray-200 cursor-default'
                    : 'text-gray-200 cursor-default',
                ].join(' ')}
              >
                {date.getDate()}
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="px-4 pb-3 flex items-center gap-4 text-[10px] text-gray-300">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-gray-100 inline-block" />
            {t('closed_sunday')}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-brand-500 inline-block" />
            <span className="text-brand-500">{t('selected')}</span>
          </span>
        </div>
      </div>

      {/* ── Booking form (appears when day is selected) ─────────────────── */}
      {selectedDate && (
        <div className="mt-3 bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-4 space-y-5">
          <p className="text-sm font-semibold text-gray-800 capitalize">{selectedDateLabel}</p>

          {/* ── Step 1: Time slots ──────────────────────────────────── */}
          <div>
            <p className="text-xs text-gray-400 mb-2.5">{t('select_time')}</p>
            {!loadingAvailability && !hasAvailableSlots && (
              <p className="text-xs text-amber-600 mb-2">{t('no_slots_available')}</p>
            )}
            <div className="flex flex-wrap gap-2">
              {slots.map((h) => {
                const occupied = occupiedHours.includes(h)
                const disabled = occupied || loadingAvailability

                return (
                  <button
                    key={h}
                    onClick={() => !disabled && handleHourClick(h)}
                    disabled={disabled}
                    className={[
                      'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                      selectedHour === h
                        ? 'bg-brand-500 text-white border-brand-500'
                        : occupied
                        ? 'border-gray-100 bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'border-gray-200 text-gray-600 hover:border-brand-300 hover:text-brand-700',
                    ].join(' ')}
                  >
                    {occupied ? `${formatHour(h, locale)} · ${t('slot_occupied')}` : formatHour(h, locale)}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Step 2: Massage type (appears after hour is selected) ── */}
          {selectedHour !== null && (
            <div>
              <p className="text-xs text-gray-400 mb-2.5">{t('select_service')}</p>

              {serviceTypes.length === 0 ? (
                <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                  <AlertCircle size={14} className="flex-shrink-0" />
                  {t('no_services')}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {serviceTypes.map((s) => {
                    const name = locale === 'es' ? s.name_es : s.name_en
                    const isSelected = selectedServiceTypeId === s.id
                    return (
                      <button
                        key={s.id}
                        onClick={() => setSelectedServiceTypeId(s.id)}
                        aria-pressed={isSelected}
                        className={[
                          'w-full text-left px-4 py-3 rounded-xl border-2 transition-all',
                          isSelected
                            ? 'border-brand-500 bg-brand-50'
                            : 'border-gray-100 bg-white hover:border-brand-200 hover:bg-brand-50/40',
                        ].join(' ')}
                      >
                        <span className={[
                          'text-sm font-semibold block leading-tight',
                          isSelected ? 'text-brand-700' : 'text-gray-800',
                        ].join(' ')}>
                          {name}
                        </span>
                        <span className={[
                          'text-xs mt-0.5 block',
                          isSelected ? 'text-brand-500' : 'text-gray-400',
                        ].join(' ')}>
                          {s.price_usd !== null && <>${s.price_usd} · </>}
                          {s.duration_minutes} min
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Notes (appears after massage type is selected) ─ */}
          {selectedServiceTypeId !== null && (
            <div>
              <p className="text-xs text-gray-400 mb-2">{t('notes')}</p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('notes_placeholder')}
                rows={2}
                className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 resize-none text-gray-800 placeholder:text-gray-300"
              />
            </div>
          )}

          {/* Feedback */}
          {bookStatus === 'error' && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5">
              {t('error')}
            </p>
          )}
          {bookStatus === 'occupied' && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-4 py-2.5">
              {t('conflict_retry')}
            </p>
          )}
          {bookStatus === 'success' && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-4 py-2.5">
              <CheckCircle2 size={15} />
              {t('success')}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-brand-500 hover:bg-brand-400 active:bg-brand-600 text-white font-semibold text-sm transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending && <Loader2 size={15} className="animate-spin" />}
            {isPending ? t('booking') : t('book')}
          </button>
        </div>
      )}
    </div>
  )
}
