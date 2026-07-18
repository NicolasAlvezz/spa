import type { ErrorEvent } from '@sentry/nextjs'

function getErrorMessage(event: ErrorEvent): string {
  const value = event.exception?.values?.[0]?.value
  if (typeof value === 'string') return value
  if (typeof event.message === 'string') return event.message
  return ''
}

/** Returns false for local-dev noise and corrupted Next.js build artifacts. */
export function shouldReportErrorEvent(event: ErrorEvent): boolean {
  if (process.env.NODE_ENV !== 'production') return false

  const message = getErrorMessage(event)
  if (!message) return true

  if (
    message.includes('ENOENT') &&
    (message.includes('no such file or directory') || message.includes('.next/'))
  ) {
    return false
  }

  if (message.includes("Cannot find module './vendor-chunks/")) {
    return false
  }

  return true
}
