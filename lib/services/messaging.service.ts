/**
 * Messaging Service
 *
 * Provides secure in-app messaging between buyers and dealers.
 * Integrates with identity firewall, circumvention monitoring,
 * and external preapproval metadata for readiness gating.
 */

import { prisma, supabase } from "@/lib/db"
import { identityFirewallService } from "./identity-firewall.service"
import { circumventionMonitorService } from "./circumvention-monitor.service"
import { resolveDecision } from "@/lib/services/decision-engine"

// ── Types ──────────────────────────────────────────────────────────────────

export type ApprovalSource = "autolenis" | "external" | "cash"

export interface BuyerReadinessPayload {
  approvalSource: string
  approvalType: ApprovalSource
  maxBudget?: number | null
  monthlyBudgetMin?: number | null
  monthlyBudgetMax?: number | null
  expiration?: string | null
  vehicleConstraints?: string | null
  uploaded?: boolean
}

export interface CreateThreadInput {
  buyerId: string
  dealerId: string
  requestId?: string | null
  dealId?: string | null
  workspaceId?: string | null
}

export interface SendMessageInput {
  threadId: string
  senderId: string
  senderType: "BUYER" | "DEALER" | "SYSTEM"
  body: string
}

export interface ThreadSummary {
  id: string
  buyerId: string
  dealerId: string
  requestId: string | null
  dealId: string | null
  approvalType: string
  identityReleased: boolean
  status: string
  createdAt: Date
  updatedAt: Date
  lastMessage?: string | null
  lastMessageAt?: Date | null
  readiness?: BuyerReadinessPayload | null
}

// ── Service ────────────────────────────────────────────────────────────────

export class MessagingService {
  /**
   * Resolve buyer profile ID from user ID.
   */
  async resolveBuyerProfileId(userId: string): Promise<string | undefined> {
    const profile = await prisma.buyerProfile.findUnique({
      where: { userId },
      select: { id: true },
    })
    return profile?.id
  }

  /**
   * Resolve dealer ID from user ID (checks DealerUser then Dealer).
   */
  async resolveDealerIdForUser(userId: string): Promise<string | undefined> {
    const { data: dealerUser } = await supabase.from("DealerUser").select("dealerId").eq("userId", userId).maybeSingle()
    if (dealerUser?.dealerId) return dealerUser.dealerId as string

    const { data: dealer } = await supabase.from("Dealer").select("id").eq("userId", userId).maybeSingle()
    return dealer?.id as string | undefined
  }

  /**
   * Get a thread for a buyer (verifies buyer ownership).
   */
  async getThreadForBuyer(threadId: string, buyerId: string) {
    const thread = await prisma.messageThread.findUnique({ where: { id: threadId } })
    if (!thread || thread.buyerId !== buyerId) return null
    return thread
  }

  /**
   * Get a thread for a dealer (verifies dealer ownership).
   */
  async getThreadForDealer(threadId: string, dealerId: string) {
    const thread = await prisma.messageThread.findUnique({ where: { id: threadId } })
    if (!thread || thread.dealerId !== dealerId) return null
    return thread
  }

