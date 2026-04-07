import { NextResponse, type NextRequest } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { supabase } from "@/lib/db"
import { requireDatabase } from "@/lib/require-database"
import { isTestWorkspace } from "@/lib/app-mode"
import { handleRouteError } from "@/lib/utils/route-error"

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

export async function GET(_req: NextRequest) {
  try {
    const user = await requireAuth(["DEALER", "DEALER_USER"])

    if (isTestWorkspace(user)) return NextResponse.json({ success: true, data: [] })
    const dbUnavailable = requireDatabase()
    if (dbUnavailable) return dbUnavailable

    const dealerId = await getDealerIdForUser(user.userId)
    if (!dealerId) return jsonError("Dealer not found", 404)

    const { data: tickets, error } = await supabase
      .from("SupportTicket")
      .select("id, subject, status, updatedAt, createdAt")
      .eq("dealerId", dealerId)
      .order("updatedAt", { ascending: false })
      .limit(50)

    if (error) return jsonError("Failed to load messages", 500)

    const ticketIds = (tickets || []).map((t: any) => t.id)
    let lastMessages: Record<string, any> = {}

    if (ticketIds.length) {
      const { data: msgs } = await supabase
        .from("SupportMessage")
        .select("ticketId, body, createdAt")
        .in("ticketId", ticketIds)
        .order("createdAt", { ascending: false })

      for (const m of msgs || []) {
        if (!lastMessages[m.ticketId]) lastMessages[m.ticketId] = m
      }
    }

    const out = (tickets || []).map((t: any) => {
      const last = lastMessages[t.id]
      return {
        id: t.id,
        subject: t.subject,
        status: t.status,
        updatedAt: t.updatedAt,
        createdAt: t.createdAt,
        lastMessage: last ? String(last.body).slice(0, 140) : "",
        lastMessageAt: last?.createdAt ?? t.updatedAt,
      }
    })

    return NextResponse.json({ success: true, data: out })
  } catch (error) {
    console.error("[DealerMessages GET] Error:", error)
    return handleRouteError(error, "Internal server error")
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(["DEALER", "DEALER_USER"])

    if (isTestWorkspace(user)) return NextResponse.json({ success: true, data: { id: "test_ticket" } })
    const dbCheck = requireDatabase()
    if (dbCheck) return dbCheck

    const body = await req.json().catch(() => null)
    const subject = body?.subject ? String(body.subject).trim() : ""
    const message = body?.message ? String(body.message).trim() : ""

    if (!subject || subject.length < 3) return jsonError("Subject is required")
    if (!message || message.length < 1) return jsonError("Message is required")

    const dealerId = await getDealerIdForUser(user.userId)
    if (!dealerId) return jsonError("Dealer not found", 404)

    const { data: ticket, error: ticketError } = await supabase
      .from("SupportTicket")
      .insert({ dealerId, subject, status: "OPEN" })
      .select("id")
      .single()

    if (ticketError) return jsonError("Failed to create ticket", 500)

    const { error: msgError } = await supabase.from("SupportMessage").insert({
      ticketId: ticket.id,
      senderUserId: user.userId,
      senderRole: "DEALER",
      body: message,
    })

    if (msgError) return jsonError("Failed to create message", 500)

    return NextResponse.json({ success: true, data: { id: ticket.id } }, { status: 201 })
  } catch (error) {
    console.error("[DealerMessages POST] Error:", error)
    return handleRouteError(error, "Internal server error")
  }
}
