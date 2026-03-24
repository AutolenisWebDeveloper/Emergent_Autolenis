import { prisma } from "@/lib/prisma"

/**
 * Inventory Verification Service
 * Promote market inventory to verified status and manage dealer vehicle confirmations.
 */

export async function promoteToVerified(
  marketVehicleId: string,
  dealerId: string
): Promise<unknown> {
  if (!marketVehicleId) throw new Error("marketVehicleId is required")
  if (!dealerId) throw new Error("dealerId is required")

  const marketVehicle = await prisma.inventoryMarketVehicle.findUnique({
    where: { id: marketVehicleId },
  })
  if (!marketVehicle) throw new Error(`Market vehicle not found: ${marketVehicleId}`)
  if (String(marketVehicle.status) === "PROMOTED") {
    throw new Error("Vehicle has already been promoted")
  }
  if (String(marketVehicle.status) === "SUPPRESSED") {
    throw new Error("Cannot promote a suppressed vehicle")
  }

  const now = new Date()

  const verified = await prisma.inventoryVerifiedVehicle.create({
    data: {
      dealerId,
      vin: marketVehicle.vin ?? `MKT-${marketVehicleId}`,
      year: marketVehicle.year,
      make: marketVehicle.make,
      model: marketVehicle.model,
      trim: marketVehicle.trim,
      bodyStyle: marketVehicle.bodyStyle,
      mileage: marketVehicle.mileage,
      priceCents: marketVehicle.priceCents,
      exteriorColor: marketVehicle.exteriorColor,
      interiorColor: marketVehicle.interiorColor,
      transmission: marketVehicle.transmission,
      fuelType: marketVehicle.fuelType,
      drivetrain: marketVehicle.drivetrain,
      engine: marketVehicle.engine,
      images: marketVehicle.images,
      stockNumber: marketVehicle.stockNumber,
      status: "AVAILABLE" as never,
      promotedFromMarketVehicleId: marketVehicleId,
      promotedAt: now,
    },
  })

  await prisma.inventoryMarketVehicle.update({
    where: { id: marketVehicleId },
    data: {
      status: "PROMOTED" as never,
      promotedToVerifiedId: verified.id,
    },
  })

  return verified
}

export async function promoteDealerInventory(
  dealerId: string,
  prospectId: string
): Promise<{ promoted: number; skipped: number }> {
  if (!dealerId) throw new Error("dealerId is required")
  if (!prospectId) throw new Error("prospectId is required")

  const marketVehicles = await prisma.inventoryMarketVehicle.findMany({
    where: {
      prospectId,
      status: "ACTIVE" as never,
    },
  })

  let promoted = 0
  let skipped = 0

  for (const mv of marketVehicles) {
    try {
      await promoteToVerified(mv.id, dealerId)
      promoted++
    } catch {
      skipped++
    }
  }

  return { promoted, skipped }
}

export async function confirmSuggestedVehicle(vehicleId: string, dealerId: string) {
  if (!vehicleId) throw new Error("vehicleId is required")
  if (!dealerId) throw new Error("dealerId is required")

  const marketVehicle = await prisma.inventoryMarketVehicle.findUnique({
    where: { id: vehicleId },
  })
  if (!marketVehicle) throw new Error(`Market vehicle not found: ${vehicleId}`)

  return promoteToVerified(vehicleId, dealerId)
}

export async function rejectSuggestedVehicle(
  vehicleId: string,
  dealerId: string,
  reason?: string
) {
  if (!vehicleId) throw new Error("vehicleId is required")
  if (!dealerId) throw new Error("dealerId is required")

  const marketVehicle = await prisma.inventoryMarketVehicle.findUnique({
    where: { id: vehicleId },
  })
  if (!marketVehicle) throw new Error(`Market vehicle not found: ${vehicleId}`)

  // TODO: persist `reason` once a rejection-reason column is added to InventoryMarketVehicle
  return prisma.inventoryMarketVehicle.update({
    where: { id: vehicleId },
    data: {
      status: "SUPPRESSED" as never,
    },
  })
}

export async function getSuggestedVehicles(dealerId: string, prospectId?: string) {
  if (!dealerId) throw new Error("dealerId is required")

  const where: Record<string, unknown> = {
    status: "ACTIVE",
  }
  if (prospectId) where.prospectId = prospectId

  return prisma.inventoryMarketVehicle.findMany({
    where,
    orderBy: { lastSeenAt: "desc" },
    take: 50,
  })
}
