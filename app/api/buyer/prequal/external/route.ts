import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { externalPreApprovalService, STORAGE_BUCKET } from "@/lib/services/external-preapproval.service"
import { externalPreApprovalSubmitSchema } from "@/lib/validators/external-preapproval"
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  MAX_DOCUMENT_SIZE_BYTES,
} from "@/lib/validators/external-preapproval"
import { supabase } from "@/lib/db"
import crypto from "crypto"
import path from "path"

const SIGNED_URL_EXPIRY_SECONDS = 3600 // 1 hour

export const dynamic = "force-dynamic"

/**
 * GET /api/buyer/prequal/external
 * Returns the latest external pre-approval submission for the current buyer.
 * RBAC: BUYER only, scoped to own submissions.
 */
export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user || user.role !== "BUYER") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      )
    }

    const submission = await externalPreApprovalService.getLatestForBuyer(
      user.userId,
    )

    // Generate a signed URL for the buyer to view their uploaded document
    let documentUrl: string | null = null
    if (submission?.documentStoragePath && submission?.storageBucket) {
      try {
        const { data: signedUrlData, error: signedUrlError } =
          await supabase.storage
            .from(submission.storageBucket)
            .createSignedUrl(submission.documentStoragePath, SIGNED_URL_EXPIRY_SECONDS)
        if (!signedUrlError && signedUrlData?.signedUrl) {
          documentUrl = signedUrlData.signedUrl
        }
      } catch {
        // Signed URL generation is best-effort
      }
    }

    return NextResponse.json({
      success: true,
      data: { submission: submission ? { ...submission, documentUrl } : null },
    })
  } catch (error) {
    console.error("[External PreApproval API] GET error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch external pre-approval" },
      { status: 500 },
    )
  }
}

/**
 * POST /api/buyer/prequal/external
 * Buyer uploads lender pre-approval document + metadata.
 * RBAC: BUYER only.
 * OWASP: allowlist MIME types, random filenames, size limits, private storage, SHA256 hash.
 */
export async function POST(request: Request) {
  try {
    const user = await getSessionUser()
    if (!user || user.role !== "BUYER") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      )
    }

    const formData = await request.formData()

    // Parse and validate metadata
    const metadataRaw = formData.get("metadata")
    if (!metadataRaw || typeof metadataRaw !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing submission metadata" },
        { status: 400 },
      )
    }

    let parsedMetadata: unknown
    try {
      parsedMetadata = JSON.parse(metadataRaw)
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid metadata JSON" },
        { status: 400 },
      )
    }

    const validationResult = externalPreApprovalSubmitSchema.safeParse(parsedMetadata)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 },
      )
    }

    const input = validationResult.data

    // Process file upload (optional but recommended)
    const file = formData.get("file") as File | null
    let fileMetadata:
      | {
          storagePath: string
          originalFileName: string
          fileSizeBytes: number
          mimeType: string
          storageBucket: string
          sha256: string
        }
      | undefined

    if (file) {
      // OWASP: Validate file size
      if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
        return NextResponse.json(
          {
            success: false,
            error: `File too large. Maximum size is ${MAX_DOCUMENT_SIZE_BYTES / (1024 * 1024)} MB`,
          },
          { status: 400 },
        )
      }

      // OWASP: Validate MIME type (allowlist, don't trust Content-Type alone)
      if (
        !ALLOWED_DOCUMENT_MIME_TYPES.includes(
          file.type as (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number],
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid file type. Allowed types: ${ALLOWED_DOCUMENT_MIME_TYPES.join(", ")}`,
          },
          { status: 400 },
        )
      }

      // OWASP: Validate file extension matches MIME type
      const ext = path.extname(file.name).toLowerCase()
      const validExtensions: Record<string, string[]> = {
        "application/pdf": [".pdf"],
        "image/png": [".png"],
        "image/jpeg": [".jpg", ".jpeg"],
      }
      if (!validExtensions[file.type]?.includes(ext)) {
        return NextResponse.json(
          {
            success: false,
            error: "File extension does not match declared type",
          },
          { status: 400 },
        )
      }

      // OWASP: Generate random filename (don't use user-provided names for storage)
      const randomName = crypto.randomUUID()
      const storagePath = `${user.userId}/preapproval/${randomName}${ext}`

      // Compute SHA256 hash for file integrity verification.
      // The buffer is read once and reused for both hashing and storage upload.
      const fileBuffer = Buffer.from(await file.arrayBuffer())
      const sha256 = crypto.createHash("sha256").update(fileBuffer).digest("hex")

      // Upload file to private storage bucket
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, fileBuffer, {
          contentType: file.type,
          upsert: false,
        })

      if (uploadError) {
        console.error("[External PreApproval API] Storage upload error:", uploadError)
        return NextResponse.json(
          { success: false, error: "Failed to upload document to storage" },
          { status: 500 },
        )
      }

      // Sanitize original filename for metadata only (not used for storage paths)
      const safeOriginalName = file.name
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .replace(/\.{2,}/g, "_")

      fileMetadata = {
        storagePath,
        originalFileName: safeOriginalName,
        fileSizeBytes: file.size,
        mimeType: file.type,
        storageBucket: STORAGE_BUCKET,
        sha256,
      }
    }

    const submission = await externalPreApprovalService.submit(
      user.userId,
      input,
      fileMetadata,
      user.workspace_id,
    )

    return NextResponse.json(
      {
        success: true,
        data: { submission },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("[External PreApproval API] POST error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to submit external pre-approval" },
      { status: 500 },
    )
  }
}
