'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export default function SetPasswordPage() {
  const t = useTranslations('setpassword')
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError(t('error_short'))
      return
    }
    if (password !== confirm) {
      setError(t('error_mismatch'))
      return
    }

    setSubmitting(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        setError(t('error_generic'))
        return
      }
      // Check if onboarding is needed
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!client) {
        router.push('/my-qr')
        return
      }

      const { data: healthForm } = await supabase
        .from('client_health_forms')
        .select('id')
        .eq('client_id', client.id)
        .maybeSingle()

      router.push(healthForm ? '/my-qr' : '/onboarding')
    } catch {
      setError(t('error_generic'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-sm flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">{t('password')}</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="input"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">{t('confirm')}</label>
          <input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
            className="input"
          />
        </div>

        {error && (
          <p className="text-red-600 text-sm font-medium bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full h-12 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-60 text-white text-base font-bold transition-colors shadow-lg shadow-amber-900/20 mt-2"
        >
          {submitting ? t('submitting') : t('submit')}
        </button>
      </form>
    </div>
  )
}
