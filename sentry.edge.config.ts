// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { shouldReportErrorEvent } from "./src/lib/sentry/should-report-event";

Sentry.init({
  dsn: "https://a79c485e658283b2b94d7b594f66ddac@o4511637938044928.ingest.us.sentry.io/4511637942370304",

  enabled: process.env.NODE_ENV === "production",

  integrations: [
    Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
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
});
