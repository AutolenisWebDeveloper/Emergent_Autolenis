import { type NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { getSessionUser } from "@/lib/auth-server"
import { createClient } from "@/lib/supabase/server"
import { InsuranceService } from "@/lib/services/insurance.service"
import { INSURANCE_ACCEPTED_FILE_TYPES } from "@/lib/constants/insurance"
import type { InsuranceDocumentTag } from "@/lib/constants/insurance"

export const dynamic = "force-dynamic"

/** Maximum allowed file size for insurance uploads (25 MB) */
const MAX_INSURANCE_FILE_SIZE = 25 * 1024 * 1024

/**
 * MIME types accepted for insurance document uploads.
 * Matches the INSURANCE_ACCEPTED_FILE_TYPES constant from insurance.ts.
 */
const ACCEPTED_MIME_TYPES: Record<string, string> = {
  "application/pdf": "PDF",
  "image/jpeg": "JPG",
  "image/png": "PNG",
  "image/heic": "HEIC",
  "image/heif": "HEIC",
}

const VALID_DOCUMENT_TAGS = ["insurance_card", "insurance_declarations", "insurance_binder", "insurance_other"]

/**
 * POST /api/buyer/insurance/upload
 *
 * Handles multipart file upload for insurance documents.
 * Stores the file in Supabase Storage, then registers it with the
 * insurance readiness service.
 *
 * FormData fields:
 * - file: File (required) — PDF/PNG/JPG/JPEG/HEIC
 * - dealId: string (required)
 * - documentTag: string (required) — insurance_card|insurance_declarations|insurance_binder|insurance_other
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || user.role !== "BUYER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const dealId = formData.get("dealId") as string | null
    const documentTag = formData.get("documentTag") as string | null

    // Validate required fields
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }
    if (!dealId) {
      return NextResponse.json({ error: "dealId is required" }, { status: 400 })
    }
    if (!documentTag || !VALID_DOCUMENT_TAGS.includes(documentTag)) {
      return NextResponse.json(
        { error: `Invalid documentTag. Must be one of: ${VALID_DOCUMENT_TAGS.join(", ")}` },
        { status: 400 },
      )
    }

    // Validate MIME type
    const mimeType = file.type?.toLowerCase() || ""
    const fileTypeLabel = ACCEPTED_MIME_TYPES[mimeType]
    if (!fileTypeLabel) {
      return NextResponse.json(
        { error: `Unsupported file type. Accepted: ${INSURANCE_ACCEPTED_FILE_TYPES.join(", ")}` },
        { status: 400 },
      )
    }

    // Validate file size
    if (file.size > MAX_INSURANCE_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_INSURANCE_FILE_SIZE / (1024 * 1024)} MB.` },
        { status: 400 },
      )
    }

    // Get buyer profile to resolve workspace
    const supabase = await createClient()
    const { data: buyer } = await supabase
      .from("BuyerProfile")
      .select("id, userId")
      .eq("userId", user.userId)
      .maybeSingle()

    if (!buyer) {
      return NextResponse.json({ error: "Buyer profile not found" }, { status: 404 })
    }

    // Verify the deal belongs to this buyer
    const { data: deal } = await supabase
      .from("SelectedDeal")
      .select("id, workspaceId")
      .eq("id", dealId)
      .or(`user_id.eq.${user.userId},buyerId.eq.${buyer.id}`)
      .maybeSingle()

    if (!deal) {
      return NextResponse.json({ error: "Deal not found or unauthorized" }, { status: 404 })
    }

    // Sanitize file name to prevent path traversal
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")

    // Upload file to Supabase Storage
    const bucket = process.env["SUPABASE_DOCUMENTS_BUCKET"] || "buyer-documents"
    const wsPrefix = deal.workspaceId || "default"
    const storagePath = `${wsPrefix}/insurance/${dealId}/${Date.now()}-${safeName}`

    const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, file, {
      contentType: file.type || undefined,
      upsert: false,
    })

    if (uploadError) {
      const correlationId = randomUUID()
      console.error("[Insurance Upload] Storage error:", { correlationId, error: uploadError })
      return NextResponse.json({ error: "Failed to upload file to storage", correlationId }, { status: 500 })
    }

    // Private bucket — generate a signed URL (7 days).
    const { data: signedData, error: signedErr } = await supabase.storage
      .from(bucket)
      .createSignedUrl(storagePath, 60 * 60 * 24 * 7)

    if (signedErr || !signedData?.signedUrl) {
      const correlationId = randomUUID()
      console.error("[Insurance Upload] Signed URL error:", { correlationId, error: signedErr })
      return NextResponse.json({ error: "Failed to generate document URL", correlationId }, { status: 500 })
    }

    const fileUrl = signedData.signedUrl

    // Register the upload with the insurance readiness service
    const result = await InsuranceService.uploadInsuranceDocument(
      dealId,
      user.userId,
      fileUrl,
      fileTypeLabel,
      documentTag as InsuranceDocumentTag,
    )

    return NextResponse.json({ success: true, data: { ...result, fileUrl } })
  } catch (error: any) {
    const correlationId = randomUUID()
    console.error("[Insurance Upload] Error:", { correlationId, error })
    const message = error?.message || "Insurance upload failed"
    const status = message.includes("not found") || message.includes("unauthorized") ? 404 : 500
    return NextResponse.json({ error: message, correlationId }, { status })
  }
}
