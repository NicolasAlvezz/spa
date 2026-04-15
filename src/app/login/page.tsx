'use client'

import { useTranslations } from 'next-intl'
import { useTransition, useState } from 'react'
import { login } from './actions'
import { LanguageToggle } from '@/components/spa/LanguageToggle'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const t = useTranslations('auth')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await login(formData)
      if (result?.error) setError(t(result.error as Parameters<typeof t>[0]))
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Language toggle */}
      <div className="flex justify-end p-4">
        <LanguageToggle />
      </div>

      {/* Login card */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          {/* Brand */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-100 mb-4">
              <span className="text-2xl">💆</span>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">VM Integral Massage</h1>
            <p className="text-sm text-gray-500 mt-1">Kissimmee, Florida</p>
          </div>

          {/* Form */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">{t('email')}</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={isPending}
                  placeholder="you@example.com"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">{t('password')}</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  disabled={isPending}
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-white" disabled={isPending}>
                {isPending ? t('logging_in') : t('login')}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
