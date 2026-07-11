/** Stable portal mount that stays outside browser translation mutations. */
export const PORTAL_ROOT_ID = 'app-portal-root'

export function getPortalContainer(): HTMLElement | undefined {
  if (typeof document === 'undefined') return undefined
  return document.getElementById(PORTAL_ROOT_ID) ?? document.body
}
