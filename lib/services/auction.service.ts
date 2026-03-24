import { prisma } from "@/lib/db"
import { AUCTION_DURATION_HOURS } from "@/lib/constants"
import { InventoryStatus } from "@/lib/constants/statuses"

export class AuctionService {
  static async validateAuctionPrerequisites(buyerId: string) {
    const buyer = await prisma.buyerProfile.findUnique({
      where: { id: buyerId },
      include: {
        preQualification: true,
        shortlists: {
          where: { active: true },
          include: { items: true },
        },
      },
    })

    const errors: string[] = []

    // Check pre-qualification exists and has not expired.
    // PreQualification is the CANONICAL gating record — both internal (soft-pull)
    // and external (manual bank pre-approval) flows write this record with the same
    // fields so no special-case branching is needed here.
    if (
      !buyer?.preQualification ||
      !buyer.preQualification.expiresAt ||
      new Date(buyer.preQualification.expiresAt) < new Date()
    ) {
      errors.push("PREQUAL_REQUIRED")
    }

    // Check shortlist has items
    const activeShortlist = buyer?.shortlists?.[0]
    if (!activeShortlist || activeShortlist.items.length === 0) {
      errors.push("SHORTLIST_EMPTY")
    }

    // Check deposit paid
    const depositPayment = await prisma.depositPayment.findFirst({
      where: {
        buyerId,
        status: "SUCCEEDED",
        refunded: false,
      },
      orderBy: { createdAt: "desc" },
    })

    if (!depositPayment) {
      errors.push("DEPOSIT_REQUIRED")
    }

    return {
      valid: errors.length === 0,
      errors,
      buyer,
      activeShortlist,
      depositPayment,
    }
  }

  static async createAuction(buyerId: string, shortlistId: string) {
    // Validate prerequisites
    const validation = await this.validateAuctionPrerequisites(buyerId)

    if (!validation.valid) {
      throw new Error(`Prerequisites not met: ${validation.errors.join(", ")}`)
    }

    // Get shortlist items to find dealers
    const shortlist = await prisma.shortlist.findUnique({
      where: { id: shortlistId },
      include: {
        items: {
          include: {
            inventoryItem: {
              include: { dealer: true },
            },
          },
        },
      },
    })

    if (!shortlist || shortlist.items.length === 0) {
      throw new Error("Shortlist is empty")
    }

    // Calculate auction timing
    const startsAt = new Date()
    const endsAt = new Date(startsAt)
    endsAt.setHours(endsAt.getHours() + (AUCTION_DURATION_HOURS || 24))

    // Collect dealer IDs before the transaction (read-only prep)
    const shortlistDealerIds = Array.from(new Set(shortlist.items.map((item: any) => item.inventoryItem.dealerId)))
    const vins = shortlist.items.map((item: any) => item.inventoryItem?.vin).filter(Boolean)
    const matchingInventory = vins.length > 0 ? await prisma.inventoryItem.findMany({
      where: {
        vin: { in: vins },
        status: InventoryStatus.AVAILABLE,
        dealerId: { notIn: shortlistDealerIds },
      },
      select: { dealerId: true },
    }) : []
    const allDealerIds = Array.from(new Set([...shortlistDealerIds, ...matchingInventory.map((i: any) => i.dealerId)]))

    // Transaction: create auction + link deposit + invite dealers + log compliance
    const auction = await prisma.$transaction(async (tx: any) => {
      const newAuction = await tx.auction.create({
        data: {
          buyerId,
          shortlistId,
          status: "OPEN",
          startsAt,
          endsAt,
        },
      })

      // Link deposit to auction
      if (validation.depositPayment) {
        await tx.depositPayment.update({
          where: { id: validation.depositPayment.id },
          data: { auctionId: newAuction.id },
        })
      }

      // Invite dealers
      await Promise.all(
        allDealerIds.map((dealerId) =>
          tx.auctionParticipant.create({
            data: {
              auctionId: newAuction.id,
              dealerId,
              invitedAt: new Date(),
            },
          }),
        ),
      )

      // Log compliance event
      await tx.complianceEvent.create({
        data: {
          eventType: "AUCTION_CREATED",
          userId: validation.buyer?.userId,
          entityType: "AUCTION",
          entityId: newAuction.id,
          metadata: {
            shortlistId,
            vehicleCount: shortlist.items.length,
            dealerCount: allDealerIds.length,
          },
        },
      })

      return newAuction
    })

    return this.getAuction(auction.id)
  }

