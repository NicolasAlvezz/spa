import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { Outfit } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import * as Sentry from '@sentry/nextjs'
import { PORTAL_ROOT_ID } from '@/lib/portal-root'
import './globals.css'

const outfit = Outfit({ subsets: ['latin'], variable: '--font-sans' })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  interactiveWidget: 'resizes-content',
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'VM Integral Massage',
    description: 'Membership management system',
    icons: {
      icon: '/images/logo.png',
    },
    other: {
      // The app is fully bilingual via next-intl. Browser auto-translation
      // (Chrome/Google Translate) rewrites React-managed text nodes and causes
      // NotFoundError insertBefore/removeChild crashes, so we opt out of it.
      google: 'notranslate',
      ...Sentry.getTraceData(),
    },
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const messages = await getMessages()

  return (
    <html lang="en" translate="no" className={`notranslate ${outfit.variable}`}>
      <body className="notranslate bg-gray-50 text-gray-900 antialiased" translate="no">
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
        <div id={PORTAL_ROOT_ID} translate="no" className="notranslate" />
        <Analytics />
      </body>
    </html>
  )
}
