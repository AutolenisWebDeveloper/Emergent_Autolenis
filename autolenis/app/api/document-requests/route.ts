import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { supabase } from "@/lib/db"
import { emailService } from "@/lib/services/email.service"
import { formatDocumentType, VALID_DOCUMENT_TYPES } from "@/lib/utils/documents"

export const dynamic = "force-dynamic"

// GET /api/document-requests — List document requests (role-filtered)
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const dealId = searchParams.get("dealId")
    const status = searchParams.get("status")

    let query = supabase
      .from("DocumentRequest")
      .select("*")
      .order("createdAt", { ascending: false })

    if (user.role === "BUYER") {
      // Buyer sees their own requests
      query = query.eq("buyerId", user.userId)
    } else if (user.role === "DEALER") {
      // Dealer sees requests for deals they are associated with
      const { data: dealerProfile } = await supabase
        .from("Dealer")
        .select("id")
        .eq("userId", user.userId)
        .single()

      if (!dealerProfile) {
        return NextResponse.json({ requests: [] })
      }

      const { data: deals } = await supabase
        .from("SelectedDeal")
        .select("id")
        .eq("dealerId", dealerProfile.id)

      const dealIds = deals?.map((d: { id: string }) => d.id) || []
      if (dealIds.length === 0) {
        return NextResponse.json({ requests: [] })
      }
      query = query.in("dealId", dealIds)
    } else if (user.role === "ADMIN") {
      // Admin sees all, optionally filtered
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Optional filters
    if (dealId) {
      query = query.eq("dealId", dealId)
    }
    if (status && status !== "all") {
      query = query.eq("status", status)
    }

    const { data: requests, error } = await query

    if (error) {
      console.error("[Document Requests List Error]", error)
      return NextResponse.json({ error: "Failed to load requests" }, { status: 500 })
    }

    return NextResponse.json({ requests: requests || [] })
  } catch (error) {
    console.error("[Document Requests Error]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/document-requests — Create a document request (Dealer/Admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (user.role !== "DEALER" && !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Only dealers and admins can create document requests" }, { status: 403 })
    }

    const body = await request.json()
    const { dealId, buyerId, type, required, notes, dueDate } = body

    if (!dealId || !buyerId || !type) {
      return NextResponse.json(
        { error: "Missing required fields: dealId, buyerId, type" },
        { status: 400 }
      )
    }

    // Validate type
    if (!VALID_DOCUMENT_TYPES.includes(type)) {
      return NextResponse.json({ error: "Invalid document type" }, { status: 400 })
    }

    // Verify deal exists and dealer has access
    if (user.role === "DEALER") {
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
    }

    const requestData = {
      dealId,
      buyerId,
      requestedByUserId: user.userId,
      requestedByRole: user.role,
      type,
      required: required !== false,
      notes: notes || null,
      dueDate: dueDate || null,
      status: "REQUESTED",
    }

    const { data: docRequest, error } = await supabase
      .from("DocumentRequest")
      .insert(requestData)
      .select()
      .single()

    if (error) {
      console.error("[Document Request Create Error]", error)
      return NextResponse.json({ error: "Failed to create request" }, { status: 500 })
    }

    // Send notification email to buyer
    try {
      const { data: buyerUser } = await supabase
        .from("User")
        .select("email, first_name")
        .eq("id", buyerId)
        .single()

      if (buyerUser?.email) {
        const APP_URL = process.env["NEXT_PUBLIC_APP_URL"] || "https://autolenis.com"
        await emailService.sendNotification(
          buyerUser.email,
          "Document Required for Your Deal",
          `Hi ${buyerUser.first_name || "there"}, a ${formatDocumentType(type)} document has been requested for your deal. ${notes ? `Notes: ${notes}` : ""} Please upload the document at your earliest convenience.`,
          "View Requests",
          `${APP_URL}/buyer/documents`
        )
      }
    } catch (emailError) {
      console.error("[Document Request Email Error]", emailError)
      // Don't fail the request if email fails
    }

    return NextResponse.json({ success: true, request: docRequest }, { status: 201 })
  } catch (error) {
    console.error("[Document Request Error]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
