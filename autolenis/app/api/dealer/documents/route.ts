import { type NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { supabase } from "@/lib/db"
import { requireDatabase } from "@/lib/require-database"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || (user.role !== "DEALER" && !isAdminRole(user.role))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dbUnavailable = requireDatabase()
    if (dbUnavailable) return dbUnavailable

    const searchParams = request.nextUrl.searchParams
    const dealId = searchParams.get("dealId")

    // Get dealer profile
    const { data: dealerProfile } = await supabase
      .from("Dealer")
      .select("id")
      .eq("userId", user.userId)
      .single()

    if (!dealerProfile) {
      return NextResponse.json({ documents: [] })
    }

    // Get deals for this dealer
    let dealQuery = supabase
      .from("SelectedDeal")
      .select("id")
      .eq("dealerId", dealerProfile.id)

    if (dealId) {
      dealQuery = dealQuery.eq("id", dealId)
    }

    const { data: deals } = await dealQuery
    const dealIds = deals?.map((d: { id: string }) => d.id) || []

    // Fetch documents in two groups then merge + deduplicate:
    // 1. Docs attached to any of the dealer's deals (e.g. buyer-uploaded via dealId)
    // 2. Docs the dealer uploaded directly (ownerUserId match), with optional dealId filter
    type DocRow = Record<string, unknown> & { id: string; createdAt: string }

    let dealDocs: DocRow[] = []
    if (dealIds.length > 0) {
      const { data: dealData, error: dealError } = await supabase
        .from("DealDocument")
        .select("*")
        .in("dealId", dealIds)
        .order("createdAt", { ascending: false })
      if (dealError) {
        const correlationId = randomUUID()
        console.error("[Dealer Documents Error]", { correlationId, error: dealError })
        return NextResponse.json({ error: "Failed to load documents", correlationId }, { status: 500 })
      }
      dealDocs = (dealData as DocRow[]) || []
    }

    let ownerQuery = supabase
      .from("DealDocument")
      .select("*")
      .eq("ownerUserId", user.userId)
      .order("createdAt", { ascending: false })

    if (dealId) {
      ownerQuery = ownerQuery.eq("dealId", dealId)
    }

    const { data: ownerData, error: ownerError } = await ownerQuery
    if (ownerError) {
      const correlationId = randomUUID()
      console.error("[Dealer Documents Error]", { correlationId, error: ownerError })
      return NextResponse.json({ error: "Failed to load documents", correlationId }, { status: 500 })
    }
    const ownerDocs = (ownerData as DocRow[]) || []

    // Merge and deduplicate by id, sort by createdAt descending
    const seen = new Set<string>()
    const merged: DocRow[] = []
    for (const doc of [...dealDocs, ...ownerDocs]) {
      if (!seen.has(doc.id)) {
        seen.add(doc.id)
        merged.push(doc)
      }
    }
    merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({ documents: merged })
  } catch (error) {
    const correlationId = randomUUID()
    console.error("[Dealer Documents Error]", { correlationId, error })
    return NextResponse.json({ error: "Internal server error", correlationId }, { status: 500 })
  }
}
