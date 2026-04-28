import { createServiceClient } from '@/lib/supabase/server'

const BUSINESS_TIMEZONE = 'America/New_York'

export interface ScheduledAppointmentWindow {
  id: string
  scheduled_at: string
  service_type_id: string | null
  duration_minutes: number
  startsAt: Date
  endsAt: Date
}

export function getDayBoundsET(date: string): { start: string; end: string } {
  const midnightUTC = new Date(`${date}T00:00:00Z`)
  const midnightET = new Date(
    midnightUTC.toLocaleString('en-US', { timeZone: BUSINESS_TIMEZONE })
  )
  const offsetMs = midnightUTC.getTime() - midnightET.getTime()
  const start = new Date(midnightUTC.getTime() + offsetMs)
  const end = new Date(start.getTime() + 86_400_000)

  return { start: start.toISOString(), end: end.toISOString() }
}

export function buildTimeSlots(date: string, hours: number[]): Date[] {
  return hours.map((hour) => {
    const slot = new Date(`${date}T00:00:00`)
    slot.setHours(hour, 0, 0, 0)
    return slot
  })
}

export function overlaps(startA: Date, endA: Date, startB: Date, endB: Date): boolean {
  return startA < endB && endA > startB
}

export function isSlotOccupied(
  slotStart: Date,
  slotDurationMinutes: number,
  windows: ScheduledAppointmentWindow[]
): boolean {
  const slotEnd = new Date(slotStart.getTime() + slotDurationMinutes * 60_000)
  return windows.some((window) =>
    overlaps(slotStart, slotEnd, window.startsAt, window.endsAt)
  )
}

export function getOccupiedHoursForDate(
  date: string,
  candidateHours: number[],
  windows: ScheduledAppointmentWindow[],
  slotDurationMinutes = 60
): number[] {
  return buildTimeSlots(date, candidateHours)
    .filter((slot) => isSlotOccupied(slot, slotDurationMinutes, windows))
    .map((slot) => slot.getHours())
}

export async function getScheduledWindowsForDate(
  date: string
): Promise<ScheduledAppointmentWindow[]> {
  const supabase = createServiceClient()
  const { start, end } = getDayBoundsET(date)

  const { data, error } = await supabase
    .from('appointments')
    .select('id, scheduled_at, service_type_id, service_types(duration_minutes)')
    .eq('status', 'scheduled')
    .gte('scheduled_at', start)
    .lt('scheduled_at', end)
    .order('scheduled_at', { ascending: true })

  if (error) throw error

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => {
    const duration = Number(row.service_types?.duration_minutes ?? 60)
    const startsAt = new Date(row.scheduled_at)
    const endsAt = new Date(startsAt.getTime() + duration * 60_000)

    return {
      id: row.id,
      scheduled_at: row.scheduled_at,
      service_type_id: row.service_type_id ?? null,
      duration_minutes: duration,
      startsAt,
      endsAt,
    }
  })
}

export async function hasSchedulingConflict(params: {
  date: string
  startsAtISO: string
  durationMinutes: number
}): Promise<boolean> {
  const startsAt = new Date(params.startsAtISO)
  const endsAt = new Date(startsAt.getTime() + params.durationMinutes * 60_000)
  const windows = await getScheduledWindowsForDate(params.date)

  return windows.some((window) => overlaps(startsAt, endsAt, window.startsAt, window.endsAt))
}