  /**
   * Resolve a buyer's approval type from the database.
   * Checks PreQualification (autolenis/external) and ExternalPreApprovalSubmission.
   *
   * Only uses prequals with status "ACTIVE" or null (for backwards compat).
   * For EXTERNAL_MANUAL source, cross-validates the linked ExternalPreApprovalSubmission
   * is still in APPROVED status — rejects stale prequals from rejected/superseded/expired submissions.
   *
   * Cash eligibility requires an explicit platform basis — a SelectedDeal with
   * payment_type = 'CASH'. Buyer profile existence alone is NOT sufficient.
   * This prevents unqualified buyers from becoming messaging-eligible merely
   * because no prequal record was found.
   */
  async resolveBuyerApprovalType(buyerId: string): Promise<{
    approvalType: ApprovalSource
    readiness: BuyerReadinessPayload
  }> {
    // Only match prequals that are ACTIVE or have no status set (backwards compat).
    // Excludes REVOKED, EXPIRED, FAILED, PENDING.
    const prequal = await prisma.preQualification.findFirst({
      where: {
        buyerId,
        OR: [
          { status: "ACTIVE" },
          { status: null },
        ],
      },
      orderBy: { createdAt: "desc" },
    })

    // Check for autolenis native prequalification
    if (prequal && prequal.source === "INTERNAL") {
      const isExpired = prequal.expiresAt && new Date(prequal.expiresAt) < new Date()
      return {
        approvalType: "autolenis",
        readiness: {
          approvalSource: "AutoLenis Prequalified",
          approvalType: "autolenis",
          maxBudget: prequal.maxOtd ?? null,
          monthlyBudgetMin: prequal.estimatedMonthlyMin ?? null,
          monthlyBudgetMax: prequal.estimatedMonthlyMax ?? null,
          expiration: isExpired ? "Expired" : prequal.expiresAt?.toISOString() ?? null,
        },
      }
    }

    // Check for external preapproval (from canonical ExternalPreApprovalSubmission path)
    if (prequal && prequal.source === "EXTERNAL_MANUAL") {
      // Cross-validate: the linked ExternalPreApprovalSubmission must still be APPROVED.
      // Rejects stale prequals from submissions that were later rejected, superseded, or expired.
      let submissionValid = false
      if (prequal.externalSubmissionId) {
        const submission = await prisma.externalPreApprovalSubmission.findUnique({
          where: { id: prequal.externalSubmissionId },
          select: { status: true },
        })
        submissionValid = submission?.status === "APPROVED"
      }

      if (submissionValid) {
        const isExpired = prequal.expiresAt && new Date(prequal.expiresAt) < new Date()
        return {
          approvalType: "external",
          readiness: {
            approvalSource: "External Pre-Approval Uploaded",
            approvalType: "external",
            maxBudget: prequal.maxOtd ?? null,
            monthlyBudgetMin: prequal.estimatedMonthlyMin ?? null,
            monthlyBudgetMax: prequal.estimatedMonthlyMax ?? null,
            expiration: isExpired ? "Expired" : prequal.expiresAt?.toISOString() ?? null,
            uploaded: true,
          },
        }
      }
      // Submission is not APPROVED (rejected/superseded/expired/missing).
      // Do NOT fall through to cash — buyer chose the external preapproval path
      // and that path is no longer valid. They must upload a new approval or get
      // a native prequal. This prevents invalid external approvals from silently
      // unlocking messaging through an unintended cash fallback.
      return {
        approvalType: "external",
        readiness: {
          approvalSource: "External Pre-Approval Uploaded",
          approvalType: "external",
          uploaded: false,
        },
      }
    }

    // Cash eligibility requires an explicit platform basis — a SelectedDeal
    // with payment_type = 'CASH'. Buyer profile existence alone is NOT sufficient.
    // This field is set via SQL migration and not in the Prisma schema, so we
    // use a raw query to check it.
    const buyer = await prisma.buyerProfile.findUnique({ where: { id: buyerId } })
    if (buyer) {
      const cashDeals = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "SelectedDeal"
        WHERE "buyerId" = ${buyerId} AND "payment_type" = 'CASH'
        LIMIT 1
      `
      if (cashDeals.length > 0) {
        return {
          approvalType: "cash",
          readiness: {
            approvalSource: "Cash Buyer",
            approvalType: "cash",
          },
        }
      }
    }

    // No valid buyer found or no valid approval basis for messaging
    throw new Error("Buyer profile not found")
  }

  /**
   * Validate whether a buyer is eligible to start or participate in messaging.
   * Returns { eligible: true } or { eligible: false, reason: string }.
   */
  async validateBuyerMessagingEligibility(buyerId: string): Promise<{
    eligible: boolean
    reason?: string
  }> {
    try {
      const { approvalType, readiness } = await this.resolveBuyerApprovalType(buyerId)

      if (approvalType === "autolenis") {
        // Check for expired preapproval
        if (readiness.expiration === "Expired") {
          return { eligible: false, reason: "Your AutoLenis prequalification has expired. Please renew before messaging dealers." }
        }
        return { eligible: true }
      }

      if (approvalType === "external") {
        if (!readiness.uploaded) {
          return { eligible: false, reason: "External pre-approval document must be uploaded before messaging dealers." }
        }
        if (readiness.expiration === "Expired") {
          return { eligible: false, reason: "Your external pre-approval has expired. Please upload a new one." }
        }
        return { eligible: true }
      }

      if (approvalType === "cash") {
        return { eligible: true }
      }

      return { eligible: false, reason: "No valid approval status found." }
    } catch {
      return { eligible: false, reason: "Unable to verify buyer qualification status." }
    }
  }

  /**
   * Build the readiness payload for a given buyer (used in thread context).
   */
  async buildBuyerReadinessPayloadForMessaging(buyerId: string): Promise<BuyerReadinessPayload | null> {
    try {
      const { readiness } = await this.resolveBuyerApprovalType(buyerId)
      return readiness
    } catch {
      return null
    }
  }

  /**
   * Create a new message thread between a buyer and dealer.
   */
  async createThread(input: CreateThreadInput) {
    // Validate buyer eligibility
    const eligibility = await this.validateBuyerMessagingEligibility(input.buyerId)
    if (!eligibility.eligible) {
      throw new Error(eligibility.reason || "Buyer is not eligible for messaging.")
    }

    // Resolve approval type
    const { approvalType, readiness } = await this.resolveBuyerApprovalType(input.buyerId)

    // Check for existing active thread between this buyer and dealer
    const existing = await prisma.messageThread.findFirst({
      where: {
        buyerId: input.buyerId,
        dealerId: input.dealerId,
        status: "ACTIVE",
      },
    })

    if (existing) {
      return { thread: existing, readiness, created: false }
    }

    const thread = await prisma.messageThread.create({
      data: {
        workspaceId: input.workspaceId ?? null,
        buyerId: input.buyerId,
        dealerId: input.dealerId,
        requestId: input.requestId ?? null,
        dealId: input.dealId ?? null,
        approvalType,
        status: "ACTIVE",
      },
    })

    return { thread, readiness, created: true }
  }

  /**
   * Send a message within a thread.
   * Runs identity firewall scan and circumvention monitoring.
   */
  async sendMessage(input: SendMessageInput) {
    // Verify thread exists and is active
    const thread = await prisma.messageThread.findUnique({
      where: { id: input.threadId },
    })

    if (!thread) {
      throw new Error("Thread not found")
    }

    if (thread.status !== "ACTIVE") {
      throw new Error("Thread is not active. Cannot send messages.")
    }

    // Verify sender belongs to thread
    if (input.senderType === "BUYER" && thread.buyerId !== input.senderId) {
      throw new Error("Unauthorized: sender does not belong to this thread")
    }
    if (input.senderType === "DEALER" && thread.dealerId !== input.senderId) {
      throw new Error("Unauthorized: sender does not belong to this thread")
    }

    // Run identity firewall scan
    const identityResult = thread.identityReleased
      ? { containsSensitiveData: false, detections: [], redactedText: input.body }
      : identityFirewallService.scan(input.body)

    // Run circumvention monitoring
    const circumventionResult = circumventionMonitorService.scan(
      input.body,
      identityResult.containsSensitiveData,
    )

    // Create message
    const message = await prisma.message.create({
      data: {
        threadId: input.threadId,
        senderType: input.senderType,
        senderId: input.senderId,
        body: input.body,
        redactedBody: identityResult.redactedText,
        containsSensitiveData: identityResult.containsSensitiveData,
        circumventionScore: circumventionResult.score,
      },
    })

    // Create redaction events if sensitive data was detected
    if (identityResult.detections.length > 0) {
      await prisma.messageRedactionEvent.createMany({
        data: identityResult.detections.map((d) => ({
          messageId: message.id,
          detectionType: d.type,
          originalText: d.original,
          redactedText: d.replacement,
        })),
      })
    }

    // Update thread timestamp
    await prisma.messageThread.update({
      where: { id: input.threadId },
      data: { updatedAt: new Date() },
    })

    return {
      message: {
        id: message.id,
        threadId: message.threadId,
        senderType: message.senderType,
        senderId: message.senderId,
        body: message.redactedBody, // Always return redacted body to clients
        containsSensitiveData: message.containsSensitiveData,
        createdAt: message.createdAt,
      },
      circumvention: {
        flagged: circumventionResult.flagged,
        score: circumventionResult.score,
      },
    }
  }

  /**
   * List threads for a buyer.
   */
  async listThreadsForBuyer(buyerId: string): Promise<ThreadSummary[]> {
    const threads = await prisma.messageThread.findMany({
      where: { buyerId },
      orderBy: { updatedAt: "desc" },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { redactedBody: true, createdAt: true },
        },
      },
    })

    return threads.map((t: any) => ({
      id: t.id,
      buyerId: t.buyerId,
      dealerId: t.dealerId,
      requestId: t.requestId,
      dealId: t.dealId,
      approvalType: t.approvalType,
      identityReleased: t.identityReleased,
      status: t.status,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      lastMessage: t.messages[0]?.redactedBody ?? null,
      lastMessageAt: t.messages[0]?.createdAt ?? null,
    }))
  }

  /**
   * List threads for a dealer (with readiness payloads).
   */
  async listThreadsForDealer(dealerId: string): Promise<ThreadSummary[]> {
    const threads = await prisma.messageThread.findMany({
      where: { dealerId },
      orderBy: { updatedAt: "desc" },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { redactedBody: true, createdAt: true },
        },
      },
    })

    // Build readiness payloads for each thread
    const results: ThreadSummary[] = []
    for (const t of threads as any[]) {
      let readiness: BuyerReadinessPayload | null = null
      try {
        readiness = await this.buildBuyerReadinessPayloadForMessaging(t.buyerId)
      } catch {
        // Readiness unavailable — still include thread
      }

      results.push({
        id: t.id,
        buyerId: t.buyerId,
        dealerId: t.dealerId,
        requestId: t.requestId,
        dealId: t.dealId,
        approvalType: t.approvalType,
        identityReleased: t.identityReleased,
        status: t.status,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        lastMessage: t.messages[0]?.redactedBody ?? null,
        lastMessageAt: t.messages[0]?.createdAt ?? null,
        readiness,
      })
    }

    return results
  }

  /**
   * List messages in a thread (returns redacted bodies only).
   */
  async listMessages(threadId: string, _actorId: string) {
    const messages = await prisma.message.findMany({
      where: { threadId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        threadId: true,
        senderType: true,
        senderId: true,
        redactedBody: true,
        containsSensitiveData: true,
        createdAt: true,
      },
    })

    return messages.map((m: any) => ({
      id: m.id,
      threadId: m.threadId,
      senderType: m.senderType,
      senderId: m.senderId,
      body: m.redactedBody,
      containsSensitiveData: m.containsSensitiveData,
      createdAt: m.createdAt,
    }))
  }

  /**
   * Mark a thread as closed.
   */
  async markThreadClosed(threadId: string) {
    return prisma.messageThread.update({
      where: { id: threadId },
      data: { status: "CLOSED" },
    })
  }

  /**
   * Admin: list all threads with optional filters.
   */
  async listThreadsForAdmin(filters?: {
    approvalType?: string
    flagged?: boolean
    identityReleased?: boolean
    page?: number
    perPage?: number
  }) {
    const page = filters?.page ?? 1
    const perPage = filters?.perPage ?? 25
    const skip = (page - 1) * perPage

    const where: Record<string, unknown> = {}
    if (filters?.approvalType) {
      where.approvalType = filters.approvalType
    }
    if (filters?.identityReleased !== undefined) {
      where.identityReleased = filters.identityReleased
    }
    if (filters?.flagged) {
      where.messages = {
        some: {
          circumventionScore: { gte: 60 },
        },
      }
    }

    const [threads, total] = await Promise.all([
      prisma.messageThread.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip,
        take: perPage,
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              redactedBody: true,
              createdAt: true,
              circumventionScore: true,
              containsSensitiveData: true,
            },
          },
        },
      }),
      prisma.messageThread.count({ where }),
    ])

    return {
      threads: (threads as any[]).map((t) => ({
        id: t.id,
        buyerId: t.buyerId,
        dealerId: t.dealerId,
        approvalType: t.approvalType,
        identityReleased: t.identityReleased,
        status: t.status,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        lastMessage: t.messages[0]?.redactedBody ?? null,
        lastMessageAt: t.messages[0]?.createdAt ?? null,
        lastMessageScore: t.messages[0]?.circumventionScore ?? 0,
        flagged: (t.messages[0]?.circumventionScore ?? 0) >= 60,
      })),
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    }
  }

  /**
   * Admin: get stats for messages monitoring dashboard.
   */
  async getAdminStats() {
    const [totalThreads, activeThreads, flaggedCount, approvalDistribution] = await Promise.all([
      prisma.messageThread.count(),
      prisma.messageThread.count({ where: { status: "ACTIVE" } }),
      prisma.message.count({ where: { circumventionScore: { gte: 60 } } }),
      prisma.messageThread.groupBy({
        by: ["approvalType"],
        _count: { id: true },
      }),
    ])

    const distribution: Record<string, number> = {}
    for (const g of approvalDistribution as any[]) {
      distribution[g.approvalType] = g._count.id
    }

    return {
      totalThreads,
      activeThreads,
      flaggedMessages: flaggedCount,
      approvalDistribution: distribution,
    }
  }
}

export const messagingService = new MessagingService()
