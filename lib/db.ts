// AutoLenis Database Connection
// Supabase client for direct queries, Prisma for ORM operations (optional)

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { logger } from "./logger"

// ---------------------------------------------------------------------------
// Lazy env-var resolution (read at call time, NOT module-load time)
// ---------------------------------------------------------------------------
// Prefer NEXT_PUBLIC_SUPABASE_URL as the canonical server URL since it is
// always set by the Supabase ↔ Vercel integration.  SUPABASE_URL is accepted
// as an override for non-Vercel deployments.
// ---------------------------------------------------------------------------

function getSupabaseUrl(): string {
  return process.env['SUPABASE_URL'] || process.env['NEXT_PUBLIC_SUPABASE_URL'] || ""
}

function getSupabaseServiceKey(): string {
  return process.env['SUPABASE_SERVICE_ROLE_KEY'] || ""
}

/**
 * Return a list of missing env-var names required for the service-role client.
 * Empty array = everything present.
 */
export function getMissingDbEnvVars(): string[] {
  const missing: string[] = []
  if (!getSupabaseUrl()) missing.push("NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)")
  if (!getSupabaseServiceKey()) missing.push("SUPABASE_SERVICE_ROLE_KEY")
  return missing
}

// Track last client-creation error (for diagnostics only, never blocks retries)
let _lastCreationError: string | null = null

// Create Supabase client with service role (bypasses RLS)
function createSupabaseClient(): SupabaseClient | null {
  const url = getSupabaseUrl()
  const key = getSupabaseServiceKey()

  try {
    if (!url || !key) {
      const missing = getMissingDbEnvVars()
      _lastCreationError = `Supabase configuration missing: ${missing.join(", ")}`
      logger.error("Supabase not configured — missing env vars", { missing })
      return null
    }

    logger.info("Initializing Supabase client", { url })
    const client = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
      db: { schema: "public" },
    })

    _lastCreationError = null
    logger.info("Supabase client initialized successfully")
    return client
  } catch (error: any) {
    _lastCreationError = `Supabase client creation failed: ${error.message}`
    logger.error("Supabase client creation failed", { error: error.message })
    return null
  }
}

// Singleton Supabase client (lazy, retries on next call if creation failed)
let _supabaseInstance: SupabaseClient | null | undefined
function getOrCreateSupabase(): SupabaseClient {
  // Retry when previous attempt failed (undefined = never tried, null = failed)
  if (_supabaseInstance === undefined || _supabaseInstance === null) {
    _supabaseInstance = createSupabaseClient()
  }
  if (!_supabaseInstance) {
    const missing = getMissingDbEnvVars()
    throw new Error(
      `Database not configured. Missing: ${missing.length > 0 ? missing.join(", ") : "unknown (client creation failed)"}`,
    )
  }
  return _supabaseInstance
}

// Proxy that throws a clear error on actual usage when Supabase is not configured
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get: (_, prop) => {
    if (prop === "then") return undefined // Allow await checks
    const client = getOrCreateSupabase()
    return (client as any)[prop]
  },
})

// Prisma client singleton (lazy loaded, optional)
let _prismaInstance: any = null
let _prismaLoadAttempted = false
let _prismaLoadError: string | null = null

/**
 * Check whether the `POSTGRES_PRISMA_URL` env var is set.
 * This is a prerequisite for Prisma — without it the client constructor
 * will throw immediately.
 */
export function isPrismaConfigured(): boolean {
  return !!process.env["POSTGRES_PRISMA_URL"]
}

/**
 * Return the last Prisma initialisation error message (or null).
 * Useful for diagnostics without exposing internals to end users.
 */
export function getPrismaLoadError(): string | null {
  return _prismaLoadError
}

// Get Prisma client (lazy loaded, returns null if unavailable)
// Retries initialisation when the previous attempt failed AND the env var
// has since become available (handles late-bound secrets on some platforms).
export function getPrisma() {
  if (!_prismaLoadAttempted || (_prismaInstance === null && isPrismaConfigured())) {
    _prismaLoadAttempted = true
    try {
      const { PrismaClient } = require("@prisma/client")
      _prismaInstance = new PrismaClient()
      _prismaLoadError = null
      logger.info("Prisma client initialized successfully")
    } catch (error: any) {
      _prismaLoadError = error.message
      logger.warn("Prisma client not available - using Supabase exclusively", { 
        error: error.message 
      })
      // Don't throw - allow app to continue with Supabase
      return null
    }
  }
  return _prismaInstance
}

// This allows existing code to use `prisma.table.method()` syntax
// Returns null-safe proxy that throws helpful error if Prisma is actually used
export const prisma = new Proxy({} as any, {
  get: (_, prop) => {
    if (prop === "then") return undefined // Allow await checks
    const client = getPrisma()
    if (!client) {
      throw new Error(
        `Prisma client not available. The app uses Supabase for database operations. Error: ${_prismaLoadError || 'Prisma not installed'}`
      )
    }
    return client[prop]
  },
})

// Check if Prisma is available
export function isPrismaAvailable(): boolean {
  return !!getPrisma()
}

// Check if database is properly configured
// Re-evaluates env vars every call so a late-bound secret is never missed.
export function isDatabaseConfigured(): boolean {
  const url = getSupabaseUrl()
  const key = getSupabaseServiceKey()
  const configured = !!(url && key)
  if (!configured) {
    const missing = getMissingDbEnvVars()
    logger.error("Database not configured — missing env vars", { missing })
  }
  return configured
}

// Get configured Supabase client or throw with detailed error
export function getSupabase(): SupabaseClient {
  return getOrCreateSupabase()
}

// Export configuration status for debugging
export function getDatabaseStatus() {
  return {
    configured: isDatabaseConfigured(),
    hasUrl: !!getSupabaseUrl(),
    hasServiceKey: !!getSupabaseServiceKey(),
    error: _lastCreationError,
  }
}

// ---------------------------------------------------------------------------
// Privileged accessor (explicitly named for audit visibility)
// ---------------------------------------------------------------------------

/**
 * Returns the service-role Supabase client that bypasses RLS.
 *
 * ⚠️  ONLY use this in:
 *   - Webhook handlers (server-to-server, signature-verified)
 *   - Cron jobs (CRON_SECRET verified)
 *   - Admin-auth flows (admin session gated)
 *   - lib/ service modules (never directly from user-facing API routes)
 *
 * Normal route code should import from @/lib/supabase/server instead,
 * which enforces RLS via the user's session token.
 */
export function getServiceRoleClient(): SupabaseClient {
  return getOrCreateSupabase()
}
