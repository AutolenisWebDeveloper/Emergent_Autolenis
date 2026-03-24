/**
 * Central monitoring and observability setup
 * Integrates error tracking, performance monitoring, and logging
 */

import { errorMonitoring } from "./sentry"
import { logger } from "../logger"

export class MonitoringService {
  initialize() {
    // Initialize error monitoring
    errorMonitoring.initialize()

    // Log startup
    logger.info("Application monitoring initialized", {
      environment: process.env['NODE_ENV'],
      version: process.env['NEXT_PUBLIC_APP_VERSION'] || "unknown",
    })

    // Set up global error handlers
    if (typeof window !== "undefined") {
      window.addEventListener("error", (event) => {
        errorMonitoring.captureException(event.error, {
          type: "window.error",
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
        })
      })

      window.addEventListener("unhandledrejection", (event) => {
        errorMonitoring.captureException(new Error(event.reason), {
          type: "unhandledrejection",
        })
      })
    }

    // Performance monitoring
    this.setupPerformanceMonitoring()
  }

  private setupPerformanceMonitoring() {
    if (typeof window === "undefined") return

    // Monitor Core Web Vitals
    if ("PerformanceObserver" in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1]
          if (!lastEntry) return
          
          const lcpValue = lastEntry.startTime

          // Convert to seconds for readability
          const lcpSeconds = (lcpValue / 1000).toFixed(2)

          // Determine performance rating
          let rating = "good"
          if (lcpValue > 4000) rating = "poor"
          else if (lcpValue > 2500) rating = "needs-improvement"

          logger.debug("LCP measured", {
            value: lcpValue,
            seconds: lcpSeconds,
            rating,
            threshold: "good < 2.5s, needs improvement < 4s",
          })

          // Track in production monitoring
          if (process.env['NODE_ENV'] === "production") {
            errorMonitoring.addBreadcrumb("performance", "info", {
              metric: "LCP",
              value: lcpValue,
              rating,
            })
          }
        })
        lcpObserver.observe({ entryTypes: ["largest-contentful-paint"] })

        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          entries.forEach((entry: any) => {
            const fid = entry.processingStart - entry.startTime

            let rating = "good"
            if (fid > 300) rating = "poor"
            else if (fid > 100) rating = "needs-improvement"

            logger.debug("FID measured", {
              value: fid,
              rating,
              threshold: "good < 100ms, needs improvement < 300ms",
            })

            if (process.env['NODE_ENV'] === "production") {
              errorMonitoring.addBreadcrumb("performance", "info", {
                metric: "FID",
                value: fid,
                rating,
              })
            }
          })
        })
        fidObserver.observe({ entryTypes: ["first-input"] })

        let clsValue = 0
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value

              let rating = "good"
              if (clsValue > 0.25) rating = "poor"
              else if (clsValue > 0.1) rating = "needs-improvement"

              logger.debug("CLS updated", {
                value: clsValue,
                rating,
                threshold: "good < 0.1, needs improvement < 0.25",
              })

              if (process.env['NODE_ENV'] === "production" && clsValue > 0.1) {
                errorMonitoring.addBreadcrumb("performance", "warning", {
                  metric: "CLS",
                  value: clsValue,
                  rating,
                })
              }
            }
          }
        })
        clsObserver.observe({ entryTypes: ["layout-shift"] })

        window.addEventListener("load", () => {
          setTimeout(() => {
            const perfData = performance.timing
            const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart
            const domReadyTime = perfData.domContentLoadedEventEnd - perfData.navigationStart

            logger.info("Page load performance", {
              pageLoadTime: `${(pageLoadTime / 1000).toFixed(2)}s`,
              domReadyTime: `${(domReadyTime / 1000).toFixed(2)}s`,
            })
          }, 0)
        })
      } catch (error) {
        logger.warn("Performance monitoring setup failed", { error })
      }
    }
  }

  // Track custom events
  trackEvent(name: string, properties?: Record<string, any>) {
    logger.info(`Event: ${name}`, properties)
    errorMonitoring.addBreadcrumb(name, "event", properties)
  }

  // Track user actions
  trackUserAction(action: string, context?: Record<string, any>) {
    this.trackEvent("user_action", { action, ...context })
  }

  // Track API calls
  trackAPICall(endpoint: string, method: string, status: number, duration: number) {
    this.trackEvent("api_call", {
      endpoint,
      method,
      status,
      duration,
    })
  }
}

export const monitoring = new MonitoringService()

// Auto-initialize in browser
if (typeof window !== "undefined") {
  monitoring.initialize()
}
