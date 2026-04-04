// Prequal Audit Log writer — immutable event trail

import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"

export interface PrequalAuditEvent {
  applicationId: string
  eventType: string
  actorId?: string
  actorType?: "SYSTEM" | "ADMIN" | "CONSUMER"
  description?: string
  metadata?: Record<string, unknown>
}

/**
 * Writes an immutable audit log entry for a prequal application.
 * Audit logs are NEVER updated or deleted.
 */
export async function writePrequalAuditLog(event: PrequalAuditEvent): Promise<void> {
  try {
    await prisma.prequalAuditLog.create({
      data: {
        applicationId: event.applicationId,
        eventType: event.eventType,
        actorId: event.actorId ?? null,
        actorType: event.actorType ?? "SYSTEM",
        description: event.description ?? null,
        metadata: event.metadata ?? null,
      },
    })
  } catch (error: unknown) {
    // Audit log failures must NOT block business logic, but must be logged
    logger.error("[PrequalAudit] Failed to write audit log", {
      applicationId: event.applicationId,
      eventType: event.eventType,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
