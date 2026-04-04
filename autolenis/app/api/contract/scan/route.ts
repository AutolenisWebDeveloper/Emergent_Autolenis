import { type NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/authz/guard"
import { DEALER_ROLES, ADMIN_ROLES } from "@/lib/authz/roles"
import { ContractShieldService } from "@/lib/services/contract-shield.service"
import { prisma } from "@/lib/db"
import { z } from "zod"

const scanInputSchema = z.object({
  contractId: z.string().min(1, "contractId is required"),
})

export async function POST(request: NextRequest) {
  const ctx = await withAuth(request, { roles: [...DEALER_ROLES, ...ADMIN_ROLES] })
  if (ctx instanceof NextResponse) return ctx

  try {
    const body = await request.json()
    const parsed = scanInputSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid contractId" }, correlationId: ctx.correlationId },
        { status: 400 },
      )
    }

    const scan = await ContractShieldService.scanContract(parsed.data.contractId)

    return NextResponse.json({
      success: true,
      data: { scan },
      correlationId: ctx.correlationId,
    })
  } catch (error) {
    console.error("[Contract Scan]", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Internal server error" }, correlationId: ctx.correlationId },
      { status: 500 },
    )
  }
}
