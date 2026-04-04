// Re-export from supabase/server for backward compatibility
export { createClient } from "./supabase/server"

// Also export from db for services that import directly
export { supabase, getSupabase, isDatabaseConfigured, getMissingDbEnvVars } from "./db"
