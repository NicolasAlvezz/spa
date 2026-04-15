import { notFound } from 'next/navigation'
import { getClientById } from '@/lib/supabase/queries/clients'
import { QrPrintView } from './QrPrintView'

interface Props {
  params: { id: string }
}

export default async function QrPrintPage({ params }: Props) {
  const client = await getClientById(params.id)
  if (!client) notFound()

  return (
    <QrPrintView
      clientId={client.id}
      fullName={`${client.first_name} ${client.last_name}`}
    />
  )
}
