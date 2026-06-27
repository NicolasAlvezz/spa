import createNextIntlPlugin from 'next-intl/plugin'
import { withSentryConfig } from '@sentry/nextjs'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    instrumentationHook: true,
  },
}

export default withSentryConfig(withNextIntl(nextConfig), {
  org: "bookni",
  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // Upload a larger set of source maps for prettier stack traces
  widenClientFileUpload: true,

  // Route browser requests to Sentry through Next.js to bypass ad-blockers.
  // Keep this path excluded from auth middleware (see src/middleware.ts).
  tunnelRoute: "/monitoring",

  // Automatically instrument Vercel Cron Monitors
  automaticVercelMonitors: true,

  // Tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,
});
