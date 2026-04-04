import { NextResponse, type NextRequest } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { supabase } from "@/lib/db"
import { requireDatabase } from "@/lib/require-database"
import { isTestWorkspace } from "@/lib/app-mode"
import { mockDb } from "@/lib/mocks/mockStore"
import { logger } from "@/lib/logger"

const ALLOWED_TYPES = ["W9", "ID", "BANK", "VOIDED_CHECK", "OTHER"]
const ALLOWED_MIME = ["application/pdf", "image/jpeg", "image/png"]
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

export async function GET() {
  try {
    const user = await getSessionUser()
    const isAffiliate =
      user &&
      (user.role === "AFFILIATE" ||
        user.role === "AFFILIATE_ONLY" ||
        (user.role === "BUYER" && user.is_affiliate === true))

    if (!user || !isAffiliate) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    if (isTestWorkspace(user)) {
      const docs = (mockDb.affiliateDocuments || []).filter(
        (d: any) => d.affiliateUserId === user.userId,
      )
      return NextResponse.json({ success: true, documents: docs })
    }

    const dbUnavailable = requireDatabase()
    if (dbUnavailable) return dbUnavailable

    // Derive affiliateId server-side
    const { data: affiliate } = await supabase
      .from("Affiliate")
      .select("id")
      .eq("userId", user.userId)
      .maybeSingle()

    if (!affiliate) {
      return NextResponse.json({ success: true, documents: [] })
    }

    const { data: documents, error } = await supabase
      .from("AffiliateDocument")
      .select("*")
      .eq("affiliateId", affiliate.id)
      .eq("workspaceId", user.workspace_id)
      .order("createdAt", { ascending: false })

    if (error) {
      logger.error("[Affiliate Documents] Fetch error:", error)
      return NextResponse.json({ success: false, error: "Failed to load documents" }, { status: 500 })
    }

    return NextResponse.json({ success: true, documents: documents || [] })
  } catch {
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser()
    const isAffiliate =
      user &&
      (user.role === "AFFILIATE" ||
        user.role === "AFFILIATE_ONLY" ||
        (user.role === "BUYER" && user.is_affiliate === true))

    if (!user || !isAffiliate) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const docType = (formData.get("type") as string) || "OTHER"

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(docType)) {
      return NextResponse.json({ success: false, error: `Invalid document type. Allowed: ${ALLOWED_TYPES.join(", ")}` }, { status: 400 })
    }

    if (!ALLOWED_MIME.includes(file.type)) {
      return NextResponse.json({ success: false, error: "Only PDF, JPG, and PNG files are accepted" }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, error: "File size must be under 10 MB" }, { status: 400 })
    }

    if (isTestWorkspace(user)) {
      const docs = (mockDb.affiliateDocuments ||= [])
      const doc = {
        id: `test_doc_${Date.now()}`,
        affiliateUserId: user.userId,
        type: docType,
        fileName: file.name,
        filePath: `/test-workspace/${user.userId}/${file.name}`,
        fileSize: file.size,
        mimeType: file.type,
        status: "PENDING",
        visibility: "INTERNAL",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      docs.unshift(doc)
      return NextResponse.json({ success: true, document: doc })
    }

    const dbCheck = requireDatabase()
    if (dbCheck) return dbCheck

    const { data: affiliate } = await supabase
      .from("Affiliate")
      .select("id")
      .eq("userId", user.userId)
      .maybeSingle()

    if (!affiliate) {
      return NextResponse.json({ success: false, error: "Affiliate profile not found" }, { status: 404 })
    }

    // Upload to Supabase Storage
    // Pass the File directly — Buffer.from is not available in the Next.js 16
    // serverless/edge runtime and causes a ReferenceError at upload time.
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const storagePath = `${user.workspace_id || "default"}/${affiliate.id}/${docType}_${Date.now()}_${safeName}`

    const { error: uploadError } = await supabase.storage
      .from("affiliate-documents")
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      logger.error("[Affiliate Documents] Upload error:", uploadError)
      return NextResponse.json({ success: false, error: "Failed to upload file" }, { status: 500 })
    }

    const { data: doc, error: insertError } = await supabase
      .from("AffiliateDocument")
      .insert({
        affiliateId: affiliate.id,
        workspaceId: user.workspace_id || null,
        type: docType,
        fileName: safeName,
        filePath: storagePath,
        fileSize: file.size,
        mimeType: file.type,
        status: "PENDING",
        visibility: "INTERNAL",
      })
      .select()
      .single()

    if (insertError) {
      logger.error("[Affiliate Documents] Insert error:", insertError)
      return NextResponse.json({ success: false, error: "Failed to save document record" }, { status: 500 })
    }

    return NextResponse.json({ success: true, document: doc })
  } catch {
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 })
  }
}
