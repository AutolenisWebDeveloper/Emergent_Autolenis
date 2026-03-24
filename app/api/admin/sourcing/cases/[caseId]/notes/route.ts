import { NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { z } from "zod"
import { requireAuth } from "@/lib/auth-server"
import { sourcingService } from "@/lib/services/sourcing.service"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

const addNoteSchema = z.object({
  content: z.string().min(1, "Note content is required").max(5000),
  isInternal: z.boolean().optional().default(true),
})

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ caseId: string }> },
) {
  const correlationId = randomUUID()
  try {
    await requireAuth(["ADMIN", "SUPER_ADMIN"])
    const { caseId } = await params

    const notes = await sourcingService.listNotes(caseId)
    return NextResponse.json({ success: true, data: notes })
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode
    if (statusCode === 401 || statusCode === 403) {
      return NextResponse.json(
        { error: { code: statusCode, message: (error as Error).message }, correlationId },
        { status: statusCode },
      )
    }
    logger.error("[ADMIN_CASE_NOTES_LIST]", { error: String(error), correlationId })
    return NextResponse.json(
      { error: { code: 500, message: "Unable to load notes." }, correlationId },
      { status: 500 },
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> },
) {
  const correlationId = randomUUID()
  try {
    const session = await requireAuth(["ADMIN", "SUPER_ADMIN"])
    const { caseId } = await params

    const body = await request.json()
    const parsed = addNoteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 422, message: parsed.error.errors[0]?.message ?? "Invalid note." }, correlationId },
        { status: 422 },
      )
    }

    const note = await sourcingService.addNote(
      caseId,
      parsed.data,
      session.userId,
      "ADMIN",
    )

    return NextResponse.json({ success: true, data: note, correlationId }, { status: 201 })
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode
    if (statusCode === 401 || statusCode === 403) {
      return NextResponse.json(
        { error: { code: statusCode, message: (error as Error).message }, correlationId },
        { status: statusCode },
      )
    }
    const message = error instanceof Error ? error.message : String(error)
    logger.error("[ADMIN_CASE_NOTES_ADD]", { error: message, correlationId })
    return NextResponse.json(
      { error: { code: 500, message: message === "Case not found" ? message : "Unable to add note." }, correlationId },
      { status: message === "Case not found" ? 404 : 500 },
    )
  }
}
