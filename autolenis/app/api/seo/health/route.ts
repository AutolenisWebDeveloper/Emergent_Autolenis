import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { seoService } from "@/lib/services/seo.service"

export async function GET() {
  try {
    const user = await requireAuth(["ADMIN"])
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const summary = await seoService.getDashboardSummary()
    return NextResponse.json(summary)
  } catch (error) {
    console.error("[v0] Error fetching SEO health:", error)
    return NextResponse.json({ error: "Failed to fetch health data" }, { status: 500 })
  }
}
