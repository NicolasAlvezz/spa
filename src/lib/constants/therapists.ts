/**
 * Active therapists at VM Integral Massage.
 * Update this list when staff changes — used in the QR check-in dropdown.
 */
export const THERAPISTS = [
  { id: 'maria_victoria', name: 'Maria Victoria Malacre' },
] as const

export type TherapistId = (typeof THERAPISTS)[number]['id']

export const THERAPIST_NAMES = THERAPISTS.map((t) => t.name)

export function getDefaultTherapistName(): string {
  return THERAPISTS[0].name
}

export function isValidTherapistName(name: string): boolean {
  const trimmed = name.trim()
  return trimmed.length > 0 && trimmed.length <= 100 && THERAPIST_NAMES.includes(trimmed as (typeof THERAPIST_NAMES)[number])
}
