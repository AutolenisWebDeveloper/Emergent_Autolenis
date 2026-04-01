import { NextRequest, NextResponse } from "next/server"
import { logger } from "@/lib/logger"
import { processQueuedMessages } from "@/lib/prequal/message-sender"

export const dynamic = "force-dynamic"

function verifyCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env["CRON_SECRET"]
  if (!cronSecret) return false
  return (
    request.headers.get("authorization") === `Bearer ${cronSecret}` ||
    request.headers.get("x-cron-secret") === cronSecret
  )
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await processQueuedMessages(50)

    logger.info("[Prequal Cron] Message delivery completed", {
      sent: result.sent,
      failed: result.failed,
      skipped: result.skipped,
    })

    return NextResponse.json({ success: true, ...result })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    logger.error("[Prequal Cron] Message delivery error", { error: msg })
    return NextResponse.json(
      { success: false, error: "Message delivery failed" },
      { status: 500 },
    )
  }
}
