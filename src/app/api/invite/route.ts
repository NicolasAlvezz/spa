import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import twilio from 'twilio'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.app_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { phone, channel } = await request.json() as {
    phone: string
    channel: 'sms' | 'whatsapp'
  }

  if (!phone || !channel) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://vmintegralmassage.com'
  const body = `Hola! 💆‍♀️ VM Integral Massage te invita a completar tu registro y acceder a tu perfil personal: ${appUrl}/setup`

  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  )

  const from =
    channel === 'whatsapp'
      ? process.env.TWILIO_WHATSAPP_FROM
      : process.env.TWILIO_SMS_FROM

  const to = channel === 'whatsapp' ? `whatsapp:${phone}` : phone

  await client.messages.create({ from, to, body })

  return NextResponse.json({ ok: true })
}
