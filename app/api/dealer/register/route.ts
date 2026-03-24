import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { dealerService } from "@/lib/services/dealer.service"
import { dealerApprovalService } from "@/lib/services/dealer-approval.service"
import { emailService } from "@/lib/services/email.service"
import { createClient } from "@/lib/supabase/server"
import { logger } from "@/lib/logger"
import { z } from "zod"
import { randomUUID } from "crypto"

const dealerRegisterSchema = z.object({
  dealershipName: z.string().min(1, "Dealership name is required"),
  businessType: z.string().min(1, "Business type is required"),
  licenseNumber: z.string().min(1, "License number is required"),
  yearsInBusiness: z.string().min(1, "Years in business is required"),
  contactName: z.string().min(1, "Contact name is required"),
  contactTitle: z.string().optional().default("Owner"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(1, "Phone number is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().min(1, "ZIP code is required"),
  averageInventory: z.string().min(1, "Average inventory is required"),
  monthlyVolume: z.string().min(1, "Monthly volume is required"),
  website: z.string().optional(),
  additionalInfo: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rawBody = await req.json()
    const parsed = dealerRegisterSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }
    const body = parsed.data

    // Create dealer using service
    const dealer = await dealerService.createDealerApplication(body)

    const supabase = await createClient()

    // Link user to dealer
    const { error: dealerUserError } = await supabase.from("DealerUser").insert({
      userId: user.userId,
      dealerId: dealer.id,
      roleLabel: body.contactTitle || "Owner",
    })

    if (dealerUserError) {
      console.error("[v0] Register dealer - DealerUser creation error:", dealerUserError)
      throw new Error(dealerUserError.message)
    }

    // Update user role
    const { error: userError } = await supabase.from("User").update({ role: "DEALER" }).eq("id", user.userId)

    if (userError) {
      console.error("[v0] Register dealer - User update error:", userError)
      throw new Error(userError.message)
    }

    // Create dealer_applications record for admin review workflow
    await dealerApprovalService.createApplication(dealer.id, user.userId, {
      businessType: body.businessType,
      yearsInBusiness: body.yearsInBusiness,
      averageInventory: body.averageInventory,
      monthlyVolume: body.monthlyVolume,
      website: body.website,
      additionalInfo: body.additionalInfo,
    })

    // Fire emails asynchronously (best-effort, do not block response)
    const correlationId = randomUUID()
    void Promise.allSettled([
      // Admin dashboard notification
      emailService.sendDealerApplicationSubmittedNotification(
        body.dealershipName,
        body.email,
        user.userId,
        correlationId,
      ),
      // Full application form to info@autolenis.com
      emailService.sendDealerApplicationFormToInfo(body, user.userId, correlationId),
      // Confirmation email to the dealer applicant
      emailService.sendDealerApplicationConfirmation(
        body.email,
        body.dealershipName,
        body.contactName,
        user.userId,
        correlationId,
      ),
    ]).then((results) => {
      for (const result of results) {
        if (result.status === "rejected") {
          logger.error("[DealerRegister] Email notification failed", {
            correlationId,
            error: result.reason,
          })
        }
      }
    })

    return NextResponse.json({ success: true, dealer })
  } catch (error) {
    console.error("[v0] Register dealer error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
