import type { WorkspaceMode } from "./types"

/**
 * Returns true when the session belongs to a TEST workspace.
 * This is the **only** sanctioned way to gate mock/test behaviour.
 * All gating is server-authoritative via workspace membership in the
 * authenticated session — no env vars, query params, cookies, or
 * localStorage toggles.
 */
export function isTestWorkspace(session: { workspace_mode?: WorkspaceMode | string } | null | undefined): boolean {
  return session?.workspace_mode === "TEST"
}
