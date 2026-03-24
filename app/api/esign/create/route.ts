import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth-server"
import { esignService } from "@/lib/services/esign.service"
import { z } from "zod"

const schema = z.object({
  dealId: z.string(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { dealId } = schema.parse(body)

    const envelope = await esignService.createEnvelope(dealId, user.id)

    return NextResponse.json(envelope)
  } catch (error: any) {
    console.error("[E-Sign Create]", error)
    return NextResponse.json({ error: "Failed to create e-sign envelope" }, { status: 500 })
  }
}
