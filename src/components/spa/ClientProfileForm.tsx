'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateProfileAction } from '@/app/(client)/profile/actions'
import type { ClientDetail } from '@/types'

interface Props {
  client: ClientDetail
}

export function ClientProfileForm({ client }: Props) {
  const t = useTranslations('clientprofile')
  const [isPending, startTransition] = useTransition()
  const [state, setState] = useState<string | null>(undefined as unknown as string | null)

  // undefined = untouched, null = success, string = error key
  const saved   = state === null
  const errKey  = typeof state === 'string' ? state : null

  const inputCls = 'h-10 bg-white border-gray-200 focus:border-brand-400 focus:ring-brand-100 text-gray-900'
  const selectCls = 'w-full h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-shadow text-gray-900 disabled:opacity-60'

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setState(undefined as unknown as string | null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await updateProfileAction(null, formData)
      setState(result)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Phone */}
      <div className="space-y-1.5">
        <Label htmlFor="phone" className="text-gray-700 font-medium">
          {t('phone')} <span className="text-red-400">*</span>
        </Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={client.phone}
          required
          disabled={isPending}
          className={inputCls}
        />
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-gray-700 font-medium">
          {t('email')}
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={client.email ?? ''}
          disabled={isPending}
          className={inputCls}
        />
      </div>

      {/* Language */}
      <div className="space-y-1.5">
        <Label htmlFor="preferred_language" className="text-gray-700 font-medium">
          {t('language')}
        </Label>
        <select
          id="preferred_language"
          name="preferred_language"
          defaultValue={client.preferred_language ?? 'en'}
          disabled={isPending}
          className={selectCls}
        >
          <option value="en">{t('lang_en')}</option>
          <option value="es">{t('lang_es')}</option>
        </select>
      </div>

      {/* Error */}
      {errKey && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
          {t(errKey as Parameters<typeof t>[0])}
        </p>
      )}

      {/* Success */}
      {saved && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-4 py-3">
          <CheckCircle2 size={16} />
          {t('saved')}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-brand-500 hover:bg-brand-400 active:bg-brand-600 text-white font-semibold text-sm transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isPending && <Loader2 size={16} className="animate-spin" />}
        {isPending ? t('saving') : t('save')}
      </button>
    </form>
  )
}
