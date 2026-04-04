import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { seoService } from "@/lib/services/seo.service"

export async function GET(_request: Request, { params }: { params: Promise<{ pageKey: string }> }) {
  try {
    const { pageKey } = await params
    const page = await seoService.getPageSEO(pageKey)

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 })
    }

    return NextResponse.json({ page })
  } catch (error) {
    console.error("[v0] Error fetching SEO page:", error)
    return NextResponse.json({ error: "Failed to fetch page" }, { status: 500 })
  }
}

export async function PUT(_request: Request, { params }: { params: Promise<{ pageKey: string }> }) {
  try {
    const user = await requireAuth(["ADMIN"])
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { pageKey } = await params
    const body = await _request.json()

    const updatedPage = await seoService.updatePageSEO(pageKey, body)

    // Recalculate health score
    await seoService.calculateHealthScore(pageKey)

    return NextResponse.json({ page: updatedPage })
  } catch (error) {
    console.error("[v0] Error updating SEO page:", error)
    return NextResponse.json({ error: "Failed to update page" }, { status: 500 })
  }
}
