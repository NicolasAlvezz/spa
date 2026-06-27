import createNextIntlPlugin from 'next-intl/plugin'
import { withSentryConfig } from '@sentry/nextjs'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    instrumentationHook: true,
  },
}

export default withSentryConfig(
  withNextIntl(nextConfig),
  {
    org: 'bookni',
    project: 'javascript-nextjs',
    // Suppress Sentry CLI output unless in CI
    silent: !process.env.CI,
    // Upload larger source map files for better stack traces
    widenClientFileUpload: true,
    // Remove Sentry logger statements from the client bundle
    disableLogger: true,
    // Don't set up Vercel Cron Monitors (not used in this project)
    automaticVercelMonitors: false,
  }
)
