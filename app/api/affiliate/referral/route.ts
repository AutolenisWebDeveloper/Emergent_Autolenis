import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth-server"
import { affiliateService } from "@/lib/services/affiliate.service"
import { createClient } from "@/lib/supabase/server"
import { z } from "zod"
import { logger } from "@/lib/logger"

const schema = z.object({
  referralCode: z.string(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== "BUYER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { referralCode } = schema.parse(body)

    const affiliate = await affiliateService.getAffiliateByCode(referralCode)

    if (!affiliate) {
      return NextResponse.json({ error: "Invalid referral code" }, { status: 404 })
    }

    const supabase = await createClient()
    const { data: buyer, error } = await supabase
      .from("BuyerProfile")
      .select("*")
      .eq("userId", user.userId)
      .maybeSingle()

    if (error) {
      logger.error("[Affiliate Referral] Error fetching buyer:", error)
      return NextResponse.json({ error: "Failed to fetch buyer profile" }, { status: 500 })
    }

    if (!buyer) {
      return NextResponse.json(
        { error: "Buyer profile not found. Please complete your profile setup." },
        { status: 404 },
      )
    }

    const referral = await affiliateService.trackReferral(affiliate.id, buyer.id)

    return NextResponse.json(referral)
  } catch (error) {
    logger.error("[Affiliate Referral] Error:", error)
    return NextResponse.json({ error: "Failed to track referral" }, { status: 500 })
  }
}
