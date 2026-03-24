import { prisma } from "@/lib/db"
import type { DealInsuranceReadiness } from "@/lib/types"
import { DealStatus, VALID_TRANSITIONS, normalizeDealStatus } from "./types"
import { writeEventAsync } from "@/lib/services/event-ledger"
import { PlatformEventType, EntityType, ActorType } from "@/lib/services/event-ledger"
import { InventoryStatus } from "@/lib/constants/statuses"

export async function advanceDealStatusIfReady(dealId: string, userId?: string) {
  const deal = await prisma.selectedDeal.findUnique({
    where: { id: dealId },
    include: {
      serviceFeePayment: true,
      insurancePolicy: true,
    },
  })

  if (!deal) return

  const currentStatus = deal.status
  let newStatus: DealStatus | null = null

  // Check advancement conditions (Prisma statuses only)
  switch (currentStatus) {
    case "FINANCING_PENDING":
      if (deal.payment_type && deal.payment_type !== "UNDECIDED") {
        newStatus = "FINANCING_APPROVED"
      }
      break

    case "FINANCING_APPROVED":
    case "FEE_PAID": {
      const feeStatus = deal.concierge_fee_status
      const insuranceStatus = deal.insurance_status as DealInsuranceReadiness | null

      // Check if fee is handled
      const feeReady = feeStatus === "PAID" || feeStatus === "INCLUDED_IN_LOAN"

      // Check if insurance is ready
      const insuranceReady =
        insuranceStatus === "SELECTED_AUTOLENIS" ||
        insuranceStatus === "EXTERNAL_PROOF_UPLOADED" ||
        insuranceStatus === "BOUND"

      if (feeReady && insuranceReady) {
        newStatus = "CONTRACT_PENDING"
      } else if (feeReady) {
        newStatus = "INSURANCE_PENDING"
      }
      break
    }

    case "INSURANCE_PENDING": {
      const insStatus = deal.insurance_status as DealInsuranceReadiness | null
      if (insStatus === "SELECTED_AUTOLENIS" || insStatus === "EXTERNAL_PROOF_UPLOADED" || insStatus === "BOUND") {
        newStatus = "CONTRACT_PENDING"
      }
      break
    }
  }

  if (newStatus && VALID_TRANSITIONS[currentStatus as DealStatus]?.includes(newStatus)) {
    // Transaction: update status + log status change
    await prisma.$transaction(async (tx: any) => {
      await tx.selectedDeal.update({
        where: { id: dealId },
        data: {
          status: newStatus,
        },
      })

      await logStatusChange(
        dealId,
        currentStatus,
        newStatus,
        userId || "SYSTEM",
        "SYSTEM",
        "Auto-advanced based on requirements",
        tx,
      )
    })

    // Emit canonical event (non-blocking, outside transaction)
    writeEventAsync({
      eventType: PlatformEventType.DEAL_STATUS_CHANGED,
      entityType: EntityType.DEAL,
      entityId: dealId,
      actorId: userId || "SYSTEM",
      actorType: ActorType.SYSTEM,
      sourceModule: "deal.status",
      correlationId: crypto.randomUUID(),
      idempotencyKey: `deal-status-${dealId}-${newStatus}-${Date.now()}`,
      payload: { previousStatus: currentStatus, newStatus, trigger: "auto-advance" },
    }).catch(() => { /* non-critical: do not block deal flow */ })
  }

  return newStatus
}

export async function cancelDeal(dealId: string, reason: string, actorRole: string, userId?: string) {
  const deal = await prisma.selectedDeal.findUnique({
    where: { id: dealId },
  })

  if (!deal) {
    throw new Error("Deal not found")
  }

  const currentStatus = normalizeDealStatus(deal.status) ?? deal.status
  if (currentStatus === "COMPLETED") {
    throw new Error("Cannot cancel completed deal")
  }
  if (currentStatus === "CANCELLED") {
    throw new Error("Deal is already cancelled")
  }

  // Transaction: update deal + release inventory + log compliance event + log status change
  await prisma.$transaction(async (tx: any) => {
    // Update deal
    await tx.selectedDeal.update({
      where: { id: dealId },
      data: {
        status: "CANCELLED",
        cancel_reason: reason,
      },
    })

    // Release inventory
    if (deal.inventoryItemId) {
      await tx.inventoryItem.update({
        where: { id: deal.inventoryItemId },
        data: { status: InventoryStatus.AVAILABLE },
      })
    }

    // Log compliance event
    await tx.complianceEvent.create({
      data: {
        eventType: "DEAL_CANCELLED",
        type: "DEAL_CANCELLATION",
        userId: userId || deal.user_id || deal.buyerId,
        relatedId: dealId,
        details: {
          reason,
          actorRole,
          previousStatus: currentStatus,
        },
      },
    })

    // Log status change (inside transaction for correctness)
    await logStatusChange(dealId, currentStatus, "CANCELLED", userId || "SYSTEM", actorRole, reason, tx)
  })

  // Emit canonical event (non-blocking, outside transaction)
  writeEventAsync({
    eventType: PlatformEventType.DEAL_CANCELLED,
    entityType: EntityType.DEAL,
    entityId: dealId,
    actorId: userId || deal.user_id || deal.buyerId,
    actorType: actorRole === "ADMIN" ? ActorType.ADMIN : ActorType.BUYER,
    sourceModule: "deal.status",
    correlationId: crypto.randomUUID(),
    idempotencyKey: `deal-cancel-${dealId}-${Date.now()}`,
    payload: { reason, actorRole, previousStatus: currentStatus },
  }).catch(() => { /* non-critical */ })

  return { success: true }
}

