'use client'

import { useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { toggleServiceTypeAction } from './actions'
import type { ServiceTypeAdminItem } from '@/lib/supabase/queries/clients'

interface Props {
  service: ServiceTypeAdminItem
}

export function ServiceTypeRow({ service }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    startTransition(async () => {
      await toggleServiceTypeAction(service.id, !service.is_active)
    })
  }

  return (
    <div className="flex items-center gap-4 px-5 py-4">
      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-900">{service.name_en}</p>
          <span className="text-xs text-gray-400">·</span>
          <p className="text-xs text-gray-500">{service.name_es}</p>
          {!service.is_active && (
            <span className="text-[10px] font-semibold uppercase tracking-wide bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">
              Inactive
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-0.5">
          {service.price_usd !== null && <>${service.price_usd} · </>}
          {service.duration_minutes} min
        </p>
      </div>

      {/* Toggle */}
      <button
        onClick={handleToggle}
        disabled={isPending}
        className={[
          'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
          service.is_active ? 'bg-brand-500' : 'bg-gray-200',
        ].join(' ')}
        role="switch"
        aria-checked={service.is_active}
        aria-label={service.is_active ? 'Deactivate' : 'Activate'}
      >
        {isPending ? (
          <span className="absolute inset-0 flex items-center justify-center">
            <Loader2 size={12} className="animate-spin text-white" />
          </span>
        ) : (
          <span
            className={[
              'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
              service.is_active ? 'translate-x-5' : 'translate-x-0',
            ].join(' ')}
          />
        )}
      </button>
    </div>
  )
}
