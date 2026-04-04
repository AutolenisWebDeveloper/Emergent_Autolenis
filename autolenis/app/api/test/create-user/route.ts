import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-server"
import { isTestWorkspace } from "@/lib/app-mode"
import { workspaceScope } from "@/lib/workspace-scope"

export const dynamic = "force-dynamic"

/**
 * POST /api/test/create-user
 *
 * Creates a test user inside the TEST workspace.
 * Only accessible when:
 *   - session.workspace_mode === "TEST"
 *   - session.role === "SYSTEM_AGENT"
 *   - session.email === "autolenis01@gmail.com"
 *
 * Body: { email, role, firstName, lastName }
 *
 * The workspace_id is derived from the authenticated session — never
 * from the client request body.
 */
export async function POST(request: Request) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!isTestWorkspace(session)) {
      return new NextResponse("Not Found", { status: 404 })
    }

    if (
      session.role !== "SYSTEM_AGENT" ||
      session.email !== "autolenis01@gmail.com"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { email, role, firstName, lastName } = body

    if (!email || !role) {
      return NextResponse.json(
        { error: "email and role are required" },
        { status: 400 }
      )
    }

    const allowedRoles = ["BUYER", "DEALER", "AFFILIATE", "ADMIN"]
    if (!allowedRoles.includes(role)) {
      return NextResponse.json(
        { error: `role must be one of: ${allowedRoles.join(", ")}` },
        { status: 400 }
      )
    }

    const { workspaceId } = workspaceScope(session)

    // Return the user creation payload (actual DB write requires active connection)
    const userData = {
      workspaceId,
      email,
      role,
      firstName: firstName || "",
      lastName: lastName || "",
    }

    return NextResponse.json({
      success: true,
      message: "Test user creation payload validated. Database write requires active database connection.",
      userData,
    })
  } catch (error) {
    console.error("[Test Create User] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
