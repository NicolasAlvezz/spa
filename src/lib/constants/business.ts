/**
 * Central source of truth for business data.
 * Used by PDFs, emails, WhatsApp templates, etc.
 *
 * NOTE: address line is a placeholder — confirm with Maria Victoria and update
 * before going to production. The rest is confirmed in CLAUDE.md / docs/business-info.md.
 */
export const BUSINESS = {
  legalName: 'VM Integral Massage Inc.',
  displayName: 'VM Integral Massage',
  address: '211 Broadway, Kissimmee, FL 34741',
  phone: '+1 407-388-4928',
  email: 'info@vmintegralmassage.com',
  website: 'https://vmintegralmassage.com',
  timezone: 'America/New_York',
} as const
