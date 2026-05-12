'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useTransition, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { loginWithNameAndPhone } from './actions'
import { LanguageToggle } from '@/components/spa/LanguageToggle'
import { PhoneInput } from '@/components/spa/PhoneInput'
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
      const result = await loginWithNameAndPhone(formData)
      if (result?.error) setError(t(result.error as Parameters<typeof t>[0]))
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col">

      <div className="flex justify-end p-5">
        <LanguageToggle />
      </div>

      <main className="flex-1 flex items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm">

          <div className="text-center mb-10">
            <Image
              src="/images/logo.png"
              alt="VM Integral Massage"
              width={160}
              height={160}
              priority
              className="w-32 h-32 sm:w-40 sm:h-40 mx-auto mb-4 drop-shadow-2xl"
            />
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              VM Integral Massage
            </h1>
            <p className="text-slate-400 text-sm mt-1.5">Kissimmee, Florida</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-5">

              <div className="space-y-2">
                <Label htmlFor="first_name" className="text-slate-300 text-sm font-medium">
                  {t('first_name')}
                </Label>
                <Input
                  id="first_name"
                  name="first_name"
                  type="text"
                  autoComplete="given-name"
                  required
                  disabled={isPending}
                  placeholder="Maria"
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-brand-500 focus:ring-brand-500/20 h-11"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300 text-sm font-medium">
                  {t('phone')}
                </Label>
                <PhoneInput variant="dark" disabled={isPending} />
              </div>

              {error && (
                <div className="flex items-start gap-2.5 text-sm text-red-400 bg-red-950/40 border border-red-800/50 rounded-lg px-3.5 py-3">
                  <span className="leading-5">{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="w-full h-11 rounded-xl bg-brand-700 hover:bg-brand-600 active:bg-brand-800 text-white font-semibold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              >
                {isPending && <Loader2 size={16} className="animate-spin" />}
                {isPending ? t('logging_in') : t('login')}
              </button>
            </form>
          </div>

          <p className="text-center mt-6">
            <Link
              href="/admin/login"
              className="text-slate-600 hover:text-slate-400 text-xs transition-colors"
            >
              {t('staff_login')} →
            </Link>
          </p>

          <p className="text-center text-slate-700 text-xs mt-2">
            VM Integral Massage Inc. &copy; {new Date().getFullYear()}
          </p>
        </div>
      </main>
    </div>
  )
}
