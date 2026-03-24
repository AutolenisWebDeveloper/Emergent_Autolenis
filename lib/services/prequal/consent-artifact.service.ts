/**
 * Consent Artifact Service
 *
 * Manages immutable consent artifacts for FCRA-compliant pre-qualification.
 * ConsentArtifacts are write-once — they are never updated or deleted.
 *
 * Flow:
 * 1. Resolve the active ConsentVersion
 * 2. Create a ConsentArtifact with the user's consent capture
 * 3. After provider execution, link the artifact to the PreQualification
 */

import { prisma } from "@/lib/db"

export interface CreateConsentArtifactInput {
  userId: string
  buyerId: string
  workspaceId?: string | null
  consentVersionId: string
  consentText: string
  ipAddress?: string | null
  userAgent?: string | null
}

export interface ConsentVersionInput {
  version: string
  label: string
  bodyText: string
  effectiveAt: Date
}

export class ConsentArtifactService {
  /**
   * Returns the currently effective consent version.
   * Falls back to creating a default v1.0 if none exists.
   */
  async getActiveConsentVersion() {
    const now = new Date()

    const version = await prisma.consentVersion.findFirst({
      where: {
        effectiveAt: { lte: now },
        OR: [{ retiredAt: null }, { retiredAt: { gt: now } }],
      },
      orderBy: { effectiveAt: "desc" },
    })

    if (version) return version

    // Bootstrap default consent version if none exists
    return prisma.consentVersion.create({
      data: {
        version: "v1.0",
        label: "Soft Pull Consent v1",
        bodyText: DEFAULT_CONSENT_TEXT,
        effectiveAt: new Date("2024-01-01"),
      },
    })
  }

  /**
   * Creates an immutable consent artifact.
   * This records that the user saw and agreed to a specific consent version.
   */
  async createArtifact(
    input: CreateConsentArtifactInput,
  ) {
    return prisma.consentArtifact.create({
      data: {
        userId: input.userId,
        buyerId: input.buyerId,
        workspaceId: input.workspaceId,
        consentVersionId: input.consentVersionId,
        consentText: input.consentText,
        consentGiven: true,
        capturedAt: new Date(),
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    })
  }

  /**
   * Links a consent artifact to the resulting PreQualification.
   * Called after provider execution succeeds.
   */
  async linkToPreQualification(
    artifactId: string,
    preQualificationId: string,
  ) {
    return prisma.consentArtifact.update({
      where: { id: artifactId },
      data: { preQualificationId },
    })
  }

  /**
   * Returns all consent artifacts for a given user, newest first.
   */
  async getArtifactsForUser(userId: string) {
    return prisma.consentArtifact.findMany({
      where: { userId },
      include: { consentVersion: true },
      orderBy: { capturedAt: "desc" },
    })
  }

  /**
   * Returns a single artifact by ID.
   */
  async getArtifactById(id: string) {
    return prisma.consentArtifact.findUnique({
      where: { id },
      include: { consentVersion: true },
    })
  }

  /**
   * Admin: list all consent versions (for UX version registry).
   */
  async listConsentVersions() {
    return prisma.consentVersion.findMany({
      orderBy: { effectiveAt: "desc" },
    })
  }

  /**
   * Admin: create a new consent version.
   */
  async createConsentVersion(input: ConsentVersionInput) {
    return prisma.consentVersion.create({
      data: {
        version: input.version,
        label: input.label,
        bodyText: input.bodyText,
        effectiveAt: input.effectiveAt,
      },
    })
  }

  /**
   * Admin: retire a consent version (it will no longer be served to new users).
   */
  async retireConsentVersion(versionId: string) {
    return prisma.consentVersion.update({
      where: { id: versionId },
      data: { retiredAt: new Date() },
    })
  }
}

const DEFAULT_CONSENT_TEXT = `I authorize AutoLenis and its partners to obtain my credit report for the purpose of pre-qualifying me for vehicle financing. I understand this is a soft inquiry that will not affect my credit score. I acknowledge that I have read and agree to the Privacy Policy and Terms of Service.`

export const consentArtifactService = new ConsentArtifactService()
