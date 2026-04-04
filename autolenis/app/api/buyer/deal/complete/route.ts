import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth-server"
import { createClient } from "@/lib/supabase/server"
import { affiliateService } from "@/lib/services/affiliate.service"
import { emailService } from "@/lib/services/email.service"

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { dealId } = await req.json()
    const supabase = await createClient()

    // Get the deal
    const { data: deal, error: dealError } = await supabase
      .from("SelectedDeal")
      .select(`
        *,
        buyer:BuyerProfile(*)
      `)
      .eq("id", dealId)
      .single()

    if (dealError || !deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 })
    }

    // Update deal status to complete
    const { error: updateError } = await supabase
      .from("SelectedDeal")
      .update({ status: "COMPLETED" })
      .eq("id", dealId)

    if (updateError) {
      throw updateError
    }

    // Process referral commissions for this deal
    const commissionResult = await affiliateService.completeDealReferral(dealId, user.id)

    // Auto-enroll buyer as affiliate if not already
    const { data: existingAffiliate } = await supabase.from("Affiliate").select("*").eq("userId", user.id).single()

    let affiliate = existingAffiliate

    if (!affiliate) {
      affiliate = await affiliateService.autoEnrollBuyerAsAffiliate(user.id)

      // Send welcome email for new affiliate
      if (user.email) {
        await emailService.sendWelcomeEmail(user.email, user.first_name || "there", "AFFILIATE").catch((err: unknown) => {
          console.error("[Deal Complete] Failed to send affiliate welcome email:", err)
        })
      }
    }

    return NextResponse.json({
      success: true,
      affiliate: affiliate
        ? {
            id: affiliate.id,
            referralCode: affiliate.refCode || affiliate.referralCode,
            referralLink: `${process.env['NEXT_PUBLIC_APP_URL'] || "https://autolenis.com"}/ref/${affiliate.refCode || affiliate.referralCode}`,
          }
        : null,
      commissionsProcessed: commissionResult?.success ? 1 : 0,
    })
  } catch (error) {
    console.error("[Deal Complete] Error:", error)
    return NextResponse.json({ error: "Failed to complete deal" }, { status: 500 })
  }
}
