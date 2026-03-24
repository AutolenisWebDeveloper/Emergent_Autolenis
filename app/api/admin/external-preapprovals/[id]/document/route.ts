import { NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { externalPreApprovalService } from "@/lib/services/external-preapproval.service"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

/** Signed URL TTL: 1 hour */
const SIGNED_URL_EXPIRY_SECONDS = 60 * 60

/**
 * GET /api/admin/external-preapprovals/[id]/document
 * Returns a signed/time-limited URL for secure document access.
 * RBAC: ADMIN / SUPER_ADMIN only.
 * Documents are stored in private storage — no public URLs.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      )
    }

    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing submission ID" },
        { status: 400 },
      )
    }

    const submission = await externalPreApprovalService.getById(id)
    if (!submission) {
      return NextResponse.json(
        { success: false, error: "Submission not found" },
        { status: 404 },
      )
    }

    if (!submission.documentStoragePath) {
      return NextResponse.json(
        { success: false, error: "No document attached to this submission" },
        { status: 404 },
      )
    }

    // Generate a time-limited signed URL via Supabase Storage.
    // Uses the admin client to bypass RLS on the private bucket.
    let signedUrl: string | null = null
    try {
      const supabase = createAdminClient()
      const bucket = submission.storageBucket || "buyer-docs"
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(submission.documentStoragePath, SIGNED_URL_EXPIRY_SECONDS)
      if (error) {
        console.error("[Admin Document API] Signed URL error:", error)
      } else {
        signedUrl = data?.signedUrl ?? null
      }
    } catch (storageErr) {
      console.error("[Admin Document API] Storage client error:", storageErr)
    }

    return NextResponse.json({
      success: true,
      data: {
        signedUrl,
        expiresInSeconds: SIGNED_URL_EXPIRY_SECONDS,
        originalFileName: submission.originalFileName,
        mimeType: submission.mimeType,
        fileSizeBytes: submission.fileSizeBytes,
        sha256: submission.sha256,
      },
    })
  } catch (error: any) {
    console.error("[Admin External PreApproval Document API] GET error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    )
  }
}
