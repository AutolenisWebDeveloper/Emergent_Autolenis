import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { dealerService } from "@/lib/services/dealer.service"
import { z } from "zod"

export const dynamic = "force-dynamic"

const profileUpdateSchema = z
  .object({
    name: z.string().max(200).optional(),
    phone: z.string().max(30).optional(),
    email: z.string().email("Invalid email format").max(255).optional(),
    address: z.string().max(500).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(2).optional(),
    zipCode: z.string().max(10).optional(),
  })
  .strict()

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user || !["DEALER", "DEALER_USER"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dealer = await dealerService.getDealerByUserId(user.id)
    if (!dealer) {
      return NextResponse.json({ error: "Dealer not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      dealer: {
        name: dealer.businessName || dealer.name || "",
        phone: dealer.phone || "",
        email: dealer.email || "",
        website: dealer.website || "",
        address: dealer.address || "",
        city: dealer.city || "",
        state: dealer.state || "",
        zipCode: dealer.zip || dealer.postalCode || "",
        status: dealer.status || "active",
      },
    })
  } catch (error) {
    console.error("[Dealer Profile API] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || !["DEALER", "DEALER_USER"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dealer = await dealerService.getDealerByUserId(user.id)
    if (!dealer) {
      return NextResponse.json({ error: "Dealer not found" }, { status: 404 })
    }

    const body = await req.json()

    let validated
    try {
      validated = profileUpdateSchema.parse(body)
    } catch (validationError) {
      const zodErr = validationError as z.ZodError
      return NextResponse.json(
        { error: zodErr.errors?.[0]?.message || "Invalid input" },
        { status: 400 },
      )
    }

    const updateData: Record<string, string> = {}
    if (validated.name !== undefined) updateData.businessName = validated.name.trim()
    if (validated.phone !== undefined) updateData.phone = validated.phone.trim()
    if (validated.email !== undefined) updateData.email = validated.email.trim()
    if (validated.address !== undefined) updateData.address = validated.address.trim()
    if (validated.city !== undefined) updateData.city = validated.city.trim()
    if (validated.state !== undefined) updateData.state = validated.state.trim()
    if (validated.zipCode !== undefined) updateData.postalCode = validated.zipCode.trim()

    await dealerService.updateDealerSettings(dealer.id, updateData)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Dealer Profile API] Update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
