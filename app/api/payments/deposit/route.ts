import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { createClient } from "@/lib/supabase/server"
import { PaymentService } from "@/lib/services/payment.service"
import { depositPaymentSchema } from "@/lib/validators/api"

export async function POST(request: Request) {
  try {
    const session = await requireAuth(["BUYER"])
    const body = await request.json()

    // Validate request body
    const parsed = depositPaymentSchema.safeParse(body)
    if (!parsed.success) {
      const fields: Record<string, string> = {}
      parsed.error.errors.forEach((err) => {
        fields[err.path.join(".")] = err.message
      })
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.errors[0]?.message || "Validation failed",
          code: "VALIDATION_ERROR",
          fields,
        },
        { status: 400 },
      )
    }

    const supabase = await createClient()
    const { data: buyer, error } = await supabase
      .from("BuyerProfile")
      .select("*")
      .eq("userId", session.userId)
      .maybeSingle()

    if (error) {
      console.error("[Payment Deposit] Error fetching buyer:", error)
      return NextResponse.json({ success: false, error: "Failed to fetch buyer profile" }, { status: 500 })
    }

    if (!buyer) {
      return NextResponse.json(
        { success: false, error: "Buyer profile not found. Please complete your profile setup." },
        { status: 404 },
      )
    }

    const result = await PaymentService.createDepositPayment(buyer.id, parsed.data.auctionId)

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error: any) {
    if (error?.statusCode === 401 || error?.statusCode === 403) {
      return NextResponse.json({ success: false, error: error.statusCode === 403 ? "Forbidden" : "Unauthorized" }, { status: error.statusCode })
    }
    console.error("[Payment Deposit] Error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
