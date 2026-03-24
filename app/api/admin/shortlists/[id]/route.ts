import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { ShortlistService } from "@/lib/services/shortlist.service"

// GET - Admin: Get single shortlist detail
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(["ADMIN"])
    const { id } = await params

    const shortlist = await ShortlistService.getShortlistDetailAdmin(id)

    return NextResponse.json({
      success: true,
      data: { shortlist },
    })
  } catch (error: any) {
    console.error("[Admin Shortlist Detail]", error)
    const status = error instanceof Error && error.message === "Unauthorized" ? 401 : error instanceof Error && error.message === "Forbidden" ? 403 : 500
    const msg = status === 401 ? "Unauthorized" : status === 403 ? "Forbidden" : "Internal server error"
    return NextResponse.json({ success: false, error: msg }, { status })
  }
}
