import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { seoService } from "@/lib/services/seo.service"
import { handleRouteError } from "@/lib/utils/route-error"

export async function GET(_request: Request, { params }: { params: Promise<{ pageKey: string }> }) {
  try {
    const user = await requireAuth(["ADMIN"])
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { pageKey } = await params
    const health = await seoService.getPageHealth(pageKey)

    if (!health) {
      return NextResponse.json({ error: "Health data not found" }, { status: 404 })
    }

    return NextResponse.json({ health })
  } catch (error) {
    console.error("[v0] Error fetching page health:", error)
    return handleRouteError(error, "Failed to fetch health data")
  }
}

export async function POST(_request: Request, { params }: { params: Promise<{ pageKey: string }> }) {
  try {
    const user = await requireAuth(["ADMIN"])
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { pageKey } = await params
    const health = await seoService.calculateHealthScore(pageKey)

    return NextResponse.json({ health })
  } catch (error) {
    console.error("[v0] Error calculating health score:", error)
    return handleRouteError(error, "Failed to calculate health score")
  }
}
