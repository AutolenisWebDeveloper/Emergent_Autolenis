import { NextRequest, NextResponse } from "next/server"

type LogLevel = "debug" | "info" | "warn" | "error"

export interface RequestLoggerConfig {
  /** Minimum log level to output (default: "info") */
  level?: LogLevel
  /** Header/body keys whose values should be redacted (default: common auth headers) */
  redactHeaders?: string[]
  /** Skip logging for matching path prefixes (e.g. health-checks) */
  skipPaths?: string[]
}

type RouteHandler = (
  request: NextRequest,
  context?: { params?: Record<string, string> },
) => Promise<NextResponse> | NextResponse

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const DEFAULT_REDACT_HEADERS = [
  "authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
]

function shouldLog(configured: LogLevel, actual: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[actual] >= LOG_LEVEL_PRIORITY[configured]
}

function generateCorrelationId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`
}

function extractUserId(request: NextRequest): string | undefined {
  return (
    request.headers.get("x-user-id") ??
    request.headers.get("x-supabase-auth") ??
    undefined
  )
}

/**
 * Wraps a Next.js API route handler with structured request logging.
 * Logs method, path, status, response time, userId, and correlationId.
 */
export function requestLogger(handler: RouteHandler, config: RequestLoggerConfig = {}): RouteHandler {
  const {
    level = "info",
    redactHeaders = DEFAULT_REDACT_HEADERS,
    skipPaths = [],
  } = config

  return async (request: NextRequest, context?: { params?: Record<string, string> }) => {
    const pathname = new URL(request.url).pathname

    if (skipPaths.some((prefix) => pathname.startsWith(prefix))) {
      return handler(request, context)
    }

    const correlationId =
      request.headers.get("x-correlation-id") ?? generateCorrelationId()
    const startTime = performance.now()

    let response: NextResponse
    let errorCaught: unknown

    try {
      response = await handler(request, context)
    } catch (err) {
      errorCaught = err
      response = NextResponse.json(
        { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" }, correlationId },
        { status: 500 },
      )
    }

    const durationMs = Math.round((performance.now() - startTime) * 100) / 100
    const statusCode = response.status
    const userId = extractUserId(request)

    const logLevel: LogLevel =
      statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info"

    if (shouldLog(level, logLevel)) {
      const entry: Record<string, unknown> = {
        timestamp: new Date().toISOString(),
        level: logLevel,
        method: request.method,
        path: pathname,
        statusCode,
        durationMs,
        correlationId,
      }

      if (userId) {
        entry.userId = userId
      }

      if (errorCaught instanceof Error) {
        entry.error = {
          name: errorCaught.name,
          message: errorCaught.message,
        }
      }

      // Collect non-redacted headers for debug level
      if (shouldLog(level, "debug")) {
        const safeHeaders: Record<string, string> = {}
        request.headers.forEach((value, key) => {
          safeHeaders[key] = redactHeaders.includes(key.toLowerCase())
            ? "[REDACTED]"
            : value
        })
        entry.headers = safeHeaders
      }

      console.log(JSON.stringify(entry))
    }

    // Attach correlationId to response
    response.headers.set("x-correlation-id", correlationId)

    return response
  }
}
