import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { requireAuth } from "@/lib/auth-server"
import { PaymentService } from "@/lib/services/payment.service"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const session = await requireAuth(["BUYER"])
    const body = await request.json()

    const headersList = await headers()
    const ipAddress = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "unknown"
    const userAgent = headersList.get("user-agent") || "unknown"

    const result = await PaymentService.agreeLoanInclusion(body.dealId, session.userId, ipAddress, userAgent)

    // Process lender disbursement
    await PaymentService.processLenderDisbursement(body.dealId)

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error: unknown) {
    const statusCode = (error as { statusCode?: number }).statusCode
    if (statusCode === 401 || statusCode === 403) {
      return NextResponse.json({ success: false, error: statusCode === 403 ? "Forbidden" : "Unauthorized" }, { status: statusCode })
    }
    logger.error("[Payment Fee Loan Agree]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}