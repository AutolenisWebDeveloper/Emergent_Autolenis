import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { ShortlistService } from "@/lib/services/shortlist.service"
import { handleRouteError } from "@/lib/utils/route-error"

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
  } catch (error: unknown) {
    console.error("[Admin Shortlist Detail]", error)
    return handleRouteError(error, "Internal server error")
  }
}
