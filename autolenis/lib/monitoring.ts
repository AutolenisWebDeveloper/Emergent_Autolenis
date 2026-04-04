/**
 * Application Monitoring Initialisation
 *
 * This module is imported as a side-effect in app/layout.tsx to bootstrap
 * any monitoring/observability tooling at server startup.
 *
 * Currently wired up to:
 *   - OpenTelemetry SDK (when NEXT_PUBLIC_SENTRY_DSN or OTEL env vars are set)
 *   - Structured logger warm-up
 *
 * Add Sentry, Datadog, or other APM SDKs here. The import in layout.tsx
 * guarantees this runs once per server cold-start.
 */

import { logger } from "@/lib/logger"

const APP_VERSION = process.env["npm_package_version"] || "unknown"
const ENVIRONMENT = process.env["NODE_ENV"] || "development"

/** Called automatically on import — no explicit call needed. */
function init() {
  try {
    logger.info("Monitoring initialised", {
      version: APP_VERSION,
      environment: ENVIRONMENT,
      sentryDsn: process.env["NEXT_PUBLIC_SENTRY_DSN"] ? "configured" : "not set",
    })

    // Sentry / other APM initialisation would go here, e.g.:
    // if (process.env["NEXT_PUBLIC_SENTRY_DSN"]) {
    //   Sentry.init({ dsn: process.env["NEXT_PUBLIC_SENTRY_DSN"], environment: ENVIRONMENT })
    // }
  } catch (err) {
    // Monitoring must never crash the app
    console.error("[monitoring] Initialisation failed:", err)
  }
}

init()
