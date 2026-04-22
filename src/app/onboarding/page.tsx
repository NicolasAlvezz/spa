'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { CheckCircle2 } from 'lucide-react'

type FormState = {
  date_of_birth: string
  under_medical_treatment: boolean
  medical_treatment_details: string
  known_allergies: boolean
  allergies_details: string
  chronic_conditions: boolean
  chronic_conditions_details: string
  taking_medications: boolean
  medications_details: string
  is_pregnant: boolean
  surgeries_last_12_months: boolean
  surgery_details: string
  had_post_surgical_massage_before: boolean
  post_surgical_details: string
  existing_conditions: string
  other_health_concerns: string
  contract_accepted: boolean
}

const initialState: FormState = {
  date_of_birth: '',
  under_medical_treatment: false,
  medical_treatment_details: '',
  known_allergies: false,
  allergies_details: '',
  chronic_conditions: false,
  chronic_conditions_details: '',
  taking_medications: false,
  medications_details: '',
  is_pregnant: false,
  surgeries_last_12_months: false,
  surgery_details: '',
  had_post_surgical_massage_before: false,
  post_surgical_details: '',
  existing_conditions: '',
  other_health_concerns: '',
  contract_accepted: false,
}

export default function OnboardingPage() {
  const t = useTranslations('onboarding')
  const router = useRouter()
  const [form, setForm] = useState<FormState>(initialState)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.date_of_birth) {
      setError(t('error_dob'))
      return
    }
    if (!form.contract_accepted) {
      setError(t('error_contract'))
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/health-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const body = await res.json()
        if (body.error === 'contract_not_accepted') {
          setError(t('error_contract'))
        } else {
          setError(t('error_generic'))
        }
        return
      }

      setDone(true)
      setTimeout(() => router.push('/my-qr'), 1800)
    } catch {
      setError(t('error_generic'))
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="w-full max-w-xl flex flex-col items-center gap-4 py-16 text-center">
        <CheckCircle2 size={52} className="text-green-500" />
        <h2 className="text-2xl font-bold text-gray-800">{t('submit')}</h2>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('subtitle')}</p>
      </div>

      {/* Personal */}
      <Section label={t('section_personal')}>
        <Field label={t('dob')}>
          <input
            type="date"
            value={form.date_of_birth}
            onChange={e => setField('date_of_birth', e.target.value)}
            className="input"
          />
        </Field>
      </Section>

      {/* Health history */}
      <Section label={t('section_health')}>
        <YesNoField
          label={t('under_medical_treatment')}
          value={form.under_medical_treatment}
          onChange={v => setField('under_medical_treatment', v)}
          t={t}
        />
        {form.under_medical_treatment && (
          <DetailsField
            label={t('medical_treatment_details')}
            value={form.medical_treatment_details}
            onChange={v => setField('medical_treatment_details', v)}
          />
        )}

        <YesNoField
          label={t('known_allergies')}
          value={form.known_allergies}
          onChange={v => setField('known_allergies', v)}
          t={t}
        />
        {form.known_allergies && (
          <DetailsField
            label={t('allergies_details')}
            value={form.allergies_details}
            onChange={v => setField('allergies_details', v)}
          />
        )}

        <YesNoField
          label={t('chronic_conditions')}
          value={form.chronic_conditions}
          onChange={v => setField('chronic_conditions', v)}
          t={t}
        />
        {form.chronic_conditions && (
          <DetailsField
            label={t('chronic_conditions_details')}
            value={form.chronic_conditions_details}
            onChange={v => setField('chronic_conditions_details', v)}
          />
        )}

        <YesNoField
          label={t('taking_medications')}
          value={form.taking_medications}
          onChange={v => setField('taking_medications', v)}
          t={t}
        />
        {form.taking_medications && (
          <DetailsField
            label={t('medications_details')}
            value={form.medications_details}
            onChange={v => setField('medications_details', v)}
          />
        )}

        <YesNoField
          label={t('is_pregnant')}
          value={form.is_pregnant}
          onChange={v => setField('is_pregnant', v)}
          t={t}
        />

        <YesNoField
          label={t('surgeries_last_12_months')}
          value={form.surgeries_last_12_months}
          onChange={v => setField('surgeries_last_12_months', v)}
          t={t}
        />
        {form.surgeries_last_12_months && (
          <>
            <DetailsField
              label={t('surgery_details')}
              value={form.surgery_details}
              onChange={v => setField('surgery_details', v)}
            />
            <YesNoField
              label={t('had_post_surgical_massage_before')}
              value={form.had_post_surgical_massage_before}
              onChange={v => setField('had_post_surgical_massage_before', v)}
              t={t}
            />
            {form.had_post_surgical_massage_before && (
              <DetailsField
                label={t('post_surgical_details')}
                value={form.post_surgical_details}
                onChange={v => setField('post_surgical_details', v)}
              />
            )}
          </>
        )}

        <Field label={t('existing_conditions')}>
          <textarea
            value={form.existing_conditions}
            onChange={e => setField('existing_conditions', e.target.value)}
            placeholder={t('existing_conditions_placeholder')}
            rows={3}
            className="input resize-none"
          />
        </Field>

        <Field label={t('other_health_concerns')}>
          <textarea
            value={form.other_health_concerns}
            onChange={e => setField('other_health_concerns', e.target.value)}
            rows={2}
            className="input resize-none"
          />
        </Field>
      </Section>

      {/* Contract */}
      <Section label={t('section_contract')}>
        <div className="bg-gray-100 rounded-xl p-4 text-sm text-gray-600 leading-relaxed">
          {t('contract_text')}
        </div>
        <label className="flex items-start gap-3 cursor-pointer mt-2">
          <input
            type="checkbox"
            checked={form.contract_accepted}
            onChange={e => setField('contract_accepted', e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-amber-500 focus:ring-amber-400"
          />
          <span className="text-sm text-gray-700 font-medium">{t('contract_checkbox')}</span>
        </label>
      </Section>

      {error && (
        <p className="text-red-600 text-sm font-medium bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full h-14 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-60 text-white text-lg font-bold transition-colors shadow-lg shadow-amber-900/20"
      >
        {submitting ? t('submitting') : t('submit')}
      </button>
    </form>
  )
}

// ——— Sub-components ———

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-5">
      <legend className="text-base font-semibold text-gray-800 border-b border-gray-200 pb-2 w-full">
        {label}
      </legend>
      {children}
    </fieldset>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  )
}

function YesNoField({
  label,
  value,
  onChange,
  t,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
  t: ReturnType<typeof useTranslations<'onboarding'>>
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`flex-1 h-10 rounded-lg border text-sm font-medium transition-colors ${
            value
              ? 'bg-amber-500 border-amber-500 text-white'
              : 'bg-white border-gray-300 text-gray-700 hover:border-amber-400'
          }`}
        >
          {t('yes')}
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`flex-1 h-10 rounded-lg border text-sm font-medium transition-colors ${
            !value
              ? 'bg-slate-700 border-slate-700 text-white'
              : 'bg-white border-gray-300 text-gray-700 hover:border-slate-400'
          }`}
        >
          {t('no')}
        </button>
      </div>
    </div>
  )
}

function DetailsField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-1.5 pl-2 border-l-2 border-amber-300">
      <label className="text-sm text-gray-600">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="input"
      />
    </div>
  )
}
