'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export default function AuthConfirmPage() {
  const router = useRouter()
  const [error, setError] = useState(false)

  useEffect(() => {
    const supabase = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    // The browser client automatically processes the #access_token fragment.
    // We listen for SIGNED_IN to know when the session is ready.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        router.replace('/set-password')
      }
    })

    // Fallback: if already signed in (page refreshed), redirect directly
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/set-password')
    })

    // If after 5 seconds there's no session, show error
    const timeout = setTimeout(() => setError(true), 5000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [router])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <p className="text-red-600 font-medium mb-3">This link has expired or is invalid.</p>
          <a href="/login" className="text-amber-600 text-sm hover:underline">Go to login</a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-500 text-sm animate-pulse">Setting up your account...</p>
    </div>
  )
}