  static async getAuction(auctionId: string) {
    return prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        buyer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            city: true,
            state: true,
            preQualification: {
              select: {
                maxOtd: true,
                budgetMin: true,
                budgetMax: true,
                creditTier: true,
              },
            },
          },
        },
        shortlist: {
          include: {
            items: {
              include: {
                inventoryItem: {
                  include: {
                    dealer: {
                      select: {
                        id: true,
                        businessName: true,
                        city: true,
                        state: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        participants: {
          include: {
            dealer: {
              select: {
                id: true,
                businessName: true,
                city: true,
                state: true,
                integrityScore: true,
              },
            },
          },
        },
        offers: {
          include: {
            financingOptions: true,
            participant: {
              include: {
                dealer: {
                  select: {
                    id: true,
                    businessName: true,
                    city: true,
                    state: true,
                    integrityScore: true,
                  },
                },
              },
            },
          },
        },
        bestPriceOptions: true,
      },
    })
  }

  static async getBuyerAuctions(buyerId: string) {
    return prisma.auction.findMany({
      where: { buyerId },
      include: {
        shortlist: {
          include: {
            items: {
              include: {
                inventoryItem: true,
              },
            },
          },
        },
        participants: true,
        offers: {
          include: {
            financingOptions: true,
            participant: {
              include: { dealer: true },
            },
          },
        },
        bestPriceOptions: true,
      },
      orderBy: { createdAt: "desc" },
    })
  }

  static async getDealerAuctions(dealerId: string) {
    const participants = await prisma.auctionParticipant.findMany({
      where: { dealerId },
      include: {
        auction: {
          include: {
            buyer: {
              select: {
                city: true,
                state: true,
                preQualification: {
                  select: {
                    budgetMin: true,
                    budgetMax: true,
                  },
                },
              },
            },
            shortlist: {
              include: {
                items: {
                  include: {
                    inventoryItem: true,
                  },
                },
              },
            },
            offers: {
              where: { participant: { dealerId } },
            },
          },
        },
      },
      orderBy: { invitedAt: "desc" },
    })

    return participants.map((p: any) => ({
      ...p.auction,
      participantId: p.id,
      invitedAt: p.invitedAt,
      respondedAt: p.respondedAt,
      hasSubmittedOffer: p.auction.offers.length > 0,
    }))
  }

  static async getDealerAuctionDetail(auctionId: string, dealerId: string) {
    const participant = await prisma.auctionParticipant.findFirst({
      where: { auctionId, dealerId },
    })

    if (!participant) {
      throw new Error("Dealer not invited to this auction")
    }

    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        buyer: {
          include: { preQualification: true },
        },
      },
    })

    // Get dealer's matching inventory
    const shortlistVins = (auction?.shortlist?.items.map((item: any) => item.inventoryItem?.vin) || []).filter(Boolean)
    const shortlistItemIds = auction?.shortlist?.items.map((i: any) => i.inventoryItemId) || []
    const orConditions: any[] = []
    if (shortlistVins.length > 0) {
      orConditions.push({ vin: { in: shortlistVins } })
    }
    if (shortlistItemIds.length > 0) {
      orConditions.push({ id: { in: shortlistItemIds } })
    }
    const dealerInventory = orConditions.length > 0 ? await prisma.inventoryItem.findMany({
      where: {
        dealerId,
        status: InventoryStatus.AVAILABLE,
        OR: orConditions,
      },
    }) : []

    // Get dealer's existing offer
    const existingOffer = await prisma.auctionOffer.findFirst({
      where: { auctionId, participantId: participant.id },
      include: { financingOptions: true },
    })

    return {
      auction,
      participantId: participant.id,
      dealerInventory,
      existingOffer,
    }
  }

  static async submitOffer(
    auctionId: string,
    dealerId: string,
    offerData: {
      inventoryItemId: string
      cashOtdCents: number
      taxAmountCents: number
      feesBreakdown: Record<string, number>
      financingOptions: Array<{
        lenderName?: string
        apr: number
        termMonths: number
        downPaymentCents: number
        monthlyPaymentCents: number
      }>
    },
  ) {
    // Verify auction is active
    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        buyer: {
          include: { preQualification: true },
        },
      },
    })

    if (!auction) {
      throw new Error("Auction not found")
    }

    if (auction.status !== "OPEN") {
      throw new Error("Auction is not open for offers")
    }

    if (new Date() > auction.endsAt) {
      throw new Error("Auction has ended")
    }

    // Verify dealer is participant
    const participant = await prisma.auctionParticipant.findFirst({
      where: { auctionId, dealerId },
    })

    if (!participant) {
      throw new Error("Dealer not invited to this auction")
    }

    // Verify price is within budget
    if (auction.buyer.preQualification && offerData.cashOtdCents > auction.buyer.preQualification.maxOtd * 100) {
      throw new Error("Offer exceeds buyer's pre-qualified budget")
    }

    // Transaction: delete old offers + create new offer + update participant + log compliance
    const offer = await prisma.$transaction(async (tx: any) => {
      // Delete existing offers from this dealer for this auction (one best offer rule)
      await tx.auctionOffer.deleteMany({
        where: {
          auctionId,
          participantId: participant.id,
        },
      })

      // Create new offer
      const newOffer = await tx.auctionOffer.create({
        data: {
          auctionId,
          participantId: participant.id,
          inventoryItemId: offerData.inventoryItemId,
          cashOtd: offerData.cashOtdCents / 100,
          taxAmount: offerData.taxAmountCents / 100,
          feesBreakdown: offerData.feesBreakdown,
          financingOptions: {
            create: offerData.financingOptions.map((opt) => ({
              lenderName: opt.lenderName || "Dealer Finance",
              apr: opt.apr,
              termMonths: opt.termMonths,
              downPayment: opt.downPaymentCents / 100,
              monthlyPayment: opt.monthlyPaymentCents / 100,
            })),
          },
        },
        include: {
          financingOptions: true,
        },
      })

      // Update participant responded_at
      await tx.auctionParticipant.update({
        where: { id: participant.id },
        data: { respondedAt: new Date() },
      })

      // Log compliance event
      await tx.complianceEvent.create({
        data: {
          eventType: "OFFER_SUBMITTED",
          entityType: "AUCTION_OFFER",
          entityId: newOffer.id,
          metadata: {
            auctionId,
            dealerId,
            cashOtdCents: offerData.cashOtdCents,
          },
        },
      })

      return newOffer
    })

    return offer
  }

  static async closeAuction(auctionId: string) {
    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      include: { offers: true },
    })

    if (!auction) {
      throw new Error("Auction not found")
    }

    // Transaction: update auction status + refund deposit (if no offers)
    await prisma.$transaction(async (tx: any) => {
      if (auction.offers.length === 0) {
        // No offers - mark as NO_OFFERS and refund deposit
        await tx.auction.update({
          where: { id: auctionId },
          data: {
            status: "NO_OFFERS",
            closedAt: new Date(),
          },
        })

        // Refund deposit
        const depositPayment = await tx.depositPayment.findFirst({
          where: { auctionId },
        })

        if (depositPayment) {
          await tx.depositPayment.update({
            where: { id: depositPayment.id },
            data: {
              refunded: true,
              refundedAt: new Date(),
              refundReason: "No offers received",
            },
          })
        }
      } else {
        // Has offers - mark closed
        await tx.auction.update({
          where: { id: auctionId },
          data: {
            status: "CLOSED",
            closedAt: new Date(),
          },
        })
      }
    })

    return this.getAuction(auctionId)
  }

  // Cron job helper to auto-close expired auctions
  static async closeExpiredAuctions() {
    const expiredAuctions = await prisma.auction.findMany({
      where: {
        status: "OPEN",
        endsAt: { lte: new Date() },
      },
    })

    for (const auction of expiredAuctions) {
      await this.closeAuction(auction.id)
    }

    return expiredAuctions.length
  }
}

export const auctionService = new AuctionService()
export default auctionService
