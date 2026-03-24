/**
 * GET /api/concierge/context
 *
 * Returns the current concierge context for the authenticated user.
 * This endpoint powers Plane B (Dynamic Knowledge) of the Lenis Concierge,
 * providing role-scoped, workspace-scoped system state so the assistant
 * can ground answers in live data rather than guessing.
 *
 * - Public visitors receive a minimal PUBLIC context
 * - Authenticated users receive their role-specific state slice
 * - RBAC enforced: buyers see buyer state, dealers see dealer state, etc.
 */

import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-server"
import { getConciergeContext } from "@/lib/ai/context"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  try {
    const session = await getSession()
    const context = getConciergeContext(session)

    return NextResponse.json(context)
  } catch (error) {
    console.error("Concierge context error:", error)
    return NextResponse.json(
      {
        error: {
          code: "CONTEXT_LOAD_FAILED",
          message: "Failed to load concierge context",
        },
      },
      { status: 500 },
    )
  }
}
