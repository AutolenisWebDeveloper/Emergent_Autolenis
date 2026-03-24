import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { supabase } from "@/lib/db"
import { emailService } from "@/lib/services/email.service"
import { formatDocumentType } from "@/lib/utils/documents"

export const dynamic = "force-dynamic"

// GET /api/document-requests/[requestId] — Get a single request
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { requestId } = await params

    const { data: docRequest, error } = await supabase
      .from("DocumentRequest")
      .select("*")
      .eq("id", requestId)
      .single()

    if (error || !docRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }

    // Access control
    if (user.role === "BUYER" && docRequest.buyerId !== user.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

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
        .eq("id", docRequest.dealId)
        .eq("dealerId", dealerProfile.id)
        .single()

      if (!deal) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    return NextResponse.json({ success: true, request: docRequest })
  } catch (error) {
    console.error("[Document Request Get Error]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH /api/document-requests/[requestId] — Update request (approve/reject)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { requestId } = await params
    const body = await request.json()

    // Get the existing request
    const { data: docRequest, error: fetchError } = await supabase
      .from("DocumentRequest")
      .select("*")
      .eq("id", requestId)
      .single()

    if (fetchError || !docRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }

    // Dealer/Admin can approve/reject
    if (body.status === "APPROVED" || body.status === "REJECTED") {
      if (user.role !== "DEALER" && !isAdminRole(user.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }

      // Dealer permission check
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
          .eq("id", docRequest.dealId)
          .eq("dealerId", dealerProfile.id)
          .single()

        if (!deal) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }
      }

      const updateData: Record<string, unknown> = {
        status: body.status,
        decidedByUserId: user.userId,
        decidedByRole: user.role,
        decidedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      if (body.decisionNotes) {
        updateData.decisionNotes = body.decisionNotes
      }

      const { data: updated, error: updateError } = await supabase
        .from("DocumentRequest")
        .update(updateData)
        .eq("id", requestId)
        .select()
        .single()

      if (updateError) {
        console.error("[Document Request Update Error]", updateError)
        return NextResponse.json({ error: "Failed to update request" }, { status: 500 })
      }

      // Send notification email to buyer about approval/rejection
      try {
        const { data: buyerUser } = await supabase
          .from("User")
          .select("email, first_name")
          .eq("id", docRequest.buyerId)
          .single()

        if (buyerUser?.email) {
          const statusText = body.status === "APPROVED" ? "approved" : "rejected"
          const APP_URL = process.env["NEXT_PUBLIC_APP_URL"] || "https://autolenis.com"
          await emailService.sendNotification(
            buyerUser.email,
            `Document ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}`,
            `Hi ${buyerUser.first_name || "there"}, your ${formatDocumentType(docRequest.type)} document has been ${statusText}. ${body.decisionNotes ? `Note: ${body.decisionNotes}` : ""}`,
            "View Documents",
            `${APP_URL}/buyer/documents`
          )
        }
      } catch (emailError) {
        console.error("[Document Request Email Error]", emailError)
      }

      return NextResponse.json({ success: true, request: updated })
    }

    return NextResponse.json({ error: "Invalid update" }, { status: 400 })
  } catch (error) {
    console.error("[Document Request Update Error]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
