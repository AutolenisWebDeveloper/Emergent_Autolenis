/**
 * Runtime validation for critical auth environment variables
 * This runs at server startup to catch configuration issues early
 */

import { logger } from "./logger"

export interface AuthRuntimeCheck {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Validate that all critical auth environment variables are properly configured
 * This should be called at runtime (not build time) to catch deployment issues
 */
export function validateAuthEnvironment(): AuthRuntimeCheck {
  const errors: string[] = []
  const warnings: string[] = []

  // Critical: JWT Secret must exist and be secure
  if (!process.env['JWT_SECRET']) {
    errors.push("JWT_SECRET is not set. Sessions cannot be created or verified.")
  } else if (process.env['JWT_SECRET'].length < 32) {
    warnings.push(
      `JWT_SECRET is only ${process.env['JWT_SECRET'].length} characters. Recommended: 32+ characters for security.`
    )
  }

  // Critical: Supabase connection required for user auth
  if (!process.env['NEXT_PUBLIC_SUPABASE_URL']) {
    errors.push("NEXT_PUBLIC_SUPABASE_URL is not set. Database operations will fail.")
  }

  if (!process.env['SUPABASE_SERVICE_ROLE_KEY']) {
    errors.push("SUPABASE_SERVICE_ROLE_KEY is not set. Auth operations will fail.")
  }

  if (!process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] && !process.env['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY']) {
    warnings.push("Neither NEXT_PUBLIC_SUPABASE_ANON_KEY nor NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY is set. Client-side DB access may fail.")
  }

  // Important: App URL affects CORS and callbacks
  if (!process.env['NEXT_PUBLIC_APP_URL']) {
    warnings.push(
      "NEXT_PUBLIC_APP_URL is not set. Using default 'https://autolenis.com'. CORS may not work correctly on preview deployments."
    )
  }

  // Production-specific checks
  if (process.env['NODE_ENV'] === "production") {
    if (!process.env['JWT_SECRET'] || process.env['JWT_SECRET'].includes("change-in-production")) {
      errors.push("Production deployment detected but JWT_SECRET appears to be default/test value.")
    }

    if (process.env['NEXT_PUBLIC_APP_URL'] === "http://localhost:3000") {
      errors.push("Production deployment has NEXT_PUBLIC_APP_URL set to localhost.")
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Log auth environment validation results
 * Safe to call at startup - does not expose secrets
 */
export function logAuthEnvironmentStatus(): void {
  const check = validateAuthEnvironment()

  if (check.isValid) {
    logger.info("✅ Auth environment validation passed", {
      warningCount: check.warnings.length,
      environment: process.env['NODE_ENV'],
      hasAppUrl: !!process.env['NEXT_PUBLIC_APP_URL'],
    })

    // Log warnings separately
    check.warnings.forEach((warning) => {
      logger.warn(`Auth config: ${warning}`)
    })
  } else {
    logger.error("❌ Auth environment validation FAILED", {
      errorCount: check.errors.length,
      warningCount: check.warnings.length,
    })

    // Log each error
    check.errors.forEach((error) => {
      logger.error(`Auth config error: ${error}`)
    })

    // Log warnings
    check.warnings.forEach((warning) => {
      logger.warn(`Auth config warning: ${warning}`)
    })
  }
}
