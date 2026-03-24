import { type NextRequest, NextResponse } from "next/server"
import { affiliateService } from "@/lib/services/affiliate.service"
import { rateLimit, rateLimits } from "@/lib/middleware/rate-limit"
import { nanoid } from "nanoid"
import { z } from "zod"

const schema = z.object({
  code: z.string().optional(),
  refCode: z.string().optional(),
  affiliateId: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, rateLimits.affiliateClick)
  if (limited) return limited

  try {
    const body = await req.json()
    const parsed = schema.parse(body)
    const code = parsed.code || parsed.refCode
    const affiliateId = parsed.affiliateId

    if (!code && !affiliateId) {
      return NextResponse.json({ error: "Missing code" }, { status: 400 })
    }

    let affiliate = null
    if (code) {
      affiliate = await affiliateService.getAffiliateByCode(code)
    } else if (affiliateId) {
      affiliate = await affiliateService.getAffiliateById(affiliateId)
    }

    if (!affiliate) {
      return NextResponse.json({ error: "Invalid code" }, { status: 404 })
    }

    // Get existing cookie or create new one
    const existingCookie = req.cookies.get("autolenis_ref")?.value
    const cookieId = existingCookie || nanoid(16)

    const result = await affiliateService.trackClick(affiliate.id, {
      userAgent: req.headers.get("user-agent"),
      referer: req.headers.get("referer"),
      ip: req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "",
      cookieId,
    })

    if (!result) {
      return NextResponse.json({ error: "Failed to track click" }, { status: 500 })
    }

    // Create response with cookies
    const refCodeValue = affiliate.refCode || affiliate.referralCode || affiliate.ref_code || code
    const response = NextResponse.json({
      success: true,
      click: result.click,
      affiliateName: result.affiliateName,
      cookieId: result.cookieId,
      affiliateId: affiliate.id,
      refCode: refCodeValue,
    })

    // Set attribution cookie (30 days)
    response.cookies.set("autolenis_ref", result.cookieId!, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    })

    // Also set ref code cookie for easier access
    response.cookies.set("autolenis_ref_code", refCodeValue, {
      httpOnly: false,
      secure: process.env['NODE_ENV'] === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    })

    return response
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to track click" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, rateLimits.affiliateClick)
  if (limited) return limited

  try {
    const { searchParams } = new URL(req.url)
    const refCode = searchParams.get("ref") || searchParams.get("code")

    if (!refCode) {
      return NextResponse.json({ error: "Missing ref code" }, { status: 400 })
    }

    const affiliate = await affiliateService.getAffiliateByCode(refCode)
    if (!affiliate) {
      return NextResponse.json({ error: "Invalid referral code" }, { status: 404 })
    }

    return NextResponse.json({
      valid: true,
      affiliateName: `${affiliate.firstName} ${affiliate.lastName}`.trim() || "A friend",
      refCode: affiliate.refCode || affiliate.ref_code,
    })
  } catch {
    return NextResponse.json({ error: "Failed to resolve code" }, { status: 500 })
  }
}
