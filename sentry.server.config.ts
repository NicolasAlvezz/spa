// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { shouldReportErrorEvent } from "./src/lib/sentry/should-report-event";

Sentry.init({
  dsn: "https://a79c485e658283b2b94d7b594f66ddac@o4511637938044928.ingest.us.sentry.io/4511637942370304",

  enabled: process.env.NODE_ENV === "production",

  integrations: [
    // Exclude "warn" on the server: Node.js internals emit ExperimentalWarning
    // (e.g. vm.USE_MAIN_CONTEXT_DEFAULT_LOADER) at warn level — not actionable.
    // Real server-side problems surface as errors or unhandled rejections.
    Sentry.consoleLoggingIntegration({ levels: ["log", "error"] }),
  ],

  // Sample 10% of traces in production to keep costs low
  tracesSampleRate: 0.1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,

  beforeSend(event) {
    return shouldReportErrorEvent(event) ? event : null
  },

  ignoreErrors: [
    "ENOENT: no such file or directory",
    "Cannot find module './vendor-chunks/",
  ],
});
