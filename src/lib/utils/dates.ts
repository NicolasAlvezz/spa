import { format, addMonths, parseISO } from 'date-fns'
import { enUS, es } from 'date-fns/locale'

type Locale = 'en' | 'es'

const localeMap = { en: enUS, es }

/**
 * Formats a date string for display.
 * en → "April 7, 2026"
 * es → "7 de abril de 2026"
 */
export function formatDate(dateString: string, locale: Locale = 'en'): string {
  const date = parseISO(dateString)
  if (locale === 'es') {
    return format(date, "d 'de' MMMM 'de' yyyy", { locale: localeMap.es })
  }
  return format(date, 'MMMM d, yyyy', { locale: localeMap.en })
}

/**
 * Formats a datetime string for display (includes time in 24h format).
 * en → "April 7, 2026 at 14:30"
 * es → "7 de abril de 2026 a las 14:30"
 */
export function formatDateTime(dateString: string, locale: Locale = 'en'): string {
  const date = parseISO(dateString)
  if (locale === 'es') {
    return format(date, "d 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: localeMap.es })
  }
  return format(date, "MMMM d, yyyy 'at' HH:mm", { locale: localeMap.en })
}

/**
 * Returns a date string (YYYY-MM-DD) exactly 1 month after the given date.
 * Used for calculating membership expiration.
 */
export function addOneMonth(dateString: string): string {
  return format(addMonths(parseISO(dateString), 1), 'yyyy-MM-dd')
}

/**
 * Returns today's date as a YYYY-MM-DD string (local time).
 */
export function today(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

/** IANA timezone for the spa (Kissimmee, FL). */
export const SPA_TZ = 'America/New_York'

/**
 * Returns today's date as a YYYY-MM-DD string in the spa's local timezone.
 * Use this in server-side code instead of `today()` to avoid UTC-vs-ET mismatches.
 */
export function todayInSpaTz(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: SPA_TZ }).format(new Date())
}

/**
 * Returns the current UTC offset string for the spa timezone, e.g. "-04:00" (EDT) or "-05:00" (EST).
 * Handles DST automatically.
 */
export function spaTzOffset(): string {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: SPA_TZ,
    timeZoneName: 'shortOffset',
  }).formatToParts(new Date())
  const gmtStr = parts.find(p => p.type === 'timeZoneName')?.value ?? 'GMT-5'
  const match = gmtStr.match(/GMT([+-])(\d+)/)
  if (!match) return '-05:00'
  return `${match[1]}${match[2].padStart(2, '0')}:00`
}
