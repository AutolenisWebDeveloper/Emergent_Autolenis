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
    const schemas = await seoService.getPageSchema(pageKey)

    return NextResponse.json({ schemas })
  } catch (error) {
    console.error("[v0] Error fetching schemas:", error)
    return NextResponse.json({ error: "Failed to fetch schemas" }, { status: 500 })
  }
}

export async function POST(_request: Request, { params }: { params: Promise<{ pageKey: string }> }) {
  try {
    const user = await requireAuth(["ADMIN"])
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { pageKey } = await params
    const { schemaType, schemaJson } = await _request.json()

    const schema = await seoService.updatePageSchema(pageKey, schemaType, schemaJson)

    return NextResponse.json({ schema })
  } catch (error) {
    console.error("[v0] Error updating schema:", error)
    return NextResponse.json({ error: "Failed to update schema" }, { status: 500 })
  }
}
