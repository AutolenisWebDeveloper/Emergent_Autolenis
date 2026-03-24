import { type NextRequest, NextResponse } from "next/server"
import { requireAuth, isAdminRole } from "@/lib/auth-server"
import { affiliateService } from "@/lib/services/affiliate.service"
import { emailService } from "@/lib/services/email.service"
import { createClient } from "@/lib/supabase/server"
import { isTestWorkspace } from "@/lib/app-mode"
import { mockActions, mockDb } from "@/lib/mocks/mockStore"
import { logger } from "@/lib/logger"

// POST - Mark a payout as processed/paid
export async function POST(request: NextRequest, { params }: { params: Promise<{ payoutId: string }> }) {
  try {
    const session = await requireAuth()
    if (!session || !isAdminRole(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { payoutId } = await params
    const body = await request.json()
    const { providerRef, method = "Bank Transfer" } = body

    if (!providerRef) {
      return NextResponse.json({ error: "Missing providerRef" }, { status: 400 })
    }

    if (isTestWorkspace(session)) {
      const payout = mockActions.approveAffiliatePayout(payoutId)
      return NextResponse.json({
        success: true,
        payout: {
          id: payout?.id || payoutId,
          status: payout?.status || "COMPLETED",
          providerRef,
          amount: payout?.amountCents || mockDb.affiliateProfiles[0]?.pendingEarnings || 0,
          method,
        },
      })
    }

    const payout = await affiliateService.processPayout(payoutId, providerRef)

    // Send email notification to affiliate
    try {
      const supabase = await createClient()
      
      // Get affiliate and user details for email
      const { data: affiliate } = await supabase
        .from("Affiliate")
        .select(`
          id,
          user:User!Affiliate_userId_fkey(email, firstName)
        `)
        .eq("id", payout.affiliateId)
        .single()

      // Supabase foreign key relations can return arrays in some query contexts
      // Normalize to object to handle both cases safely
      const user = Array.isArray(affiliate?.user) ? affiliate.user[0] : affiliate?.user
      if (user?.email) {
        await emailService.sendAffiliatePayoutNotification(
          user.email,
          user.firstName || "Affiliate",
          payout.amount / 100, // Convert cents to dollars
          method
        )
      }
    } catch (emailError) {
      // Log but don't fail the request if email fails
      logger.error("[Admin Process Payout API] Email notification failed:", emailError)
    }

    return NextResponse.json({
      success: true,
      payout: {
        id: payout.id,
        status: "COMPLETED",
        providerRef,
      },
    })
  } catch (error) {
    logger.error("[Admin Process Payout API] Error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 },
    )
  }
}
