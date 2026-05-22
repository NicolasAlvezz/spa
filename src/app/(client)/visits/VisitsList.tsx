'use client'

import { useState } from 'react'
import { X, Clock, DollarSign, Tag, FileText, Calendar } from 'lucide-react'
import type { ClientVisitRow } from '@/lib/supabase/queries/client-portal'

const SESSION_LABELS: Record<string, { en: string; es: string }> = {
  included:      { en: 'Plan session',   es: 'Sesión del plan'  },
  rollover:      { en: 'Rollover',       es: 'Rollover'         },
  additional:    { en: 'Individual',     es: 'Individual'       },
  welcome_offer: { en: 'Welcome offer',  es: 'Bienvenida'       },
  post_op:       { en: 'Post-op',        es: 'Post-op'          },
}

const SESSION_COLORS: Record<string, string> = {
  included:      'bg-green-100 text-green-700',
  rollover:      'bg-brand-100 text-brand-700',
  additional:    'bg-gray-100 text-gray-500',
  welcome_offer: 'bg-purple-100 text-purple-700',
  post_op:       'bg-orange-100 text-orange-700',
}

interface Props {
  visits: ClientVisitRow[]
  locale: 'en' | 'es'
}

function formatDateTime(iso: string, locale: 'en' | 'es') {
  return new Date(iso).toLocaleString(locale === 'es' ? 'es-US' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDate(iso: string, locale: 'en' | 'es') {
  return new Date(iso).toLocaleDateString(locale === 'es' ? 'es-US' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatTime(iso: string, locale: 'en' | 'es') {
  return new Date(iso).toLocaleTimeString(locale === 'es' ? 'es-US' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function VisitsList({ visits, locale }: Props) {
  const [selected, setSelected] = useState<ClientVisitRow | null>(null)

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-50">
          {visits.map((v) => {
            const svc = locale === 'es' ? v.service_name_es : v.service_name_en
            const typeLabel = SESSION_LABELS[v.session_type]?.[locale] ?? v.session_type
            const typeCls = SESSION_COLORS[v.session_type] ?? 'bg-gray-100 text-gray-500'
            const showBadge = v.session_type !== 'additional'

            return (
              <button
                key={v.id}
                onClick={() => setSelected(v)}
                className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {svc ?? (locale === 'es' ? 'Visita' : 'Visit')}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDateTime(v.visited_at, locale)}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {showBadge && (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${typeCls}`}>
                      {typeLabel}
                    </span>
                  )}
                  {v.service_duration_minutes && (
                    <span className="text-[10px] text-gray-400">{v.service_duration_minutes} min</span>
                  )}
                  <span className="text-gray-300 text-xs">›</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Detail modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          onClick={() => setSelected(null)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl px-5 py-6 space-y-4 max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {(locale === 'es' ? selected.service_name_es : selected.service_name_en) ?? (locale === 'es' ? 'Visita' : 'Visit')}
                </h2>
                <p className="text-sm text-gray-400 mt-0.5">
                  {SESSION_LABELS[selected.session_type]?.[locale] ?? selected.session_type}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <X size={14} className="text-gray-500" />
              </button>
            </div>

            <div className="h-px bg-gray-100" />

            {/* Details */}
            <div className="space-y-3">
              <DetailRow icon={Calendar} label={locale === 'es' ? 'Fecha' : 'Date'} value={formatDate(selected.visited_at, locale)} />
              <DetailRow icon={Clock} label={locale === 'es' ? 'Hora' : 'Time'} value={formatTime(selected.visited_at, locale)} />
              {selected.service_duration_minutes && (
                <DetailRow icon={Clock} label={locale === 'es' ? 'Duración' : 'Duration'} value={`${selected.service_duration_minutes} min`} />
              )}
              {selected.service_price_usd !== null && (
                <DetailRow icon={DollarSign} label={locale === 'es' ? 'Precio' : 'Price'} value={`$${selected.service_price_usd}`} />
              )}
              <DetailRow
                icon={Tag}
                label={locale === 'es' ? 'Tipo' : 'Type'}
                value={selected.has_membership
                  ? (locale === 'es' ? 'Incluida en plan' : 'Included in plan')
                  : (locale === 'es' ? 'Visita individual' : 'Individual visit')}
              />
              {selected.notes && (
                <DetailRow icon={FileText} label={locale === 'es' ? 'Notas' : 'Notes'} value={selected.notes} />
              )}
            </div>

            <button
              onClick={() => setSelected(null)}
              className="w-full h-11 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium transition-colors mt-2"
            >
              {locale === 'es' ? 'Cerrar' : 'Close'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function DetailRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-gray-50">
        <Icon size={13} className="text-gray-400" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 uppercase tracking-wide leading-none mb-0.5">{label}</p>
        <p className="text-sm font-medium text-gray-800">{value}</p>
      </div>
    </div>
  )
}
