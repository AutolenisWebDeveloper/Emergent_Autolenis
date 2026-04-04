-- Migration: Add connection canary table for health checks
-- Purpose: Provides a simple table for verifying database connectivity
-- Run this in the Supabase SQL Editor

-- Create the connection canary table
CREATE TABLE IF NOT EXISTS public._connection_canary (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  message TEXT
);

-- Insert initial test row
INSERT INTO public._connection_canary (message) 
VALUES ('canary alive')
ON CONFLICT DO NOTHING;

-- Grant SELECT permission to service_role (for health checks)
GRANT SELECT ON public._connection_canary TO service_role;

-- Add comment to document the table's purpose
COMMENT ON TABLE public._connection_canary IS 'Health check table used by /api/health/db endpoint to verify database connectivity';
