'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronLeft, ChevronRight, Plus, X, Phone, Clock, Loader2 } from 'lucide-react'
import type { CalendarAppointment } from '@/lib/supabase/queries/dashboard'
import type { ClientSelectItem, ServiceTypeItem } from '@/lib/supabase/queries/clients'
import { AddAppointmentModal } from './AddAppointmentModal'

// ─── Constants ────────────────────────────────────────────────────────────────

const SLOT_H      = 64  // px per hour slot
const FIRST_HOUR  = 8

const WEEKDAY_HOURS  = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18] // 8 AM → 7 PM
const SATURDAY_HOURS = [8, 9, 10, 11, 12, 13]                       // 8 AM → 2 PM

type AppStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show'

const STATUS_BADGE: Record<AppStatus, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
  no_show:   'bg-gray-100 text-gray-500',
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function todayET(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date())
}

function getHours(dayOfWeek: number): number[] {
  if (dayOfWeek === 0) return []
  return dayOfWeek === 6 ? SATURDAY_HOURS : WEEKDAY_HOURS
}

function formatHourLabel(h: number): string {
  if (h === 12) return '12 PM'
  if (h === 0 || h === 24) return '12 AM'
  return h < 12 ? `${h} AM` : `${h - 12} PM`
}

function formatDateHeading(dateStr: string, todayStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const dayName = dt.toLocaleDateString('en-US', { weekday: 'long' })
  const rest    = dt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  return dateStr === todayStr ? `Today — ${rest}` : `${dayName}, ${rest}`
}

function addDays(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d + delta)
  return [
    dt.getFullYear(),
    String(dt.getMonth() + 1).padStart(2, '0'),
    String(dt.getDate()).padStart(2, '0'),
  ].join('-')
}

function getETHourMin(iso: string): { h: number; min: number } {
  const dt = new Date(iso)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(dt)
  const h   = parseInt(parts.find(p => p.type === 'hour')!.value,   10) % 24
  const min = parseInt(parts.find(p => p.type === 'minute')!.value, 10)
  return { h, min }
}

