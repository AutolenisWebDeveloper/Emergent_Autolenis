import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { esignService } from "@/lib/services/esign.service"
import { z } from "zod"

const schema = z.object({
  provider: z.string().optional().default("mock"),
  options: z
    .object({
      embedded_signing: z.boolean().optional(),
    })
    .optional(),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ dealId: string }> }) {
  try {
    const user = await getSessionUser()
    if (!user || !["DEALER", "DEALER_USER"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { dealId } = await params
    const body = await req.json().catch(() => ({}))
    const { provider, options } = schema.parse(body)

    const envelope = await esignService.createEnvelope(dealId, user.id, {
      provider,
      embeddedSigning: options?.embedded_signing,
    })

    return NextResponse.json({ success: true, envelope })
  } catch (error) {
    console.error("[E-Sign] Create envelope error:", error)
    return NextResponse.json({ error: "Failed to create e-sign envelope" }, { status: 400 })
  }
}
