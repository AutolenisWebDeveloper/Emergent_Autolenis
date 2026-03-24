import { prisma } from "@/lib/db"

export async function logEvent(
  dealId: string,
  eventType: string,
  details: Record<string, any>,
) {
  try {
    await prisma.complianceEvent.create({
      data: {
        dealId,
        eventType,
        action: eventType,
        details: details as any,
      },
    })
  } catch (error) {
    console.error("Failed to log event:", error)
  }
}

/**
 * Enhanced CMA audit log with full actor and context information.
 * All CMA approval/revocation events MUST use this function.
 */
export async function logCmaEvent(
  dealId: string,
  eventType: string,
  details: Record<string, any>,
  context?: {
    userId?: string
    ipAddress?: string
    userAgent?: string
  },
) {
  try {
    await prisma.complianceEvent.create({
      data: {
        dealId,
        eventType,
        action: eventType,
        userId: context?.userId,
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
        details: details as any,
      },
    })
  } catch (error) {
    console.error("Failed to log CMA event:", error)
  }
}
