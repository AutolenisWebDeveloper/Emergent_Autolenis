import { type NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { getSessionUser } from "@/lib/auth-server"
import { supabase } from "@/lib/db"
import { requireDatabase } from "@/lib/require-database"
import { isAcceptedDocumentMimeType, MAX_DOCUMENT_FILE_SIZE } from "@/lib/utils/documents"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || !["DEALER", "DEALER_USER"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dbUnavailable = requireDatabase()
    if (dbUnavailable) return dbUnavailable

    // Get dealer profile
    const { data: dealer } = await supabase
      .from("Dealer")
      .select("id, workspaceId")
      .eq("userId", user.userId)
      .single()

    if (!dealer) {
      return NextResponse.json({ error: "Dealer not found" }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const type = (formData.get("type") as string) || "OTHER"
    const visibility = (formData.get("visibility") as string) || "BUYER_ADMIN"
    const dealId = formData.get("dealId") as string | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate MIME type — reject files without a recognized MIME type
    if (!file.type || !isAcceptedDocumentMimeType(file.type)) {
      return NextResponse.json({ error: "Unsupported file type. Please upload a PDF or image." }, { status: 400 })
    }

    // Validate file size
    if (file.size > MAX_DOCUMENT_FILE_SIZE) {
      return NextResponse.json({ error: `File too large. Maximum size is ${MAX_DOCUMENT_FILE_SIZE / (1024 * 1024)} MB.` }, { status: 400 })
    }

    // Validate visibility enum
    const validVisibilities = ["BUYER_ADMIN", "ADMIN_ONLY", "DEALER_ONLY"]
    if (!validVisibilities.includes(visibility)) {
      return NextResponse.json({ error: "Invalid visibility value" }, { status: 400 })
    }

    // If dealId provided, verify it belongs to this dealer
    if (dealId && dealId !== "none") {
      const { data: deal } = await supabase
        .from("SelectedDeal")
        .select("id")
        .eq("id", dealId)
        .eq("dealerId", dealer.id)
        .single()

      if (!deal) {
        return NextResponse.json({ error: "Deal not found or not authorized" }, { status: 403 })
      }
    }

    // Sanitize file name to prevent path traversal
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")

    // Upload file to Supabase Storage
    const bucket = process.env["SUPABASE_DOCUMENTS_BUCKET"] || "buyer-documents"
    const wsPrefix = dealer.workspaceId || "default"
    const storagePath = `${wsPrefix}/dealer/${dealer.id}/${Date.now()}-${safeName}`

    const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, file, {
      contentType: file.type || undefined,
      upsert: false,
    })

    if (uploadError) {
      const correlationId = randomUUID()
      console.error("[Dealer Document Upload] Storage error:", { correlationId, error: uploadError })
      return NextResponse.json({ error: "Failed to upload file to storage", correlationId }, { status: 500 })
    }

    // Private bucket — generate a long-lived signed URL (7 days).
    // Public URLs are empty for private buckets.
    const { data: signedData, error: signedErr } = await supabase.storage
      .from(bucket)
      .createSignedUrl(storagePath, 60 * 60 * 24 * 7)

    if (signedErr || !signedData?.signedUrl) {
      const correlationId = randomUUID()
      console.error("[Dealer Document Upload] Signed URL error:", { correlationId, error: signedErr })
      return NextResponse.json({ error: "Failed to generate document URL", correlationId }, { status: 500 })
    }

    const fileUrl = signedData.signedUrl

    const { data: doc, error } = await supabase
      .from("DealDocument")
      .insert({
        ownerUserId: user.userId,
        dealId: dealId && dealId !== "none" ? dealId : null,
        type,
        fileName: safeName,
        mimeType: file.type || null,
        fileSize: file.size || null,
        fileUrl,
        storagePath,
        status: "UPLOADED",
        uploadVisibility: validVisibilities.includes(visibility) ? visibility : "BUYER_ADMIN",
        workspaceId: dealer.workspaceId,
      })
      .select("id")
      .single()

    if (error) {
      const correlationId = randomUUID()
      console.error("[Dealer Document Upload] Error:", { correlationId, error })
      return NextResponse.json({ error: "Failed to save document", correlationId }, { status: 500 })
    }

    return NextResponse.json({ success: true, document: doc })
  } catch (error) {
    const correlationId = randomUUID()
    console.error("[Dealer Document Upload] Error:", { correlationId, error })
    return NextResponse.json({ error: "Internal server error", correlationId }, { status: 500 })
  }
}
