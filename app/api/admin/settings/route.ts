import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { adminService } from "@/lib/services/admin.service"

export const dynamic = "force-dynamic"

const ALLOWED_SETTING_KEYS = new Set([
  "deposit_amount",
  "fee_tier_one_cents",
  "fee_tier_two_cents",
  "fee_threshold_cents",
  "auction_duration_hours",
  "deposit_grace_period_hours",
  "fee_financing_enabled",
  "affiliate_commission_l1",
  "affiliate_commission_l2",
  "affiliate_commission_l3",
  "affiliate_commission_l4",
  "affiliate_commission_l5",
  "affiliate_min_payout",
  "branding",
])

export async function GET() {
  const requestId = `req_${Date.now()}`
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 })
    }

    const settings = await adminService.getSystemSettings()
    console.info("[settings.read]", { event: "settings.read", userId: user.userId, requestId })
    return NextResponse.json(settings)
  } catch (error) {
    console.error("[settings.read_error]", { event: "settings.read_error", requestId, error: String(error) })
    return NextResponse.json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Failed to load settings" } }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const requestId = `req_${Date.now()}`
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 })
    }

    const body = await request.json()
    const { key, value } = body || {}

    if (typeof key !== "string" || !ALLOWED_SETTING_KEYS.has(key)) {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_KEY", message: `Invalid setting key: ${typeof key === "string" ? key : "(not a string)"}` } },
        { status: 400 }
      )
    }

    if (value === undefined || value === null) {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_VALUE", message: "Setting value cannot be null or undefined" } },
        { status: 400 }
      )
    }

    console.info("[settings.update]", { event: "settings.update", userId: user.userId, key, requestId })
    const result = await adminService.updateSystemSettings(key, value, user.userId)
    return NextResponse.json(result)
  } catch (error) {
    console.error("[settings.update_error]", { event: "settings.update_error", requestId, error: String(error) })
    return NextResponse.json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Failed to update settings" } }, { status: 500 })
  }
}
