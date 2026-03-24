import { createClient as createSupabaseClient } from "@supabase/supabase-js"

/**
 * Creates a Supabase admin client that bypasses Row Level Security (RLS).
 * Use this ONLY for server-side operations that need to create/modify data
 * without RLS restrictions, such as user signup, admin operations, etc.
 *
 * NEVER expose this client to the browser or use in client components.
 */
export function createAdminClient() {
  const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL']
  const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY']

  if (!supabaseUrl) {
    console.error("[createAdminClient] NEXT_PUBLIC_SUPABASE_URL is not configured")
    throw new Error("Database URL is not configured. Please check environment variables.")
  }

  if (!supabaseServiceKey) {
    console.error("[createAdminClient] SUPABASE_SERVICE_ROLE_KEY is not configured")
    throw new Error("Database service key is not configured. Please check environment variables.")
  }

  return createSupabaseClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
