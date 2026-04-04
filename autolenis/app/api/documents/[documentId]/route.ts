import { type NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { supabase, isDatabaseConfigured } from "@/lib/db"
import { requireDatabase } from "@/lib/require-database"
import { isDocumentType, isAcceptedDocumentMimeType } from "@/lib/utils/documents"

export const dynamic = "force-dynamic"

// GET /api/documents/[documentId] — Get a single document
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { documentId } = await params

    const { data: document, error } = await supabase
      .from("DealDocument")
      .select("*")
      .eq("id", documentId)
      .single()

    if (error || !document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Enforce access control
    if (user.role === "BUYER" && document.ownerUserId !== user.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (user.role === "DEALER") {
      if (!document.dealId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      const { data: dealerProfile } = await supabase
        .from("Dealer")
        .select("id")
        .eq("userId", user.userId)
        .single()

      if (!dealerProfile) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }

      const { data: deal } = await supabase
        .from("SelectedDeal")
        .select("id")
        .eq("id", document.dealId)
        .eq("dealerId", dealerProfile.id)
        .single()

      if (!deal) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    // Admin can see all
    return NextResponse.json({ success: true, document })
  } catch (error) {
    const correlationId = randomUUID()
    console.error("[Document Get Error]", { correlationId, error })
    return NextResponse.json({ error: "Internal server error", correlationId }, { status: 500 })
  }
}

// PATCH /api/documents/[documentId] — Update a document
// Buyers: edit own document metadata (fileName, type)
// Dealer/Admin: approve/reject documents
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { documentId } = await params
    const body = await request.json()

    // Get the document first
    const { data: document, error: fetchError } = await supabase
      .from("DealDocument")
      .select("*")
      .eq("id", documentId)
      .single()

    if (fetchError || !document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Buyer editing own document metadata
    if (user.role === "BUYER") {
      if (document.ownerUserId !== user.userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      const { fileName, type } = body
      const updateData: Record<string, unknown> = {
        updatedAt: new Date().toISOString(),
      }
      if (fileName && typeof fileName === "string") {
        updateData.fileName = fileName
      }
      if (type && typeof type === "string") {
        if (!isDocumentType(type)) {
          return NextResponse.json({ error: "Invalid document type" }, { status: 400 })
        }
        updateData.type = type
      }
      if (Object.keys(updateData).length <= 1) {
        return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
      }
      const { data: updated, error: updateError } = await supabase
        .from("DealDocument")
        .update(updateData)
        .eq("id", documentId)
        .select()
        .single()
      if (updateError) {
        console.error("[Document Update Error]", updateError)
        return NextResponse.json({ error: "Failed to update document" }, { status: 500 })
      }
      return NextResponse.json({ success: true, document: updated })
    }

    // Dealer/Admin: approve/reject flow
    if (user.role !== "DEALER" && !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { status, rejectionReason } = body

    if (!status || !["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json(
        { error: "Status must be APPROVED or REJECTED" },
        { status: 400 }
      )
    }

    // Dealer permission check
    if (user.role === "DEALER") {
      if (!document.dealId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      const { data: dealerProfile } = await supabase
        .from("Dealer")
        .select("id")
        .eq("userId", user.userId)
        .single()

      if (!dealerProfile) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }

      const { data: deal } = await supabase
        .from("SelectedDeal")
        .select("id")
        .eq("id", document.dealId)
        .eq("dealerId", dealerProfile.id)
        .single()

      if (!deal) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    const updateData: Record<string, unknown> = {
      status,
      updatedAt: new Date().toISOString(),
    }
    if (status === "REJECTED" && rejectionReason) {
      updateData.rejectionReason = rejectionReason
    }

    const { data: updated, error: updateError } = await supabase
      .from("DealDocument")
      .update(updateData)
      .eq("id", documentId)
      .select()
      .single()

    if (updateError) {
      const correlationId = randomUUID()
      console.error("[Document Update Error]", { correlationId, error: updateError })
      return NextResponse.json({ error: "Failed to update document", correlationId }, { status: 500 })
    }

    // If this document satisfies a request, update the request status too
    if (document.requestId) {
      const requestUpdate: Record<string, unknown> = {
        status,
        decidedByUserId: user.userId,
        decidedByRole: user.role,
        decidedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      if (status === "REJECTED" && rejectionReason) {
        requestUpdate.decisionNotes = rejectionReason
      }
      await supabase
        .from("DocumentRequest")
        .update(requestUpdate)
        .eq("id", document.requestId)
    }

    return NextResponse.json({ success: true, document: updated })
  } catch (error) {
    const correlationId = randomUUID()
    console.error("[Document Update Error]", { correlationId, error })
    return NextResponse.json({ error: "Internal server error", correlationId }, { status: 500 })
  }
}

// PUT /api/documents/[documentId] — Replace document file (owner only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { documentId } = await params

    const { data: document, error: fetchError } = await supabase
      .from("DealDocument")
      .select("*")
      .eq("id", documentId)
      .single()

    if (fetchError || !document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Only the document owner or admin can replace
    if (document.ownerUserId !== user.userId && !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const contentType = request.headers.get("content-type") || ""
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Multipart form data required" }, { status: 400 })
    }

    const formData = await request.formData()
    const file = formData.get("file")
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file upload" }, { status: 400 })
    }

    const mimeType = file.type || null
    if (mimeType && !isAcceptedDocumentMimeType(mimeType)) {
      return NextResponse.json({ error: "Unsupported file type. Please upload a PDF or image." }, { status: 400 })
    }

    const fileName = file.name
    const fileSize = file.size || null
    let fileUrl: string | null = null
    let storagePath: string | null = null
    const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_")

    if (!isDatabaseConfigured()) {
      const wsPrefix = user.workspace_id || "default"
      storagePath = `${wsPrefix}/${user.userId}/${document.dealId || "general"}/${Date.now()}-${safeFileName}`
      fileUrl = `test://documents/${storagePath}`
    } else {
      const bucket = process.env["SUPABASE_DOCUMENTS_BUCKET"] || "buyer-documents"
      const wsPrefix = user.workspace_id || "default"
      storagePath = `${wsPrefix}/${user.userId}/${document.dealId || "general"}/${Date.now()}-${safeFileName}`

      // Remove old file from storage if it exists
      if (document.storagePath) {
        const { error: removeError } = await supabase.storage.from(bucket).remove([document.storagePath])
        if (removeError) {
          console.error("[Document Replace] Failed to remove old file, continuing with upload", removeError)
        }
      }

      const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, file, {
        contentType: mimeType || undefined,
        upsert: false,
      })
      if (uploadError) {
        const correlationId = randomUUID()
        console.error("[Document Replace Error]", { correlationId, error: uploadError })
        return NextResponse.json({ error: "Failed to upload replacement file", correlationId }, { status: 500 })
      }

      const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(storagePath)
      fileUrl = publicUrlData?.publicUrl || null

      if (!fileUrl) {
        const { data: signedUrlData, error: signedError } = await supabase.storage
          .from(bucket)
          .createSignedUrl(storagePath, 60 * 60 * 24 * 7)
        if (signedError) {
          const correlationId = randomUUID()
          console.error("[Document Replace Error]", { correlationId, error: signedError })
          return NextResponse.json({ error: "Failed to generate document URL", correlationId }, { status: 500 })
        }
        fileUrl = signedUrlData?.signedUrl || null
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from("DealDocument")
      .update({
        fileName: safeFileName,
        mimeType,
        fileSize,
        fileUrl,
        storagePath,
        status: "UPLOADED",
        rejectionReason: null,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", documentId)
      .select()
      .single()

    if (updateError) {
      const correlationId = randomUUID()
      console.error("[Document Replace Error]", { correlationId, error: updateError })
      return NextResponse.json({ error: "Failed to update document record", correlationId }, { status: 500 })
    }

    return NextResponse.json({ success: true, document: updated })
  } catch (error) {
    const correlationId = randomUUID()
    console.error("[Document Replace Error]", { correlationId, error })
    return NextResponse.json({ error: "Internal server error", correlationId }, { status: 500 })
  }
}

// DELETE /api/documents/[documentId] — Delete a document (owner or admin)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { documentId } = await params

    const { data: document, error: fetchError } = await supabase
      .from("DealDocument")
      .select("*")
      .eq("id", documentId)
      .single()

    if (fetchError || !document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Only the document owner or admin can delete
    if (document.ownerUserId !== user.userId && !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Remove file from storage if it exists
    if (document.storagePath && isDatabaseConfigured()) {
      const bucket = process.env["SUPABASE_DOCUMENTS_BUCKET"] || "buyer-documents"
      await supabase.storage.from(bucket).remove([document.storagePath])
    }

    // Delete the document record
    const { error: deleteError } = await supabase
      .from("DealDocument")
      .delete()
      .eq("id", documentId)

    if (deleteError) {
      const correlationId = randomUUID()
      console.error("[Document Delete Error]", { correlationId, error: deleteError })
      return NextResponse.json({ error: "Failed to delete document", correlationId }, { status: 500 })
    }

    // If linked to a request, revert request status to REQUESTED
    if (document.requestId) {
      await supabase
        .from("DocumentRequest")
        .update({
          status: "REQUESTED",
          updatedAt: new Date().toISOString(),
        })
        .eq("id", document.requestId)
    }

    return NextResponse.json({ success: true, message: "Document deleted" })
  } catch (error) {
    const correlationId = randomUUID()
    console.error("[Document Delete Error]", { correlationId, error })
    return NextResponse.json({ error: "Internal server error", correlationId }, { status: 500 })
  }
}
