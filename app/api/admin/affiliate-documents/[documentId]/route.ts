import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { supabase } from "@/lib/db"
import { requireDatabase } from "@/lib/require-database"

export const dynamic = "force-dynamic"

// PATCH /api/admin/affiliate-documents/[documentId] — Review an affiliate document
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> },
) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { documentId } = await params

    const dbUnavailable = requireDatabase()
    if (dbUnavailable) return dbUnavailable

    const body = await request.json()
    const { status, reviewNotes } = body

    const VALID_STATUSES = ["PENDING", "APPROVED", "REJECTED"]
    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 },
      )
    }

    const { data: existing, error: fetchError } = await supabase
      .from("AffiliateDocument")
      .select("id")
      .eq("id", documentId)
      .maybeSingle()

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Affiliate document not found" }, { status: 404 })
    }

    const updates: Record<string, unknown> = {
      status,
      reviewedBy: user.userId,
      reviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    if (reviewNotes !== undefined) updates.reviewNotes = reviewNotes

    const { data: updated, error } = await supabase
      .from("AffiliateDocument")
      .update(updates)
      .eq("id", documentId)
      .select()
      .single()

    if (error) {
      const correlationId = randomUUID()
      console.error("[Admin Affiliate Document PATCH Error]", { correlationId, error })
      return NextResponse.json({ error: "Failed to update document", correlationId }, { status: 500 })
    }

    return NextResponse.json({ success: true, document: updated })
  } catch (error) {
    const correlationId = randomUUID()
    console.error("[Admin Affiliate Document PATCH Error]", { correlationId, error })
    return NextResponse.json({ error: "Internal server error", correlationId }, { status: 500 })
  }
}

// DELETE /api/admin/affiliate-documents/[documentId]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ documentId: string }> },
) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { documentId } = await params

    const dbCheck = requireDatabase()
    if (dbCheck) return dbCheck

    // Fetch to get filePath for storage cleanup
    const { data: doc } = await supabase
      .from("AffiliateDocument")
      .select("filePath")
      .eq("id", documentId)
      .maybeSingle()

    if (doc?.filePath) {
      await supabase.storage.from("affiliate-documents").remove([doc.filePath])
    }

    const { error } = await supabase
      .from("AffiliateDocument")
      .delete()
      .eq("id", documentId)

    if (error) {
      const correlationId = randomUUID()
      console.error("[Admin Affiliate Document DELETE Error]", { correlationId, error })
      return NextResponse.json({ error: "Failed to delete document", correlationId }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const correlationId = randomUUID()
    console.error("[Admin Affiliate Document DELETE Error]", { correlationId, error })
    return NextResponse.json({ error: "Internal server error", correlationId }, { status: 500 })
  }
}
