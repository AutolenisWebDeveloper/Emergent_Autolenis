import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { encryptSsn } from "@/lib/prequal/encryption"
import { generateSessionToken, setPrequalSessionCookie } from "@/lib/prequal/session"
import { writePrequalAuditLog } from "@/lib/prequal/audit"
import { validateConsentVersion } from "@/lib/prequal/consent"
import { getApplicationExpiryDate } from "@/lib/prequal/sla"
import { step1Schema } from "@/lib/validations/prequal/step1"
import { step2Schema } from "@/lib/validations/prequal/step2"
import { step3Schema } from "@/lib/validations/prequal/step3"
import { step4Schema } from "@/lib/validations/prequal/step4"

export const dynamic = "force-dynamic"

const startSchema = z.object({
  step1: step1Schema,
  step2: step2Schema,
  step3: step3Schema,
  step4: step4Schema,
})

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const parsed = startSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { step1, step2, step3, step4 } = parsed.data

    // Validate consent version
    const consentVersion = await validateConsentVersion(step4.consentVersionId)
    if (!consentVersion) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired consent version" },
        { status: 400 }
      )
    }

    // Encrypt SSN before storage
    const ssnEncrypted = encryptSsn(step1.ssn)
    const sessionToken = generateSessionToken()
    const expiresAt = getApplicationExpiryDate()
    const now = new Date()

    // Get request metadata
    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ?? null
    const userAgent = request.headers.get("user-agent") ?? null

    // Create the application record
    const application = await prisma.prequalApplication.create({
      data: {
        sessionToken,
        status: "CONSENT_CAPTURED",
        queueSegment: "NEW",
        // Step 1
        firstName: step1.firstName,
        lastName: step1.lastName,
        email: step1.email,
        phone: step1.phone,
        dateOfBirth: new Date(step1.dateOfBirth),
        ssnEncrypted,
        // Step 2
        addressLine1: step2.addressLine1,
        addressLine2: step2.addressLine2 ?? null,
        city: step2.city,
        state: step2.state,
        zipCode: step2.zipCode,
        residenceType: step2.residenceType,
        monthsAtAddress: step2.monthsAtAddress,
        // Step 3
        employmentType: step3.employmentType,
        employerName: step3.employerName ?? null,
        grossMonthlyIncome: step3.grossMonthlyIncome,
        monthlyHousingPayment: step3.monthlyHousingPayment,
        // Step 4
        downPaymentCents: step4.downPayment,
        targetMonthlyPaymentCents: step4.targetMonthlyPayment,
        // Consent
        consentGiven: true,
        consentGivenAt: now,
        consentIpAddress: ipAddress,
        consentUserAgent: userAgent,
        consentVersionId: step4.consentVersionId,
        // Metadata
        ipAddress,
        userAgent,
        submittedAt: now,
        expiresAt,
      },
    })

    // Create consent record
    await prisma.prequalConsent.create({
      data: {
        applicationId: application.id,
        consentVersionId: step4.consentVersionId,
        consentText: consentVersion.bodyText,
        htmlHash: consentVersion.htmlHash ?? null,
        consentGiven: true,
        consentDate: now,
        ipAddress,
        userAgent,
      },
    })

    // Write audit log
    await writePrequalAuditLog({
      applicationId: application.id,
      eventType: "APPLICATION_CREATED",
      actorType: "CONSUMER",
      description: "Consumer submitted prequal application",
      metadata: { sessionToken, email: step1.email },
    })

    // Set session cookie
    await setPrequalSessionCookie(sessionToken)

    logger.info("[Prequal] Application created", { applicationId: application.id })

    return NextResponse.json({
      success: true,
      applicationId: application.id,
      sessionToken,
      status: "CONSENT_CAPTURED",
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    logger.error("[Prequal] Failed to create application", { error: msg })
    return NextResponse.json({ success: false, error: "Failed to submit application" }, { status: 500 })
  }
}
