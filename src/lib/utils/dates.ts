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
