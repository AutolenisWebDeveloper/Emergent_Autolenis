import { type NextRequest, NextResponse } from "next/server"
import * as coverageGapService from "@/lib/services/coverage-gap.service"
import * as dealerInviteService from "@/lib/services/dealer-invite.service"
import { timingSafeEqual } from "node:crypto"

export const dynamic = "force-dynamic"

// POST /api/internal/inventory/generate-invites
// Internal job route: Generate dealer invites for open coverage gap tasks
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization")
    const expectedKey = process.env["INTERNAL_API_KEY"]
    if (expectedKey) {
      const expected = `Bearer ${expectedKey}`
      if (
        !authHeader ||
        authHeader.length !== expected.length ||
        !timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected))
      ) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    // Get open coverage gap tasks
    const { tasks } = await coverageGapService.getGapTasks({ status: "OPEN", perPage: 50 })
    let invitesSent = 0

    for (const task of tasks) {
      try {
        // Find prospects in the gap area
        const gapTask = task as { id: string; marketZip: string; buyerRequestId?: string; prospectId?: string }

        // Skip tasks without an assigned prospect
        if (!gapTask.prospectId) continue

        // Create an invite for the gap
        await coverageGapService.inviteForGap(gapTask.id, gapTask.prospectId, "SYSTEM")
        invitesSent++
      } catch {
        // Skip individual failures
      }
    }

    // Expire stale invites
    const expired = await dealerInviteService.expireStaleInvites()

    return NextResponse.json({
      success: true,
      data: { tasksProcessed: tasks.length, invitesSent, expiredInvites: expired },
    })
  } catch (error) {
    console.error("[job:generate-invites] Error:", error)
    return NextResponse.json({ error: "Job failed" }, { status: 500 })
  }
}
