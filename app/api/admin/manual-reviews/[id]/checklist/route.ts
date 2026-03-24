import { type NextRequest, NextResponse } from "next/server"
import { getSession, isCmaApprover } from "@/lib/auth-server"
import { submitChecklist, CMA_ROOT_CAUSE_CATEGORIES } from "@/lib/services/contract-shield"
import { z } from "zod"

const checklistSchema = z.object({
  rootCauseCategory: z.enum(CMA_ROOT_CAUSE_CATEGORIES as unknown as [string, ...string[]]),
  rootCauseNotes: z.string().optional(),
  vinMatch: z.boolean(),
  buyerIdentityMatch: z.boolean(),
  otdMathValidated: z.boolean(),
  feesValidated: z.boolean(),
  termsValidated: z.boolean(),
  disclosuresPresent: z.boolean(),
  verifiedFieldsJson: z.record(z.unknown()).optional(),
  evidenceAttachmentIds: z.array(z.string()).optional(),
  attestationAccepted: z.boolean(),
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
    const parsed = checklistSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.issues.map((i) => i.message).join(", ") } },
        { status: 400 },
      )
    }

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    const userAgent = request.headers.get("user-agent") || undefined

    const result = await submitChecklist(id, parsed.data as any, {
      adminId: session.userId,
      adminRole: session.role,
      ipAddress: ip,
      userAgent,
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to submit checklist"
    return NextResponse.json(
      { error: { code: "CMA_ERROR", message } },
      { status: 400 },
    )
  }
}
