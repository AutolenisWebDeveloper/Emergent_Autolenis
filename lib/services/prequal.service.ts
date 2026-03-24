import { prisma } from "@/lib/db"
import { PREQUAL_EXPIRY_DAYS } from "@/lib/constants"
import { isTestWorkspace } from "@/lib/app-mode"
import { mockDb } from "@/lib/mocks/mockStore"
import type { WorkspaceMode } from "@/lib/types"
import {
  type PreQualProviderRequest,
  type PreQualProviderResponse,
  normalizeCreditTier,
  normalizeProviderResponse,
} from "@/lib/services/prequal/provider-interface"
import { providerRegistry } from "@/lib/services/prequal/provider-registry"
import { consentArtifactService } from "@/lib/services/prequal/consent-artifact.service"

// Types
export type PreQualStatus = "ACTIVE" | "EXPIRED" | "REVOKED" | "FAILED"

// Matches CreditTier enum in prisma/schema.prisma
type CreditTier = "EXCELLENT" | "GOOD" | "FAIR" | "POOR" | "DECLINED"

export interface BuyerProfileInput {
  dateOfBirth?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  employmentStatus?: string
  employerName?: string
  monthlyIncomeCents?: number
  monthlyHousingCents?: number
  firstName?: string
  lastName?: string
  phone?: string
}

export interface PreQualStartInput {
  consentGiven: boolean
  consentText?: string
  ssnLast4?: string
}

// Re-export for backward compatibility
export type { PreQualProviderResponse }

// Default consent text
const DEFAULT_CONSENT_TEXT = `I authorize AutoLenis and its partners to obtain my credit report for the purpose of pre-qualifying me for vehicle financing. I understand this is a soft inquiry that will not affect my credit score. I acknowledge that I have read and agree to the Privacy Policy and Terms of Service.`

const VALID_CREDIT_TIERS: CreditTier[] = ["EXCELLENT", "GOOD", "FAIR", "POOR", "DECLINED"]

function toValidCreditTier(tier: string | undefined | null): CreditTier {
  if (tier && VALID_CREDIT_TIERS.includes(tier as CreditTier)) {
    return tier as CreditTier
  }
  // Map provider-specific tiers
  const mapped = normalizeCreditTier(tier)
  return mapped as CreditTier
}

// Internal Pre-Qualification Provider (AutoLenis scoring engine)
// Kept for backward compatibility — delegates to extracted provider
class InternalPreQualProvider {
  static readonly PROVIDER_NAME = "AutoLenisPrequal"

