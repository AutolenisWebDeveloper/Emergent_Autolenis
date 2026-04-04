// Consent version validation and snapshot logic for prequal

import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"

/**
 * Retrieves the currently active consent version.
 * Returns null if no active version exists.
 */
export async function getActiveConsentVersion() {
  try {
    return await prisma.prequalConsentVersion.findFirst({
      where: { active: true },
      orderBy: { effectiveAt: "desc" },
    })
  } catch (error: unknown) {
    logger.error("[PrequalConsent] Failed to load active consent version", {
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

/**
 * Validates that a given consentVersionId is active.
 * Returns the consent version record if valid, null if expired/invalid.
 */
export async function validateConsentVersion(consentVersionId: string) {
  try {
    const version = await prisma.prequalConsentVersion.findUnique({
      where: { id: consentVersionId },
    })
    if (!version || !version.active) {
      return null
    }
    return version
  } catch (error: unknown) {
    logger.error("[PrequalConsent] Failed to validate consent version", {
      consentVersionId,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}
