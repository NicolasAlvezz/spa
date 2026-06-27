'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
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
    <html>
      <body className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <p className="text-gray-500 text-sm mb-4">
            Something went wrong. Please try again.
          </p>
          <button
            onClick={reset}
            className="px-4 py-2 bg-slate-900 text-white text-sm rounded-lg"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
