import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { isTestWorkspace } from "@/lib/app-mode"
import { supabase } from "@/lib/db"
import { requireDatabase } from "@/lib/require-database"

export async function GET(_request: Request, { params }: { params: Promise<{ documentId: string }> }) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { documentId } = await params

    if (isTestWorkspace(user)) {
      return NextResponse.json({ success: true, data: { id: documentId, status: "PENDING", fileName: "test-document.pdf" } })
    }

    const dbUnavailable = requireDatabase()
    if (dbUnavailable) return dbUnavailable

    const { data: doc, error } = await supabase
      .from("DealDocument")
      .select("*")
      .eq("id", documentId)
      .maybeSingle()

    if (error) {
      const correlationId = randomUUID()
      console.error("[Admin Document GET Error]", { correlationId, error })
      return NextResponse.json({ error: "Failed to fetch document", correlationId }, { status: 500 })
    }

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: doc })
  } catch (error) {
    console.error("[AdminDocuments GET] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ documentId: string }> }) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { documentId } = await params
    const body = await request.json()

    if (isTestWorkspace(user)) {
      return NextResponse.json({ success: true, message: "Document updated" })
    }

    const dbCheck = requireDatabase()
    if (dbCheck) return dbCheck

    // Whitelist allowed fields matching DealDocument schema
    const { status, rejectionReason, uploadVisibility } = body
    if (status === undefined && rejectionReason === undefined && uploadVisibility === undefined) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
    }

    const VALID_STATUSES = ["UPLOADED", "UNDER_REVIEW", "APPROVED", "REJECTED"]
    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` }, { status: 400 })
    }

    const VALID_VISIBILITIES = ["BUYER_ADMIN", "ADMIN_ONLY", "DEALER_ONLY"]
    if (uploadVisibility !== undefined && !VALID_VISIBILITIES.includes(uploadVisibility)) {
      return NextResponse.json({ error: `Invalid visibility. Must be one of: ${VALID_VISIBILITIES.join(", ")}` }, { status: 400 })
    }

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() }
    if (status !== undefined) updates.status = status
    if (rejectionReason !== undefined) updates.rejectionReason = rejectionReason
    if (uploadVisibility !== undefined) updates.uploadVisibility = uploadVisibility

    const { error } = await supabase
      .from("DealDocument")
      .update(updates)
      .eq("id", documentId)

    if (error) {
      const correlationId = randomUUID()
      console.error("[Admin Document PATCH Error]", { correlationId, error })
      return NextResponse.json({ error: "Failed to update document", correlationId }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Document updated" })
  } catch (error) {
    console.error("[AdminDocuments PATCH] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ documentId: string }> }) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { documentId } = await params

    if (isTestWorkspace(user)) {
      return NextResponse.json({ success: true, message: "Document deleted" })
    }

    const dbCheck3 = requireDatabase()
    if (dbCheck3) return dbCheck3

    // Fetch storagePath so we can delete the file from storage too
    const { data: doc } = await supabase
      .from("DealDocument")
      .select("storagePath")
      .eq("id", documentId)
      .maybeSingle()

    if (doc?.storagePath) {
      const bucket = process.env["SUPABASE_DOCUMENTS_BUCKET"] || "buyer-documents"
      await supabase.storage.from(bucket).remove([doc.storagePath])
    }

    const { error } = await supabase
      .from("DealDocument")
      .delete()
      .eq("id", documentId)

    if (error) {
      const correlationId = randomUUID()
      console.error("[Admin Document DELETE Error]", { correlationId, error })
      return NextResponse.json({ error: "Failed to delete document", correlationId }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Document deleted" })
  } catch (error) {
    console.error("[AdminDocuments DELETE] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
