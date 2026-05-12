export function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return digits.startsWith('1') ? `+${digits}` : `+1${digits}`
}

export function phoneToAuthEmail(phone: string): string {
  return `${toE164(phone)}@vmintegralmassage.com`
}
