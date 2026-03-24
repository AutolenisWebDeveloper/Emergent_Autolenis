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
    const keywords = await seoService.getPageKeywords(pageKey)

    return NextResponse.json({ keywords })
  } catch (error) {
    console.error("[v0] Error fetching keywords:", error)
    return NextResponse.json({ error: "Failed to fetch keywords" }, { status: 500 })
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

    const keywords = await seoService.updatePageKeywords(pageKey, body)

    return NextResponse.json({ keywords })
  } catch (error) {
    console.error("[v0] Error updating keywords:", error)
    return NextResponse.json({ error: "Failed to update keywords" }, { status: 500 })
  }
}
