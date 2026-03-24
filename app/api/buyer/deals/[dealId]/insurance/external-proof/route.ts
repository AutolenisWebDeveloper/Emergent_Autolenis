import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { InsuranceService } from "@/lib/services/insurance.service"

export async function POST(request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  try {
    const session = await requireAuth(["BUYER"])
    const { dealId } = await params
    const body = await request.json()

    const { carrier_name, policy_number, start_date, end_date, document_url } = body

    if (!carrier_name || !policy_number || !document_url) {
      return NextResponse.json(
        { success: false, error: "carrier_name, policy_number, and document_url are required" },
        { status: 400 },
      )
    }

    const result = await InsuranceService.uploadExternalProof(
      session.userId,
      dealId,
      carrier_name,
      policy_number,
      start_date ? new Date(start_date) : new Date(),
      end_date ? new Date(end_date) : null,
      document_url,
    )

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error("Error uploading external insurance:", error)
    return NextResponse.json({ success: false, error: "Failed to upload external insurance proof" }, { status: 500 })
  }
}