function formatTimeRange(iso: string, durationMin: number): string {
  const start = new Date(iso)
  const end   = new Date(start.getTime() + durationMin * 60_000)
  const fmt   = (dt: Date) =>
    dt.toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true,
      timeZone: 'America/New_York',
    })
  return `${fmt(start)} – ${fmt(end)}`
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  initialAppointments: CalendarAppointment[]
  initialDateStr: string
  clients: ClientSelectItem[]
  serviceTypes: ServiceTypeItem[]
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DayCalendar({
  initialAppointments,
  initialDateStr,
  clients,
  serviceTypes,
}: Props) {
  const t = useTranslations('dashboard')
  const todayStr = todayET()

  // ── State ──────────────────────────────────────────────────────────────────
  const [dateStr,      setDateStr]      = useState(initialDateStr)
  const [appointments, setAppointments] = useState<CalendarAppointment[]>(initialAppointments)
  const [loading,      setLoading]      = useState(false)
  const [selectedId,   setSelectedId]   = useState<string | null>(null)
  const [updatingId,   setUpdatingId]   = useState<string | null>(null)
  const [addOpen,      setAddOpen]      = useState(false)
  const [addDate,      setAddDate]      = useState(initialDateStr)
  const [addHour,      setAddHour]      = useState<number | undefined>()
  const [currentTime,  setCurrentTime]  = useState(new Date())

  // Tick every minute to keep the red time line accurate
  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  // ── Data fetching ──────────────────────────────────────────────────────────
  const fetchDate = useCallback(async (date: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/appointments?date=${date}`)
      if (res.ok) setAppointments(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  function navigate(delta: number) {
    const next = addDays(dateStr, delta)
    setDateStr(next)
    setSelectedId(null)
    fetchDate(next)
  }

  function goToday() {
    setDateStr(todayStr)
    setSelectedId(null)
    if (todayStr === initialDateStr) {
      setAppointments(initialAppointments)
    } else {
      fetchDate(todayStr)
    }
  }

  function openAddModal(date: string, hour?: number) {
    setAddDate(date)
    setAddHour(hour)
    setAddOpen(true)
  }

  // ── Timeline setup ─────────────────────────────────────────────────────────
  const [y, m, d] = dateStr.split('-').map(Number)
  const dayOfWeek = new Date(y, m - 1, d).getDay()
  const hours     = getHours(dayOfWeek)
  const isSunday  = dayOfWeek === 0

  // Current time position (Eastern)
  const { h: nowH, min: nowMin } = getETHourMin(currentTime.toISOString())
  const showRedLine =
    dateStr === todayStr &&
    hours.length > 0 &&
    nowH >= FIRST_HOUR &&
    nowH <= hours[hours.length - 1]
  const redLineTop = (nowH - FIRST_HOUR) * SLOT_H + (nowMin / 60) * SLOT_H

  // ── Status update ──────────────────────────────────────────────────────────
  async function handleStatusUpdate(id: string, status: AppStatus) {
    setUpdatingId(id)
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        setAppointments(prev =>
          prev.map(a => (a.id === id ? { ...a, status } : a))
        )
        setSelectedId(null)
      }
    } finally {
      setUpdatingId(null)
    }
  }

  const selectedAppt = selectedId
    ? (appointments.find(a => a.id === selectedId) ?? null)
    : null

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">

      {/* ── Header ────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2">
        <p className="flex-1 min-w-0 text-sm font-semibold text-gray-900 truncate">
          {formatDateHeading(dateStr, todayStr)}
        </p>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            aria-label="Previous day"
          >
            <ChevronLeft size={16} />
          </button>

          <button
            onClick={goToday}
            className={[
              'h-8 px-3 rounded-lg text-xs font-semibold transition-colors',
              dateStr === todayStr
                ? 'bg-brand-50 text-brand-700'
                : 'hover:bg-gray-100 text-gray-600',
            ].join(' ')}
          >
            {t('cal_today_btn')}
          </button>

          <button
            onClick={() => navigate(1)}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            aria-label="Next day"
          >
            <ChevronRight size={16} />
          </button>

          <div className="w-px h-5 bg-gray-200 mx-0.5" />

          <button
            onClick={() => openAddModal(dateStr)}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-brand-500 hover:bg-brand-400 active:bg-brand-600 text-white text-xs font-semibold transition-colors shadow-sm"
          >
            <Plus size={13} />
            <span className="hidden sm:inline">{t('add_appointment')}</span>
          </button>
        </div>
      </div>

      {/* ── Timeline / Closed message ──────────────────── */}
      {isSunday ? (
        <div className="flex-1 flex items-center justify-center py-16">
          <p className="text-sm text-gray-400">{t('cal_closed')}</p>
        </div>
      ) : (
        <div
          className={[
            'relative overflow-y-auto transition-[max-height] duration-300',
            selectedAppt
              ? 'max-h-[300px] sm:max-h-[360px]'
              : 'max-h-[480px] sm:max-h-[540px]',
          ].join(' ')}
        >
          {/* Loading overlay */}
          {loading && (
            <div className="absolute inset-0 bg-white/70 z-30 flex items-center justify-center">
              <Loader2 size={20} className="animate-spin text-brand-500" />
            </div>
          )}

          {/* Relative container — hours + blocks positioned inside */}
          <div
            className="relative"
            style={{ height: (hours.length + 1) * SLOT_H }}
          >
            {/* Hour rows */}
            {hours.map((h) => (
              <div
                key={h}
                style={{ top: (h - FIRST_HOUR) * SLOT_H, height: SLOT_H }}
                className="absolute inset-x-0 flex border-b border-gray-100 group cursor-pointer hover:bg-gray-50/60 transition-colors"
                onClick={() => openAddModal(dateStr, h)}
              >
                {/* Label */}
                <div className="w-14 flex-shrink-0 flex items-start justify-end pr-3 pt-1.5 pointer-events-none">
                  <span className="text-[11px] text-gray-400 tabular-nums select-none">
                    {formatHourLabel(h)}
                  </span>
                </div>
                {/* Slot area — hover hint */}
                <div className="flex-1 relative pointer-events-none">
                  <Plus
                    size={12}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </div>
              </div>
            ))}

            {/* Closing hour label */}
            <div
              style={{ top: hours.length * SLOT_H }}
              className="absolute inset-x-0 flex pointer-events-none"
            >
              <div className="w-14 flex-shrink-0 flex justify-end pr-3 -mt-2">
                <span className="text-[11px] text-gray-400 tabular-nums">
                  {formatHourLabel(hours[hours.length - 1] + 1)}
                </span>
              </div>
            </div>

            {/* Red current-time line */}
            {showRedLine && (
              <div
                style={{ top: redLineTop }}
                className="absolute inset-x-0 z-20 pointer-events-none flex items-center"
              >
                <div className="w-14 flex-shrink-0 flex justify-end pr-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 -mr-1.5" />
                </div>
                <div className="flex-1 h-px bg-red-500" />
              </div>
            )}

            {/* Appointment blocks */}
            {appointments.map((appt) => {
              const { h: ah, min: amin } = getETHourMin(appt.scheduled_at)
              const duration = appt.service?.duration_minutes ?? 60
              const top    = (ah - FIRST_HOUR) * SLOT_H + (amin / 60) * SLOT_H
              const height = Math.max((duration / 60) * SLOT_H, 32)
              const isSelected = selectedId === appt.id
              const status = appt.status as AppStatus

              return (
                <button
                  key={appt.id}
                  style={{ top, height, left: 58, right: 8 }}
                  className={[
                    'absolute rounded-lg text-left px-2.5 py-1.5 overflow-hidden border-0 transition-all',
                    isSelected
                      ? 'bg-amber-600 ring-2 ring-amber-300 ring-offset-1 shadow-md z-10'
                      : 'bg-amber-500 hover:bg-amber-400 shadow-sm z-10',
                    status === 'cancelled' ? 'opacity-50' : '',
                    status === 'no_show'   ? 'opacity-60' : '',
                  ].join(' ')}
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedId(isSelected ? null : appt.id)
                  }}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] sm:text-xs font-semibold text-white truncate leading-tight">
                        {appt.client.first_name} {appt.client.last_name}
                      </p>
                      {height > 44 && (
                        <p className="text-[10px] text-amber-100 truncate mt-0.5">
                          {appt.service?.name_en ?? 'Appointment'}
                        </p>
                      )}
                      {height > 58 && (
                        <p className="text-[10px] text-amber-100 mt-0.5">
                          {formatTimeRange(appt.scheduled_at, duration)}
                        </p>
                      )}
                    </div>
                    {/* Status badge */}
                    <span
                      className={[
                        'flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-tight',
                        STATUS_BADGE[status] ?? STATUS_BADGE.scheduled,
                      ].join(' ')}
                    >
                      {status === 'scheduled' ? 'SCH'
                        : status === 'completed' ? 'DONE'
                        : status === 'no_show'   ? 'N/S'
                        : 'CANC'}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Appointment detail panel ──────────────────── */}
      {selectedAppt && (
        <div className="border-t border-gray-100 bg-gray-50/40 px-4 py-4">
          {/* Detail header */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {selectedAppt.client.first_name} {selectedAppt.client.last_name}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {formatTimeRange(
                  selectedAppt.scheduled_at,
                  selectedAppt.service?.duration_minutes ?? 60,
                )}
              </p>
            </div>
            <button
              onClick={() => setSelectedId(null)}
              className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-gray-200 text-gray-400 transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {/* Detail metadata */}
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-gray-500 mb-3">
            <span className="flex items-center gap-1.5">
              <Phone size={11} className="text-gray-400" />
              {selectedAppt.client.phone}
            </span>
            {selectedAppt.service && (
              <>
                <span className="font-medium text-gray-700">
                  {selectedAppt.service.name_en}
                  {selectedAppt.service.price_usd != null && ` · $${selectedAppt.service.price_usd}`}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock size={11} className="text-gray-400" />
                  {selectedAppt.service.duration_minutes} min
                </span>
              </>
            )}
          </div>

          {selectedAppt.notes && (
            <p className="text-xs text-gray-500 bg-white border border-gray-100 rounded-lg px-3 py-2 mb-3 leading-relaxed">
              {selectedAppt.notes}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap">
            {selectedAppt.status !== 'completed' && (
              <button
                onClick={() => handleStatusUpdate(selectedAppt.id, 'completed')}
                disabled={!!updatingId}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-green-500 hover:bg-green-400 text-white text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {updatingId === selectedAppt.id && (
                  <Loader2 size={11} className="animate-spin" />
                )}
                {t('cal_mark_completed')}
              </button>
            )}
            {selectedAppt.status !== 'no_show' && selectedAppt.status !== 'cancelled' && selectedAppt.status !== 'completed' && (
              <button
                onClick={() => handleStatusUpdate(selectedAppt.id, 'no_show')}
                disabled={!!updatingId}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {t('cal_mark_no_show')}
              </button>
            )}
            {selectedAppt.status === 'scheduled' && (
              <button
                onClick={() => handleStatusUpdate(selectedAppt.id, 'cancelled')}
                disabled={!!updatingId}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {t('cal_cancel')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Controlled AddAppointmentModal */}
      <AddAppointmentModal
        clients={clients}
        serviceTypes={serviceTypes}
        controlledOpen={addOpen}
        onControlledClose={() => setAddOpen(false)}
        defaultDate={addDate}
        defaultHour={addHour}
        onSuccess={() => fetchDate(dateStr)}
      />
    </div>
  )
}
