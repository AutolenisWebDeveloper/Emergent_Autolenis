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

    // No message payload provided; return current scanner capability status.
    // The scanner currently operates on submitted messages.
    // To report platform messaging abuse, open a support-ticket via /api/admin/support.
    return NextResponse.json({
      success: true,
      data: {
        note: "Submit messageId + content to scan a message payload.",
      },
    })
  } catch (error) {
    console.error("[job:deal-protection-scan] Error:", error)
    return NextResponse.json({ error: "Job failed" }, { status: 500 })
  }
}
