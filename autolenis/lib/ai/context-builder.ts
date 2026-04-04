/**
 * Context Builder – constructs viewer context for AI orchestration.
 *
 * Produces a role-aware context object used by the orchestrator to
 * classify intent, gate tools, and route to the correct specialist agent.
 */

export type AIRole = "public" | "buyer" | "dealer" | "affiliate" | "admin"

export interface ViewerContext {
  role: AIRole
  userId: string | null
  workspaceId: string | null
  permissions: string[]
}

/**
 * Map the platform UserRole string coming from the session to the
 * simplified AIRole used by the AI subsystem.
 */
function mapRole(sessionRole: string | undefined): AIRole {
  switch (sessionRole) {
    case "BUYER":
      return "buyer"
    case "DEALER":
    case "DEALER_USER":
      return "dealer"
    case "AFFILIATE":
    case "AFFILIATE_ONLY":
      return "affiliate"
    case "ADMIN":
    case "SUPER_ADMIN":
      return "admin"
    default:
      return "public"
  }
}

/**
 * Derive coarse-grained permissions from the AI role.
 * These are consumed by the tool registry to gate execution.
 */
function derivePermissions(role: AIRole): string[] {
  switch (role) {
    case "admin":
      return ["read", "write", "admin", "audit"]
    case "dealer":
      return ["read", "write", "dealer"]
    case "buyer":
      return ["read", "write", "buyer"]
    case "affiliate":
      return ["read", "write", "affiliate"]
    case "public":
    default:
      return ["read"]
  }
}

export interface SessionLike {
  userId?: string
  role?: string
  workspace_id?: string
}

/**
 * Build the viewer context that the orchestrator consumes.
 *
 * @param session - The session object from the auth layer (nullable for public visitors).
 */
export function buildViewerContext(session: SessionLike | null): ViewerContext {
  const role = mapRole(session?.role)
  return {
    role,
    userId: session?.userId ?? null,
    workspaceId: session?.workspace_id ?? null,
    permissions: derivePermissions(role),
  }
}
