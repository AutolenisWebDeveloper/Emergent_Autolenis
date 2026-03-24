import { type NextRequest, NextResponse } from "next/server"
import { getSession, isCmaApprover } from "@/lib/auth-server"
import { revokeManualReview } from "@/lib/services/contract-shield"
import { z } from "zod"

const bodySchema = z.object({
  reason: z.string().min(1, "Revocation reason is required"),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const session = await getSession()

    if (!session || !isCmaApprover(session.role)) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "CMA approver role required" } },
        { status: 401 },
      )
    }

    const body = await request.json()
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.issues.map((i) => i.message).join(", ") } },
        { status: 400 },
      )
    }

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    const userAgent = request.headers.get("user-agent") || undefined

    const result = await revokeManualReview(id, parsed.data.reason, {
      adminId: session.userId,
      adminRole: session.role,
      ipAddress: ip,
      userAgent,
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to revoke"
    return NextResponse.json(
      { error: { code: "CMA_ERROR", message } },
      { status: 400 },
    )
  }
}
