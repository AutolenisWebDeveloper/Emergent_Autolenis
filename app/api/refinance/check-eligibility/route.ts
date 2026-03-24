import { type NextRequest, NextResponse } from "next/server"
import { supabase, isDatabaseConfigured } from "@/lib/db"
import { requireDatabase } from "@/lib/require-database"
import { emailService } from "@/lib/services/email.service"
import { EMAIL_CONFIG } from "@/lib/resend"
import { logger } from "@/lib/logger"
import { rateLimit } from "@/lib/middleware/rate-limit"

// OpenRoad Lending - Allowed States
const ALLOWED_STATES_OPENROAD = [
  "AL",
  "AR",
  "AZ",
  "CA",
  "CO",
  "DE",
  "FL",
  "GA",
  "IA",
  "ID",
  "IL",
  "IN",
  "KS",
  "KY",
  "LA",
  "MA",
  "MD",
  "ME",
  "MI",
  "MN",
  "MO",
  "MT",
  "NC",
  "ND",
  "NE",
  "NJ",
  "NM",
  "NY",
  "OH",
  "OK",
  "OR",
  "PA",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VA",
  "WA",
  "WV",
  "WY",
]

// OpenRoad Partner ID
const OPENROAD_PARTNER_ID = process.env['OPENROAD_PARTNER_ID'] || "autolenis"

interface RefinanceFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  state: string
  tcpaConsent: boolean
  vehicleYear: number
  vehicleMake: string
  vehicleModel: string
  mileage: number
  vehicleCondition: "EXCELLENT" | "GOOD" | "FAIR" | "POOR"
  loanBalance: number
  currentMonthlyPayment: number
  monthlyIncome: number
  affiliateId?: string
}

// Layer 1: Lender (OpenRoad) Filters - MANDATORY
function applyLenderFilters(data: RefinanceFormData): string[] {
  const currentYear = new Date().getFullYear()
  const vehicleAge = currentYear - data.vehicleYear
  const reasons: string[] = []

  if (vehicleAge > 13) reasons.push("lender_vehicle_too_old")
  if (data.mileage > 160000) reasons.push("lender_mileage_too_high")
  if (data.monthlyIncome < 2000) reasons.push("lender_income_too_low")
  if (!ALLOWED_STATES_OPENROAD.includes(data.state)) reasons.push("lender_state_not_allowed")

  return reasons
}

