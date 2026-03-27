import { prisma } from "@/lib/db"
import { MAX_SHORTLIST_ITEMS } from "@/lib/constants"
import { PreQualService } from "@/lib/services/prequal.service"
import { InventoryStatus } from "@/lib/constants/statuses"

// Types for shortlist items with computed fields
export interface ShortlistItemWithComputed {
  shortlistItemId: string
  inventoryItemId: string
  vehicle: {
    year: number
    make: string
    model: string
    trim: string | null
    bodyStyle: string | null
  }
  dealer: {
    id: string
    name: string | null
    city: string | null
    state: string | null
  }
  priceCents: number
  status: string
  withinBudget: boolean | null
  isValidForAuction: boolean
  isPrimaryChoice: boolean
  notes: string | null
  photos: string[]
  addedAt: Date
}

export interface ShortlistResponse {
  shortlist: {
    id: string
    name: string | null
    active: boolean
    items: ShortlistItemWithComputed[]
  }
  preQualification: {
    active: boolean
    maxOtdAmountCents: number | null
    expiresAt: Date | null
  } | null
}

export class ShortlistService {
  static async getOrCreateShortlist(buyerId: string): Promise<ShortlistResponse> {
    // 1. Get or create active shortlist
    let shortlist = await prisma.shortlist.findFirst({
      where: {
        buyerId,
        active: true,
      },
      include: {
        items: {
          where: {
            removed_at: null, // Only non-deleted items
          },
          include: {
            inventoryItem: {
              include: {
                dealer: {
                  select: {
                    id: true,
                    businessName: true,
                    name: true,
                    city: true,
                    state: true,
                  },
                },
              },
            },
          },
          orderBy: {
            addedAt: "desc",
          },
        },
      },
    })

    if (!shortlist) {
      shortlist = await prisma.shortlist.create({
        data: {
          buyerId,
          name: "My Shortlist",
          active: true,
        },
        include: {
          items: {
            where: {
              removed_at: null,
            },
            include: {
              inventoryItem: {
                include: {
                  dealer: {
                    select: {
                      id: true,
                      businessName: true,
                      name: true,
                      city: true,
                      state: true,
                    },
                  },
                },
              },
            },
            orderBy: {
              addedAt: "desc",
            },
          },
        },
      })
    }

    // 2. Get active pre-qualification for budget computation
    const preQualResult = await PreQualService.getCurrentPreQual(buyerId)
    const maxOtdCents = preQualResult.active ? preQualResult.preQualification?.maxOtdAmountCents || null : null

    // 3. Transform items with computed fields
    const items: ShortlistItemWithComputed[] = shortlist.items.map((item: any) => {
      const inv = item.inventoryItem
      const dealer = inv?.dealer
      const priceCents = inv?.priceCents || inv?.price_cents || 0
      const status = inv?.status || "UNKNOWN"

      // Compute budget flag
      let withinBudget: boolean | null = null
      if (maxOtdCents !== null && priceCents > 0) {
        withinBudget = priceCents <= maxOtdCents
      }

      // Compute auction eligibility (only AVAILABLE status is valid)
      const isValidForAuction = status === InventoryStatus.AVAILABLE

      // Get photos — vehicle data is now inline on InventoryItem
      const photos: string[] = []
      if (inv?.photosJson && Array.isArray(inv.photosJson)) {
        photos.push(...inv.photosJson)
      } else if (inv?.photos_json && Array.isArray(inv.photos_json)) {
        photos.push(...(inv.photos_json as string[]))
      }

      return {
        shortlistItemId: item.id,
        inventoryItemId: item.inventoryItemId,
        vehicle: {
          year: inv?.year || 0,
          make: inv?.make || "",
          model: inv?.model || "",
          trim: inv?.trim || null,
          bodyStyle: inv?.bodyStyle || inv?.body_style || null,
        },
        dealer: {
          id: dealer?.id || "",
          name: dealer?.businessName || dealer?.name || null,
          city: dealer?.city || null,
          state: dealer?.state || null,
        },
        priceCents,
        status,
        withinBudget,
        isValidForAuction,
        isPrimaryChoice: (item as Record<string, unknown>)["is_primary_choice"] || false,
        notes: (item as Record<string, unknown>)["notes"] || null,
        photos,
        addedAt: item.addedAt,
      }
    })

    return {
      shortlist: {
        id: shortlist.id,
        name: shortlist.name,
        active: shortlist.active,
        items,
      },
      preQualification: preQualResult.active
        ? {
            active: true,
            maxOtdAmountCents: preQualResult.preQualification?.maxOtdAmountCents || null,
            expiresAt: preQualResult.preQualification?.expiresAt || null,
          }
        : null,
    }
  }

