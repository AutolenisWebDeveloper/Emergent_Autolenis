/**
 * Forwarding Authorization Service
 *
 * Manages authorization artifacts that control when and how pre-qualification
 * results can be shared (forwarded) to dealers, lenders, or other third parties.
 *
 * A ForwardingAuthorization is REQUIRED before any prequal data can be
 * transmitted to a third party. Without it, forwarding is blocked.
 */

import { prisma } from "@/lib/db"

export interface CreateForwardingAuthInput {
  userId: string
  buyerId: string
  workspaceId?: string | null
  preQualificationId: string
  authorizedRecipientType: "DEALER" | "LENDER"
  authorizedRecipientId?: string
  consentText: string
  ipAddress?: string | null
  userAgent?: string | null
}

const DEFAULT_FORWARDING_CONSENT_TEXT = `I authorize AutoLenis to share my pre-qualification results with the selected dealer or lender for the purpose of facilitating vehicle financing. I understand that this disclosure is limited to the information necessary to process my vehicle purchase.`

export class ForwardingAuthorizationService {
  /**
   * Creates a forwarding authorization artifact.
   * Must be created BEFORE prequal results can be forwarded to any third party.
   */
  async createAuthorization(input: CreateForwardingAuthInput) {
    return prisma.forwardingAuthorization.create({
      data: {
        userId: input.userId,
        buyerId: input.buyerId,
        workspaceId: input.workspaceId,
        preQualificationId: input.preQualificationId,
        authorizedRecipientType: input.authorizedRecipientType,
        authorizedRecipientId: input.authorizedRecipientId ?? null,
        consentText: input.consentText || DEFAULT_FORWARDING_CONSENT_TEXT,
        consentGiven: true,
        capturedAt: new Date(),
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    })
  }

  /**
   * Checks whether forwarding is authorized for a given prequal + recipient.
   * Returns the authorization artifact if valid, or null if blocked.
   */
  async checkAuthorization(
    preQualificationId: string,
    recipientType: string,
    recipientId?: string,
  ) {
    const auth = await prisma.forwardingAuthorization.findFirst({
      where: {
        preQualificationId,
        authorizedRecipientType: recipientType,
        ...(recipientId
          ? { authorizedRecipientId: recipientId }
          : {}),
        revokedAt: null, // Not revoked
      },
      orderBy: { capturedAt: "desc" },
    })

    return auth
  }

  /**
   * Enforces that forwarding is authorized. Throws if not.
   */
  async assertForwardingAuthorized(
    preQualificationId: string,
    recipientType: string,
    recipientId?: string,
  ) {
    const auth = await this.checkAuthorization(
      preQualificationId,
      recipientType,
      recipientId,
    )

    if (!auth) {
      throw new ForwardingNotAuthorizedError(
        preQualificationId,
        recipientType,
      )
    }

    return auth
  }

  /**
   * Returns all forwarding authorizations for a prequal.
   */
  async getAuthorizationsForPreQual(preQualificationId: string) {
    return prisma.forwardingAuthorization.findMany({
      where: { preQualificationId },
      orderBy: { capturedAt: "desc" },
    })
  }

  /**
   * Returns all forwarding authorizations for a user.
   */
  async getAuthorizationsForUser(userId: string) {
    return prisma.forwardingAuthorization.findMany({
      where: { userId },
      orderBy: { capturedAt: "desc" },
    })
  }

  /**
   * Revokes a forwarding authorization.
   */
  async revokeAuthorization(
    authorizationId: string,
    reason: string,
  ) {
    return prisma.forwardingAuthorization.update({
      where: { id: authorizationId },
      data: {
        revokedAt: new Date(),
        revokedReason: reason,
      },
    })
  }
}

export class ForwardingNotAuthorizedError extends Error {
  readonly statusCode = 403
  readonly code = "FORWARDING_NOT_AUTHORIZED"

  constructor(preQualificationId: string, recipientType: string) {
    super(
      `Forwarding of pre-qualification ${preQualificationId} to ${recipientType} ` +
        `is not authorized. A ForwardingAuthorization artifact is required.`,
    )
    this.name = "ForwardingNotAuthorizedError"
  }
}

export const forwardingAuthorizationService =
  new ForwardingAuthorizationService()
