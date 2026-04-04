import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { prisma } from "@/lib/prisma"
import { randomUUID } from "crypto"

export const dynamic = "force-dynamic"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { eventId } = await params
    const event = await prisma.messageRedactionEvent.findUnique({ where: { id: eventId } })
    if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(event)
  } catch (error) {
    const correlationId = randomUUID()
    console.error("[Admin Redaction Event Error]", { correlationId, error })
    return NextResponse.json({ error: "Failed to get redaction event", correlationId }, { status: 500 })
  }
}
