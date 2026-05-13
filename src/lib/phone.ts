// Build E.164 from a local phone number + country prefix (e.g. "598" + "98352367" → "+59898352367")
export function buildE164(localPhone: string, prefix: string): string {
  const digits = localPhone.replace(/\D/g, '')
  return `+${prefix}${digits}`
}

export function phoneToAuthEmail(e164: string): string {
  return `${e164}@vmintegralmassage.com`
}

const KNOWN_PREFIXES = ['506', '503', '502', '505', '507', '593', '591', '595', '598', '54', '55', '56', '57', '52', '53', '51', '58', '1']

export function parseE164(e164: string): { prefix: string; local: string } | null {
  if (!e164.startsWith('+')) return null
  const digits = e164.slice(1)
  const sorted = [...KNOWN_PREFIXES].sort((a, b) => b.length - a.length)
  for (const code of sorted) {
    if (digits.startsWith(code)) {
      return { prefix: code, local: digits.slice(code.length) }
    }
  }
  return null
}
