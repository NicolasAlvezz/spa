'use client'

import { useState, useTransition } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Loader2, User, Heart, CreditCard, FileText } from 'lucide-react'
import { createClientAction, type CreateClientState } from '@/app/(admin)/admin/clients/actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Database } from '@/types/database'

type Plan = Database['public']['Tables']['membership_plans']['Row']

interface Props {
  plans: Plan[]
}

const HOW_HEARD_VALUES = [
  'instagram', 'referral', 'google', 'facebook', 'flyer', 'walk_in', 'other',
] as const

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-gray-100">
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-50">
        <Icon size={15} className="text-amber-600" />
      </div>
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{title}</h2>
    </div>
  )
}

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

  const inputClass = "h-10 bg-white border-gray-200 focus:border-amber-400 focus:ring-amber-100 text-gray-900"
  const selectClass = "w-full h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-shadow text-gray-900 disabled:opacity-60"

  return (
    <form action={handleAction} className="space-y-6 max-w-2xl">

      {/* ── Personal info ─────────────────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <SectionHeader icon={User} title={tAuth('personal_info')} />

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="first_name" className="text-gray-700 font-medium">
                {t('first_name')} <span className="text-red-400">*</span>
              </Label>
              <Input id="first_name" name="first_name" required minLength={2} disabled={isPending} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="last_name" className="text-gray-700 font-medium">
                {t('last_name')} <span className="text-red-400">*</span>
              </Label>
              <Input id="last_name" name="last_name" required minLength={2} disabled={isPending} className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-gray-700 font-medium">
                {t('phone')} <span className="text-red-400">*</span>
              </Label>
              <Input
                id="phone" name="phone" type="tel" required
                placeholder="(407) 000-0000" disabled={isPending} className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-gray-700 font-medium text-gray-500">
                {t('email')}
              </Label>
              <Input id="email" name="email" type="email" disabled={isPending} className={inputClass} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address" className="text-gray-700 font-medium">
              {t('address')} <span className="text-red-400">*</span>
            </Label>
            <Input id="address" name="address" required minLength={5} disabled={isPending} className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="how_did_you_hear" className="text-gray-700 font-medium">
                {t('how_heard')}
              </Label>
              <select id="how_did_you_hear" name="how_did_you_hear" disabled={isPending} className={selectClass}>
                <option value="">—</option>
                {HOW_HEARD_VALUES.map((v) => (
                  <option key={v} value={v}>{t(`how_heard_options.${v}`)}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="first_visit_date" className="text-gray-700 font-medium">
                {t('first_visit')}
              </Label>
              <Input id="first_visit_date" name="first_visit_date" type="date" disabled={isPending} className={inputClass} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="preferred_language" className="text-gray-700 font-medium">
              {tAuth('preferred_language')}
            </Label>
            <select
              id="preferred_language" name="preferred_language"
              defaultValue="en" disabled={isPending} className={`${selectClass} w-auto`}
            >
              <option value="en">{tAuth('lang_en')}</option>
              <option value="es">{tAuth('lang_es')}</option>
            </select>
          </div>
        </div>
      </section>

      {/* ── Healthcare ─────────────────────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <SectionHeader icon={Heart} title="Healthcare" />

        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              name="is_healthcare_worker"
              checked={isHealthcare}
              onChange={(e) => setIsHealthcare(e.target.checked)}
              disabled={isPending}
              className="w-4 h-4 rounded border-gray-300 accent-amber-500"
            />
            <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
              {t('is_healthcare')}
            </span>
          </label>

          {isHealthcare && (
            <label className="flex items-center gap-3 cursor-pointer group pl-7">
              <input
                type="checkbox"
                name="work_id_verified"
                disabled={isPending}
                className="w-4 h-4 rounded border-gray-300 accent-amber-500"
              />
              <span className="text-sm text-gray-600 group-hover:text-gray-800 transition-colors">
                {t('id_verified')}
              </span>
            </label>
          )}
        </div>
      </section>

      {/* ── Membership (optional) ───────────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <SectionHeader icon={CreditCard} title={tAuth('membership_optional')} />

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="plan_id" className="text-gray-700 font-medium">
              {tAuth('add_membership')}
            </Label>
            <select
              id="plan_id" name="plan_id"
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              disabled={isPending} className={selectClass}
            >
              <option value="">
                — {locale === 'es' ? 'Sin membresía por ahora' : 'No membership yet'} —
              </option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {locale === 'es' ? p.name_es : p.name_en} — USD {p.price_usd}/{locale === 'es' ? 'mes' : 'mo'}
                </option>
              ))}
            </select>
          </div>

          {selectedPlanId && (
            <div className="grid grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="payment_method" className="text-gray-700 font-medium">
                  {tPay('method')}
                </Label>
                <select id="payment_method" name="payment_method" required disabled={isPending} className={selectClass}>
                  <option value="cash">{tPay('method_cash')}</option>
                  <option value="debit">{tPay('method_debit')}</option>
                  <option value="credit">{tPay('method_credit')}</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="payment_amount" className="text-gray-700 font-medium">
                  {tPay('amount')}
                </Label>
                <Input
                  id="payment_amount" name="payment_amount"
                  type="number" min="0" step="0.01"
                  defaultValue={selectedPlan?.price_usd ?? ''}
                  required disabled={isPending} className={inputClass}
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Notes ──────────────────────────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <SectionHeader icon={FileText} title={t('notes')} />
        <textarea
          name="notes"
          rows={3}
          disabled={isPending}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-shadow resize-none text-gray-900 placeholder:text-gray-400 disabled:opacity-60"
          placeholder={locale === 'es' ? 'Notas internas...' : 'Internal notes...'}
        />
      </section>

      {/* ── Error ──────────────────────────────────────────────────────── */}
      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
          {tAuth(state.error as Parameters<typeof tAuth>[0])}
        </p>
      )}

      {/* ── Submit ─────────────────────────────────────────────────────── */}
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white font-semibold text-sm transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isPending && <Loader2 size={16} className="animate-spin" />}
        {isPending ? tAuth('saving') : tAuth('save')}
      </button>
    </form>
  )
}
