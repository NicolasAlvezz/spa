import { getAllServiceTypes } from '@/lib/supabase/queries/clients'
import { ServicesClient } from './ServicesClient'

export default async function ServicesPage() {
  const services = await getAllServiceTypes()

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl">
      <ServicesClient initialServices={services} />
    </div>
  )
}
