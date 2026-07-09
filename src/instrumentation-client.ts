// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://a79c485e658283b2b94d7b594f66ddac@o4511637938044928.ingest.us.sentry.io/4511637942370304",

  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
    Sentry.replayIntegration({
      // Mask all text and inputs — required for a medical/health spa (HIPAA-adjacent)
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Sample 10% of traces in production to keep costs low
  tracesSampleRate: 0.1,

  // Enable structured logs to be sent to Sentry
  enableLogs: true,

  // Do NOT record sessions passively — only record when an error occurs
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,

  sendDefaultPii: true,

  // Supabase logs a console.error when a session's refresh token is expired/invalid.
  // The middleware already handles this by redirecting to /login — not a bug.
  beforeSendLog(log) {
    const msg = typeof log.message === 'string' ? log.message : ''
    if (msg.includes('refresh_token_not_found') || msg.includes('Refresh Token Not Found')) {
      return null
    }
    return log
  },

  // Also filter as an error event in case it surfaces via an unhandled rejection
  ignoreErrors: [
    'refresh_token_not_found',
    'Refresh Token Not Found',
    'Invalid Refresh Token',
    // Camera permission denied by the user/device — handled in UI via onCameraError()
    'NotAllowedError',
    // DOM mutation races caused by browser auto-translation / extensions rewriting
    // React-managed nodes. We already opt out via translate="no", but extensions
    // can still force it — these are not app bugs and are not actionable.
    "Failed to execute 'insertBefore' on 'Node'",
    "Failed to execute 'removeChild' on 'Node'",
    'The node to be removed is not a child of this node',
    'The node before which the new node is to be inserted is not a child of this node',
  ],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
