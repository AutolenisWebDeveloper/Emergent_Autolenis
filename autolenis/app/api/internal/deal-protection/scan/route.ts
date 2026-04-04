import { type NextRequest, NextResponse } from "next/server"
import * as circumventionMonitorService from "@/lib/services/circumvention-monitor.service"
import { timingSafeEqual } from "node:crypto"

export const dynamic = "force-dynamic"

// POST /api/internal/deal-protection/scan
// Internal job route: Scan for circumvention signals across recent messages/deals
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization")
    const expectedKey = process.env["INTERNAL_API_KEY"]
    if (expectedKey) {
      const expected = `Bearer ${expectedKey}`
      if (
        !authHeader ||
        authHeader.length !== expected.length ||
        !timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected))
      ) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    const body = await req.json().catch(() => ({}))

    // If specific message provided, scan it
    if (body.messageId && body.content) {
      const result = await circumventionMonitorService.scanMessageForCircumvention({
        id: body.messageId,
        content: body.content,
        senderId: body.senderId ?? "unknown",
        recipientId: body.recipientId ?? "unknown",
        dealId: body.dealId,
      })
      return NextResponse.json({ success: true, data: result })
    }

    // Otherwise return status - full batch scanning not implemented as
    // in-app buyer↔dealer real-time messaging does not currently exist.
    // The platform uses support-ticket based messaging.
    return NextResponse.json({
      success: true,
      data: {
        note: "Batch scanning available when in-app messaging is implemented. Use per-message scanning via body.messageId.",
      },
    })
  } catch (error) {
    console.error("[job:deal-protection-scan] Error:", error)
    return NextResponse.json({ error: "Job failed" }, { status: 500 })
  }
}
