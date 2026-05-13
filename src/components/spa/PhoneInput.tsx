'use client'

import { useState } from 'react'

const COUNTRIES = [
  { code: '1',   flag: '🇺🇸', name: 'US / Canada +1' },
  { code: '54',  flag: '🇦🇷', name: 'Argentina +54' },
  { code: '591', flag: '🇧🇴', name: 'Bolivia +591' },
  { code: '55',  flag: '🇧🇷', name: 'Brasil +55' },
  { code: '56',  flag: '🇨🇱', name: 'Chile +56' },
  { code: '57',  flag: '🇨🇴', name: 'Colombia +57' },
  { code: '506', flag: '🇨🇷', name: 'Costa Rica +506' },
  { code: '53',  flag: '🇨🇺', name: 'Cuba +53' },
  { code: '593', flag: '🇪🇨', name: 'Ecuador +593' },
  { code: '503', flag: '🇸🇻', name: 'El Salvador +503' },
  { code: '502', flag: '🇬🇹', name: 'Guatemala +502' },
  { code: '504', flag: '🇭🇳', name: 'Honduras +504' },
  { code: '52',  flag: '🇲🇽', name: 'México +52' },
  { code: '505', flag: '🇳🇮', name: 'Nicaragua +505' },
  { code: '507', flag: '🇵🇦', name: 'Panamá +507' },
  { code: '595', flag: '🇵🇾', name: 'Paraguay +595' },
  { code: '51',  flag: '🇵🇪', name: 'Perú +51' },
  { code: '598', flag: '🇺🇾', name: 'Uruguay +598' },
  { code: '58',  flag: '🇻🇪', name: 'Venezuela +58' },
] as const

interface Props {
  variant: 'dark' | 'light'
  disabled?: boolean
  defaultPrefix?: string
  defaultLocalPhone?: string
}

export function PhoneInput({ variant, disabled, defaultPrefix = '1', defaultLocalPhone }: Props) {
  const [prefix, setPrefix] = useState(defaultPrefix)

  const isDark = variant === 'dark'

  const selectClass = isDark
    ? 'bg-slate-800 border border-slate-700 text-white h-11 rounded-l-lg pl-2 pr-1 text-sm focus:outline-none focus:border-brand-500'
    : 'bg-white border border-gray-300 text-gray-800 h-11 rounded-l-lg pl-2 pr-1 text-sm focus:outline-none focus:border-brand-500 border-r-0'

  const inputClass = isDark
    ? 'flex-1 bg-slate-800 border border-slate-700 border-l-0 text-white placeholder:text-slate-500 h-11 rounded-r-lg px-3 text-sm focus:outline-none focus:border-brand-500'
    : 'flex-1 border border-gray-300 border-l-0 text-gray-800 placeholder:text-gray-400 h-11 rounded-r-lg px-3 text-sm focus:outline-none focus:border-brand-500'

  return (
    <div className="flex">
      <select
        name="phone_prefix"
        value={prefix}
        onChange={e => setPrefix(e.target.value)}
        disabled={disabled}
        className={selectClass}
        aria-label="Country code"
      >
        {COUNTRIES.map(c => (
          <option key={c.code + c.name} value={c.code}>
            {c.flag} +{c.code}
          </option>
        ))}
      </select>
      <input
        name="phone_local"
        type="tel"
        required
        disabled={disabled}
        defaultValue={defaultLocalPhone}
        placeholder={prefix === '1' ? '(407) 555-0100' : '98 352 367'}
        className={inputClass}
        aria-label="Phone number"
      />
    </div>
  )
}
