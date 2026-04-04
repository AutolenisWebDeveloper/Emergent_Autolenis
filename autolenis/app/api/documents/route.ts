import { type NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { getSessionUser } from "@/lib/auth-server"
import { supabase, isDatabaseConfigured } from "@/lib/db"
import { requireDatabase } from "@/lib/require-database"
import { isDocumentType, isAcceptedDocumentMimeType, MAX_DOCUMENT_FILE_SIZE } from "@/lib/utils/documents"
import { isTestWorkspace } from "@/lib/app-mode"
import { mockDb } from "@/lib/mocks/mockStore"

export const dynamic = "force-dynamic"

// GET /api/documents — List documents (role-filtered)
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (isTestWorkspace(user)) {
      const documents = (mockDb.dealDocuments || []).filter((doc: any) =>
        user.role === "BUYER" ? doc.ownerUserId === user.userId : true,
      )
      return NextResponse.json({ documents })
    }

    const dbUnavailable = requireDatabase()
    if (dbUnavailable) return dbUnavailable

    const searchParams = request.nextUrl.searchParams
    const dealId = searchParams.get("dealId")
    const type = searchParams.get("type")
    const status = searchParams.get("status")
    const search = searchParams.get("search")

    let query = supabase
      .from("DealDocument")
      .select("*")
      .order("createdAt", { ascending: false })

    // Workspace scoping — always filter by session workspace
    if (user.workspace_id) {
      query = query.eq("workspaceId", user.workspace_id)
    }

    // Role-based scoping
    if (user.role === "BUYER") {
      query = query.eq("ownerUserId", user.userId)
    } else if (user.role === "DEALER") {
      // Dealer can only see documents on deals they are associated with
      if (!dealId) {
        // Get all deals associated with this dealer
        const { data: dealerProfile } = await supabase
          .from("Dealer")
          .select("id")
          .eq("userId", user.userId)
          .single()

        if (!dealerProfile) {
          return NextResponse.json({ documents: [] })
        }

        const { data: deals } = await supabase
          .from("SelectedDeal")
          .select("id")
          .eq("dealerId", dealerProfile.id)

        const dealIds = deals?.map((d: { id: string }) => d.id) || []
        if (dealIds.length === 0) {
          return NextResponse.json({ documents: [] })
        }
        query = query.in("dealId", dealIds)
      } else {
        // Verify dealer is associated with this deal
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
          .eq("id", dealId)
          .eq("dealerId", dealerProfile.id)
          .single()

        if (!deal) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }
        query = query.eq("dealId", dealId)
      }
    } else if (user.role === "ADMIN") {
      // Admin can see all documents, optionally filtered by deal
      if (dealId) {
        query = query.eq("dealId", dealId)
      }
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Apply optional filters
    if (type && type !== "all") {
      query = query.eq("type", type)
    }
    if (status && status !== "all") {
      query = query.eq("status", status)
    }
    if (search) {
      query = query.ilike("fileName", `%${search}%`)
    }

    const { data: documents, error } = await query

    if (error) {
      const correlationId = randomUUID()
      console.error("[Documents GET Error]", { correlationId, error })
      return NextResponse.json({ error: "Failed to load documents", correlationId }, { status: 500 })
    }

    return NextResponse.json({ documents: documents || [] })
  } catch (error) {
    const correlationId = randomUUID()
    console.error("[Documents GET Error]", { correlationId, error })
    return NextResponse.json({ error: "Internal server error", correlationId }, { status: 500 })
  }
}

