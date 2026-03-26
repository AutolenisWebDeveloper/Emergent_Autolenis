import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { getSessionUser } from "@/lib/auth-server"
import { ADMIN_ROLES } from "@/lib/authz/roles"
import { writePrequalAuditLog } from "@/lib/prequal/audit"

export const dynamic = "force-dynamic"

const noteSchema = z.object({
  body: z.string().min(1).max(5000),
  isInternal: z.boolean().default(true),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const user = await getSessionUser()
    if (!user || !(ADMIN_ROLES as readonly string[]).includes(user.role)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const parsed = noteSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const application = await prisma.prequalApplication.findUnique({ where: { id } })
    if (!application) {
      return NextResponse.json({ success: false, error: "Application not found" }, { status: 404 })
    }

    const note = await prisma.prequalNote.create({
      data: {
        applicationId: id,
        authorId: user.userId,
        body: parsed.data.body,
        isInternal: parsed.data.isInternal,
      },
    })

    await writePrequalAuditLog({
      applicationId: id,
      eventType: "NOTE_ADDED",
      actorId: user.userId,
      actorType: "ADMIN",
      description: `Note added: ${parsed.data.body.substring(0, 100)}`,
    })

    return NextResponse.json({ success: true, data: note })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    logger.error("[Admin Prequal] Notes route error", { error: msg })
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
