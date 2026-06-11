/**
 * Client invite copy and WhatsApp deep link — shared by server actions and UI.
 */
export function buildRegistrationLink(e164: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://vmintegralmassage.vercel.app'
  return `${appUrl}/setup?phone=${encodeURIComponent(e164)}`
}

export function buildInviteMessage(e164: string): string {
  const registrationLink = buildRegistrationLink(e164)
  return `Hola! 💆‍♀️ VM Integral Massage te invita a completar tu registro y acceder a tu perfil personal: ${registrationLink}`
}

/** Opens WhatsApp chat with optional pre-filled message (wa.me deep link). */
export function buildWhatsAppUrl(e164: string, message?: string): string {
  const digits = e164.replace(/\D/g, '')
  const text = encodeURIComponent(message ?? buildInviteMessage(e164))
  return `https://wa.me/${digits}?text=${text}`
}
