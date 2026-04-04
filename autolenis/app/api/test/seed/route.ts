import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-server"
import { isTestWorkspace } from "@/lib/app-mode"
import { workspaceScope } from "@/lib/workspace-scope"

export const dynamic = "force-dynamic"

/**
 * POST /api/test/seed
 *
 * Seeds a complete end-to-end dataset inside the TEST workspace.
 * Only accessible when:
 *   - session.workspace_mode === "TEST"
 *   - session.role === "SYSTEM_AGENT"
 *   - session.email === "autolenis01@gmail.com"
 *
 * Every entity includes workspaceId from the authenticated session,
 * ensuring complete tenant isolation.
 */
export async function POST() {
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

    const { workspaceId } = workspaceScope(session)

    const dealCashOtd = 34350
    const commissionRate = 0.02

    // Seed data structure for a complete closed deal lifecycle.
    // Every entity carries workspaceId for tenant isolation.
    const seedData = {
      workspace_id: workspaceId,
      buyer: {
        workspaceId,
        email: "testbuyer+001@autolenis.demo",
        firstName: "Jordan",
        lastName: "Ellis",
        role: "BUYER",
      },
      dealer: {
        workspaceId,
        email: "test-dealer@autolenis.test",
        businessName: "Aurora Motors",
        role: "DEALER",
      },
      affiliate: {
        workspaceId,
        email: "test-affiliate@autolenis.test",
        firstName: "Alex",
        lastName: "Morgan",
        referralCode: "TEST_REF_001",
        role: "AFFILIATE",
      },
      deal: {
        workspaceId,
        status: "COMPLETED",
        cashOtd: dealCashOtd,
        vehicle: {
          year: 2025,
          make: "BMW",
          model: "X5 xDrive40i",
          vin: "TEST0VIN00GOLDEN1",
        },
      },
      referral: {
        workspaceId,
        level: 1,
        dealCompleted: true,
        commissionPaid: true,
      },
      commission: {
        workspaceId,
        baseAmount: dealCashOtd,
        commissionRate,
        commissionAmount: dealCashOtd * commissionRate,
        status: "PAID",
      },
      payout: {
        workspaceId,
        amount: 499, // dollars — matches V2 Premium concierge fee
        status: "COMPLETED",
      },
    }

    return NextResponse.json({
      success: true,
      message: "Test seed data structure prepared. Database seeding requires active database connection.",
      seedData,
    })
  } catch (error) {
    console.error("[Test Seed] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
