'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { useTransition, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { setupAccount } from './actions'
import { LanguageToggle } from '@/components/spa/LanguageToggle'
import { PhoneInput } from '@/components/spa/PhoneInput'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { parseE164 } from '@/lib/phone'

const ERRORS: Record<string, { en: string; es: string }> = {
  fill_all_fields: { en: 'Please fill in all fields.', es: 'Completá todos los campos.' },
  phone_not_found: { en: "We don't recognize that phone number. Contact reception.", es: 'No reconocemos ese número. Contactá con recepción.' },
  generic_error:   { en: 'Something went wrong. Please try again.', es: 'Ocurrió un error. Intentá de nuevo.' },
}

function SetupForm() {
  const t = useTranslations('auth')
  const searchParams = useSearchParams()
  const [locale] = useState<'en' | 'es'>(() =>
    typeof document !== 'undefined'
      ? ((document.cookie.match(/locale=(\w+)/)?.[1] as 'en' | 'es') ?? 'en')
      : 'en'
  )
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const rawPhone = searchParams.get('phone') ?? ''
  const parsed = rawPhone ? parseE164(rawPhone) : null

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await setupAccount(formData)
      if (result?.error) {
        setError(ERRORS[result.error]?.[locale] ?? ERRORS.generic_error[locale])
      }
    })
  }

  const label = (en: string, es: string) => locale === 'es' ? es : en

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
            <p className="text-slate-400 text-sm mt-1.5">
              {label('Complete your registration', 'Completá tu registro')}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 sm:p-8">
            <p className="text-slate-400 text-sm mb-5">
              {label(
                'Enter your name and the phone number you received this message on.',
                'Ingresá tu nombre y el número de celular al que te llegó este mensaje.'
              )}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">

              <div className="flex gap-3">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="first_name" className="text-slate-300 text-sm font-medium">
                    {label('First name', 'Nombre')}
                  </Label>
                  <Input
                    id="first_name"
                    name="first_name"
                    type="text"
                    autoComplete="given-name"
                    required
                    disabled={isPending}
                    placeholder="Maria"
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 h-11"
                  />
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="last_name" className="text-slate-300 text-sm font-medium">
                    {label('Last name', 'Apellido')}
                  </Label>
                  <Input
                    id="last_name"
                    name="last_name"
                    type="text"
                    autoComplete="family-name"
                    required
                    disabled={isPending}
                    placeholder="García"
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 h-11"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm font-medium">
                  {t('phone')}
                </Label>
                <PhoneInput
                  variant="dark"
                  disabled={isPending}
                  defaultPrefix={parsed?.prefix ?? '1'}
                  defaultLocalPhone={parsed?.local}
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
                className="w-full h-11 rounded-xl bg-brand-700 hover:bg-brand-600 active:bg-brand-800 text-white font-semibold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              >
                {isPending && <Loader2 size={16} className="animate-spin" />}
                {isPending
                  ? label('Setting up...', 'Configurando...')
                  : label('Complete registration', 'Completar registro')}
              </button>
            </form>
          </div>

          <p className="text-center text-slate-700 text-xs mt-6">
            VM Integral Massage Inc. &copy; {new Date().getFullYear()}
          </p>
        </div>
      </main>
    </div>
  )
}

export default function SetupPage() {
  return (
    <Suspense>
      <SetupForm />
    </Suspense>
  )
}
