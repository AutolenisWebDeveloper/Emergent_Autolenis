/**
 * Application Logger
 * Replaces console.log with structured logging
 * Supports different log levels and structured data
 */

type LogLevel = "debug" | "info" | "warn" | "error"

interface LogContext {
  [key: string]: unknown
}

class Logger {
  private prefix: string
  private isDevelopment: boolean

  constructor(prefix = "") {
    this.prefix = prefix
    this.isDevelopment = process.env['NODE_ENV'] === "development"
  }

  private log(level: LogLevel, message: string, context?: LogContext) {
    // Logs are sent to console; integrate external logging service (e.g., Datadog) as needed
    // In production: emit info, warn, and error. In development: emit all levels including debug.
    if (!this.isDevelopment && level === "debug") {
      return
    }

    const timestamp = new Date().toISOString()
    const logPrefix = this.prefix ? `[${this.prefix}]` : ""
    const fullMessage = `${timestamp} ${level.toUpperCase()} ${logPrefix} ${message}`

    if (context) {
      console[level](fullMessage, context)
    } else {
      console[level](fullMessage)
    }
  }

  debug(message: string, context?: LogContext) {
    this.log("debug", message, context)
  }

  info(message: string, context?: LogContext) {
    this.log("info", message, context)
  }

  warn(message: string, context?: LogContext) {
    this.log("warn", message, context)
  }

  error(message: string, error?: Error | unknown, context?: LogContext) {
    const errorContext = {
      ...context,
      error:
        error instanceof Error
          ? {
              message: error.message,
              stack: error.stack,
              name: error.name,
            }
          : error,
    }
    this.log("error", message, errorContext)
  }
}

// Export logger instances for different modules
export const logger = new Logger()
export const authLogger = new Logger("Auth")
export const apiLogger = new Logger("API")
export const dbLogger = new Logger("DB")
export const emailLogger = new Logger("Email")
export const adminLogger = new Logger("Admin")

export default logger
