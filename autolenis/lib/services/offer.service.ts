import { prisma } from "@/lib/db"
import { InventoryStatus } from "@/lib/constants/statuses"

// ─── Lender References Note ──────────────────────────────────────────────
// "lender_name" / "lenderName" in this service refers to the financing
// partner name provided by the DEALER as part of their auction offer
// (e.g., "Chase Auto", "Capital One"). This is dealer-sourced data — not
// AutoLenis-to-lender routing. AutoLenis does not route buyer data to
// lenders or manage lender integrations.
// ─────────────────────────────────────────────────────────────────────────

// Validation error codes
export type OfferValidationErrorCode =
  | "OTD_MISMATCH"
  | "NEGATIVE_FEE"
  | "MISSING_REQUIRED_FEE"
  | "INVENTORY_NOT_AVAILABLE"
  | "INVENTORY_NOT_OWNED"
  | "AUCTION_NOT_OPEN"
  | "AUCTION_ENDED"
  | "NOT_PARTICIPANT"
  | "ALREADY_SUBMITTED"
  | "NO_FINANCING_OPTIONS"
  | "INVALID_FINANCING_OPTION"
  | "ABOVE_BUYER_BUDGET"

export interface OfferValidationError {
  code: OfferValidationErrorCode
  message: string
  field?: string
  severity: "error" | "warning"
}

export interface FeeBreakdown {
  base_price_cents: number
  tax_cents: number
  title_registration_cents: number
  doc_fee_cents: number
  dealer_fees_cents: number
  add_ons?: Array<{ name: string; amount_cents: number }>
  other_fees_cents?: number
}

export interface FinancingOptionInput {
  lender_name: string
  apr: number
  term_months: number
  down_payment_cents: number
  est_monthly_payment_cents: number
  is_promoted_option?: boolean
}

export interface OfferSubmissionInput {
  inventory_item_id: string
  cash_otd_cents: number
  fee_breakdown: FeeBreakdown
  financing_options: FinancingOptionInput[]
  offer_notes?: string
}

// OTD tolerance: $5 = 500 cents
const OTD_TOLERANCE_CENTS = 500

// Budget overage threshold: 20%
const BUDGET_OVERAGE_THRESHOLD = 0.2

