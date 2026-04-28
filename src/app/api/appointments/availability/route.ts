import { NextResponse } from 'next/server'
import {
  getOccupiedHoursForDate,
  getScheduledWindowsForDate,
} from '@/lib/supabase/queries/appointments'

const WEEKDAY_SLOTS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]
const SATURDAY_SLOTS = [8, 9, 10, 11, 12, 13]

function getSlotsByDay(date: Date): number[] {
  return date.getDay() === 6 ? SATURDAY_SLOTS : WEEKDAY_SLOTS
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'invalid_date' }, { status: 400 })
  }

  const parsedDate = new Date(`${date}T00:00:00`)
  if (Number.isNaN(parsedDate.getTime())) {
    return NextResponse.json({ error: 'invalid_date' }, { status: 400 })
  }

  if (parsedDate.getDay() === 0) {
    return NextResponse.json({ occupied_hours: [], occupied_exact_hours: [] })
  }

  try {
    const candidateHours = getSlotsByDay(parsedDate)
    const windows = await getScheduledWindowsForDate(date)
    const occupiedHours = getOccupiedHoursForDate(date, candidateHours, windows, 60)
    const occupiedExactHours = windows.map((window) => window.startsAt.getHours())

    return NextResponse.json({
      occupied_hours: Array.from(new Set(occupiedHours)).sort((a, b) => a - b),
      occupied_exact_hours: Array.from(new Set(occupiedExactHours)).sort((a, b) => a - b),
    })
  } catch (error) {
    console.error('[GET /api/appointments/availability] error:', error)
    return NextResponse.json({ error: 'failed_to_load_availability' }, { status: 500 })
  }
}
