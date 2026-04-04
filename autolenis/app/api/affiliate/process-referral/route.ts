import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth-server"
import { affiliateService } from "@/lib/services/affiliate.service"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const schema = z.object({
  refCode: z.string().optional(),
  meta: z
    .object({
      refCode: z.string().optional(),
      affiliateId: z.string().optional(),
      firstTouchUrl: z.string().optional(),
      utmSource: z.string().optional(),
      utmMedium: z.string().optional(),
      utmCampaign: z.string().optional(),
      utmTerm: z.string().optional(),
      utmContent: z.string().optional(),
      capturedAt: z.string().optional(),
    })
    .optional(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { refCode, meta } = schema.parse(body)

    // Also check for cookie-based attribution
    const cookieRefCode = req.cookies.get("autolenis_ref_code")?.value
    const cookieId = req.cookies.get("autolenis_ref")?.value

    const codeToUse = refCode || meta?.refCode || cookieRefCode

    if (!codeToUse && !cookieId) {
      return NextResponse.json({
        success: false,
        message: "No referral code or cookie found",
      })
    }

    // Process the referral with 3-level chain building
    const referrals = await affiliateService.processSignupReferral(user.id, codeToUse, cookieId)

    if (!referrals || referrals.length === 0) {
      return NextResponse.json({
        success: false,
        message: "Could not create referral (may be self-referral or already exists)",
      })
    }

    if (meta) {
      const level1Referral = referrals.find((referral: any) => referral.level === 1) || referrals[0]
      if (level1Referral?.id) {
        const supabase = await createClient()
        const attributionPayload: Record<string, unknown> = {
          ref_code: codeToUse || null,
          source_url: meta.firstTouchUrl || null,
          utm_source: meta.utmSource || null,
          utm_medium: meta.utmMedium || null,
          utm_campaign: meta.utmCampaign || null,
          utm_term: meta.utmTerm || null,
          utm_content: meta.utmContent || null,
          attributed_at: meta.capturedAt ? new Date(meta.capturedAt).toISOString() : new Date().toISOString(),
          status: "pending",
        }

        await supabase.from("Referral").update(attributionPayload).eq("id", level1Referral.id)
      }
    }

    // Clear the referral cookies after successful attribution
    const response = NextResponse.json({
      success: true,
      message: "Referral tracked successfully",
      levels: referrals.length,
    })

    response.cookies.delete("autolenis_ref")
    response.cookies.delete("autolenis_ref_code")

    return response
  } catch {
    return NextResponse.json({ error: "Failed to process referral" }, { status: 500 })
  }
}
