import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { upgradeBuyerToPremium } from "@/lib/services/buyer-package.service"
import { createClient } from "@/lib/supabase/server"
import { sendUpgradeConfirmationEmail, sendPremiumSpecialistNotification } from "@/lib/email/triggers"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const user = await getSessionUser()
    if (!user || user.role !== "BUYER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const reason = typeof body.reason === "string" ? body.reason : null

    // Look up the buyer profile to get the profile id and name
    const supabase = await createClient()
    const { data: profile, error: profileError } = await supabase
      .from("BuyerProfile")
      .select("id, package_tier, firstName, lastName")
      .eq("userId", user.userId)
      .maybeSingle()

    if (profileError || !profile) {
      return NextResponse.json({ error: "Buyer profile not found" }, { status: 404 })
    }

    if (profile.package_tier === "PREMIUM") {
      return NextResponse.json({ error: "Already on Premium plan" }, { status: 409 })
    }

    // The RPC function uses the admin client internally
    await upgradeBuyerToPremium(profile.id, "DASHBOARD_UPGRADE", reason)

    // Send upgrade notifications (fire-and-forget — upgrade already succeeded)
    const buyerName = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || "Buyer"
    const buyerEmail = user.email || ""

    try {
      await Promise.allSettled([
        sendUpgradeConfirmationEmail(buyerEmail, profile.firstName || "there", user.userId),
        sendPremiumSpecialistNotification(buyerName, buyerEmail, profile.id, "DASHBOARD_UPGRADE"),
      ])
    } catch (notifyErr) {
      // Non-blocking — upgrade already committed via RPC
      logger.error("[Buyer Upgrade] Notification send failed (non-blocking)", notifyErr instanceof Error ? notifyErr : undefined)
    }

    return NextResponse.json({ success: true, message: "Upgraded to Premium" })
  } catch (error: any) {
    console.error("[Buyer Upgrade] Error:", error)
    return NextResponse.json(
      { error: "Failed to upgrade" },
      { status: 500 },
    )
  }
}