export class OfferService {
  /**
   * Get dealer context for offer builder page
   */
  async getOfferContext(auctionId: string, dealerId: string) {
    // Check if dealer is a participant
    const participant = await prisma.auctionParticipant.findFirst({
      where: { auctionId, dealerId },
    })

    if (!participant) {
      throw new Error("Dealer is not a participant in this auction")
    }

    // Load auction details
    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        buyer: {
          include: {
            prequal: {
              select: {
                maxOtd: true,
                maxOtdAmountCents: true,
                budgetMin: true,
                budgetMax: true,
              },
            },
          },
        },
        shortlist: {
          include: {
            items: {
              where: { removedAt: null },
              include: {
                inventoryItem: true,
              },
            },
          },
        },
      },
    })

    if (!auction) {
      throw new Error("Auction not found")
    }

    // Load dealer info
    const dealer = await prisma.dealer.findUnique({
      where: { id: dealerId },
      select: { id: true, businessName: true, name: true },
    })

    // Load dealer's available inventory
    const inventory = await prisma.inventoryItem.findMany({
      where: {
        dealerId,
        status: InventoryStatus.AVAILABLE,
      },
      orderBy: { createdAt: "desc" },
    })

    // Check for existing offer
    const existingOffer = await prisma.auctionOffer.findFirst({
      where: { auctionId, dealer_id: dealerId },
      include: {
        financingOptions: true,
        inventoryItem: true,
      },
    })

    // Calculate time remaining
    const now = new Date()
    const timeRemainingMs = auction.endsAt ? auction.endsAt.getTime() - now.getTime() : 0
    const timeRemainingSeconds = Math.max(0, Math.floor(timeRemainingMs / 1000))

    return {
      auction: {
        id: auction.id,
        status: auction.status,
        startsAt: auction.startsAt,
        endsAt: auction.endsAt,
        timeRemainingSeconds,
        buyerBudgetCents:
          auction.buyer?.prequal?.maxOtdAmountCents ||
          (auction.buyer?.prequal?.maxOtd ? auction.buyer.prequal.maxOtd * 100 : null),
      },
      dealer: {
        id: dealer?.id,
        name: dealer?.businessName || dealer?.name,
      },
      hasSubmittedOffer: !!existingOffer,
      inventory: inventory.map((item: any) => ({
        inventoryItemId: item.id,
        year: item.vehicle?.year,
        make: item.vehicle?.make,
        model: item.vehicle?.model,
        trim: item.vehicle?.trim,
        stockNumber: item.stockNumber,
        mileage: item.mileage || item.vehicle?.mileage,
        status: item.status,
        priceCents: item.priceCents,
        vin: item.vin || item.vehicle?.vin,
      })),
      existingOffer: existingOffer
        ? {
            id: existingOffer.id,
            cashOtdCents: existingOffer.cashOtdCents || Math.round((existingOffer.cashOtd || 0) * 100),
            feeBreakdownJson: existingOffer.feeBreakdownJson,
            isValid: existingOffer.isValid ?? true,
            validationErrors: existingOffer.validationErrorsJson,
            submittedAt: existingOffer.submittedAt || existingOffer.createdAt,
            financingOptions: existingOffer.financingOptions,
          }
        : null,
      shortlistVehicles:
        auction.shortlist?.items.map((item: any) => ({
          make: item.inventoryItem?.make,
          model: item.inventoryItem?.model,
          trim: item.inventoryItem?.trim,
        })) || [],
    }
  }

  /**
   * Calculate OTD from fee breakdown
   */
  calculateOtdFromBreakdown(feeBreakdown: FeeBreakdown): number {
    let total = 0
    total += feeBreakdown.base_price_cents || 0
    total += feeBreakdown.tax_cents || 0
    total += feeBreakdown.title_registration_cents || 0
    total += feeBreakdown.doc_fee_cents || 0
    total += feeBreakdown.dealer_fees_cents || 0
    total += feeBreakdown.other_fees_cents || 0

    if (feeBreakdown.add_ons && Array.isArray(feeBreakdown.add_ons)) {
      for (const addon of feeBreakdown.add_ons) {
        total += addon.amount_cents || 0
      }
    }

    return total
  }

  /**
   * Validate fee breakdown
   */
  validateFeeBreakdown(feeBreakdown: FeeBreakdown, cashOtdCents: number): OfferValidationError[] {
    const errors: OfferValidationError[] = []

    // Check for negative fees
    const feeFields = [
      { field: "base_price_cents", value: feeBreakdown.base_price_cents },
      { field: "tax_cents", value: feeBreakdown.tax_cents },
      { field: "title_registration_cents", value: feeBreakdown.title_registration_cents },
      { field: "doc_fee_cents", value: feeBreakdown.doc_fee_cents },
      { field: "dealer_fees_cents", value: feeBreakdown.dealer_fees_cents },
      { field: "other_fees_cents", value: feeBreakdown.other_fees_cents },
    ]

    for (const { field, value } of feeFields) {
      if (value !== undefined && value !== null && value < 0) {
        errors.push({
          code: "NEGATIVE_FEE",
          message: `Fee field ${field} cannot be negative`,
          field: `fee_breakdown.${field}`,
          severity: "error",
        })
      }
    }

    // Check add-ons for negative values
    if (feeBreakdown.add_ons) {
      for (let i = 0; i < feeBreakdown.add_ons.length; i++) {
        const addon = feeBreakdown.add_ons[i]
        if (!addon) continue
        
        if (addon.amount_cents < 0) {
          errors.push({
            code: "NEGATIVE_FEE",
            message: `Add-on "${addon.name}" cannot have negative amount`,
            field: `fee_breakdown.add_ons[${i}].amount_cents`,
            severity: "error",
          })
        }
      }
    }

    // Check OTD matches fee breakdown
    const calculatedOtd = this.calculateOtdFromBreakdown(feeBreakdown)
    const difference = Math.abs(cashOtdCents - calculatedOtd)

    if (difference > OTD_TOLERANCE_CENTS) {
      errors.push({
        code: "OTD_MISMATCH",
        message: `Out-the-door total ($${(cashOtdCents / 100).toFixed(2)}) does not match fee breakdown total ($${(calculatedOtd / 100).toFixed(2)}). Difference: $${(difference / 100).toFixed(2)}`,
        field: "cash_otd_cents",
        severity: "error",
      })
    }

    // Check required fields
    if (!feeBreakdown.base_price_cents || feeBreakdown.base_price_cents <= 0) {
      errors.push({
        code: "MISSING_REQUIRED_FEE",
        message: "Base price is required and must be greater than 0",
        field: "fee_breakdown.base_price_cents",
        severity: "error",
      })
    }

    return errors
  }

  /**
   * Validate financing options
   */
  validateFinancingOptions(options: FinancingOptionInput[]): OfferValidationError[] {
    const errors: OfferValidationError[] = []

    if (!options || options.length === 0) {
      errors.push({
        code: "NO_FINANCING_OPTIONS",
        message: "At least one financing option is required",
        field: "financing_options",
        severity: "error",
      })
      return errors
    }

    for (let i = 0; i < options.length; i++) {
      const opt = options[i]
      if (!opt) continue

      if (!opt.lender_name || opt.lender_name.trim() === "") {
        errors.push({
          code: "INVALID_FINANCING_OPTION",
          message: `Financing option ${i + 1}: Lender name is required`,
          field: `financing_options[${i}].lender_name`,
          severity: "error",
        })
      }

      if (opt.apr < 0 || opt.apr > 40) {
        errors.push({
          code: "INVALID_FINANCING_OPTION",
          message: `Financing option ${i + 1}: APR must be between 0% and 40%`,
          field: `financing_options[${i}].apr`,
          severity: "error",
        })
      }

      if (opt.term_months < 12 || opt.term_months > 96) {
        errors.push({
          code: "INVALID_FINANCING_OPTION",
          message: `Financing option ${i + 1}: Term must be between 12 and 96 months`,
          field: `financing_options[${i}].term_months`,
          severity: "error",
        })
      }

      if (opt.down_payment_cents < 0) {
        errors.push({
          code: "INVALID_FINANCING_OPTION",
          message: `Financing option ${i + 1}: Down payment cannot be negative`,
          field: `financing_options[${i}].down_payment_cents`,
          severity: "error",
        })
      }

      if (opt.est_monthly_payment_cents < 0) {
        errors.push({
          code: "INVALID_FINANCING_OPTION",
          message: `Financing option ${i + 1}: Monthly payment cannot be negative`,
          field: `financing_options[${i}].est_monthly_payment_cents`,
          severity: "error",
        })
      }
    }

    return errors
  }

  /**
   * Submit dealer offer (core submission endpoint)
   */
  async submitOffer(
    auctionId: string,
    dealerId: string,
    userId: string,
    input: OfferSubmissionInput,
  ): Promise<{
    success: boolean
    offer?: any
    errors?: OfferValidationError[]
  }> {
    const validationErrors: OfferValidationError[] = []

    // 1. Load auction and verify status
    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        buyer: {
          include: {
            prequal: true,
          },
        },
      },
    })

    if (!auction) {
      return {
        success: false,
        errors: [{ code: "AUCTION_NOT_OPEN", message: "Auction not found", severity: "error" }],
      }
    }

    if (auction.status !== "OPEN") {
      validationErrors.push({
        code: "AUCTION_NOT_OPEN",
        message: `Auction is not open for offers (status: ${auction.status})`,
        severity: "error",
      })
    }

    if (auction.endsAt && new Date() > auction.endsAt) {
      validationErrors.push({
        code: "AUCTION_ENDED",
        message: "Auction has ended",
        severity: "error",
      })
    }

    // 2. Verify dealer is a participant
    const participant = await prisma.auctionParticipant.findFirst({
      where: { auctionId, dealerId },
    })

    if (!participant) {
      validationErrors.push({
        code: "NOT_PARTICIPANT",
        message: "Dealer is not invited to this auction",
        severity: "error",
      })
    }

    // 3. Check for existing offer (one offer per dealer per auction)
    const existingOffer = await prisma.auctionOffer.findFirst({
      where: { auctionId, dealer_id: dealerId },
    })

    if (existingOffer) {
      validationErrors.push({
        code: "ALREADY_SUBMITTED",
        message: "You have already submitted your best offer for this auction",
        severity: "error",
      })
    }

    // 4. Validate inventory ownership and availability
    const inventoryItem = await prisma.inventoryItem.findUnique({
      where: { id: input.inventory_item_id },
    })

    if (!inventoryItem) {
      validationErrors.push({
        code: "INVENTORY_NOT_AVAILABLE",
        message: "Selected inventory item not found",
        field: "inventory_item_id",
        severity: "error",
      })
    } else {
      if (inventoryItem.dealerId !== dealerId) {
        validationErrors.push({
          code: "INVENTORY_NOT_OWNED",
          message: "You can only submit offers for your own inventory",
          field: "inventory_item_id",
          severity: "error",
        })
      }

      if (inventoryItem.status !== "AVAILABLE") {
        validationErrors.push({
          code: "INVENTORY_NOT_AVAILABLE",
          message: `Selected inventory is not available (status: ${inventoryItem.status})`,
          field: "inventory_item_id",
          severity: "error",
        })
      }
    }

    // 5. Validate fee breakdown and OTD
    const feeErrors = this.validateFeeBreakdown(input.fee_breakdown, input.cash_otd_cents)
    validationErrors.push(...feeErrors)

    // 6. Validate financing options
    const financingErrors = this.validateFinancingOptions(input.financing_options)
    validationErrors.push(...financingErrors)

    // 7. Budget check (warning, not blocking)
    const buyerMaxOtdCents =
      auction.buyer?.prequal?.maxOtdAmountCents ||
      (auction.buyer?.prequal?.maxOtd ? auction.buyer.prequal.maxOtd * 100 : null)

    if (buyerMaxOtdCents && input.cash_otd_cents > buyerMaxOtdCents * (1 + BUDGET_OVERAGE_THRESHOLD)) {
      validationErrors.push({
        code: "ABOVE_BUYER_BUDGET",
        message: `Offered OTD ($${(input.cash_otd_cents / 100).toFixed(2)}) exceeds buyer's pre-qualified budget ($${(buyerMaxOtdCents / 100).toFixed(2)}) by more than ${BUDGET_OVERAGE_THRESHOLD * 100}%`,
        field: "cash_otd_cents",
        severity: "warning",
      })
    }

    // If there are critical errors, return them
    const criticalErrors = validationErrors.filter((e) => e.severity === "error")
    if (criticalErrors.length > 0) {
      return { success: false, errors: validationErrors }
    }

    // 8. Create the offer
    const isValid = validationErrors.filter((e) => e.severity === "error").length === 0
    const offer = await prisma.auctionOffer.create({
      data: {
        auctionId,
        participantId: participant!.id,
        dealer_id: dealerId,
        inventoryItemId: input.inventory_item_id,
        cashOtd: input.cash_otd_cents / 100,
        cashOtdCents: input.cash_otd_cents,
        cash_otd_cents: input.cash_otd_cents,
        taxAmount: (input.fee_breakdown.tax_cents || 0) / 100,
        taxAmountCents: input.fee_breakdown.tax_cents || 0,
        tax_amount_cents: input.fee_breakdown.tax_cents || 0,
        feesBreakdown: input.fee_breakdown,
        feeBreakdownJson: input.fee_breakdown,
        fee_breakdown_json: input.fee_breakdown,
        offer_notes: input.offer_notes,
        submitted_at: new Date(),
        is_valid: isValid,
        validation_errors_json: validationErrors.length > 0 ? validationErrors : null,
      },
    })

    // 9. Create financing options
    if (input.financing_options.length > 0) {
      await prisma.auctionOfferFinancingOption.createMany({
        data: input.financing_options.map((opt) => ({
          offerId: offer.id,
          lender_name: opt.lender_name,
          lenderName: opt.lender_name,
          apr: opt.apr,
          term_months: opt.term_months,
          termMonths: opt.term_months,
          down_payment_cents: opt.down_payment_cents,
          downPayment: opt.down_payment_cents / 100,
          downPaymentCents: opt.down_payment_cents,
          est_monthly_payment_cents: opt.est_monthly_payment_cents,
          monthlyPayment: opt.est_monthly_payment_cents / 100,
          estMonthlyPaymentCents: opt.est_monthly_payment_cents,
          is_promoted_option: opt.is_promoted_option || false,
        })),
      })
    }

    // 10. Update participant
    await prisma.auctionParticipant.update({
      where: { id: participant!.id },
      data: { respondedAt: new Date() },
    })

    // 11. Write audit log
    await prisma.$executeRaw`
      INSERT INTO "offer_audit_logs" ("auction_offer_id", "changed_by_role", "changed_by_user_id", "action_type", "new_value_json")
      VALUES (${offer.id}, 'DEALER', ${userId}, 'CREATE', ${JSON.stringify({
        cash_otd_cents: input.cash_otd_cents,
        inventory_item_id: input.inventory_item_id,
        financing_options_count: input.financing_options.length,
      })}::jsonb)
    `

    // 12. Load and return the complete offer
    const completeOffer = await prisma.auctionOffer.findUnique({
      where: { id: offer.id },
      include: { financingOptions: true },
    })

    return {
      success: true,
      offer: {
        id: completeOffer!.id,
        auctionId: completeOffer!.auctionId,
        dealerId,
        inventoryItemId: completeOffer!.inventoryItemId,
        cashOtdCents: completeOffer!.cash_otd_cents || completeOffer!.cashOtdCents,
        isValid: completeOffer!.is_valid,
        validationErrors: completeOffer!.validation_errors_json,
        submittedAt: completeOffer!.submitted_at,
        financingOptionsCount: completeOffer!.financingOptions.length,
      },
    }
  }

  /**
   * Get dealer's own offer summary (read-only)
   */
  async getDealerOfferSummary(auctionId: string, dealerId: string) {
    const offer = await prisma.auctionOffer.findFirst({
      where: { auctionId, dealer_id: dealerId },
      include: {
        financingOptions: true,
        inventoryItem: true,
      },
    })

    if (!offer) {
      // Check if auction is still open
      const auction = await prisma.auction.findUnique({
        where: { id: auctionId },
      })

      return {
        offer: null,
        canSubmit: auction?.status === "OPEN" && (!auction.endsAt || new Date() < auction.endsAt),
      }
    }

    return {
      offer: {
        id: offer.id,
        cashOtdCents: offer.cash_otd_cents || offer.cashOtdCents,
        feeBreakdownJson: offer.fee_breakdown_json || offer.feeBreakdownJson,
        offerNotes: offer.offer_notes,
        submittedAt: offer.submitted_at || offer.createdAt,
        isValid: offer.is_valid ?? true,
        validationErrors: offer.validation_errors_json,
        inventoryItem: {
          id: offer.inventoryItem?.id,
          stockNumber: offer.inventoryItem?.stockNumber,
          vehicle: offer.inventoryItem,
        },
        financingOptions: offer.financingOptions.map((fo: any) => ({
          id: fo.id,
          lenderName: fo.lender_name || fo.lenderName,
          apr: fo.apr,
          termMonths: fo.term_months || fo.termMonths,
          downPaymentCents: fo.down_payment_cents || fo.downPaymentCents,
          estMonthlyPaymentCents: fo.est_monthly_payment_cents || fo.estMonthlyPaymentCents,
          isPromotedOption: fo.is_promoted_option,
        })),
      },
      canSubmit: false,
    }
  }

  /**
   * Admin: List all offers for an auction
   */
  async getAuctionOffers(auctionId: string) {
    const offers = await prisma.auctionOffer.findMany({
      where: { auctionId },
      include: {
        financingOptions: true,
        inventoryItem: true,
      },
    })

    // Get dealer info separately
    const dealerIds = offers.map((o: any) => o.dealer_id).filter(Boolean) as string[]
    const dealers = await prisma.dealer.findMany({
      where: { id: { in: dealerIds } },
      select: { id: true, businessName: true, name: true, integrityScore: true },
    })
    const dealerMap = new Map(dealers.map((d: any) => [d.id, d]))

    return offers.map((offer: any) => {
      const dealer: any = offer.dealer_id ? dealerMap.get(offer.dealer_id) : null
      return {
        id: offer.id,
        dealerId: offer.dealer_id,
        dealerName: dealer?.businessName || dealer?.name || "Unknown",
        dealerIntegrityScore: dealer?.integrityScore,
        inventory: {
          id: offer.inventoryItem?.id,
          year: offer.inventoryItem?.year,
          make: offer.inventoryItem?.make,
          model: offer.inventoryItem?.model,
          trim: offer.inventoryItem?.trim,
          vin: offer.inventoryItem?.vin,
        },
        cashOtdCents: offer.cash_otd_cents || offer.cashOtdCents,
        isValid: offer.is_valid ?? true,
        validationErrors: offer.validation_errors_json,
        submittedAt: offer.submitted_at || offer.createdAt,
        financingOptionCount: offer.financingOptions.length,
      }
    })
  }

  /**
   * Admin: Get full offer detail
   */
  async getOfferDetail(offerId: string) {
    const offer = await prisma.auctionOffer.findUnique({
      where: { id: offerId },
      include: {
        financingOptions: true,
        inventoryItem: {
          include: { dealer: true },
        },
        auction: {
          include: {
            buyer: {
              include: { prequal: true },
            },
          },
        },
      },
    })

    if (!offer) return null

    // Get audit logs
    const auditLogs = await prisma.$queryRaw<any[]>`
      SELECT * FROM "offer_audit_logs" 
      WHERE "auction_offer_id" = ${offerId}
      ORDER BY "created_at" DESC
      LIMIT 50
    `

    return {
      id: offer.id,
      auctionId: offer.auctionId,
      dealerId: offer.dealer_id,
      dealer: {
        id: offer.inventoryItem?.dealer?.id,
        name: offer.inventoryItem?.dealer?.businessName || offer.inventoryItem?.dealer?.name,
        integrityScore: offer.inventoryItem?.dealer?.integrityScore,
      },
      inventory: {
        id: offer.inventoryItem?.id,
        stockNumber: offer.inventoryItem?.stockNumber,
        vin: offer.inventoryItem?.vin,
        vehicle: offer.inventoryItem,
      },
      cashOtdCents: offer.cash_otd_cents || offer.cashOtdCents,
      feeBreakdownJson: offer.fee_breakdown_json || offer.feeBreakdownJson,
      offerNotes: offer.offer_notes,
      submittedAt: offer.submitted_at || offer.createdAt,
      isValid: offer.is_valid ?? true,
      validationErrors: offer.validation_errors_json,
      financingOptions: offer.financingOptions.map((fo: any) => ({
        id: fo.id,
        lenderName: fo.lender_name || fo.lenderName,
        apr: fo.apr,
        termMonths: fo.term_months || fo.termMonths,
        downPaymentCents: fo.down_payment_cents || fo.downPaymentCents,
        estMonthlyPaymentCents: fo.est_monthly_payment_cents || fo.estMonthlyPaymentCents,
        isPromotedOption: fo.is_promoted_option,
      })),
      buyerBudgetCents:
        offer.auction?.buyer?.prequal?.maxOtdAmountCents ||
        (offer.auction?.buyer?.prequal?.maxOtd ? offer.auction.buyer.prequal.maxOtd * 100 : null),
      auditLogs,
    }
  }

  /**
   * Admin: Override offer validity
   */
  async overrideOfferValidity(offerId: string, adminUserId: string, isValid: boolean, adminNote?: string) {
    const offer = await prisma.auctionOffer.findUnique({
      where: { id: offerId },
    })

    if (!offer) {
      throw new Error("Offer not found")
    }

    const previousValue = {
      is_valid: offer.is_valid,
      validation_errors_json: offer.validation_errors_json,
    }

    // Update offer
    const updatedOffer = await prisma.auctionOffer.update({
      where: { id: offerId },
      data: {
        is_valid: isValid,
        validation_errors_json: adminNote
          ? [
              ...(Array.isArray(offer.validation_errors_json) ? offer.validation_errors_json : []),
              {
                code: "ADMIN_OVERRIDE",
                message: adminNote,
                severity: "info",
                overriddenAt: new Date().toISOString(),
                overriddenBy: adminUserId,
              },
            ]
          : offer.validation_errors_json,
      },
    })

    // Write audit log
    await prisma.$executeRaw`
      INSERT INTO "offer_audit_logs" 
      ("auction_offer_id", "changed_by_role", "changed_by_user_id", "action_type", "previous_value_json", "new_value_json", "notes")
      VALUES (
        ${offerId}, 
        'ADMIN', 
        ${adminUserId}, 
        'VALIDITY_UPDATE', 
        ${JSON.stringify(previousValue)}::jsonb, 
        ${JSON.stringify({ is_valid: isValid })}::jsonb,
        ${adminNote || null}
      )
    `

    return updatedOffer
  }

  /**
   * Helper for System 7: Get valid offers for Best Price Report
   */
  async getOffersForBestPrice(auctionId: string) {
    const offers = await prisma.auctionOffer.findMany({
      where: {
        auctionId,
        is_valid: true,
      },
      include: {
        financingOptions: true,
        inventoryItem: {
          include: {
            dealer: {
              select: {
                id: true,
                businessName: true,
                name: true,
                integrityScore: true,
                city: true,
                state: true,
              },
            },
          },
        },
      },
      orderBy: [{ cash_otd_cents: "asc" }, { createdAt: "asc" }],
    })

    return offers.map((offer: any) => ({
      id: offer.id,
      dealerId: offer.dealer_id,
      dealer: offer.inventoryItem?.dealer,
      cashOtdCents: offer.cash_otd_cents || offer.cashOtdCents || Math.round((offer.cashOtd || 0) * 100),
      feeBreakdown: offer.fee_breakdown_json || offer.feeBreakdownJson,
      inventoryItem: offer.inventoryItem,
      vehicle: offer.inventoryItem,
      financingOptions: offer.financingOptions.map((fo: any) => ({
        id: fo.id,
        lenderName: fo.lender_name || fo.lenderName,
        apr: fo.apr,
        termMonths: fo.term_months || fo.termMonths,
        downPaymentCents: fo.down_payment_cents || fo.downPaymentCents || Math.round((fo.downPayment || 0) * 100),
        estMonthlyPaymentCents:
          fo.est_monthly_payment_cents || fo.estMonthlyPaymentCents || Math.round((fo.monthlyPayment || 0) * 100),
        isPromotedOption: fo.is_promoted_option,
      })),
      submittedAt: offer.submitted_at || offer.createdAt,
    }))
  }
}

export const offerService = new OfferService()
export default offerService