  static async prequalify(data: {
    firstName: string
    lastName: string
    dateOfBirth: string
    addressLine1: string
    city: string
    state: string
    postalCode: string
    monthlyIncomeCents: number
    monthlyHousingCents: number
    ssnLast4?: string
  }, session?: { workspace_mode?: WorkspaceMode } | null): Promise<PreQualProviderResponse> {
    if (isTestWorkspace(session)) {
      const testPrequal = mockDb.prequals[0]
      return {
        success: true,
        creditTier: testPrequal.creditTier,
        approvedAmountCents: testPrequal.maxOtdAmountCents,
        maxMonthlyPaymentCents: testPrequal.maxMonthlyPaymentCents,
        minMonthlyPaymentCents: testPrequal.minMonthlyPaymentCents,
        dtiRatio: testPrequal.dtiRatio,
        providerReferenceId: "ALQ-PREQ-2026-0001",
      }
    }

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 800))

    // Scoring logic based on income and housing
    const monthlyIncome = data.monthlyIncomeCents / 100
    const monthlyHousing = data.monthlyHousingCents / 100

    // Calculate DTI
    const dtiRatio = monthlyIncome > 0 ? (monthlyHousing / monthlyIncome) * 100 : 100

    // Reject if DTI too high
    if (dtiRatio > 50) {
      return {
        success: false,
        errorMessage: "Debt-to-income ratio exceeds acceptable threshold",
      }
    }

    // Determine credit tier using deterministic scoring based on profile data
    // Score is computed from DTI, income level, and housing-to-income ratio
    const dtiScore = Math.max(0, 100 - dtiRatio * 2) // lower DTI = higher score
    const incomeScore = Math.min(100, monthlyIncome / 80) // up to $8k/month = full score
    const stabilityScore = Math.min(100, Math.max(0, 100 - (monthlyHousing / Math.max(monthlyIncome, 1)) * 200))
    const estimatedScore = Math.floor(600 + (dtiScore * 0.4 + incomeScore * 0.35 + stabilityScore * 0.25) * 2)
    let creditTier: string
    let rateMultiplier: number

    if (estimatedScore >= 750) {
      creditTier = "EXCELLENT"
      rateMultiplier = 1.0
    } else if (estimatedScore >= 700) {
      creditTier = "GOOD"
      rateMultiplier = 0.9
    } else if (estimatedScore >= 650) {
      creditTier = "FAIR"
      rateMultiplier = 0.75
    } else {
      creditTier = "POOR"
      rateMultiplier = 0.5
    }

    // Calculate max monthly payment (43% DTI rule minus housing)
    const availableMonthly = monthlyIncome * 0.43 - monthlyHousing
    const maxMonthlyPayment = Math.max(0, Math.floor(availableMonthly * rateMultiplier))

    // Calculate max OTD (assuming 60-month term, avg APR based on tier)
    const avgApr =
      creditTier === "EXCELLENT" ? 0.045 : creditTier === "GOOD" ? 0.065 : creditTier === "FAIR" ? 0.085 : 0.12
    const termMonths = 60
    const monthlyRate = avgApr / 12

    // PV formula: P = PMT * [(1 - (1 + r)^-n) / r]
    const approvedAmount =
      monthlyRate > 0
        ? maxMonthlyPayment * ((1 - Math.pow(1 + monthlyRate, -termMonths)) / monthlyRate)
        : maxMonthlyPayment * termMonths

    return {
      success: true,
      creditTier,
      approvedAmountCents: Math.floor(approvedAmount) * 100,
      maxMonthlyPaymentCents: maxMonthlyPayment * 100,
      minMonthlyPaymentCents: Math.floor(maxMonthlyPayment * 0.5) * 100,
      dtiRatio: Math.round(dtiRatio * 100) / 100,
      providerReferenceId: `ALQ-${Date.now()}-${crypto.randomUUID().replace(/-/g, "").substring(0, 12)}`,
    }
  }
}

export class PreQualService {
  // Get buyer profile
  async getBuyerProfile(userId: string) {
    return prisma.buyerProfile.findUnique({
      where: { userId },
    })
  }

  // Update buyer profile (upsert)
  async updateBuyerProfile(userId: string, data: BuyerProfileInput) {
    // Convert cents fields if provided
    const updateData: Record<string, unknown> = {}

    if (data['dateOfBirth']) updateData['dateOfBirth'] = new Date(data['dateOfBirth'])
    if (data['addressLine1']) updateData['address'] = data['addressLine1']
    if (data['addressLine2'] !== undefined) updateData['addressLine2'] = data['addressLine2']
    if (data['city']) updateData['city'] = data['city']
    if (data['state']) updateData['state'] = data['state']
    if (data['postalCode']) updateData['postalCode'] = data['postalCode']
    if (data['country']) updateData['country'] = data['country']
    if (data['employmentStatus']) updateData['employmentStatus'] = data['employmentStatus']
    if (data['employerName']) updateData['employerName'] = data['employerName']
    if (data['monthlyIncomeCents'] !== undefined) updateData['monthlyIncomeCents'] = data['monthlyIncomeCents']
    if (data['monthlyHousingCents'] !== undefined) updateData['monthlyHousingCents'] = data['monthlyHousingCents']
    if (data['firstName']) updateData['firstName'] = data['firstName']
    if (data['lastName']) updateData['lastName'] = data['lastName']
    if (data['phone']) updateData['phone'] = data['phone']

    updateData['updatedAt'] = new Date()

    return prisma.buyerProfile.upsert({
      where: { userId },
      create: {
        userId,
        ...updateData,
        createdAt: new Date(),
      },
      update: updateData,
    })
  }

