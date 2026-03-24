import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/db"
import { requireDatabase } from "@/lib/require-database"
import { logger } from "@/lib/logger"
import { rateLimit } from "@/lib/middleware/rate-limit"

export const dynamic = "force-dynamic"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, {
    maxRequests: 30,
    windowMs: 10 * 60 * 1000,
    keyGenerator: (req) => {
      const ip = (req as any).ip || req.headers.get("x-forwarded-for") || "unknown"
      return `refi_redirect:${ip}`
    },
  })
  if (limited) return limited

  try {
    const { leadId } = await request.json().catch(() => ({}))

    if (!leadId || typeof leadId !== "string") {
      return NextResponse.json({ error: "Lead ID is required" }, { status: 400 })
    }
    if (!UUID_RE.test(leadId)) {
      return NextResponse.json({ error: "Invalid Lead ID format" }, { status: 400 })
    }

    const dbUnavailable = requireDatabase()
    if (dbUnavailable) return dbUnavailable

    const now = new Date().toISOString()
    const { error } = await supabase
      .from("RefinanceLead")
      .update({ redirectedToPartnerAt: now, updatedAt: now })
      .eq("id", leadId)

    if (error) {
      logger.error("Failed to update refinance lead redirect timestamp", {
        context: "record-redirect-api",
        leadId,
        error: error.message,
      })
      return NextResponse.json({ error: "Could not update lead" }, { status: 500 })
    }

    logger.info("Recorded refinance redirect", {
      context: "record-redirect-api",
      leadId,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error("Error recording refinance redirect", {
      context: "record-redirect-api",
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: "Could not record redirect" }, { status: 500 })
  }
}
