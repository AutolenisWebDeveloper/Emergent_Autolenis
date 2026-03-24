import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { ShortlistService } from "@/lib/services/shortlist.service"

// GET - Admin: List all shortlists with filters
export async function GET(request: Request) {
  try {
    await requireAuth(["ADMIN"])
    const { searchParams } = new URL(request.url)

    const filters = {
      userId: searchParams.get("userId") || undefined,
      hasItems: searchParams.has("hasItems") ? searchParams.get("hasItems") === "true" : undefined,
      limit: Number.parseInt(searchParams.get("limit") || "50"),
      offset: Number.parseInt(searchParams.get("offset") || "0"),
    }

    const result = await ShortlistService.getShortlistsAdmin(filters)

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error: any) {
    console.error("[Admin Shortlists]", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    )
  }
}
