'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'

type Lang = 'en' | 'es'

type FormState = {
  first_name: string
  last_name: string
  phone: string
  address: string
  preferred_language: 'en' | 'es'
  how_did_you_hear: string
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
  first_name: '',
  last_name: '',
  phone: '',
  address: '',
  preferred_language: 'en',
  how_did_you_hear: '',
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

const HOW_HEARD_OPTIONS = [
  { value: 'instagram', en: 'Instagram', es: 'Instagram' },
  { value: 'referral', en: 'Referred by a friend', es: 'Recomendación de amigo/a' },
  { value: 'google', en: 'Google', es: 'Google' },
  { value: 'facebook', en: 'Facebook', es: 'Facebook' },
  { value: 'flyer', en: 'Flyer / Poster', es: 'Volante / Cartel' },
  { value: 'walk_in', en: 'Walked in', es: 'Pasé por el lugar' },
  { value: 'other', en: 'Other', es: 'Otro' },
]

const STRINGS = {
  en: {
    title: 'Welcome to VM Integral Massage',
    subtitle: 'Please complete this form before your first session. Your information is kept strictly confidential.',
    done: 'All set! Redirecting...',
    section_personal: 'Personal Information',
    first_name: 'First name',
    last_name: 'Last name',
    phone: 'Phone / Cell',
    address: 'Address',
    preferred_language: 'Preferred language',
    lang_en: 'English',
    lang_es: 'Spanish',
    how_heard: 'How did you hear about us?',
    dob: 'Date of birth',
    section_health: 'Medical History',
    under_medical_treatment: 'Are you currently under medical treatment?',
    medical_treatment_details: 'If yes, please specify your condition and treatment',
    known_allergies: 'Do you have any known allergies?',
    allergies_details: 'If yes, please list your allergies',
    chronic_conditions: 'Do you have any chronic conditions (e.g., diabetes, hypertension, asthma)?',
    chronic_conditions_details: 'If yes, please list them',
    taking_medications: 'Are you currently taking any medications (prescription or over-the-counter)?',
    medications_details: 'If yes, please list them with dosage',
    is_pregnant: 'Are you pregnant or suspect you might be?',
    surgeries_last_12_months: 'Have you undergone any surgeries in the past 12 months?',
    surgery_details: 'If yes, please describe',
    had_post_surgical_massage_before: 'Some type of post-surgical massage was performed before contacting us?',
    post_surgical_details: 'If yes, please specify surgery type and date',
    existing_conditions: 'Do you have any of the following (fibrosis, adhesions, wounds, lymphedema, varicose veins, etc.)?',
    existing_conditions_placeholder: 'fibrosis, adhesions, wounds, lymphedema, varicose veins...',
    other_health_concerns: 'Any other health concerns or relevant medical history?',
    yes: 'Yes',
    no: 'No',
    section_contract: 'Release & Waiver',
    contract_text: 'I understand that massage therapy is not a substitute for medical treatment. I certify that I have disclosed all known medical conditions and take full responsibility for any undisclosed conditions. I release VM Integral Massage Inc., its owner, and therapists from any liability for adverse effects resulting from massage therapy. By accepting this waiver today, I acknowledge that each future QR check-in visit at the spa constitutes my continued acceptance of these terms.',
    contract_checkbox: 'I have read, understood, and accept the above release and waiver.',
    submit: 'Complete & Continue',
    submitting: 'Saving...',
    error_personal: 'Please fill in all required personal information.',
    error_dob: 'Date of birth is required.',
    error_contract: 'You must accept the release and waiver to continue.',
    error_already_registered: 'This account is already registered. Please go to your QR code page.',
    error_unauthorized: 'Your session has expired. Please close this page and use the invitation link again.',
    error_save_client: 'Could not save your profile.',
    error_save_health: 'Your profile was saved but the health form could not be saved.',
    error_generic: 'Something went wrong. Please try again.',
  },
  es: {
    title: 'Bienvenida a VM Integral Massage',
    subtitle: 'Por favor completá este formulario antes de tu primera sesión. Tu información es estrictamente confidencial.',
    done: '¡Listo! Redirigiendo...',
    section_personal: 'Información personal',
    first_name: 'Nombre',
    last_name: 'Apellido',
    phone: 'Celular',
    address: 'Dirección',
    preferred_language: 'Idioma preferido',
    lang_en: 'Inglés',
    lang_es: 'Español',
    how_heard: '¿Cómo supo de nosotros?',
    dob: 'Fecha de nacimiento',
    section_health: 'Historial médico',
    under_medical_treatment: '¿Está actualmente bajo tratamiento médico?',
    medical_treatment_details: 'Si es así, especifique su condición y tratamiento',
    known_allergies: '¿Tiene alguna alergia conocida?',
    allergies_details: 'Si es así, liste sus alergias',
    chronic_conditions: '¿Tiene alguna condición crónica? (p.ej., diabetes, hipertensión, asma)',
    chronic_conditions_details: 'Si es así, listelas',
    taking_medications: '¿Está tomando algún medicamento actualmente? (recetado o de venta libre)',
    medications_details: 'Si es así, listelos con la dosis',
    is_pregnant: '¿Está embarazada o sospecha estarlo?',
    surgeries_last_12_months: '¿Se ha sometido a alguna cirugía en los últimos 12 meses?',
    surgery_details: 'Si es así, descríbalas',
    had_post_surgical_massage_before: '¿Se realizó algún tipo de masaje post-quirúrgico antes de contactarnos?',
    post_surgical_details: 'Si es así, especifique tipo de cirugía y fecha',
    existing_conditions: '¿Presenta alguna de las siguientes condiciones (fibrosis, adherencias, heridas, linfedema, várices, etc.)?',
    existing_conditions_placeholder: 'fibrosis, adherencias, heridas, linfedema, várices...',
    other_health_concerns: '¿Otras preocupaciones de salud o historial médico relevante?',
    yes: 'Sí',
    no: 'No',
    section_contract: 'Exención de responsabilidad',
    contract_text: 'Entiendo que la terapia de masajes no reemplaza el tratamiento médico. Certifico que he revelado todas las condiciones médicas conocidas y asumo plena responsabilidad por cualquier condición no declarada. Exonero a VM Integral Massage Inc., su propietaria y terapeutas de cualquier responsabilidad por efectos adversos derivados de la terapia de masajes. Al aceptar esta exención hoy, reconozco que cada futura visita con escaneo de QR en el spa constituye mi aceptación continua de estos términos.',
    contract_checkbox: 'He leído, comprendido y acepto la exención de responsabilidad anterior.',
    submit: 'Completar y continuar',
    submitting: 'Guardando...',
    error_personal: 'Por favor completá todos los datos personales requeridos.',
    error_dob: 'La fecha de nacimiento es obligatoria.',
    error_contract: 'Debés aceptar la exención de responsabilidad para continuar.',
    error_already_registered: 'Esta cuenta ya está registrada. Por favor andá a tu página de código QR.',
    error_unauthorized: 'Tu sesión expiró. Cerrá esta página y usá el link de invitación nuevamente.',
    error_save_client: 'No se pudo guardar tu perfil.',
    error_save_health: 'Tu perfil se guardó pero no se pudo guardar el formulario de salud.',
    error_generic: 'Ocurrió un error. Intentá de nuevo.',
  },
} as const

export default function OnboardingPage() {
  const router = useRouter()
  const [lang, setLang] = useState<Lang>('en')
  const [form, setForm] = useState<FormState>(initialState)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const s = STRINGS[lang]

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function handleLangChange(newLang: Lang) {
    setLang(newLang)
    setField('preferred_language', newLang)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.first_name.trim() || !form.last_name.trim() || !form.phone.trim() || !form.address.trim()) {
      setError(s.error_personal)
      return
    }
    if (!form.date_of_birth) {
      setError(s.error_dob)
      return
    }
    if (!form.contract_accepted) {
      setError(s.error_contract)
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const body = await res.json()
        switch (body.error) {
          case 'contract_not_accepted':
            setError(s.error_contract)
            break
          case 'already_registered':
            setError(s.error_already_registered)
            break
          case 'unauthorized':
            setError(s.error_unauthorized)
            break
          case 'failed_to_create_client':
            setError(`${s.error_save_client} (${body.detail ?? body.code ?? 'unknown'})`)
            break
          case 'failed_to_save_health_form':
            setError(`${s.error_save_health} (${body.detail ?? body.code ?? 'unknown'})`)
            break
          default:
            setError(`${s.error_generic} [${body.error ?? 'unknown'}]`)
        }
        return
      }

      setDone(true)
      setTimeout(() => router.push('/my-qr'), 1800)
    } catch {
      setError(s.error_generic)
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="w-full max-w-xl flex flex-col items-center gap-4 py-16 text-center">
        <CheckCircle2 size={52} className="text-green-500" />
        <h2 className="text-2xl font-bold text-gray-800">{s.done}</h2>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{s.title}</h1>
        <p className="text-sm text-gray-500 mt-1">{s.subtitle}</p>
      </div>

      {/* Language toggle */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">Language / Idioma:</span>
        <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden text-sm font-medium">
          <button
            type="button"
            onClick={() => handleLangChange('en')}
            className={`px-4 py-2 transition-colors ${
              lang === 'en'
                ? 'bg-brand-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => handleLangChange('es')}
            className={`px-4 py-2 transition-colors border-l border-gray-200 ${
              lang === 'es'
                ? 'bg-brand-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Español
          </button>
        </div>
      </div>

      {/* Personal info */}
      <Section label={s.section_personal}>
        <div className="grid grid-cols-2 gap-3">
          <Field label={s.first_name}>
            <input
              type="text"
              value={form.first_name}
              onChange={e => setField('first_name', e.target.value)}
              required
              className="input"
            />
          </Field>
          <Field label={s.last_name}>
            <input
              type="text"
              value={form.last_name}
              onChange={e => setField('last_name', e.target.value)}
              required
              className="input"
            />
          </Field>
        </div>
        <Field label={s.phone}>
          <input
            type="tel"
            value={form.phone}
            onChange={e => setField('phone', e.target.value)}
            required
            placeholder="(407) 000-0000"
            className="input"
          />
        </Field>
        <Field label={s.address}>
          <input
            type="text"
            value={form.address}
            onChange={e => setField('address', e.target.value)}
            required
            className="input"
          />
        </Field>
        <Field label={s.preferred_language}>
          <select
            value={form.preferred_language}
            onChange={e => {
              const v = e.target.value as 'en' | 'es'
              setField('preferred_language', v)
              setLang(v)
            }}
            className="input"
          >
            <option value="en">{s.lang_en}</option>
            <option value="es">{s.lang_es}</option>
          </select>
        </Field>
        <Field label={s.how_heard}>
          <select
            value={form.how_did_you_hear}
            onChange={e => setField('how_did_you_hear', e.target.value)}
            className="input"
          >
            <option value="">—</option>
            {HOW_HEARD_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {lang === 'es' ? opt.es : opt.en}
              </option>
            ))}
          </select>
        </Field>
        <Field label={s.dob}>
          <input
            type="date"
            value={form.date_of_birth}
            onChange={e => setField('date_of_birth', e.target.value)}
            className="input"
          />
        </Field>
      </Section>

      {/* Health history */}
      <Section label={s.section_health}>
        <YesNoField label={s.under_medical_treatment} value={form.under_medical_treatment} onChange={v => setField('under_medical_treatment', v)} yes={s.yes} no={s.no} />
        {form.under_medical_treatment && (
          <DetailsField label={s.medical_treatment_details} value={form.medical_treatment_details} onChange={v => setField('medical_treatment_details', v)} />
        )}

        <YesNoField label={s.known_allergies} value={form.known_allergies} onChange={v => setField('known_allergies', v)} yes={s.yes} no={s.no} />
        {form.known_allergies && (
          <DetailsField label={s.allergies_details} value={form.allergies_details} onChange={v => setField('allergies_details', v)} />
        )}

        <YesNoField label={s.chronic_conditions} value={form.chronic_conditions} onChange={v => setField('chronic_conditions', v)} yes={s.yes} no={s.no} />
        {form.chronic_conditions && (
          <DetailsField label={s.chronic_conditions_details} value={form.chronic_conditions_details} onChange={v => setField('chronic_conditions_details', v)} />
        )}

        <YesNoField label={s.taking_medications} value={form.taking_medications} onChange={v => setField('taking_medications', v)} yes={s.yes} no={s.no} />
        {form.taking_medications && (
          <DetailsField label={s.medications_details} value={form.medications_details} onChange={v => setField('medications_details', v)} />
        )}

        <YesNoField label={s.is_pregnant} value={form.is_pregnant} onChange={v => setField('is_pregnant', v)} yes={s.yes} no={s.no} />

        <YesNoField label={s.surgeries_last_12_months} value={form.surgeries_last_12_months} onChange={v => setField('surgeries_last_12_months', v)} yes={s.yes} no={s.no} />
        {form.surgeries_last_12_months && (
          <DetailsField label={s.surgery_details} value={form.surgery_details} onChange={v => setField('surgery_details', v)} />
        )}

        <YesNoField label={s.had_post_surgical_massage_before} value={form.had_post_surgical_massage_before} onChange={v => setField('had_post_surgical_massage_before', v)} yes={s.yes} no={s.no} />
        {form.had_post_surgical_massage_before && (
          <DetailsField label={s.post_surgical_details} value={form.post_surgical_details} onChange={v => setField('post_surgical_details', v)} />
        )}

        <Field label={s.existing_conditions}>
          <textarea
            value={form.existing_conditions}
            onChange={e => setField('existing_conditions', e.target.value)}
            placeholder={s.existing_conditions_placeholder}
            rows={3}
            className="input resize-none"
          />
        </Field>

        <Field label={s.other_health_concerns}>
          <textarea
            value={form.other_health_concerns}
            onChange={e => setField('other_health_concerns', e.target.value)}
            rows={2}
            className="input resize-none"
          />
        </Field>
      </Section>

      {/* Contract */}
      <Section label={s.section_contract}>
        <div className="bg-gray-100 rounded-xl p-4 text-sm text-gray-600 leading-relaxed">
          {s.contract_text}
        </div>
        <label className="flex items-start gap-3 cursor-pointer mt-2">
          <input
            type="checkbox"
            checked={form.contract_accepted}
            onChange={e => setField('contract_accepted', e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-400"
          />
          <span className="text-sm text-gray-700 font-medium">{s.contract_checkbox}</span>
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
        className="w-full h-14 rounded-xl bg-brand-500 hover:bg-brand-400 active:bg-brand-600 disabled:opacity-60 text-white text-lg font-bold transition-colors shadow-lg shadow-brand-900/20"
      >
        {submitting ? s.submitting : s.submit}
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
  yes,
  no,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
  yes: string
  no: string
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
              ? 'bg-brand-500 border-brand-500 text-white'
              : 'bg-white border-gray-300 text-gray-700 hover:border-brand-400'
          }`}
        >
          {yes}
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
          {no}
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
    <div className="flex flex-col gap-1.5 pl-2 border-l-2 border-brand-300">
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
