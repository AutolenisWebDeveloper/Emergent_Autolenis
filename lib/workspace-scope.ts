/**
 * Workspace-scoped data access helpers.
 *
 * All database queries that touch domain tables MUST go through these helpers
 * to guarantee workspace isolation.  The helpers derive the workspace_id from
 * the authenticated session — never from the client.
 *
 * RLS note:  When using Supabase with Row-Level Security, the application MUST
 * also set the PostgreSQL session variable before every query:
 *   SET LOCAL app.workspace_id = '<workspace_id>';
 * This is enforced by the RLS policies created in migration 05.
 * When using the Supabase service-role client (which bypasses RLS), the
 * application-level filters below are the primary guard.
 *
 * Usage:
 *   const scope = workspaceScope(session)
 *   const { data } = await supabase.from("BuyerProfile").select("*").eq("workspaceId", scope.workspaceId)
 */

import type { SessionUser } from "./auth"

export interface WorkspaceScope {
  /** The workspace_id from the authenticated session. */
  workspaceId: string
  /** Convenience: true when the session is in a TEST workspace. */
  isTest: boolean
}

/**
 * Extract a guaranteed workspace scope from a session.
 * Throws if the session has no workspace_id — callers should catch and
 * return 401/403 as appropriate.
 */
export function workspaceScope(session: SessionUser | null | undefined): WorkspaceScope {
  if (!session) {
    throw new Error("workspaceScope: session is required")
  }

  const workspaceId = session.workspace_id
  if (!workspaceId) {
    throw new Error("workspaceScope: session.workspace_id is missing")
  }

  return {
    workspaceId,
    isTest: session.workspace_mode === "TEST",
  }
}

/**
 * Returns a Supabase filter helper that automatically appends the
 * workspace_id equality check to a query builder.
 *
 * Example:
 *   const wsFilter = workspaceFilter(session)
 *   const { data } = await wsFilter(supabase.from("SelectedDeal").select("*"))
 */
export function workspaceFilter(session: SessionUser) {
  const { workspaceId } = workspaceScope(session)

  return function applyWorkspaceFilter<T extends { eq: (col: string, val: string) => T }>(query: T): T {
    return query.eq("workspaceId", workspaceId)
  }
}

/**
 * Returns an object suitable for spreading into Supabase insert payloads
 * to set the workspaceId on new rows.
 *
 * Example:
 *   await supabase.from("Referral").insert({ ...referralData, ...workspaceInsert(session) })
 */
export function workspaceInsert(session: SessionUser): { workspaceId: string } {
  const { workspaceId } = workspaceScope(session)
  return { workspaceId }
}