  static async addItem(buyerId: string, inventoryItemId: string, notes?: string) {
    // 1. Get or create shortlist
    const shortlistData = await this.getOrCreateShortlist(buyerId)
    const shortlistId = shortlistData.shortlist.id

    // 2. Check if inventory item exists and is valid
    const inventoryItem = await prisma.inventoryItem.findUnique({
      where: { id: inventoryItemId },
    })

    if (!inventoryItem) {
      throw new Error("Vehicle not found")
    }

    // 3. Check inventory status
    const status = inventoryItem.status || "UNKNOWN"
    if (status === "SOLD" || status === "REMOVED") {
      throw new Error("This vehicle is no longer available")
    }

    // 4. Check if already in shortlist (excluding soft-deleted)
    const existing = await prisma.shortlistItem.findFirst({
      where: {
        shortlistId,
        inventoryItemId,
        removed_at: null,
      },
    })

    if (existing) {
      // Idempotent - return success without creating duplicate
      return this.getOrCreateShortlist(buyerId)
    }

    // 5. Check max items limit
    const currentCount = shortlistData.shortlist.items.length
    if (currentCount >= MAX_SHORTLIST_ITEMS) {
      throw new Error(
        `You've reached the maximum of ${MAX_SHORTLIST_ITEMS} cars in your shortlist. Please remove one before adding another.`,
      )
    }

    // 6. Create shortlist item
    await prisma.shortlistItem.create({
      data: {
        shortlistId,
        inventoryItemId,
        notes: notes || null,
        is_primary_choice: false,
        addedAt: new Date(),
        updatedAt: new Date(),
      },
    })

    // 7. Return updated shortlist with budget info
    const result = await this.getOrCreateShortlist(buyerId)

    // Find the added item to return its computed fields
    const addedItem = result.shortlist.items.find((i) => i.inventoryItemId === inventoryItemId)

    return {
      ...result,
      addedItem: addedItem || null,
    }
  }

  static async removeItem(buyerId: string, inventoryItemId: string, hardDelete = false) {
    // 1. Get shortlist
    const shortlistData = await this.getOrCreateShortlist(buyerId)
    const shortlistId = shortlistData.shortlist.id

    // 2. Find the item
    const item = await prisma.shortlistItem.findFirst({
      where: {
        shortlistId,
        inventoryItemId,
        removed_at: null,
      },
    })

    if (!item) {
      throw new Error("Item not found in shortlist")
    }

    // 3. Remove (soft or hard delete)
    if (hardDelete) {
      await prisma.shortlistItem.delete({
        where: { id: item.id },
      })
    } else {
      await prisma.shortlistItem.update({
        where: { id: item.id },
        data: {
          removed_at: new Date(),
          updatedAt: new Date(),
        },
      })
    }

    return this.getOrCreateShortlist(buyerId)
  }

  static async updateItemNotes(buyerId: string, shortlistItemId: string, notes: string | null) {
    // Verify ownership
    const item = await prisma.shortlistItem.findFirst({
      where: {
        id: shortlistItemId,
        removed_at: null,
        shortlist: {
          buyerId,
          active: true,
        },
      },
    })

    if (!item) {
      throw new Error("Item not found or you don't have access")
    }

    await prisma.shortlistItem.update({
      where: { id: shortlistItemId },
      data: {
        notes,
        updatedAt: new Date(),
      },
    })

    return this.getOrCreateShortlist(buyerId)
  }

