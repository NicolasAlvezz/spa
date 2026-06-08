import { format } from 'date-fns'
import { enUS, es } from 'date-fns/locale'
import { sendWhatsAppMessage } from '@/lib/twilio'

const BUSINESS_NAME = 'VM Integral Massage'

export type NotificationLocale = 'en' | 'es'

// Accepts an ISO 8601 date string or a Date and returns a human-friendly
// rendering in the requested locale (e.g. "Tuesday, June 9, 2026 at 10:30 AM").
function formatAppointmentDate(
  date: string | Date,
  locale: NotificationLocale,
): string {
  const parsed = typeof date === 'string' ? new Date(date) : date
  if (Number.isNaN(parsed.getTime())) {
    return typeof date === 'string' ? date : parsed.toISOString()
  }
  const pattern =
    locale === 'es' ? "EEEE d 'de' MMMM, h:mm a" : 'EEEE, MMMM d, h:mm a'
  return format(parsed, pattern, { locale: locale === 'es' ? es : enUS })
}

export interface BookingConfirmationInput {
  phone: string
  clientName: string
  date: string | Date
  locale?: NotificationLocale
}

export async function sendBookingConfirmation({
  phone,
  clientName,
  date,
  locale = 'es',
}: BookingConfirmationInput): Promise<void> {
  const when = formatAppointmentDate(date, locale)

  const body =
    locale === 'es'
      ? `Hola ${clientName}, tu turno en ${BUSINESS_NAME} está confirmado para el ${when}. ¡Te esperamos!`
      : `Hi ${clientName}, your appointment at ${BUSINESS_NAME} is confirmed for ${when}. See you soon!`

  await sendWhatsAppMessage(phone, body)
}
