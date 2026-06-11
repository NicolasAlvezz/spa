'use client'

import { useTranslations } from 'next-intl'
import { User } from 'lucide-react'
import { THERAPISTS } from '@/lib/constants/therapists'

interface Props {
  value: string
  onChange: (name: string) => void
  disabled?: boolean
}

export function TherapistSelector({ value, onChange, disabled = false }: Props) {
  const t = useTranslations('scan')

  return (
    <div>
      <p className="text-slate-400 text-xs uppercase tracking-wide mb-2">{t('therapist_label')}</p>
      <div className="relative">
        <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full h-12 pl-9 pr-8 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm font-medium appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-brand-500/50"
        >
          {THERAPISTS.map((therapist) => (
            <option key={therapist.id} value={therapist.name}>
              {therapist.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
