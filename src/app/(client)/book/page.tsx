import { getTranslations } from 'next-intl/server'
import { getLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getServiceTypes } from '@/lib/supabase/queries/clients'
import { BookingSection } from '@/components/spa/BookingSection'
import { Star, MapPin, Phone, Clock, ShieldCheck, Check, Wifi, Car, CreditCard, Accessibility, PawPrint, Baby } from 'lucide-react'

export default async function BookPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [t, locale, serviceTypes] = await Promise.all([
    getTranslations('book'),
    getLocale(),
    getServiceTypes(),
  ])

  const loc = locale as 'en' | 'es'

  return (
    <div className="flex-1 pb-8">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 pt-6 pb-4 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t('title')}</h1>
        <p className="text-sm text-gray-400 mt-1">{t('subtitle')}</p>
      </div>

      {/* ── Booking calendar ───────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 max-w-2xl mx-auto">
        <BookingSection locale={loc} serviceTypes={serviceTypes} />
      </div>

      {/* ── About ──────────────────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 max-w-2xl mx-auto mt-8 space-y-6">

        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5">
          <h2 className="text-base font-bold text-gray-900 mb-3">{t('about_title')}</h2>

          <div className="flex items-center gap-2 mb-3">
            <Star size={15} className="text-amber-400 fill-amber-400 flex-shrink-0" />
            <span className="text-sm font-semibold text-gray-800">{t('about_rating')}</span>
          </div>

          <div className="space-y-2 text-sm text-gray-500">
            <div className="flex items-start gap-2">
              <MapPin size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />
              <span>{t('about_address')}</span>
            </div>
            <div className="flex items-start gap-2">
              <Clock size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />
              <span>{t('about_hours')}</span>
            </div>
            <div className="flex items-start gap-2">
              <Phone size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />
              <span>{t('about_phone')}</span>
            </div>
          </div>
        </section>

        {/* ── Health & Safety ──────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck size={16} className="text-green-500 flex-shrink-0" />
            <h2 className="text-base font-bold text-gray-900">{t('health_title')}</h2>
          </div>

          <ul className="space-y-2">
            {[
              t('health_masks'),
              t('health_gloves'),
              t('health_surfaces'),
              t('health_between_clients'),
            ].map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                <Check size={13} className="text-green-500 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* ── Amenities ────────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5">
          <h2 className="text-base font-bold text-gray-900 mb-4">{t('amenities_title')}</h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { icon: Car,           label: t('amenity_parking')    },
              { icon: Wifi,          label: t('amenity_wifi')        },
              { icon: CreditCard,    label: t('amenity_cards')       },
              { icon: Accessibility, label: t('amenity_accessible')  },
              { icon: PawPrint,      label: t('amenity_pets')        },
              { icon: Baby,          label: t('amenity_children')    },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-sm text-gray-600">
                <Icon size={14} className="text-brand-500 flex-shrink-0" />
                {label}
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  )
}
