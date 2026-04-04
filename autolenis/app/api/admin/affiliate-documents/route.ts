import { type NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { supabase } from "@/lib/db"
import { requireDatabase } from "@/lib/require-database"

export const dynamic = "force-dynamic"

// GET /api/admin/affiliate-documents — List all affiliate documents (admin only)
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dbUnavailable = requireDatabase()
    if (dbUnavailable) return dbUnavailable

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status")
    const affiliateId = searchParams.get("affiliateId")

    let query = supabase
      .from("AffiliateDocument")
      .select("*")
      .order("createdAt", { ascending: false })

    if (status && status !== "all") {
      query = query.eq("status", status)
    }
    if (affiliateId) {
      query = query.eq("affiliateId", affiliateId)
    }

    const { data: documents, error } = await query

    if (error) {
      const correlationId = randomUUID()
      console.error("[Admin Affiliate Documents Error]", { correlationId, error })
      return NextResponse.json({ error: "Failed to load affiliate documents", correlationId }, { status: 500 })
    }

    return NextResponse.json({ documents: documents || [] })
  } catch (error) {
    const correlationId = randomUUID()
    console.error("[Admin Affiliate Documents Error]", { correlationId, error })
    return NextResponse.json({ error: "Internal server error", correlationId }, { status: 500 })
  }
}