  // Get active pre-qualification for user
  async getActivePrequalification(userId: string) {
    // First check by buyerId (legacy field)
    const prequal = await prisma.preQualification.findFirst({
      where: {
        buyerId: userId,
        status: "ACTIVE",
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    })

    return prequal
  }

  // Get current pre-qualification status
  async getCurrentPreQual(userId: string) {
    const prequal = await this.getActivePrequalification(userId)

    if (!prequal) {
      return {
        active: false,
        preQualification: null,
      }
    }

    return {
      active: true,
      preQualification: {
        id: prequal.id,
        status: prequal.status,
        creditTier: prequal.creditTier,
        maxOtdAmountCents: prequal.maxOtdAmountCents ?? null,
        minMonthlyPaymentCents: prequal.minMonthlyPaymentCents ?? null,
        maxMonthlyPaymentCents: prequal.maxMonthlyPaymentCents ?? null,
        dtiRatio: prequal.dtiRatio ?? null,
        expiresAt: prequal.expiresAt,
        providerName: prequal.providerName,
        source: prequal.source || "INTERNAL",
        createdAt: prequal.createdAt,
      },
    }
  }

  // Validate profile completeness
  validateProfileForPreQual(profile: Record<string, unknown> | null): {
    valid: boolean
    missingFields: string[]
  } {
    const missingFields: string[] = []

    if (!profile) {
      return { valid: false, missingFields: ["Profile not found. Please complete your profile first."] }
    }

    if (!profile['dateOfBirth']) missingFields.push("dateOfBirth")
    if (!profile['address']) missingFields.push("address")
    if (!profile['city']) missingFields.push("city")
    if (!profile['state']) missingFields.push("state")
    if (!profile['postalCode'] && !profile['zip']) missingFields.push("postalCode")
    if (!profile['monthlyIncomeCents'] && !profile['annualIncome'])
      missingFields.push("monthlyIncomeCents")
    if (
      profile['monthlyHousingCents'] === undefined &&
      profile['monthlyHousing'] === undefined
    ) {
      missingFields.push("monthlyHousingCents")
    }

    return { valid: missingFields.length === 0, missingFields }
  }

  // Start pre-qualification process
  // Pipeline: session → consent capture → provider execution → normalized results
  async startPreQual(
    userId: string,
    input: PreQualStartInput,
    requestContext: { ipAddress?: string; userAgent?: string },
    session?: { workspace_mode?: WorkspaceMode } | null,
  ) {
    // 1. Validate consent
    if (!input.consentGiven) {
      throw new Error("Consent is required to proceed with pre-qualification")
    }

    // 2. Load and validate profile
    const profile = await this.getBuyerProfile(userId)
    const validation = this.validateProfileForPreQual(profile as Record<string, unknown>)

    if (!validation.valid) {
      throw new Error(`Profile incomplete. Missing: ${validation.missingFields.join(", ")}`)
    }

    // 3. Capture consent artifact (immutable)
    let consentArtifactId: string | null = null
    try {
      const consentVersion = await consentArtifactService.getActiveConsentVersion()
      const artifact = await consentArtifactService.createArtifact({
        userId,
        buyerId: userId,
        workspaceId: profile?.workspaceId,
        consentVersionId: consentVersion.id,
        consentText: input.consentText || DEFAULT_CONSENT_TEXT,
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
      })
      consentArtifactId = artifact.id
    } catch (err) {
      // Consent artifact creation is best-effort during migration;
      // fall back to legacy raw SQL consent event recording
      console.warn("[PreQual] Consent artifact creation failed (migration fallback):", err instanceof Error ? err.message : err)
    }

    // Legacy consent event recording (maintained for backward compatibility)
    await prisma.$executeRaw`
      INSERT INTO credit_consent_events (id, user_id, consent_given, consent_text, provider_name, ip_address, user_agent, created_at)
      VALUES (
        gen_random_uuid()::text,
        ${userId},
        ${input.consentGiven},
        ${input.consentText || DEFAULT_CONSENT_TEXT},
        ${InternalPreQualProvider.PROVIDER_NAME},
        ${requestContext.ipAddress || null},
        ${requestContext.userAgent || null},
        now()
      )
    `

    // 4. Resolve provider via registry
    const provider = providerRegistry.resolve(session?.workspace_mode)
    const providerName = provider.providerName

    // 5. Build provider request payload
    const requestPayload: PreQualProviderRequest = {
      firstName: profile!.firstName || "",
      lastName: profile!.lastName || "",
      dateOfBirth: profile!.dateOfBirth?.toISOString().split("T")[0] || "",
      addressLine1: profile!.address || "",
      city: profile!.city || "",
      state: profile!.state || "",
      postalCode: profile!.postalCode || profile!.zip || "",
      monthlyIncomeCents:
        profile!.monthlyIncomeCents ||
        Math.floor(((profile!.annualIncome || 0) / 12) * 100),
      monthlyHousingCents:
        profile!.monthlyHousingCents ||
        Math.floor((profile!.monthlyHousing || 0) * 100),
      ssnLast4: input.ssnLast4,
    }

    // 6. Execute provider
    let providerResponse: PreQualProviderResponse
    let providerEventStatus: "SUCCESS" | "ERROR" = "SUCCESS"
    let providerErrorMessage: string | null = null
    const startTime = Date.now()

    try {
      providerResponse = await provider.prequalify(requestPayload, session)
      if (!providerResponse.success) {
        providerEventStatus = "ERROR"
        providerErrorMessage = providerResponse.errorMessage || "Pre-qualification failed"
      }
    } catch (error) {
      providerEventStatus = "ERROR"
      providerErrorMessage = error instanceof Error ? error.message : "Provider error"
      providerResponse = { success: false, errorMessage: providerErrorMessage }
    }

    const durationMs = Date.now() - startTime

    // 7. Normalize result
    const normalized = normalizeProviderResponse(providerName, providerResponse)

    // 8. Expire any existing ACTIVE pre-quals for this user
    await prisma.preQualification.updateMany({
      where: {
        buyerId: userId,
        status: "ACTIVE",
      },
      data: {
        status: "EXPIRED",
        updatedAt: new Date(),
      },
    })

    // 9. Create new pre-qualification record
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + (PREQUAL_EXPIRY_DAYS || 30))

    const newStatus: PreQualStatus = providerResponse.success ? "ACTIVE" : "FAILED"

    const prequal = await prisma.preQualification.create({
      data: {
        buyerId: userId,
        status: newStatus,
        creditTier: toValidCreditTier(normalized.creditTier),
        maxOtd: normalized.approvedAmountCents ? normalized.approvedAmountCents / 100 : null,
        maxOtdAmountCents: normalized.approvedAmountCents || null,
        estimatedMonthlyMin: normalized.minMonthlyPaymentCents
          ? normalized.minMonthlyPaymentCents / 100
          : null,
        minMonthlyPaymentCents: normalized.minMonthlyPaymentCents || null,
        estimatedMonthlyMax: normalized.maxMonthlyPaymentCents
          ? normalized.maxMonthlyPaymentCents / 100
          : null,
        maxMonthlyPaymentCents: normalized.maxMonthlyPaymentCents || null,
        dti: normalized.dtiRatio || null,
        dtiRatio: normalized.dtiRatio || null,
        source: "INTERNAL",
        providerName,
        providerReferenceId: normalized.providerReferenceId || null,
        rawResponseJson: { ...providerResponse },
        softPullCompleted: providerResponse.success,
        softPullDate: new Date(),
        consentGiven: true,
        consentDate: new Date(),
        expiresAt: providerResponse.success ? expiresAt : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })

    // 10. Link consent artifact to prequal
    if (consentArtifactId) {
      try {
        await consentArtifactService.linkToPreQualification(consentArtifactId, prequal.id)
      } catch (err) {
        console.warn("[PreQual] Consent artifact linking failed (migration fallback):", err instanceof Error ? err.message : err)
      }
    }

    // 11. Log provider event (Prisma-managed model)
    try {
      await prisma.preQualProviderEvent.create({
        data: {
          userId,
          preQualificationId: prequal.id,
          workspaceId: profile?.workspaceId,
          providerName,
          requestPayload: requestPayload as any,
          responsePayload: providerResponse as any,
          status: providerEventStatus,
          errorMessage: providerErrorMessage,
          durationMs,
        },
      })
    } catch (err) {
      console.warn("[PreQual] Prisma provider event creation failed (migration fallback):", err instanceof Error ? err.message : err)
    }

    // Legacy provider event recording (maintained for backward compatibility)
    await prisma.$executeRaw`
      INSERT INTO prequal_provider_events (id, user_id, pre_qualification_id, request_payload, response_payload, status, error_message, created_at)
      VALUES (
        gen_random_uuid()::text,
        ${userId},
        ${prequal.id},
        ${JSON.stringify(requestPayload)}::jsonb,
        ${JSON.stringify(providerResponse)}::jsonb,
        ${providerEventStatus},
        ${providerErrorMessage},
        now()
      )
    `

    // 12. Log compliance event
    await prisma.complianceEvent.create({
      data: {
        eventType: "SOFT_CREDIT_PULL",
        userId,
        buyerId: userId,
        severity: providerResponse.success ? "INFO" : "WARN",
        details: {
          prequalId: prequal.id,
          status: newStatus,
          creditTier: normalized.creditTier,
          maxOtdCents: normalized.approvedAmountCents,
          providerName,
          durationMs,
          consentArtifactId,
        },
        createdAt: new Date(),
      },
    })

    // 13. Return result
    if (!providerResponse.success) {
      return {
        success: false,
        error: providerResponse.errorMessage || "Pre-qualification failed. Please try again or contact support.",
      }
    }

    return {
      success: true,
      preQualification: {
        id: prequal.id,
        status: "ACTIVE",
        creditTier: normalized.creditTier,
        maxOtdAmountCents: normalized.approvedAmountCents,
        minMonthlyPaymentCents: normalized.minMonthlyPaymentCents,
        maxMonthlyPaymentCents: normalized.maxMonthlyPaymentCents,
        dtiRatio: normalized.dtiRatio,
        expiresAt,
        providerName,
      },
    }
  }

  // Refresh pre-qualification (re-run)
  async refreshPreQual(userId: string, requestContext: { ipAddress?: string; userAgent?: string }, session?: { workspace_mode?: WorkspaceMode } | null) {
    return this.startPreQual(userId, { consentGiven: true, consentText: DEFAULT_CONSENT_TEXT }, requestContext, session)
  }

  // Admin: Get prequal history for user
  async getPreQualHistoryForUser(userId: string) {
    const [preQuals, consentEvents, providerEvents] = await Promise.all([
      prisma.preQualification.findMany({
        where: { buyerId: userId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.$queryRaw<
        Array<{
          id: string
          user_id: string
          consent_given: boolean
          consent_text: string
          provider_name: string
          ip_address: string | null
          user_agent: string | null
          created_at: Date
        }>
      >`SELECT * FROM credit_consent_events WHERE user_id = ${userId} ORDER BY created_at DESC`,
      prisma.$queryRaw<
        Array<{
          id: string
          user_id: string
          pre_qualification_id: string | null
          request_payload: unknown
          response_payload: unknown
          status: string
          error_message: string | null
          created_at: Date
        }>
      >`SELECT * FROM prequal_provider_events WHERE user_id = ${userId} ORDER BY created_at DESC`,
    ])

    const activePreQual = preQuals.find((p: any) => p.status === "ACTIVE" && p.expiresAt && p.expiresAt > new Date())

    return {
      activePreQualification: activePreQual || null,
      preQualificationHistory: preQuals,
      consentEvents,
      providerEvents,
    }
  }

  // Admin: Revoke pre-qualification
  async revokePreQual(userId: string, adminUserId: string, reason?: string) {
    const activePreQual = await this.getActivePrequalification(userId)

    if (!activePreQual) {
      throw new Error("No active pre-qualification found for this user")
    }

    await prisma.preQualification.update({
      where: { id: activePreQual.id },
      data: {
        status: "REVOKED",
        updatedAt: new Date(),
      },
    })

    // Log compliance event
    await prisma.complianceEvent.create({
      data: {
        eventType: "PREQUAL_REVOKED",
        userId,
        buyerId: userId,
        severity: "WARN",
        details: {
          prequalId: activePreQual.id,
          revokedBy: adminUserId,
          reason: reason || "Admin revocation",
        },
        createdAt: new Date(),
      },
    })

    return { success: true }
  }

  // Create a new prequal session
  async createSession(userId: string, _requestContext: { ipAddress?: string; userAgent?: string }) {
    return prisma.prequalSession.create({
      data: {
        userId,
        status: "INITIATED",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })
  }

  // Record consent artifact
  async recordConsent(
    userId: string,
    consentVersionId: string,
    sessionId: string,
    requestContext: { ipAddress?: string; userAgent?: string },
  ) {
    // Verify consent version exists
    const consentVersion = await prisma.prequalConsentVersion.findUnique({
      where: { id: consentVersionId },
    })
    if (!consentVersion) {
      throw Object.assign(new Error("Consent version not found"), { code: "NOT_FOUND" })
    }

    // Verify session belongs to this user
    const prequalSession = await prisma.prequalSession.findFirst({
      where: { id: sessionId, userId },
    })
    if (!prequalSession) {
      throw Object.assign(new Error("Session not found"), { code: "NOT_FOUND" })
    }

    // Create immutable consent artifact
    const artifact = await prisma.prequalConsentArtifact.create({
      data: {
        userId,
        consentVersionId,
        consentText: consentVersion.bodyText,
        consentGiven: true,
        consentDate: new Date(),
        ipAddress: requestContext.ipAddress || null,
        userAgent: requestContext.userAgent || null,
        sessionId,
        createdAt: new Date(),
      },
    })

    // Update session status
    await prisma.prequalSession.update({
      where: { id: sessionId },
      data: { status: "CONSENT_CAPTURED", consentArtifactId: artifact.id, updatedAt: new Date() },
    })

    return artifact
  }

  // Get normalized prequal offers for buyer
  async getOffers(userId: string) {
    const buyer = await prisma.buyerProfile.findUnique({
      where: { userId },
      select: { id: true },
    })
    if (!buyer) return []

    return prisma.preQualification.findMany({
      where: {
        buyerId: buyer.id,
        status: "ACTIVE",
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    })
  }

  // Record forwarding authorization artifact
  async recordForwardingAuthorization(
    userId: string,
    authorizedParties: string[],
    authorizationText: string,
    requestContext: { ipAddress?: string; userAgent?: string },
  ) {
    return prisma.consumerAuthorizationArtifact.create({
      data: {
        userId,
        authorizationType: "DATA_FORWARDING",
        authorized: true,
        authorizationText,
        recipientDescription: authorizedParties.join(", "),
        ipAddress: requestContext.ipAddress || null,
        userAgent: requestContext.userAgent || null,
        authorizedAt: new Date(),
        createdAt: new Date(),
      },
    })
  }

  // Static wrapper methods for API route compatibility
  static async refreshPreQual(userId: string, requestContext: { ipAddress?: string; userAgent?: string }, session?: { workspace_mode?: WorkspaceMode } | null) {
    return prequalService.refreshPreQual(userId, requestContext, session)
  }

  static async startPreQual(userId: string, data: any, requestContext: { ipAddress?: string; userAgent?: string }, session?: { workspace_mode?: WorkspaceMode } | null) {
    return prequalService.startPreQual(userId, data, requestContext, session)
  }

  static async getBuyerProfile(userId: string) {
    return prequalService.getBuyerProfile(userId)
  }

  static async updateBuyerProfile(userId: string, data: BuyerProfileInput) {
    return prequalService.updateBuyerProfile(userId, data)
  }

  static async getCurrentPreQual(userId: string) {
    return prequalService.getCurrentPreQual(userId)
  }
}

// Export singleton instance
const prequalService = new PreQualService()
export { prequalService }
export default prequalService
