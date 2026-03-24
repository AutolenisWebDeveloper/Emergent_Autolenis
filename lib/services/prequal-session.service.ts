/**
 * Prequal Session Service
 *
 * Manages the prequalification session lifecycle:
 *  1. Create session
 *  2. Capture written-instruction consent
 *  3. Capture forwarding authorization (if applicable)
 *  4. Run provider-backed prequalification
 *  5. Return normalized result DTO
 *
 * Compliance invariants:
 *  - Every LIVE provider-backed prequal links to a retained written-instruction artifact
 *  - Forwarding authorization required before forwarding consumer-supplied data
 *  - All provider requests/responses are audit-linked via PrequalProviderEvent
 *  - Internal heuristic scoring cannot masquerade as provider-backed approval in LIVE mode
 */

import { prisma } from "@/lib/db"
import { PREQUAL_EXPIRY_DAYS } from "@/lib/constants"
import type { WorkspaceMode } from "@/lib/types"
import { MicroBiltPrequalProvider } from "./providers/microbilt-prequalification.provider"
import { IPredictRiskProvider } from "./providers/ipredict-risk.provider"
import {
  PrequalResponseNormalizer,
  type NormalizedPrequalResult,
} from "./providers/prequal-response-normalizer"
import type { PreQualProviderResponse } from "./prequal.service"

// ─── Types ──────────────────────────────────────────────────────────────────

export type SessionStatus =
  | "INITIATED"
  | "CONSENT_CAPTURED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "EXPIRED"

export type PrequalSourceType = "INTERNAL" | "MICROBILT" | "IPREDICT"

export interface CreateSessionInput {
  sourceType?: PrequalSourceType
}

export interface CaptureConsentInput {
  consentVersionId: string
  consentText: string
  consentGiven: boolean
}

export interface CaptureForwardingAuthInput {
  authorizationText: string
  authorized: boolean
  recipientDescription?: string
}

export interface RunPrequalInput {
  firstName: string
  lastName: string
  dateOfBirth: string
  addressLine1: string
  city: string
  state: string
  postalCode: string
  ssnLast4?: string
  monthlyIncomeCents: number
  monthlyHousingCents: number
}

// ─── Default consent version for non-provider (internal) flows ──────────────

const FALLBACK_CONSENT_VERSION_ID = "__internal_default__"

// ─── Service ────────────────────────────────────────────────────────────────

