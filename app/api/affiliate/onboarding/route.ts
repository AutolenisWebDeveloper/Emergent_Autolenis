import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAffiliateRole } from "@/lib/auth-server"
import { affiliateService } from "@/lib/services/affiliate.service"
import { rateLimit } from "@/lib/middleware/rate-limit"
import { logger } from "@/lib/logger"

export async function POST(req: NextRequest) {
  // Rate limit: 5 onboarding attempts per 15 minutes per IP
  const rateLimitResponse = await rateLimit(req, {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000,
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    if (!isAffiliateRole(user)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const { firstName, lastName, phone } = body || {}

    // Validate required fields
    if (!firstName || typeof firstName !== "string" || !firstName.trim()) {
      return NextResponse.json({ success: false, error: "First name is required" }, { status: 400 })
    }
    if (!lastName || typeof lastName !== "string" || !lastName.trim()) {
      return NextResponse.json({ success: false, error: "Last name is required" }, { status: 400 })
    }
    if (!phone || typeof phone !== "string" || !phone.trim()) {
      return NextResponse.json({ success: false, error: "Phone number is required" }, { status: 400 })
    }

    // Create affiliate record (idempotent — returns existing if already created)
    const affiliate = await affiliateService.createAffiliate(
      user.userId,
      firstName.trim(),
      lastName.trim(),
    )

    const baseUrl = process.env['NEXT_PUBLIC_APP_URL'] || "https://autolenis.com"
    const referralCode = affiliate.refCode || affiliate.referralCode
    const referralLink = `${baseUrl}/ref/${referralCode}`

    return NextResponse.json({
      success: true,
      data: {
        referralCode,
        referralLink,
      },
    })
  } catch (error) {
    logger.error("[Affiliate Onboarding] Error:", error)
    return NextResponse.json({ success: false, error: "Onboarding failed" }, { status: 500 })
  }
}
