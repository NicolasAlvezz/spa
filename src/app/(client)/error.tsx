'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function ClientError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
      <p className="text-gray-500 text-sm max-w-xs leading-relaxed">
        Something went wrong. Please try refreshing the page.
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-slate-900 text-white text-sm rounded-lg"
      >
        Try again
      </button>
    </div>
  )
}
