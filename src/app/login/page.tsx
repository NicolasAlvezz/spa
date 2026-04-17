'use client'

import { useTranslations } from 'next-intl'
import { useTransition, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { login } from './actions'
import { LanguageToggle } from '@/components/spa/LanguageToggle'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col">

      {/* Language toggle */}
      <div className="flex justify-end p-5">
        <LanguageToggle />
      </div>

      {/* Centered content */}
      <div className="flex-1 flex items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm">

          {/* Brand */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-amber-500/15 border border-amber-500/25 mb-4 sm:mb-5">
              <span className="text-amber-400 text-xl sm:text-2xl font-bold">VM</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              VM Integral Massage
            </h1>
            <p className="text-slate-400 text-sm mt-1.5">Kissimmee, Florida</p>
          </div>

          {/* Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-5">

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300 text-sm font-medium">
                  {t('email')}
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={isPending}
                  placeholder="admin@vmintegralmassage.com"
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500 focus:ring-amber-500/20 h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300 text-sm font-medium">
                  {t('password')}
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  disabled={isPending}
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500 focus:ring-amber-500/20 h-11"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2.5 text-sm text-red-400 bg-red-950/40 border border-red-800/50 rounded-lg px-3.5 py-3">
                  <span className="leading-5">{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white font-semibold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              >
                {isPending && <Loader2 size={16} className="animate-spin" />}
                {isPending ? t('logging_in') : t('login')}
              </button>
            </form>
          </div>

          <p className="text-center text-slate-600 text-xs mt-6">
            VM Integral Massage Inc. &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  )
}