  static async setPrimaryChoice(buyerId: string, shortlistItemId: string, isPrimary: boolean) {
    // Verify ownership
    const item = await prisma.shortlistItem.findFirst({
      where: {
        id: shortlistItemId,
        removed_at: null,
        shortlist: {
          buyerId,
          active: true,
        },
      },
      include: { shortlist: true },
    })

    if (!item) {
      throw new Error("Item not found or you don't have access")
    }

    // If setting as primary, optionally unset others (allow multiple primaries)
    // Current spec doesn't restrict to single primary

    await prisma.shortlistItem.update({
      where: { id: shortlistItemId },
      data: {
        is_primary_choice: isPrimary,
        updatedAt: new Date(),
      },
    })

    return this.getOrCreateShortlist(buyerId)
  }

  static async getEligibleShortlistItemsForAuctions(
    buyerId: string,
    options?: { requireWithinBudget?: boolean },
  ): Promise<string[]> {
    const shortlistData = await this.getOrCreateShortlist(buyerId)

    return shortlistData.shortlist.items
      .filter((item: any) => {
        // Must be AVAILABLE
        if (!item.isValidForAuction) return false

        // Optionally must be within budget
        if (options?.requireWithinBudget && item.withinBudget === false) {
          return false
        }

        return true
      })
      .map((item: any) => item.inventoryItemId)
  }

  static async getShortlistById(shortlistId: string) {
    return prisma.shortlist.findUnique({
      where: { id: shortlistId },
      include: {
        items: {
          where: { removed_at: null },
          include: {
            inventoryItem: {
              include: {
                dealer: true,
              },
            },
          },
        },
      },
    })
  }

  static async getShortlistsAdmin(filters?: {
    userId?: string
    hasItems?: boolean
    limit?: number
    offset?: number
  }) {
    const where: Record<string, unknown> = {}

    if (filters?.userId) {
      where.buyerId = filters.userId
    }

    const shortlists = await prisma.shortlist.findMany({
      where,
      include: {
        items: {
          where: { removed_at: null },
          select: { id: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: filters?.limit || 50,
      skip: filters?.offset || 0,
    })

    // Filter by hasItems if specified
    let result = shortlists.map((s: any) => ({
      id: s.id,
      buyerId: s.buyerId,
      name: s.name,
      active: s.active,
      itemCount: s.items.length,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }))

    if (filters?.hasItems !== undefined) {
      result = result.filter((s: any) => (filters.hasItems ? s.itemCount > 0 : s.itemCount === 0))
    }

    const total = await prisma.shortlist.count({ where })

    return { shortlists: result, total }
  }

  static async getShortlistDetailAdmin(shortlistId: string) {
    const shortlist = await prisma.shortlist.findUnique({
      where: { id: shortlistId },
      include: {
        items: {
          include: {
            inventoryItem: {
              include: {
                dealer: {
                  select: {
                    id: true,
                    businessName: true,
                    name: true,
                    city: true,
                    state: true,
                  },
                },
              },
            },
          },
          orderBy: { addedAt: "desc" },
        },
      },
    })

    if (!shortlist) {
      throw new Error("Shortlist not found")
    }

    return {
      id: shortlist.id,
      buyerId: shortlist.buyerId,
      name: shortlist.name,
      active: shortlist.active,
      createdAt: shortlist.createdAt,
      updatedAt: shortlist.updatedAt,
      items: shortlist.items.map((item: any) => ({
        id: item.id,
        inventoryItemId: item.inventoryItemId,
        addedAt: item.addedAt,
        removedAt: (item as Record<string, unknown>)["removed_at"],
        notes: (item as Record<string, unknown>)["notes"],
        isPrimaryChoice: (item as Record<string, unknown>)["is_primary_choice"],
        vehicle: item.inventoryItem ? {
          year: item.inventoryItem.year,
          make: item.inventoryItem.make,
          model: item.inventoryItem.model,
          trim: item.inventoryItem.trim,
          vin: item.inventoryItem.vin,
          mileage: item.inventoryItem.mileage,
          bodyStyle: item.inventoryItem.bodyStyle,
        } : null,
        dealer: item.inventoryItem?.dealer,
        inventoryStatus: item.inventoryItem?.status,
        priceCents: item.inventoryItem?.priceCents || item.inventoryItem?.price_cents,
      })),
    }
  }
}

export const shortlistService = new ShortlistService()
export default shortlistService
