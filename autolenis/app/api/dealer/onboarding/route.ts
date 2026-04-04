import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getSession } from "@/lib/auth-server"
import { z } from "zod"

const onboardingSchema = z.object({
  dealershipName: z.string().min(1, "Dealership name is required"),
  businessAddress: z.string().min(1, "Business address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().min(1, "ZIP code is required"),
  phone: z.string().min(1, "Phone is required"),
  dealerLicense: z.string().min(1, "Dealer license is required"),
  taxId: z.string().min(1, "Tax ID is required"),
  yearsInBusiness: z.string().optional(),
  inventorySize: z.string().optional(),
  specializations: z.string().optional(),
  agreesToTerms: z.boolean().refine((val) => val === true, "Must agree to terms"),
})

export async function POST(request: Request) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    if (session.role !== "DEALER") {
      return NextResponse.json(
        { success: false, error: "Only dealer accounts can complete dealer onboarding" },
        { status: 403 },
      )
    }

    const body = await request.json()

    let validated
    try {
      validated = onboardingSchema.parse(body)
    } catch (validationError: any) {
      return NextResponse.json(
        { success: false, error: validationError.errors?.[0]?.message || "Invalid input" },
        { status: 400 },
      )
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from("Dealer")
      .update({
        businessName: validated.dealershipName,
        licenseNumber: validated.dealerLicense,
        phone: validated.phone,
        address: validated.businessAddress,
        city: validated.city,
        state: validated.state,
        zip: validated.zipCode,
        verified: false,
      })
      .eq("userId", session.userId)

    if (error) {
      console.error("[Dealer Onboarding API] Supabase error:", error)
      throw new Error(error.message)
    }

    return NextResponse.json({
      success: true,
      data: {
        message: "Onboarding completed successfully",
      },
    })
  } catch (error) {
    console.error("[Dealer Onboarding API] Error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to complete onboarding" },
      { status: 500 },
    )
  }
}