export async function adminOverrideStatus(dealId: string, newStatus: DealStatus, notes: string, adminUserId: string) {
  const deal = await prisma.selectedDeal.findUnique({
    where: { id: dealId },
  })

  if (!deal) {
    throw new Error("Deal not found")
  }

  const currentStatus = normalizeDealStatus(deal.status) ?? deal.status

  // Transaction: update deal + log status change + log compliance event
  await prisma.$transaction(async (tx: any) => {
    // Update deal
    await tx.selectedDeal.update({
      where: { id: dealId },
      data: {
        status: newStatus,
        cancel_reason: newStatus === "CANCELLED" ? notes : deal.cancel_reason,
      },
    })

    // Log status change (inside transaction for correctness)
    await logStatusChange(dealId, currentStatus, newStatus, adminUserId, "ADMIN", notes, tx)

    // Log compliance event
    await tx.complianceEvent.create({
      data: {
        eventType: "ADMIN_OVERRIDE",
        type: "STATUS_OVERRIDE",
        userId: adminUserId,
        relatedId: dealId,
        details: {
          previousStatus: currentStatus,
          newStatus,
          notes,
        },
      },
    })
  })

  // Emit canonical event (non-blocking, outside transaction)
  writeEventAsync({
    eventType: PlatformEventType.DEAL_STATUS_CHANGED,
    entityType: EntityType.DEAL,
    entityId: dealId,
    actorId: adminUserId,
    actorType: ActorType.ADMIN,
    sourceModule: "deal.status",
    correlationId: crypto.randomUUID(),
    idempotencyKey: `deal-override-${dealId}-${newStatus}-${Date.now()}`,
    payload: { previousStatus: currentStatus, newStatus, notes, trigger: "admin-override" },
  }).catch(() => { /* non-critical */ })

  return { success: true, previousStatus: currentStatus, newStatus }
}

export async function logStatusChange(
  dealId: string,
  previousStatus: string | null,
  newStatus: string,
  userId: string,
  role: string,
  notes?: string,
  tx?: any,
) {
  const client = tx || prisma
  try {
    await client.$executeRaw`
      INSERT INTO "deal_status_history" ("selected_deal_id", "previous_status", "new_status", "changed_by_user_id", "changed_by_role", "notes")
      VALUES (${dealId}, ${previousStatus}, ${newStatus}, ${userId}, ${role}, ${notes})
    `
  } catch (e) {
    // If inside a transaction, re-throw to trigger rollback
    if (tx) throw e
    console.error("Failed to log status change:", e)
  }
}

export function buildStatusTimeline(deal: any) {
  const statuses: DealStatus[] = [
    "SELECTED",
    "FINANCING_PENDING",
    "FINANCING_APPROVED",
    "FEE_PENDING",
    "FEE_PAID",
    "INSURANCE_PENDING",
    "INSURANCE_COMPLETE",
    "CONTRACT_PENDING",
    "CONTRACT_REVIEW",
    "CONTRACT_APPROVED",
    "SIGNING_PENDING",
    "SIGNED",
    "PICKUP_SCHEDULED",
    "COMPLETED",
  ]

  const currentStatus = normalizeDealStatus(deal.status) ?? deal.status
  const currentIndex = statuses.indexOf(currentStatus as DealStatus)

  return statuses.map((status, index) => ({
    status,
    label: status.replace(/_/g, " "),
    isComplete: index < currentIndex,
    isCurrent: status === currentStatus,
    isPending: index > currentIndex,
  }))
}
