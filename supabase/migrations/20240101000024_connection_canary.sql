-- Migration: Add connection canary table for health checks
-- Purpose: Provides a simple table for verifying database connectivity
--          Used by the /api/health/db endpoint.
--
-- Rollback:
--   DROP TABLE IF EXISTS public._connection_canary;

-- Create the connection canary table (idempotent)
CREATE TABLE IF NOT EXISTS public._connection_canary (
  id        BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  message   TEXT
);

-- Insert initial test row (idempotent — no-op if table already has rows)
INSERT INTO public._connection_canary (message)
SELECT 'canary alive'
WHERE NOT EXISTS (SELECT 1 FROM public._connection_canary);

-- Grant SELECT permission to service_role (used by health checks)
GRANT SELECT ON public._connection_canary TO service_role;

-- Restrict all other access (anon/authenticated must NOT see this table)
REVOKE ALL ON public._connection_canary FROM anon;
REVOKE ALL ON public._connection_canary FROM authenticated;

COMMENT ON TABLE public._connection_canary IS
  'Health check table used by /api/health/db to verify database connectivity. Do not store application data here.';
