import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth-server"
import { esignService } from "@/lib/services/esign.service"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ envelopeId: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { envelopeId } = await params
    const envelope = await esignService.getEnvelopeStatus(envelopeId)

    if (!envelope) {
      return NextResponse.json({ error: "Envelope not found" }, { status: 404 })
    }

    return NextResponse.json(envelope)
  } catch (error: any) {
    console.error("[E-Sign Status]", error)
    return NextResponse.json({ error: "Failed to get envelope status" }, { status: 500 })
  }
}
