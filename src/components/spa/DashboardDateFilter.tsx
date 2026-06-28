'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Calendar } from 'lucide-react'

interface Props {
  from: string
  to: string
  defaultFrom: string
  defaultTo: string
}

export function DashboardDateFilter({ from, to, defaultFrom, defaultTo }: Props) {
  const router = useRouter()
  const pathname = usePathname()

  function update(key: 'from' | 'to', value: string) {
    const params = new URLSearchParams()
    const newFrom = key === 'from' ? value : from
    const newTo   = key === 'to'   ? value : to

    if (newFrom !== defaultFrom || newTo !== defaultTo) {
      params.set('from', newFrom)
      params.set('to', newTo)
      router.push(`${pathname}?${params.toString()}`)
    } else {
      router.push(pathname)
    }
  }

  const isCustom = from !== defaultFrom || to !== defaultTo

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Calendar size={14} className="text-gray-400 flex-shrink-0" />
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={from}
          max={to}
          onChange={(e) => update('from', e.target.value)}
          className="h-8 px-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-shadow"
        />
        <span className="text-gray-400 text-sm">—</span>
        <input
          type="date"
          value={to}
          min={from}
          onChange={(e) => update('to', e.target.value)}
          className="h-8 px-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-shadow"
        />
      </div>
      {isCustom && (
        <button
          onClick={() => router.push(pathname)}
          className="h-8 px-2.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
        >
          This month
        </button>
      )}
    </div>
  )
}