export class PrequalSessionService {
  /**
   * 1. Create a new prequal session.
   */
  async createSession(
    userId: string,
    input: CreateSessionInput,
    requestContext: { ipAddress?: string; userAgent?: string },
  ) {
    const session = await prisma.prequalSession.create({
      data: {
        userId,
        status: "INITIATED",
        sourceType: input.sourceType || "INTERNAL",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })

    return { sessionId: session.id, status: session.status }
  }

  /**
   * 2. Capture written-instruction consent for the session.
   * This is required before running any provider-backed prequal.
   */
  async captureConsent(
    sessionId: string,
    userId: string,
    input: CaptureConsentInput,
    requestContext: { ipAddress?: string; userAgent?: string },
  ) {
    if (!input.consentGiven) {
      throw new Error("Written-instruction consent is required to proceed with prequalification")
    }

    // Ensure session belongs to user and is in correct state
    const session = await prisma.prequalSession.findFirst({
      where: { id: sessionId, userId },
    })

    if (!session) {
      throw new Error("Prequal session not found")
    }

    if (session.status !== "INITIATED") {
      throw new Error("Consent can only be captured for sessions in INITIATED state")
    }

    // Create the consent artifact (immutable)
    const artifact = await prisma.prequalConsentArtifact.create({
      data: {
        userId,
        consentVersionId: input.consentVersionId,
        consentText: input.consentText,
        consentGiven: true,
        consentDate: new Date(),
        ipAddress: requestContext.ipAddress || null,
        userAgent: requestContext.userAgent || null,
        sessionId,
        createdAt: new Date(),
      },
    })

    // Update session state
    await prisma.prequalSession.update({
      where: { id: sessionId },
      data: {
        status: "CONSENT_CAPTURED",
        consentArtifactId: artifact.id,
        updatedAt: new Date(),
      },
    })

    return { artifactId: artifact.id, status: "CONSENT_CAPTURED" }
  }

  /**
   * 3. Capture forwarding authorization (separate from consent).
   * Required before forwarding consumer-supplied data to third parties.
   */
  async captureForwardingAuthorization(
    sessionId: string,
    userId: string,
    input: CaptureForwardingAuthInput,
    requestContext: { ipAddress?: string; userAgent?: string },
  ) {
    const session = await prisma.prequalSession.findFirst({
      where: { id: sessionId, userId },
    })

    if (!session) {
      throw new Error("Prequal session not found")
    }

    const artifact = await prisma.consumerAuthorizationArtifact.create({
      data: {
        userId,
        authorizationType: "DATA_FORWARDING",
        authorized: input.authorized,
        authorizationText: input.authorizationText,
        recipientDescription: input.recipientDescription || null,
        ipAddress: requestContext.ipAddress || null,
        userAgent: requestContext.userAgent || null,
        authorizedAt: new Date(),
        sessionId,
        createdAt: new Date(),
      },
    })

    // Link to session
    await prisma.prequalSession.update({
      where: { id: sessionId },
      data: {
        forwardingAuthorizationId: artifact.id,
        updatedAt: new Date(),
      },
    })

    return { authorizationId: artifact.id, authorized: input.authorized }
  }

  /**
   * 4. Run the provider-backed prequalification.
   *
   * Requires:
   *  - Session with consent captured
   *  - Forwarding authorization if sourceType != INTERNAL
   *  - Profile data in input
   *
   * In LIVE mode, internal heuristic scoring is blocked.
   */
  async runPrequal(
    sessionId: string,
    userId: string,
    input: RunPrequalInput,
    workspaceMode?: WorkspaceMode | null,
  ): Promise<NormalizedPrequalResult> {
    const session = await prisma.prequalSession.findFirst({
      where: { id: sessionId, userId },
    })

    if (!session) {
      throw new Error("Prequal session not found")
    }

    if (session.status !== "CONSENT_CAPTURED") {
      throw new Error("Written-instruction consent must be captured before running prequalification")
    }

    const sourceType = session.sourceType as PrequalSourceType

    // Enforce LIVE-mode prohibition on heuristic scoring
    PrequalResponseNormalizer.assertNotHeuristicInLive(
      sourceType,
      this.getProviderName(sourceType),
      workspaceMode,
    )

    // Require forwarding authorization for non-internal sources
    if (sourceType !== "INTERNAL" && !session.forwardingAuthorizationId) {
      throw new Error("Forwarding authorization is required before running provider-backed prequalification")
    }

    // Update session to PROCESSING
    await prisma.prequalSession.update({
      where: { id: sessionId },
      data: {
        status: "PROCESSING",
        providerRequestedAt: new Date(),
        updatedAt: new Date(),
      },
    })

    // Log permissible purpose
    await prisma.permissiblePurposeLog.create({
      data: {
        userId,
        sessionId,
        permissiblePurpose: "WRITTEN_INSTRUCTIONS_OF_CONSUMER",
        purposeDescription:
          "Consumer initiated prequalification with written instruction consent. " +
          "Soft inquiry does not affect consumer credit score.",
        providerName: this.getProviderName(sourceType),
        inquiryType: "SOFT_PULL",
        createdAt: new Date(),
      },
    })

    // Run the provider
    let providerResponse: PreQualProviderResponse
    let eventStatus: "SUCCESS" | "ERROR" = "SUCCESS"
    let errorMessage: string | null = null
    const startTime = Date.now()

    try {
      providerResponse = await this.callProvider(sourceType, input, sessionId)
      if (!providerResponse.success) {
        eventStatus = "ERROR"
        errorMessage = providerResponse.errorMessage || "Prequalification failed"
      }
    } catch (error) {
      eventStatus = "ERROR"
      errorMessage = error instanceof Error ? error.message : "Provider error"
      providerResponse = { success: false, errorMessage }
    }

    const latencyMs = Date.now() - startTime

    // Log provider event
    await prisma.prequalProviderEvent.create({
      data: {
        sessionId,
        userId,
        providerName: this.getProviderName(sourceType),
        eventType: "PREQUALIFY",
        requestPayload: this.sanitizeRequestPayload(input),
        responsePayload: providerResponse as unknown as Record<string, unknown>,
        responseStatus: eventStatus,
        errorMessage,
        latencyMs,
        createdAt: new Date(),
      },
    })

    // Create or update PreQualification record
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + (PREQUAL_EXPIRY_DAYS || 30))

    const normalizedTier = PrequalResponseNormalizer.normalizeCreditTier(
      providerResponse.creditTier,
    )
    const newStatus = providerResponse.success ? "ACTIVE" : "FAILED"

    // Expire existing active prequalifications
    await prisma.preQualification.updateMany({
      where: { buyerId: userId, status: "ACTIVE" },
      data: { status: "EXPIRED", updatedAt: new Date() },
    })

    const prequal = await prisma.preQualification.create({
      data: {
        buyerId: userId,
        status: newStatus,
        creditTier: normalizedTier,
        maxOtd: providerResponse.approvedAmountCents
          ? providerResponse.approvedAmountCents / 100
          : 0,
        maxOtdAmountCents: providerResponse.approvedAmountCents || null,
        estimatedMonthlyMin: providerResponse.minMonthlyPaymentCents
          ? providerResponse.minMonthlyPaymentCents / 100
          : 0,
        minMonthlyPaymentCents: providerResponse.minMonthlyPaymentCents || null,
        estimatedMonthlyMax: providerResponse.maxMonthlyPaymentCents
          ? providerResponse.maxMonthlyPaymentCents / 100
          : 0,
        maxMonthlyPaymentCents: providerResponse.maxMonthlyPaymentCents || null,
        dti: providerResponse.dtiRatio || null,
        dtiRatio: providerResponse.dtiRatio || null,
        source: this.toPreQualSource(sourceType),
        providerName: this.getProviderName(sourceType),
        providerReferenceId: providerResponse.providerReferenceId || null,
        rawResponseJson: { ...providerResponse },
        softPullCompleted: providerResponse.success,
        softPullDate: new Date(),
        consentGiven: true,
        consentDate: new Date(),
        expiresAt: providerResponse.success ? expiresAt : new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })

    // Update session with result
    await prisma.prequalSession.update({
      where: { id: sessionId },
      data: {
        status: providerResponse.success ? "COMPLETED" : "FAILED",
        prequalificationId: prequal.id,
        providerRespondedAt: new Date(),
        expiresAt: providerResponse.success ? expiresAt : null,
        updatedAt: new Date(),
      },
    })

    // Update provider event with prequal ID
    await prisma.prequalProviderEvent.updateMany({
      where: { sessionId, userId },
      data: { prequalificationId: prequal.id },
    })

    // Build normalized result
    const hasForwardingAuth = !!session.forwardingAuthorizationId

    return PrequalResponseNormalizer.toNormalizedResult({
      id: prequal.id,
      status: newStatus,
      sourceType,
      provider: this.getProviderName(sourceType),
      providerResponse,
      expiresAt: providerResponse.success ? expiresAt : null,
      disclosuresAccepted: true,
      forwardingAuthorized: hasForwardingAuth,
      createdAt: prequal.createdAt,
    })
  }

  /**
   * Get session details including linked artifacts.
   */
  async getSession(sessionId: string, userId: string) {
    const session = await prisma.prequalSession.findFirst({
      where: { id: sessionId, userId },
      include: { providerEvents: true },
    })

    if (!session) {
      throw new Error("Prequal session not found")
    }

    return session
  }

  /**
   * Admin: Get all compliance artifacts for a session.
   */
  async getSessionArtifacts(sessionId: string) {
    const [session, consentArtifacts, authArtifacts, providerEvents, purposeLogs] =
      await Promise.all([
        prisma.prequalSession.findUnique({ where: { id: sessionId } }),
        prisma.prequalConsentArtifact.findMany({
          where: { sessionId },
          orderBy: { createdAt: "desc" },
        }),
        prisma.consumerAuthorizationArtifact.findMany({
          where: { sessionId },
          orderBy: { createdAt: "desc" },
        }),
        prisma.prequalProviderEvent.findMany({
          where: { sessionId },
          orderBy: { createdAt: "desc" },
        }),
        prisma.permissiblePurposeLog.findMany({
          where: { sessionId },
          orderBy: { createdAt: "desc" },
        }),
      ])

    return {
      session,
      consentArtifacts,
      authorizationArtifacts: authArtifacts,
      providerEvents,
      permissiblePurposeLogs: purposeLogs,
    }
  }

  /**
   * Admin: List all sessions for a user.
   */
  async listUserSessions(userId: string) {
    return prisma.prequalSession.findMany({
      where: { userId },
      include: { providerEvents: true },
      orderBy: { createdAt: "desc" },
    })
  }

  /**
   * Admin: Export consent artifacts for MicroBilt review.
   */
  async exportConsentArtifacts(filters?: { userId?: string; fromDate?: Date; toDate?: Date }) {
    const where: Record<string, unknown> = {}
    if (filters?.userId) where["userId"] = filters.userId
    if (filters?.fromDate || filters?.toDate) {
      where["createdAt"] = {
        ...(filters?.fromDate ? { gte: filters.fromDate } : {}),
        ...(filters?.toDate ? { lte: filters.toDate } : {}),
      }
    }

    const [consentVersions, consentArtifacts, authArtifacts] = await Promise.all([
      prisma.prequalConsentVersion.findMany({ orderBy: { effectiveAt: "desc" } }),
      prisma.prequalConsentArtifact.findMany({
        where,
        orderBy: { createdAt: "desc" },
      }),
      prisma.consumerAuthorizationArtifact.findMany({
        where,
        orderBy: { createdAt: "desc" },
      }),
    ])

    return {
      consentVersions,
      consentArtifacts,
      authorizationArtifacts: authArtifacts,
      exportedAt: new Date().toISOString(),
    }
  }

  // ─── Private Helpers ────────────────────────────────────────────────────────

  private getProviderName(sourceType: PrequalSourceType): string {
    switch (sourceType) {
      case "MICROBILT":
        return MicroBiltPrequalProvider.PROVIDER_NAME
      case "IPREDICT":
        return IPredictRiskProvider.PROVIDER_NAME
      default:
        return "AutoLenisPrequal"
    }
  }

  private toPreQualSource(sourceType: PrequalSourceType): "INTERNAL" | "MICROBILT" | "IPREDICT" {
    switch (sourceType) {
      case "MICROBILT":
        return "MICROBILT"
      case "IPREDICT":
        return "IPREDICT"
      default:
        return "INTERNAL"
    }
  }

  private async callProvider(
    sourceType: PrequalSourceType,
    input: RunPrequalInput,
    sessionId: string,
  ): Promise<PreQualProviderResponse> {
    const baseRequest = {
      firstName: input.firstName,
      lastName: input.lastName,
      dateOfBirth: input.dateOfBirth,
      addressLine1: input.addressLine1,
      city: input.city,
      state: input.state,
      postalCode: input.postalCode,
      ssnLast4: input.ssnLast4,
    }

    switch (sourceType) {
      case "MICROBILT":
        return MicroBiltPrequalProvider.prequalify(baseRequest, { sessionId })

      case "IPREDICT": {
        // iPredict is risk-only; map to PreQualProviderResponse shape
        const riskResult = await IPredictRiskProvider.assessRisk(baseRequest, { sessionId })
        if (!riskResult.success) {
          return {
            success: false,
            errorMessage: riskResult.errorMessage,
          }
        }
        // iPredict doesn't provide approval amounts — it's supplementary
        return {
          success: true,
          creditTier: IPredictRiskProvider.riskCategoryToCreditTier(riskResult.riskCategory),
          providerReferenceId: riskResult.providerReferenceId,
        }
      }

      default: {
        return this.internalPrequalify(input)
      }
    }
  }

  /**
   * Internal prequalification using the same deterministic scoring as InternalPreQualProvider.
   * This is the fallback for non-provider flows.
   */
  private async internalPrequalify(input: RunPrequalInput): Promise<PreQualProviderResponse> {
    await new Promise((resolve) => setTimeout(resolve, 500))

    const monthlyIncome = input.monthlyIncomeCents / 100
    const monthlyHousing = input.monthlyHousingCents / 100

    const dtiRatio = monthlyIncome > 0 ? (monthlyHousing / monthlyIncome) * 100 : 100

    if (dtiRatio > 50) {
      return {
        success: false,
        errorMessage: "Debt-to-income ratio exceeds acceptable threshold",
      }
    }

    const dtiScore = Math.max(0, 100 - dtiRatio * 2)
    const incomeScore = Math.min(100, monthlyIncome / 80)
    const stabilityScore = Math.min(
      100,
      Math.max(0, 100 - (monthlyHousing / Math.max(monthlyIncome, 1)) * 200),
    )
    const estimatedScore = Math.floor(
      600 + (dtiScore * 0.4 + incomeScore * 0.35 + stabilityScore * 0.25) * 2,
    )

    let creditTier: string
    let rateMultiplier: number

    if (estimatedScore >= 750) {
      creditTier = "EXCELLENT"
      rateMultiplier = 1.0
    } else if (estimatedScore >= 700) {
      creditTier = "PRIME"
      rateMultiplier = 0.9
    } else if (estimatedScore >= 650) {
      creditTier = "NEAR_PRIME"
      rateMultiplier = 0.75
    } else {
      creditTier = "SUBPRIME"
      rateMultiplier = 0.5
    }

    const availableMonthly = monthlyIncome * 0.43 - monthlyHousing
    const maxMonthlyPayment = Math.max(0, Math.floor(availableMonthly * rateMultiplier))

    const avgApr =
      creditTier === "EXCELLENT"
        ? 0.045
        : creditTier === "PRIME"
          ? 0.065
          : creditTier === "NEAR_PRIME"
            ? 0.085
            : 0.12
    const termMonths = 60
    const monthlyRate = avgApr / 12

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
      providerReferenceId: `ALQ-SESSION-${Date.now()}-${crypto.randomUUID().replace(/-/g, "").substring(0, 12)}`,
    }
  }

  /**
   * Remove sensitive fields (SSN) from request payload before storing.
   */
  private sanitizeRequestPayload(input: RunPrequalInput): Record<string, unknown> {
    const sanitized = { ...input } as Record<string, unknown>
    delete sanitized["ssnLast4"]
    return sanitized
  }
}

// Export singleton
const prequalSessionService = new PrequalSessionService()
export { prequalSessionService }
export default prequalSessionService
