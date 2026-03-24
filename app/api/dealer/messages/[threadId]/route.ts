import { NextResponse, type NextRequest } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { supabase } from "@/lib/db"
import { requireDatabase } from "@/lib/require-database"
import { isTestWorkspace } from "@/lib/app-mode"

export const dynamic = "force-dynamic"

function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

async function getDealerIdForUser(userId: string) {
  const { data: dealerUser } = await supabase.from("DealerUser").select("dealerId").eq("userId", userId).maybeSingle()
  if (dealerUser?.dealerId) return dealerUser.dealerId as string

  const { data: dealer } = await supabase.from("Dealer").select("id").eq("userId", userId).maybeSingle()
  return dealer?.id as string | undefined
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ threadId: string }> }) {
  try {
    const user = await requireAuth(["DEALER", "DEALER_USER"])
    const { threadId } = await ctx.params

    if (isTestWorkspace(user)) return NextResponse.json({ success: true, data: { id: threadId, messages: [] } })
    const dbUnavailable = requireDatabase()
    if (dbUnavailable) return dbUnavailable

    const dealerId = await getDealerIdForUser(user.userId)
    if (!dealerId) return jsonError("Dealer not found", 404)

    const { data: ticket } = await supabase
      .from("SupportTicket")
      .select("id, dealerId, subject, status")
      .eq("id", threadId)
      .maybeSingle()

    if (!ticket || ticket.dealerId !== dealerId) return jsonError("Not found", 404)

    const { data: messages, error } = await supabase
      .from("SupportMessage")
      .select("id, senderRole, body, createdAt")
      .eq("ticketId", threadId)
      .order("createdAt", { ascending: true })

    if (error) return jsonError("Failed to load messages", 500)

    return NextResponse.json({
      success: true,
      data: {
        id: ticket.id,
        subject: ticket.subject,
        status: ticket.status,
        messages: (messages || []).map((m: any) => ({
          id: m.id,
          senderRole: m.senderRole,
          message: m.body,
          time: m.createdAt,
          isMe: m.senderRole === "DEALER",
        })),
      },
    })
  } catch (error) {
    console.error("[DealerMessages GET] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ threadId: string }> }) {
  try {
    const user = await requireAuth(["DEALER", "DEALER_USER"])
    const { threadId } = await ctx.params

    if (isTestWorkspace(user)) return NextResponse.json({ success: true })
    const dbCheck = requireDatabase()
    if (dbCheck) return dbCheck

    const dealerId = await getDealerIdForUser(user.userId)
    if (!dealerId) return jsonError("Dealer not found", 404)

    const body = await req.json().catch(() => null)
    const message = body?.message ? String(body.message).trim() : ""
    if (!message) return jsonError("Message is required")

    const { data: ticket } = await supabase
      .from("SupportTicket")
      .select("id, dealerId, status")
      .eq("id", threadId)
      .maybeSingle()

    if (!ticket || ticket.dealerId !== dealerId) return jsonError("Not found", 404)
    if (ticket.status !== "OPEN") return jsonError("Ticket is closed", 409)

    const { error } = await supabase.from("SupportMessage").insert({
      ticketId: threadId,
      senderUserId: user.userId,
      senderRole: "DEALER",
      body: message,
    })

    if (error) return jsonError("Failed to send message", 500)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[DealerMessages POST] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
