import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth-server"
import { affiliateService } from "@/lib/services/affiliate.service"
import { rateLimit } from "@/lib/middleware/rate-limit"

export async function POST(req: NextRequest) {
  // Rate limit: 5 enrollment attempts per 15 minutes per IP
  const rateLimitResponse = await rateLimit(req, {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000,
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Create affiliate record for the user
    const affiliate = await affiliateService.createAffiliate(user.id, user.first_name || "", user.last_name || "")

    const baseUrl = process.env['NEXT_PUBLIC_APP_URL'] || "https://autolenis.com"

    return NextResponse.json({
      success: true,
      affiliate: {
        id: affiliate.id,
        referralCode: affiliate.refCode || affiliate.referralCode,
        referralLink: `${baseUrl}/ref/${affiliate.refCode || affiliate.referralCode}`,
      },
    })
  } catch {
    return NextResponse.json({ error: "Failed to enroll as affiliate" }, { status: 500 })
  }
}
