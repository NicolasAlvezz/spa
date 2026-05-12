// Build E.164 from a local phone number + country prefix (e.g. "598" + "98352367" → "+59898352367")
export function buildE164(localPhone: string, prefix: string): string {
  const digits = localPhone.replace(/\D/g, '')
  return `+${prefix}${digits}`
}

export function phoneToAuthEmail(e164: string): string {
  return `${e164}@vmintegralmassage.com`
}
