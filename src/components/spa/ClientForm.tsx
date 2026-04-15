'use client'

import { useState, useTransition } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { createClientAction, type CreateClientState } from '@/app/(admin)/admin/clients/actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import type { Database } from '@/types/database'

type Plan = Database['public']['Tables']['membership_plans']['Row']

interface Props {
  plans: Plan[]
}

const HOW_HEARD_VALUES = [
  'instagram', 'referral', 'google', 'facebook', 'flyer', 'walk_in', 'other',
] as const

export function ClientForm({ plans }: Props) {
  const t = useTranslations('client')
  const tAuth = useTranslations('clients')
  const tPay = useTranslations('payment')
  const locale = useLocale() as 'en' | 'es'

  const [isPending, startTransition] = useTransition()
  const [state, setState] = useState<CreateClientState>(undefined)

  const [isHealthcare, setIsHealthcare] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState('')

  const selectedPlan = plans.find((p) => p.id === selectedPlanId)

  function handleAction(formData: FormData) {
    setState(undefined)
    startTransition(async () => {
      const result = await createClientAction(undefined, formData)
      setState(result)
    })
  }

  return (
    <form action={handleAction} className="space-y-8 max-w-2xl">
      {/* ── Required fields ─────────────────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          {tAuth('personal_info')}
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="first_name">{t('first_name')} *</Label>
            <Input id="first_name" name="first_name" required minLength={2} disabled={isPending} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="last_name">{t('last_name')} *</Label>
            <Input id="last_name" name="last_name" required minLength={2} disabled={isPending} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="phone">{t('phone')} *</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              required
              placeholder="(407) 000-0000"
              disabled={isPending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">{t('email')}</Label>
            <Input id="email" name="email" type="email" disabled={isPending} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="address">{t('address')} *</Label>
          <Input id="address" name="address" required minLength={5} disabled={isPending} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="how_did_you_hear">{t('how_heard')}</Label>
            <select
              id="how_did_you_hear"
              name="how_did_you_hear"
              disabled={isPending}
              className="w-full h-9 rounded-md border border-gray-200 bg-white px-3 text-sm outline-none focus:border-amber-400"
            >
              <option value="">—</option>
              {HOW_HEARD_VALUES.map((v) => (
                <option key={v} value={v}>
                  {t(`how_heard_options.${v}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="first_visit_date">{t('first_visit')}</Label>
            <Input
              id="first_visit_date"
              name="first_visit_date"
              type="date"
              disabled={isPending}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="preferred_language">{tAuth('preferred_language')}</Label>
          <select
            id="preferred_language"
            name="preferred_language"
            defaultValue="en"
            disabled={isPending}
            className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm outline-none focus:border-amber-400"
          >
            <option value="en">{tAuth('lang_en')}</option>
            <option value="es">{tAuth('lang_es')}</option>
          </select>
        </div>
      </section>

      {/* ── Healthcare ─────────────────────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Healthcare
        </h2>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="is_healthcare_worker"
            checked={isHealthcare}
            onChange={(e) => setIsHealthcare(e.target.checked)}
            disabled={isPending}
            className="w-4 h-4 rounded border-gray-300 accent-amber-500"
          />
          <span className="text-sm text-gray-700">{t('is_healthcare')}</span>
        </label>

        {isHealthcare && (
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="work_id_verified"
              disabled={isPending}
              className="w-4 h-4 rounded border-gray-300 accent-amber-500"
            />
            <span className="text-sm text-gray-700">{t('id_verified')}</span>
          </label>
        )}
      </section>

      {/* ── Membership (optional) ───────────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          {tAuth('membership_optional')}
        </h2>

        <div className="space-y-1.5">
          <Label htmlFor="plan_id">{tAuth('add_membership')}</Label>
          <select
            id="plan_id"
            name="plan_id"
            value={selectedPlanId}
            onChange={(e) => setSelectedPlanId(e.target.value)}
            disabled={isPending}
            className="w-full h-9 rounded-md border border-gray-200 bg-white px-3 text-sm outline-none focus:border-amber-400"
          >
            <option value="">— {locale === 'es' ? 'Sin membresía por ahora' : 'No membership yet'} —</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {locale === 'es' ? p.name_es : p.name_en} — USD {p.price_usd}/
                {locale === 'es' ? 'mes' : 'mo'}
              </option>
            ))}
          </select>
        </div>

        {selectedPlanId && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="payment_method">{tPay('method')}</Label>
              <select
                id="payment_method"
                name="payment_method"
                required
                disabled={isPending}
                className="w-full h-9 rounded-md border border-gray-200 bg-white px-3 text-sm outline-none focus:border-amber-400"
              >
                <option value="cash">{tPay('method_cash')}</option>
                <option value="debit">{tPay('method_debit')}</option>
                <option value="credit">{tPay('method_credit')}</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payment_amount">{tPay('amount')}</Label>
              <Input
                id="payment_amount"
                name="payment_amount"
                type="number"
                min="0"
                step="0.01"
                defaultValue={selectedPlan?.price_usd ?? ''}
                required
                disabled={isPending}
              />
            </div>
          </div>
        )}
      </section>

      {/* ── Notes ──────────────────────────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          {t('notes')}
        </h2>
        <textarea
          name="notes"
          rows={3}
          disabled={isPending}
          className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400 resize-none"
          placeholder={locale === 'es' ? 'Notas internas...' : 'Internal notes...'}
        />
      </section>

      {/* ── Submit ─────────────────────────────────────────────────────── */}
      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
          {tAuth(state.error as Parameters<typeof tAuth>[0])}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={isPending}
        className="bg-amber-500 hover:bg-amber-600 text-white h-10 px-6"
      >
        {isPending ? tAuth('saving') : tAuth('save')}
      </Button>
    </form>
  )
}
