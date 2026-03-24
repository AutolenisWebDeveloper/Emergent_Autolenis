import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { seoService } from "@/lib/services/seo.service"

export async function GET() {
  try {
    const user = await requireAuth(["ADMIN"])
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const pages = await seoService.getAllPages()
    return NextResponse.json({ pages })
  } catch (error) {
    console.error("[v0] Error fetching SEO pages:", error)
    return NextResponse.json({ error: "Failed to fetch pages" }, { status: 500 })
  }
}
