// Sentry tunnel route — proxies browser SDK requests to Sentry's ingest
// through our own server to bypass ad-blockers.
// This path must be excluded from auth middleware (see src/middleware.ts).
// https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/#configure-tunneling-to-avoid-ad-blockers

import { NextResponse } from 'next/server'

const SENTRY_HOST = 'sentry.io'
const SENTRY_INGEST_DOMAINS = [
  'sentry.io',
  'ingest.sentry.io',
  'ingest.us.sentry.io',
  'ingest.de.sentry.io',
]

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const envelope = await request.text()
    const pieces = envelope.split('\n')
    const header = JSON.parse(pieces[0] ?? '{}') as { dsn?: string }

    if (!header.dsn) {
      return NextResponse.json({ error: 'Invalid envelope' }, { status: 400 })
    }

    const dsn = new URL(header.dsn)
    const host = dsn.hostname

    // Validate that we're only proxying to legitimate Sentry ingest hosts
    if (!SENTRY_INGEST_DOMAINS.some((domain) => host === domain || host.endsWith(`.${SENTRY_HOST}`))) {
      return NextResponse.json({ error: 'Invalid DSN host' }, { status: 403 })
    }

    const projectId = dsn.pathname.replace('/', '')
    const sentryIngestUrl = `https://${host}/api/${projectId}/envelope/`

    const response = await fetch(sentryIngestUrl, {
      method: 'POST',
      body: envelope,
      headers: {
        'Content-Type': 'application/x-sentry-envelope',
        'X-Forwarded-For': request.headers.get('X-Forwarded-For') ?? '',
      },
    })

    return new NextResponse(null, { status: response.status })
  } catch {
    return NextResponse.json({ error: 'Tunnel error' }, { status: 500 })
  }
}
