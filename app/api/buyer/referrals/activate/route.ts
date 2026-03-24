import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth-server"
import { affiliateService } from "@/lib/services/affiliate.service"
import { emailService } from "@/lib/services/email.service"
import { buildReferralLink, getReferralCode } from "@/lib/utils/referral-code"

export async function POST() {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== "BUYER") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const affiliate = await affiliateService.autoEnrollBuyerAsAffiliate(user.id)

    // Best-effort: affiliate welcome email (non-blocking)
    if (user.email) {
      emailService
        .sendWelcomeEmail(user.email, user.first_name || "there", "Affiliate", user.id)
        .catch((err: unknown) => console.error("[Referral Activate] Welcome email failed:", err))
    }

    const refCode = getReferralCode(affiliate as any)
    const referralLink = buildReferralLink(refCode)

    return NextResponse.json({
      success: true,
      data: {
        affiliateId: (affiliate as any).id,
        refCode,
        referralLink,
      },
    })
  } catch (error: any) {
    console.error("[Referral Activate] Error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to activate referrals" },
      { status: 400 },
    )
  }
}
