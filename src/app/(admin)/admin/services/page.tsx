import { getAllServiceTypes, getAllMembershipPlans } from '@/lib/supabase/queries/clients'
import { ServicesClient } from './ServicesClient'
import { PlansClient } from './PlansClient'

export default async function ServicesPage() {
  const [services, plans] = await Promise.all([
    getAllServiceTypes(),
    getAllMembershipPlans(),
  ])

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl space-y-12">
      <ServicesClient initialServices={services} />
      <PlansClient initialPlans={plans} />
    </div>
  )
}
