import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { seoService } from "@/lib/services/seo.service"

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
    return NextResponse.json({ error: "Failed to fetch health data" }, { status: 500 })
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
    return NextResponse.json({ error: "Failed to calculate health score" }, { status: 500 })
  }
}
