import twilio, { type Twilio } from 'twilio'

let cachedClient: Twilio | null = null

function getClient(): Twilio {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN

  if (!accountSid || !authToken) {
    throw new Error(
      '[twilio] TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set'
    )
  }

  if (!cachedClient) {
    cachedClient = twilio(accountSid, authToken)
  }

  return cachedClient
}

// Normalizes a destination phone into the `whatsapp:+E164` form Twilio expects.
// Accepted inputs: "+14073884928", "whatsapp:+14073884928", "14073884928".
function normalizeWhatsAppNumber(to: string): string {
  const trimmed = to.trim()
  if (trimmed.startsWith('whatsapp:')) return trimmed
  if (trimmed.startsWith('+')) return `whatsapp:${trimmed}`
  const digits = trimmed.replace(/\D/g, '')
  if (!digits) throw new Error(`[twilio] invalid destination phone: "${to}"`)
  return `whatsapp:+${digits}`
}

export interface SendWhatsAppResult {
  sid: string
  to: string
  status: string
}

export async function sendWhatsAppMessage(
  to: string,
  body: string
): Promise<SendWhatsAppResult> {
  const from = process.env.TWILIO_WHATSAPP_FROM
  if (!from) {
    throw new Error('[twilio] TWILIO_WHATSAPP_FROM must be set')
  }
  if (!body || !body.trim()) {
    throw new Error('[twilio] message body cannot be empty')
  }

  const destination = normalizeWhatsAppNumber(to)

  try {
    const client = getClient()
    const message = await client.messages.create({
      from,
      to: destination,
      body,
    })

    console.log('[twilio] whatsapp sent', {
      sid: message.sid,
      to: message.to,
      status: message.status,
    })

    return { sid: message.sid, to: message.to, status: message.status }
  } catch (err) {
    console.error('[twilio] whatsapp send failed', {
      to: destination,
      error: err instanceof Error ? err.message : String(err),
    })
    throw err
  }
}

/*
 * ─── WhatsApp webhook configuration ─────────────────────────────────────────
 *
 * Twilio Console → Messaging → Senders → WhatsApp → +1 555 969 4430 → Configure
 *
 *   "When a message comes in":
 *     URL:    https://vmintegralmassage.vercel.app/api/whatsapp/incoming
 *     Method: HTTP POST
 *
 * Required environment variables (in .env.local and Vercel project settings):
 *     TWILIO_ACCOUNT_SID
 *     TWILIO_AUTH_TOKEN
 *     TWILIO_WHATSAPP_FROM=whatsapp:+15559694430
 *
 * Destination numbers passed to sendWhatsAppMessage() may be any of:
 *     "+14073884928"            ← E.164
 *     "whatsapp:+14073884928"   ← already-prefixed
 *     "14073884928"             ← digits only
 * The helper always normalizes them to "whatsapp:+E164" before sending.
 *
 * Note: outside the Twilio sandbox, the destination must have opted in to
 * receive messages from your number, or the message must use an approved
 * WhatsApp message template.
 * ────────────────────────────────────────────────────────────────────────────
 */
