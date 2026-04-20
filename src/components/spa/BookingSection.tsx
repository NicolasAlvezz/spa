'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronLeft, ChevronRight, Loader2, CheckCircle2 } from 'lucide-react'
import { bookAppointmentAction } from '@/app/(client)/my-qr/book-action'

// ─── Spa schedule ─────────────────────────────────────────────────────────────
// Mon–Fri: 8 am – 7 pm (last slot 6 pm)
// Sat:     8 am – 2 pm (last slot 1 pm)
// Sun:     closed
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
}

export function BookingSection({ locale }: Props) {
  const t = useTranslations('booking')

  const now = new Date()
  const [month, setMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedHour, setSelectedHour] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [isPending, startTransition] = useTransition()
  const [bookStatus, setBookStatus] = useState<'idle' | 'success' | 'error'>('idle')

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

  function prevMonth() {
    const prev = new Date(year, monthIdx - 1, 1)
    if (prev < currentMonthStart) return
    setMonth(prev)
    setSelectedDate(null)
    setSelectedHour(null)
    setBookStatus('idle')
  }

  function nextMonth() {
    setMonth(new Date(year, monthIdx + 1, 1))
    setSelectedDate(null)
    setSelectedHour(null)
    setBookStatus('idle')
  }

  function handleDayClick(date: Date) {
    if (isPast(date) || !isWorkingDay(date)) return
    setSelectedDate(date)
    setSelectedHour(null)
    setBookStatus('idle')
  }

  function handleSubmit() {
    if (!selectedDate || selectedHour === null) return
    const dt = new Date(selectedDate)
    dt.setHours(selectedHour, 0, 0, 0)
    startTransition(async () => {
      const err = await bookAppointmentAction(dt.toISOString(), notes.trim() || null)
      setBookStatus(err ? 'error' : 'success')
      if (!err) {
        setSelectedDate(null)
        setSelectedHour(null)
        setNotes('')
      }
    })
  }

  const isPrevDisabled = new Date(year, monthIdx - 1, 1) < currentMonthStart
  const slots = selectedDate ? getSlots(selectedDate) : []

  const selectedDateLabel = selectedDate
    ? selectedDate.toLocaleDateString(locale === 'es' ? 'es-US' : 'en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
    : ''

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
                    ? 'bg-amber-500 text-white shadow-sm'
                    : clickable && isToday
                    ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
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
            <span className="w-3 h-3 rounded-sm bg-amber-500 inline-block" />
            <span className="text-amber-500">{t('selected')}</span>
          </span>
        </div>
      </div>

      {/* ── Booking form (appears when day is selected) ─────────────────── */}
      {selectedDate && (
        <div className="mt-3 bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-4 space-y-4">
          <p className="text-sm font-semibold text-gray-800 capitalize">{selectedDateLabel}</p>

          {/* Time slots */}
          <div>
            <p className="text-xs text-gray-400 mb-2.5">{t('select_time')}</p>
            <div className="flex flex-wrap gap-2">
              {slots.map((h) => (
                <button
                  key={h}
                  onClick={() => setSelectedHour(h)}
                  className={[
                    'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                    selectedHour === h
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'border-gray-200 text-gray-600 hover:border-amber-300 hover:text-amber-700',
                  ].join(' ')}
                >
                  {formatHour(h, locale)}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <p className="text-xs text-gray-400 mb-2">{t('notes')}</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('notes_placeholder')}
              rows={2}
              className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 resize-none text-gray-800 placeholder:text-gray-300"
            />
          </div>

          {/* Feedback */}
          {bookStatus === 'error' && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5">
              {t('error')}
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
            disabled={selectedHour === null || isPending}
            className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white font-semibold text-sm transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending && <Loader2 size={15} className="animate-spin" />}
            {isPending ? t('booking') : t('book')}
          </button>
        </div>
      )}
    </div>
  )
}