// POST /api/documents — Upload a document
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only buyers can upload their own documents via this endpoint
    if (user.role !== "BUYER") {
      return NextResponse.json({ error: "Only buyers can upload documents" }, { status: 403 })
    }

    const contentType = request.headers.get("content-type") || ""
    let type: string | null = null
    let fileName: string | null = null
    let mimeType: string | null = null
    let fileSize: number | null = null
    let fileUrl: string | null = null
    let storagePath: string | null = null
    let dealId: string | null = null
    let requestId: string | null = null

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData()
      type = formData.get("type") as string | null
      dealId = (formData.get("dealId") as string | null) || null
      requestId = (formData.get("requestId") as string | null) || null
      const providedFileName = formData.get("fileName") as string | null
      const file = formData.get("file")

      if (!(file instanceof File)) {
        return NextResponse.json({ error: "Missing file upload" }, { status: 400 })
      }

      fileName = providedFileName || file.name
      mimeType = file.type || null
      fileSize = file.size || null

      if (!type || !fileName) {
        return NextResponse.json({ error: "Missing required fields: type, fileName" }, { status: 400 })
      }

      if (mimeType && !isAcceptedDocumentMimeType(mimeType)) {
        return NextResponse.json({ error: "Unsupported file type. Please upload a PDF or image." }, { status: 400 })
      }

      if (file.size > MAX_DOCUMENT_FILE_SIZE) {
        return NextResponse.json({ error: `File too large. Maximum size is ${MAX_DOCUMENT_FILE_SIZE / (1024 * 1024)} MB.` }, { status: 400 })
      }

      const wsPrefix = user.workspace_id || "default"

      if (isTestWorkspace(user) || !isDatabaseConfigured()) {
        storagePath = `${wsPrefix}/${user.userId}/${dealId || "general"}/${Date.now()}-${fileName}`
        fileUrl = `test://documents/${storagePath}`
      } else {
        const bucket = process.env["SUPABASE_DOCUMENTS_BUCKET"] || "buyer-documents"
        const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_")
        storagePath = `${wsPrefix}/${user.userId}/${dealId || "general"}/${Date.now()}-${safeFileName}`

        const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, file, {
          contentType: mimeType || undefined,
          upsert: false,
        })

        if (uploadError) {
          const correlationId = randomUUID()
          console.error("[Document Upload Error]", { correlationId, error: uploadError })
          return NextResponse.json({ error: "Failed to upload document", correlationId }, { status: 500 })
        }

        // buyer-documents is a private bucket — always use signed URLs.
        // getPublicUrl returns an empty string for private buckets.
        const { data: signedUrlData, error: signedError } = await supabase.storage
          .from(bucket)
          .createSignedUrl(storagePath, 60 * 60 * 24 * 7) // 7-day signed URL
        if (signedError || !signedUrlData?.signedUrl) {
          const correlationId = randomUUID()
          console.error("[Document Upload Error]", { correlationId, error: signedError })
          return NextResponse.json({ error: "Failed to generate document URL", correlationId }, { status: 500 })
        }
        fileUrl = signedUrlData.signedUrl
      }
    } else {
      const body = await request.json()
      type = body.type
      fileName = body.fileName
      mimeType = body.mimeType || null
      fileSize = body.fileSize || null
      fileUrl = body.fileUrl
      storagePath = body.storagePath || null
      dealId = body.dealId || null
      requestId = body.requestId || null
    }

    if (!type || !fileName || !fileUrl) {
      return NextResponse.json({ error: "Missing required fields: type, fileName, fileUrl" }, { status: 400 })
    }

    // Validate type
    if (!isDocumentType(type)) {
      return NextResponse.json({ error: "Invalid document type" }, { status: 400 })
    }

    const documentData: Record<string, unknown> = {
      ownerUserId: user.userId,
      dealId: dealId || null,
      workspaceId: user.workspace_id || null,
      type,
      fileName,
      mimeType: mimeType || null,
      fileSize: fileSize || null,
      fileUrl,
      storagePath,
      status: "UPLOADED",
      requestId: requestId || null,
    }

    if (isTestWorkspace(user)) {
      const documents = (mockDb.dealDocuments ||= [])
      const now = new Date().toISOString()
      const document = {
        id: `test_doc_${Date.now()}`,
        ...documentData,
        workspaceId: user.workspace_id || null,
        createdAt: now,
        updatedAt: now,
      }
      documents.unshift(document)
      return NextResponse.json({ success: true, document }, { status: 201 })
    }

    const dbCheck = requireDatabase()
    if (dbCheck) return dbCheck

    const { data: document, error } = await supabase
      .from("DealDocument")
      .insert(documentData)
      .select()
      .single()

    if (error) {
      const correlationId = randomUUID()
      console.error("[Document Upload Error]", { correlationId, error })
      return NextResponse.json({ error: "Failed to save document", correlationId }, { status: 500 })
    }

    // If satisfying a request, update the request status
    if (requestId) {
      await supabase
        .from("DocumentRequest")
        .update({ status: "UPLOADED", updatedAt: new Date().toISOString() })
        .eq("id", requestId)
        .eq("buyerId", user.userId)
    }

    return NextResponse.json({ success: true, document }, { status: 201 })
  } catch (error) {
    const correlationId = randomUUID()
    console.error("[Document Upload Error]", { correlationId, error })
    return NextResponse.json({ error: "Internal server error", correlationId }, { status: 500 })
  }
}
