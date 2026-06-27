import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { Outfit } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import * as Sentry from '@sentry/nextjs'
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
    <html lang="en" className={outfit.variable}>
      <body className="bg-gray-50 text-gray-900 antialiased">
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  )
}
