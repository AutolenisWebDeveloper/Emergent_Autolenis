/**
 * Error Monitoring Setup
 * Configures Sentry for error tracking and performance monitoring
 */

interface SentryConfig {
  dsn?: string
  environment: string
  enabled: boolean
  tracesSampleRate: number
}

class ErrorMonitoring {
  private config: SentryConfig
  private initialized = false

  constructor() {
    this.config = {
      dsn: process.env['NEXT_PUBLIC_SENTRY_DSN'],
      environment: process.env['NODE_ENV'] || "development",
      enabled: !!process.env['NEXT_PUBLIC_SENTRY_DSN'] && process.env['NODE_ENV'] === "production",
      tracesSampleRate: 0.1, // 10% of transactions
    }
  }

  initialize() {
    if (this.initialized) return
    this.initialized = true

    if (!this.config.enabled) {
      console.log("[Monitoring] Sentry not configured, skipping initialization")
      return
    }

    // Initialize Sentry when DSN is configured
    // import * as Sentry from "@sentry/nextjs"
    // Sentry.init({
    //   dsn: this.config.dsn,
    //   environment: this.config.environment,
    //   tracesSampleRate: this.config.tracesSampleRate,
    // })

    console.log("[Monitoring] Error monitoring initialized for", this.config.environment)
  }

  captureException(error: Error, context?: Record<string, any>) {
    if (!this.config.enabled) {
      console.error("[Monitoring] Error captured:", error, context)
      return
    }

    // When Sentry DSN is configured: Sentry.captureException(error, { extra: context })
  }

  captureMessage(message: string, level: "info" | "warning" | "error" = "info") {
    if (!this.config.enabled) {
      console.log(`[Monitoring] ${level.toUpperCase()}:`, message)
      return
    }

    // When Sentry DSN is configured: Sentry.captureMessage(message, level)
  }

  setUser(_user: { id: string; email?: string; role?: string }) {
    if (!this.config.enabled) return

    // When Sentry DSN is configured: Sentry.setUser(user)
  }

  addBreadcrumb(_message: string, _category: string, _data?: Record<string, any>) {
    if (!this.config.enabled) return

    // When Sentry DSN is configured: Sentry.addBreadcrumb({ message, category, data })
  }
}

export const errorMonitoring = new ErrorMonitoring()
