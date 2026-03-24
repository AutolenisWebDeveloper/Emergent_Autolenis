import { type NextRequest, NextResponse } from "next/server"
import { withAuth, ADMIN_ROLES } from "@/lib/authz/guard"
import { esignService } from "@/lib/services/esign.service"
import { supabase } from "@/lib/db"
import { z } from "zod"

const schema = z.object({
  reason: z
    .string()
    .min(1, "Reason is required")
    .max(1000),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ dealId: string }> }) {
  const ctx = await withAuth(req, {
    roles: ADMIN_ROLES,
    requireMfa: true,
    requireWorkspace: true,
    auditAction: "MARK_DEAL_SIGNED",
  })
  if (ctx instanceof NextResponse) return ctx

  try {
    const { dealId } = await params
    const body = await req.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.errors[0]?.message || "Invalid input" }, correlationId: ctx.correlationId },
        { status: 400 },
      )
    }

    // Verify deal belongs to workspace before mutation
    const { data: dealCheck } = await supabase
      .from("SelectedDeal")
      .select("id")
      .eq("id", dealId)
      .eq("workspaceId", ctx.workspaceId)
      .single()

    if (!dealCheck) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Deal not found" }, correlationId: ctx.correlationId },
        { status: 404 },
      )
    }

    const result = await esignService.markSigned(dealId, ctx.userId, parsed.data.reason)

    return NextResponse.json({ ...result, correlationId: ctx.correlationId })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error"
    console.error("[Admin Mark-Signed] Error:", message)

    const status = message === "Deal not found" ? 404 : 400
    return NextResponse.json(
      { error: { code: status === 404 ? "NOT_FOUND" : "BAD_REQUEST", message }, correlationId: ctx.correlationId },
      { status },
    )
  }
}
