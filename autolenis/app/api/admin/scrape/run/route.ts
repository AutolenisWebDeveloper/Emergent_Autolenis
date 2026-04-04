import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { runZipIngestion } from "@/lib/services/inventory-sourcing/ingest.service"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

const scrapeRunSchema = z.object({
  zip: z
    .string()
    .min(5, "ZIP code must be 5 digits")
    .max(5, "ZIP code must be 5 digits")
    .regex(/^\d{5}$/, "ZIP code must be exactly 5 digits"),
})

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()

    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const parsed = scrapeRunSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message:
              parsed.error.errors[0]?.message || "ZIP code validation failed",
          },
        },
        { status: 400 },
      )
    }

    const count = await runZipIngestion(parsed.data.zip)

    return NextResponse.json({ success: true, count })
  } catch (error) {
    logger.error("Scrape run failed", { error })
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Scrape run failed" } },
      { status: 500 },
    )
  }
}