// Layer 2: AutoLenis Internal Filters - QUALITY CONTROL
function applyInternalFilters(data: RefinanceFormData): string[] {
  const reasons: string[] = []

  if (data.loanBalance < 8000) reasons.push("internal_loan_balance_too_low")
  if (data.vehicleCondition === "POOR") reasons.push("internal_vehicle_condition_poor")

  return reasons
}

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, {
    maxRequests: 10,
    windowMs: 10 * 60 * 1000,
    keyGenerator: (req) => {
      const ip = (req as any).ip || req.headers.get("x-forwarded-for") || "unknown"
      // Basic separation per email to reduce abuse while allowing shared IPs
      const email = req.headers.get("x-refi-email") || "unknown"
      return `refi_eligibility:${ip}:${String(email).toLowerCase()}`
    },
  })
  if (limited) return limited

  try {
    const dbConfigured = isDatabaseConfigured()
    if (!dbConfigured) {
      logger.warn("Refinance API: Database not configured, skipping DB operations")
    }

    const body = (await request.json()) as RefinanceFormData

    // Normalize high-risk fields early
    body.email = String(body.email || "").trim().toLowerCase()
    body.phone = String(body.phone || "").replace(/\D/g, "")
    body.state = String(body.state || "").trim().toUpperCase()

    // Validate required fields
    if (!body.firstName || !body.lastName || !body.email || !body.phone || !body.state) {
      return NextResponse.json({ error: "Missing required personal information" }, { status: 400 })
    }

    // Strong format validation
    const emailOk = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(body.email)
    if (!emailOk) return NextResponse.json({ error: "Invalid email address" }, { status: 400 })

    if (body.phone.length < 10 || body.phone.length > 15) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 })
    }

    if (!/^[A-Z]{2}$/.test(body.state)) {
      return NextResponse.json({ error: "Invalid state" }, { status: 400 })
    }

    if (!body.vehicleYear || !body.vehicleMake || !body.vehicleModel || !body.mileage || !body.vehicleCondition) {
      return NextResponse.json({ error: "Missing required vehicle information" }, { status: 400 })
    }

    if (!body.loanBalance || !body.currentMonthlyPayment || !body.monthlyIncome) {
      return NextResponse.json({ error: "Missing required loan information" }, { status: 400 })
    }

    if (!body.tcpaConsent) {
      return NextResponse.json({ error: "TCPA consent is required" }, { status: 400 })
    }

    // Apply two-layer filtering
    const lenderFailures = applyLenderFilters(body)
    const internalFailures = applyInternalFilters(body)
    const allReasons = [...lenderFailures, ...internalFailures]
    const qualified = allReasons.length === 0

    // Idempotency guard (prevent duplicate submissions in short window)
    // If the same email + vehicle triple has an existing lead created in the last 10 minutes,
    // return the existing leadId and qualification decision.
    if (dbConfigured) {
      try {
        const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
        const { data: existing } = await supabase
          .from("RefinanceLead")
          .select("id, qualificationStatus, qualificationReasons")
          .eq("email", body.email)
          .eq("vehicleYear", body.vehicleYear)
          .eq("vehicleMake", body.vehicleMake)
          .eq("vehicleModel", body.vehicleModel)
          .gte("createdAt", tenMinAgo)
          .order("createdAt", { ascending: false })
          .maybeSingle()

        if (existing?.id) {
          const existingQualified = existing.qualificationStatus === "QUALIFIED"
          const redirectUrl = existingQualified
            ? `https://openroadlending.com/apply?partner_id=${OPENROAD_PARTNER_ID}&sub_id=${existing.id}`
            : undefined
          return NextResponse.json({
            qualified: existingQualified,
            leadId: existing.id,
            redirectUrl,
            reasons: existingQualified ? undefined : JSON.parse(existing.qualificationReasons || "[]"),
            deduped: true,
          })
        }
      } catch (dedupeErr) {
        logger.warn("Refinance idempotency check failed (continuing)", { error: dedupeErr })
      }
    }

    // Generate a unique lead ID
    const leadId = crypto.randomUUID()

    // Log the lead data
    logger.info("Refinance lead received", {
      leadId,
      qualified,
      reasons: allReasons,
      email: body.email,
      state: body.state,
    })

    // Persist refinance lead to database
    if (dbConfigured) {
      try {
        const { error: leadInsertError } = await supabase.from("RefinanceLead").insert({
          id: leadId,
          leadType: "refinance",
          partner: "OpenRoad",
          firstName: body.firstName,
          lastName: body.lastName,
          email: body.email,
          phone: body.phone,
          state: body.state,
          tcpaConsent: body.tcpaConsent,
          vehicleYear: body.vehicleYear,
          vehicleMake: body.vehicleMake,
          vehicleModel: body.vehicleModel,
          mileage: body.mileage,
          vehicleCondition: body.vehicleCondition,
          loanBalance: body.loanBalance,
          currentMonthlyPayment: body.currentMonthlyPayment,
          monthlyIncome: body.monthlyIncome,
          qualificationStatus: qualified ? "QUALIFIED" : "DECLINED",
          qualificationReasons: JSON.stringify(allReasons),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        if (leadInsertError) {
          logger.error("Failed to persist refinance lead", { leadId, error: leadInsertError })
        } else {
          logger.info("Refinance lead persisted to database", { leadId })
        }

        // Create admin notification
        const { error: notifError } = await supabase.from("AdminNotification").insert({
          id: crypto.randomUUID(),
          workspaceId: "ws_live_default",
          priority: "P1",
          category: "USER",
          type: "refinance.submission",
          title: "New Refinance Eligibility Submission",
          message: `${body.firstName} ${body.lastName} (${body.email}) submitted a refinance eligibility check. Status: ${qualified ? "Qualified" : "Not Qualified"}`,
          entityType: "User",
          entityId: leadId,
          ctaPath: `/admin/refinance`,
          metadata: {
            email: body.email,
            state: body.state,
            loanBalance: body.loanBalance,
            qualified,
          },
          isRead: false,
          isArchived: false,
          createdAt: new Date().toISOString(),
        })
        if (notifError) {
          logger.error("Failed to create refinance notification", { leadId, error: notifError })
        }
      } catch (dbError) {
        logger.error("Database error during refinance lead persistence", { leadId, error: dbError })
      }
    }

    try {
      const internalEmailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4338ca;">New Refinance Lead Submission</h2>
          <p><strong>Reference ID:</strong> ${leadId}</p>
          <p><strong>Status:</strong> ${qualified ? "✅ Pre-Qualified" : "❌ Not Qualified"}</p>
          
          <h3 style="color: #4338ca; margin-top: 20px;">Contact Information</h3>
          <ul style="list-style: none; padding: 0;">
            <li><strong>Name:</strong> ${body.firstName} ${body.lastName}</li>
            <li><strong>Email:</strong> ${body.email}</li>
            <li><strong>Phone:</strong> ${body.phone}</li>
            <li><strong>State:</strong> ${body.state}</li>
          </ul>
          
          <h3 style="color: #4338ca; margin-top: 20px;">Vehicle Information</h3>
          <ul style="list-style: none; padding: 0;">
            <li><strong>Vehicle:</strong> ${body.vehicleYear} ${body.vehicleMake} ${body.vehicleModel}</li>
            <li><strong>Mileage:</strong> ${body.mileage.toLocaleString()} miles</li>
            <li><strong>Condition:</strong> ${body.vehicleCondition}</li>
          </ul>
          
          <h3 style="color: #4338ca; margin-top: 20px;">Loan Information</h3>
          <ul style="list-style: none; padding: 0;">
            <li><strong>Current Loan Balance:</strong> $${body.loanBalance.toLocaleString()}</li>
            <li><strong>Monthly Payment:</strong> $${body.currentMonthlyPayment.toLocaleString()}</li>
            <li><strong>Monthly Income:</strong> $${body.monthlyIncome.toLocaleString()}</li>
          </ul>
          
          ${
            !qualified
              ? `
          <h3 style="color: #dc2626; margin-top: 20px; font-weight: 600;">Disqualification Reasons</h3>
          <ul>
            ${allReasons.map((r) => `<li>${r.replace(/_/g, " ").replace(/lender |internal /g, "")}</li>`).join("")}
          </ul>
          `
              : ""
          }
          
          <p style="margin-top: 20px; color: #666; font-size: 12px;">
            Submitted at: ${new Date().toLocaleString("en-US", { timeZone: "America/New_York" })} ET
          </p>
        </div>
      `

      const internalResult = await emailService.sendNotificationEmail(
        EMAIL_CONFIG.adminEmail,
        `[Refinance Lead] ${qualified ? "✅ Qualified" : "❌ Not Qualified"} - ${body.firstName} ${body.lastName}`,
        internalEmailHtml,
      )
      logger.debug("Refinance internal notification sent", { result: internalResult })
    } catch (emailError) {
      logger.error("Refinance internal notification failed", { error: emailError })
    }

    // Send affiliate email if affiliateId is present
    if (body.affiliateId && dbConfigured) {
      try {
        const { data: affiliateData } = await supabase
          .from("Affiliate")
          .select("firstName, lastName, userId")
          .eq("id", body.affiliateId)
          .limit(1)

        if (affiliateData && affiliateData.length > 0) {
          const affiliate = affiliateData[0]
          const { data: affiliateUser } = await supabase
            .from("User")
            .select("email")
            .eq("id", affiliate.userId)
            .limit(1)

          if (affiliateUser && affiliateUser.length > 0) {
            await emailService.sendNotification(
              affiliateUser[0].email,
              "New Refinance Referral",
              `A refinance lead (${body.firstName}) was attributed to your referral. Check your affiliate dashboard for details.`,
              "View Dashboard",
              `${process.env['NEXT_PUBLIC_APP_URL'] || 'https://autolenis.com'}/affiliate/dashboard`
            )
            logger.debug("Refinance affiliate email sent", { affiliateId: body.affiliateId })
          }
        }
      } catch (affiliateEmailError) {
        logger.error("Refinance affiliate email failed", { error: affiliateEmailError })
      }
    }

    if (qualified) {
      const redirectUrl = `https://openroadlending.com/apply?partner_id=${OPENROAD_PARTNER_ID}&sub_id=${leadId}`

      try {
        const qualifiedResult = await emailService.sendNotification(
          body.email,
          "You're Pre-Qualified for Refinancing!",
          `Hi ${body.firstName}, based on your information, you may qualify for refinancing. Click below to complete your application with our lending partner.`,
          "Complete Application",
          redirectUrl
        )
        logger.debug("Refinance qualified email sent", { result: qualifiedResult })
      } catch (emailError) {
        logger.error("Refinance qualified email failed", { error: emailError })
      }

      return NextResponse.json({
        qualified: true,
        leadId,
        redirectUrl,
      })
    } else {
      try {
        const declinedResult = await emailService.sendNotification(
          body.email,
          "Refinance Application Update",
          `Hi ${body.firstName}, unfortunately we're unable to pre-qualify you for refinancing at this time. Reasons: ${allReasons.join(", ")}. You may re-apply after addressing these items.`
        )
        logger.debug("Refinance declined email sent", { result: declinedResult })
      } catch (emailError) {
        logger.error("Refinance declined email failed", { error: emailError })
      }

      return NextResponse.json({
        qualified: false,
        leadId,
        reasons: allReasons,
      })
    }
  } catch (error) {
    logger.error("Refinance API error", error instanceof Error ? error : undefined)
    return NextResponse.json(
      {
        error: "Failed to process eligibility check. Please try again.",
      },
      { status: 500 },
    )
  }
}
