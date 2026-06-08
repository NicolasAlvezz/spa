import { NextResponse } from 'next/server'
import twilio from 'twilio'

// Twilio signature validation depends on the raw form-encoded body and a
// reconstructed URL that matches what Twilio called, so this route must run on
// the Node.js runtime and never be cached.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMPTY_TWIML =
  '<?xml version="1.0" encoding="UTF-8"?>\n<Response></Response>'

function twimlResponse(xml: string = EMPTY_TWIML): Response {
  return new Response(xml, {
    status: 200,
    headers: { 'Content-Type': 'text/xml; charset=utf-8' },
  })
}

// Vercel/CDN proxies set `x-forwarded-*`; Twilio signs whatever public URL it
// was configured to POST to, so we rebuild it from those headers.
function reconstructPublicUrl(req: Request): string {
  const url = new URL(req.url)
  const forwardedProto = req.headers.get('x-forwarded-proto')
  const forwardedHost =
    req.headers.get('x-forwarded-host') ?? req.headers.get('host')

  if (forwardedHost) url.host = forwardedHost
  if (forwardedProto) url.protocol = `${forwardedProto}:`

  return url.toString()
}

export async function POST(req: Request) {
  const authToken = process.env.TWILIO_AUTH_TOKEN
  if (!authToken) {
    console.error('[whatsapp/incoming] missing TWILIO_AUTH_TOKEN env var')
    return NextResponse.json({ error: 'misconfigured' }, { status: 500 })
  }

  const signature = req.headers.get('x-twilio-signature')
  if (!signature) {
    console.warn('[whatsapp/incoming] missing X-Twilio-Signature header')
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const rawBody = await req.text()
  const formParams: Record<string, string> = Object.fromEntries(
    new URLSearchParams(rawBody),
  )

  const url = reconstructPublicUrl(req)
  const isValid = twilio.validateRequest(authToken, signature, url, formParams)

  if (!isValid) {
    console.warn('[whatsapp/incoming] invalid Twilio signature', { url })
    return NextResponse.json({ error: 'invalid_signature' }, { status: 403 })
  }

  const {
    MessageSid,
    From,
    To,
    Body,
    ProfileName,
    NumMedia,
    WaId,
  } = formParams

  console.log('[whatsapp/incoming] message received', {
    sid: MessageSid,
    from: From,
    to: To,
    waId: WaId,
    profileName: ProfileName,
    numMedia: NumMedia,
    body: Body,
  })

  // TODO: dispatch to business logic (e.g. parse commands, log to Supabase,
  // reply with TwiML, enqueue notifications, etc.)

  return twimlResponse()
}
