import { prisma } from "@/lib/db"

// Best Price Algorithm Weights - can be configured via admin_settings
const DEFAULT_WEIGHTS = {
  balanced: {
    otd: 0.35,
    monthly: 0.35,
    vehicle: 0.15,
    dealer: 0.1,
    junkFee: 0.05,
  },
  monthly: {
    shorterTermBonus: 0.2,
    aprPenalty: 0.3,
    budgetPenalty: 0.5,
  },
}

interface FeeBreakdown {
  base_price_cents?: number
  tax_cents?: number
  title_registration_cents?: number
  doc_fee_cents?: number
  dealer_fees_cents?: number
  add_ons?: Array<{ name: string; amount_cents: number }>
  other_fees_cents?: number
}

interface FinancingOption {
  id: string
  lender_name?: string
  lenderName?: string
  apr: number
  term_months?: number
  termMonths?: number
  down_payment_cents?: number
  downPayment?: number
  est_monthly_payment_cents?: number
  monthlyPayment?: number
  is_promoted_option?: boolean
}

interface EnhancedOffer {
  id: string
  auctionId: string
  inventoryItemId: string
  cash_otd_cents?: number
  cashOtdCents?: number
  cashOtd?: number
  fee_breakdown_json?: FeeBreakdown
  feeBreakdownJson?: any
  is_valid?: boolean
  financingOptions: FinancingOption[]
  dealer: any
  inventoryItem: any
  vehicle: any
  junkFeeRatio: number
  junkFeeCents: number
}

interface ScoredOffer {
  offer: EnhancedOffer
  score: number
  monthlyPayment: number | null
  financingOption: FinancingOption | null
  explanation: string
}

interface BestPriceSnapshot {
  vehicle: {
    year: number
    make: string
    model: string
    trim: string | null
    mileage: number | null
    is_new: boolean
  }
  dealer: {
    id: string
    name: string
    city: string | null
    state: string | null
    integrity_score: number | null
  }
  price: {
    cash_otd_cents: number
    fee_breakdown: FeeBreakdown
    junk_fee_ratio: number
  }
  financing: {
    selected_option: {
      lender_name: string | null
      apr: number
      term_months: number
      down_payment_cents: number
      est_monthly_payment_cents: number
    } | null
  }
  meta: {
    type: string
    rank: number
    score: number
    explanation: string
  }
}

export class BestPriceService {
  static async computeBestPriceOptions(auctionId: string, runType = "INITIAL") {
    // 1. Load auction with all related data
    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        shortlist: {
          include: {
            buyer: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    })

    if (!auction) {
      throw new Error("Auction not found")
    }

    // Verify auction is CLOSED
    if (auction.status !== "CLOSED" && auction.status !== "NO_OFFERS") {
      throw new Error(`Auction status must be CLOSED, got ${auction.status}`)
    }

    const buyerId = auction.buyerId

    // 2. Load buyer pre-qualification and preferences
    const [preQual, preferences] = await Promise.all([
      prisma.preQualification.findFirst({
        where: { buyerId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.buyerPreferences.findFirst({
        where: { buyerId },
      }),
    ])

    const maxOtdCents = preQual?.maxOtdAmountCents ?? (preQual?.maxOtd ? (preQual.maxOtd || 0) * 100 : null)
    const maxMonthlyCents =
      preQual?.maxMonthlyPaymentCents ?? (preQual?.estimatedMonthlyMax
        ? (preQual.estimatedMonthlyMax || 0) * 100
        : null)
    const preferredMakes = preferences?.preferred_makes || preferences?.makes || []

    // 3. Fetch all VALID offers for this auction
    const offers = await prisma.auctionOffer.findMany({
      where: {
        auctionId,
        // Only include valid offers (from System 6)
        OR: [
          { is_valid: true },
          { is_valid: null }, // Legacy offers without validation
        ],
      },
      include: {
        financingOptions: true,
        participant: {
          include: { dealer: true },
        },
      },
    })

    if (offers.length === 0) {
      // Log the run
      await this.logRun(auctionId, runType, 0, 0, "No valid offers found")
      return []
    }

    // 4. Enhance offers with inventory, vehicle, and calculated fields
    const enhancedOffers: EnhancedOffer[] = await Promise.all(
      offers.map(async (offer: any) => {
        const inventoryItem = await prisma.inventoryItem.findUnique({
          where: { id: offer.inventoryItemId },
          include: { dealer: true },
        })

        const feeBreakdown: FeeBreakdown = (offer.fee_breakdown_json || offer.feeBreakdownJson || {}) as FeeBreakdown
        const { junkFeeCents, junkFeeRatio } = this.calculateJunkFees(feeBreakdown, this.getOfferOtdCents(offer))

        return {
          ...offer,
          dealer: offer.participant?.dealer || inventoryItem?.dealer,
          inventoryItem,
          vehicle: inventoryItem,
          junkFeeCents,
          junkFeeRatio,
        }
      }),
    )

    // Filter out offers without valid inventory/vehicle
    const validOffers = enhancedOffers.filter((o) => o.inventoryItem && o.vehicle)

    if (validOffers.length === 0) {
      await this.logRun(auctionId, runType, offers.length, 0, "No offers with valid inventory")
      return []
    }

    // 5. Apply brand preference filtering
    const { primaryUniverse, fallbackUniverse } = this.filterByBrandPreference(validOffers, preferredMakes as string[])
    const offersToRank = primaryUniverse.length > 0 ? primaryUniverse : fallbackUniverse

    // 6. Load weights from admin_settings or use defaults
    const weights = await this.loadWeights()

    // 7. Delete existing best price options for this auction
    await prisma.bestPriceOption.deleteMany({
      where: { auctionId },
    })

    // 8. Compute each category
    const bestCashResults = this.rankBestCash(offersToRank, maxOtdCents, 5)
    const bestMonthlyResults = this.rankBestMonthly(offersToRank, maxMonthlyCents, weights.monthly, 5)
    const balancedResults = this.rankBalanced(offersToRank, maxOtdCents, maxMonthlyCents, weights.balanced, 5)

    // 9. Insert ranked options
    const createdOptions = []

    for (let i = 0; i < bestCashResults.length; i++) {
      const result = bestCashResults[i]
      if (!result) continue
      const snapshot = this.buildSnapshot(result, "BEST_CASH", i + 1)

      createdOptions.push(
        await prisma.bestPriceOption.create({
          data: {
            auctionId,
            auction_id: auctionId,
            type: "BEST_CASH",
            offerId: result.offer.id,
            offer_id: result.offer.id,
            inventoryItemId: result.offer.inventoryItemId,
            inventory_item_id: result.offer.inventoryItemId,
            dealerId: result.offer.dealer?.id || "",
            dealer_id: result.offer.dealer?.id || "",
            cashOtd: this.getOfferOtdCents(result.offer) / 100,
            cash_otd: this.getOfferOtdCents(result.offer) / 100,
            monthlyPayment: result.monthlyPayment ? result.monthlyPayment / 100 : null,
            monthly_payment: result.monthlyPayment ? result.monthlyPayment / 100 : null,
            financingOptionId: result.financingOption?.id || null,
            financing_option_id: result.financingOption?.id || null,
            score: result.score,
            rank: i + 1,
            snapshot_json: snapshot,
            is_declined: false,
            isDeclined: false,
          },
        }),
      )
    }

    for (let i = 0; i < bestMonthlyResults.length; i++) {
      const result = bestMonthlyResults[i]
      if (!result) continue
      const snapshot = this.buildSnapshot(result, "BEST_MONTHLY", i + 1)

      createdOptions.push(
        await prisma.bestPriceOption.create({
          data: {
            auctionId,
            auction_id: auctionId,
            type: "BEST_MONTHLY",
            offerId: result.offer.id,
            offer_id: result.offer.id,
            inventoryItemId: result.offer.inventoryItemId,
            inventory_item_id: result.offer.inventoryItemId,
            dealerId: result.offer.dealer?.id || "",
            dealer_id: result.offer.dealer?.id || "",
            cashOtd: this.getOfferOtdCents(result.offer) / 100,
            cash_otd: this.getOfferOtdCents(result.offer) / 100,
            monthlyPayment: result.monthlyPayment ? result.monthlyPayment / 100 : null,
            monthly_payment: result.monthlyPayment ? result.monthlyPayment / 100 : null,
            financingOptionId: result.financingOption?.id || null,
            financing_option_id: result.financingOption?.id || null,
            score: result.score,
            rank: i + 1,
            snapshot_json: snapshot,
            is_declined: false,
            isDeclined: false,
          },
        }),
      )
    }

    for (let i = 0; i < balancedResults.length; i++) {
      const result = balancedResults[i]
      if (!result) continue
      const snapshot = this.buildSnapshot(result, "BALANCED", i + 1)

      createdOptions.push(
        await prisma.bestPriceOption.create({
          data: {
            auctionId,
            auction_id: auctionId,
            type: "BALANCED",
            offerId: result.offer.id,
            offer_id: result.offer.id,
            inventoryItemId: result.offer.inventoryItemId,
            inventory_item_id: result.offer.inventoryItemId,
            dealerId: result.offer.dealer?.id || "",
            dealer_id: result.offer.dealer?.id || "",
            cashOtd: this.getOfferOtdCents(result.offer) / 100,
            cash_otd: this.getOfferOtdCents(result.offer) / 100,
            monthlyPayment: result.monthlyPayment ? result.monthlyPayment / 100 : null,
            monthly_payment: result.monthlyPayment ? result.monthlyPayment / 100 : null,
            financingOptionId: result.financingOption?.id || null,
            financing_option_id: result.financingOption?.id || null,
            score: result.score,
            rank: i + 1,
            snapshot_json: snapshot,
            is_declined: false,
            isDeclined: false,
          },
        }),
      )
    }

    // 10. Log the run
    await this.logRun(
      auctionId,
      runType,
      offers.length,
      validOffers.length,
      `Created ${createdOptions.length} options`,
      weights,
    )

    return createdOptions
  }

  private static getOfferOtdCents(offer: any): number {
    if (offer.cash_otd_cents) return offer.cash_otd_cents
    if (offer.cashOtdCents) return offer.cashOtdCents
    if (offer.cashOtd) return Math.round(offer.cashOtd * 100)
    return 0
  }

  private static getMonthlyPaymentCents(option: FinancingOption): number {
    if (option.est_monthly_payment_cents) return option.est_monthly_payment_cents
    if (option.monthlyPayment) return Math.round(option.monthlyPayment * 100)
    return 0
  }

  private static getTermMonths(option: FinancingOption): number {
    return option.term_months || option.termMonths || 60
  }

  private static calculateJunkFees(
    breakdown: FeeBreakdown,
    totalOtdCents: number,
  ): { junkFeeCents: number; junkFeeRatio: number } {
    const docFee = breakdown.doc_fee_cents || 0
    const dealerFees = breakdown.dealer_fees_cents || 0
    const addOns = (breakdown.add_ons || []).reduce((sum, a) => sum + (a.amount_cents || 0), 0)

    const junkFeeCents = docFee + dealerFees + addOns
    const junkFeeRatio = totalOtdCents > 0 ? junkFeeCents / totalOtdCents : 0

    return { junkFeeCents, junkFeeRatio }
  }

  private static filterByBrandPreference(
    offers: EnhancedOffer[],
    preferredMakes: string[],
  ): { primaryUniverse: EnhancedOffer[]; fallbackUniverse: EnhancedOffer[] } {
    if (!preferredMakes || preferredMakes.length === 0) {
      return { primaryUniverse: offers, fallbackUniverse: offers }
    }

    const normalizedPreferred = preferredMakes.map((m) => m.toLowerCase().trim())
    const primaryUniverse = offers.filter((o) => {
      const make = o.vehicle?.make?.toLowerCase().trim()
      return make && normalizedPreferred.includes(make)
    })

    return { primaryUniverse, fallbackUniverse: offers }
  }

  private static async loadWeights() {
    try {
      const setting = await prisma.adminSetting.findFirst({
        where: { key: "BEST_PRICE_WEIGHTS" },
      })
      if (setting?.value) {
        return { ...DEFAULT_WEIGHTS, ...(setting.value as Record<string, unknown>) }
      }
    } catch {
      // Use defaults
    }
    return DEFAULT_WEIGHTS
  }

  private static rankBestCash(offers: EnhancedOffer[], maxOtdCents: number | null, limit: number): ScoredOffer[] {
    const scored = offers.map((offer: any) => {
      const otdCents = this.getOfferOtdCents(offer)
      let score = 1_000_000_000 / (otdCents || 1) // Inverse of OTD

      // Penalize junk fees
      score -= offer.junkFeeRatio * 1000

      // Bonus for newer vehicles
      const year = offer.vehicle?.year || 2020
      score += (year - 2015) * 10

      // Bonus for lower mileage
      const mileage = offer.inventoryItem?.mileage || 50000
      score -= mileage / 10000

      // Penalize if over budget
      if (maxOtdCents && otdCents > maxOtdCents) {
        const overBudgetRatio = (otdCents - maxOtdCents) / maxOtdCents
        score -= overBudgetRatio * 5000
      }

      // Get best financing option for display
      const bestFinancing =
        offer.financingOptions.length > 0
          ? offer.financingOptions.reduce((best: any, curr: any) =>
              this.getMonthlyPaymentCents(curr) < this.getMonthlyPaymentCents(best) ? curr : best,
            )
          : null

      return {
        offer,
        score,
        monthlyPayment: bestFinancing ? this.getMonthlyPaymentCents(bestFinancing) : null,
        financingOption: bestFinancing,
        explanation: `Lowest total OTD price${offer.junkFeeRatio < 0.05 ? " with minimal fees" : ""}`,
      }
    })

    return scored.sort((a, b) => b.score - a.score).slice(0, limit)
  }

  private static rankBestMonthly(
    offers: EnhancedOffer[],
    maxMonthlyCents: number | null,
    weights: typeof DEFAULT_WEIGHTS.monthly,
    limit: number,
  ): ScoredOffer[] {
    const pairs: Array<{ offer: EnhancedOffer; option: FinancingOption; score: number }> = []

    for (const offer of offers) {
      for (const option of offer.financingOptions) {
        const monthlyCents = this.getMonthlyPaymentCents(option)
        const termMonths = this.getTermMonths(option)
        const apr = option.apr || 0

        if (monthlyCents <= 0 || termMonths < 12 || termMonths > 96 || apr < 0 || apr > 40) {
          continue // Skip invalid options
        }

        let score = 1_000_000 / monthlyCents

        // Shorter term bonus
        const termBonus = ((96 - termMonths) / 96) * weights.shorterTermBonus * 100
        score += termBonus

        // APR penalty
        const aprPenalty = (apr / 40) * weights.aprPenalty * 100
        score -= aprPenalty

        // Budget penalty
        if (maxMonthlyCents && monthlyCents > maxMonthlyCents) {
          const overRatio = (monthlyCents - maxMonthlyCents) / maxMonthlyCents
          score -= overRatio * weights.budgetPenalty * 1000
        }

        pairs.push({ offer, option, score })
      }
    }

    // For each offer, keep only its best financing option
    const bestByOffer = new Map<string, { offer: EnhancedOffer; option: FinancingOption; score: number }>()
    for (const pair of pairs) {
      const existing = bestByOffer.get(pair.offer.id)
      if (!existing || pair.score > existing.score) {
        bestByOffer.set(pair.offer.id, pair)
      }
    }

    return Array.from(bestByOffer.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((p) => ({
        offer: p.offer,
        score: p.score,
        monthlyPayment: this.getMonthlyPaymentCents(p.option),
        financingOption: p.option,
        explanation: `Lowest monthly payment with ${this.getTermMonths(p.option)}-month term at ${p.option.apr}% APR`,
      }))
  }

  private static rankBalanced(
    offers: EnhancedOffer[],
    maxOtdCents: number | null,
    maxMonthlyCents: number | null,
    weights: typeof DEFAULT_WEIGHTS.balanced,
    limit: number,
  ): ScoredOffer[] {
    // Calculate min/max for normalization
    const otds = offers.map((o) => this.getOfferOtdCents(o))
    const minOtd = Math.min(...otds)
    const maxOtd = Math.max(...otds)

    const monthlies = offers
      .flatMap((o) => o.financingOptions.map((f) => this.getMonthlyPaymentCents(f)))
      .filter((m) => m > 0)
    const minMonthly = monthlies.length > 0 ? Math.min(...monthlies) : 0
    const maxMonthly = monthlies.length > 0 ? Math.max(...monthlies) : 1

    const scored = offers.map((offer: any) => {
      const otdCents = this.getOfferOtdCents(offer)

      // OTD score (normalized, lower = higher score)
      const otdScore = maxOtd !== minOtd ? (maxOtd - otdCents) / (maxOtd - minOtd) : 1

      // Pick representative financing option (promoted or closest to 60-72 months)
      const promoted = offer.financingOptions.find((f: any) => f.is_promoted_option)
      const standardTerm = offer.financingOptions
        .filter((f: any) => {
          const term = this.getTermMonths(f)
          return term >= 60 && term <= 72
        })
        .sort((a: any, b: any) => this.getMonthlyPaymentCents(a) - this.getMonthlyPaymentCents(b))[0]
      const anyOption = offer.financingOptions.sort(
        (a: any, b: any) => this.getMonthlyPaymentCents(a) - this.getMonthlyPaymentCents(b),
      )[0]
      const chosenOption = promoted || standardTerm || anyOption

      // Monthly score
      let monthlyScore = 0
      let monthlyCents: number | null = null
      if (chosenOption) {
        monthlyCents = this.getMonthlyPaymentCents(chosenOption)
        monthlyScore = maxMonthly !== minMonthly ? (maxMonthly - monthlyCents) / (maxMonthly - minMonthly) : 1
      }

      // Vehicle score
      const year = offer.vehicle?.year || 2020
      const yearScore = Math.min(1, (year - 2015) / 10)
      const mileage = offer.inventoryItem?.mileage || 50000
      const mileageScore = Math.max(0, 1 - mileage / 150000)
      const isNewBonus = offer.inventoryItem?.is_new || offer.inventoryItem?.isNew ? 0.2 : 0
      const vehicleScore = (yearScore + mileageScore + isNewBonus) / 2.2

      // Dealer score
      const dealerIntegrity = offer.dealer?.integrityScore || 0.8
      const dealerScore = dealerIntegrity

      // Junk fee score (lower ratio = higher score)
      const junkFeeScore = 1 - Math.min(1, offer.junkFeeRatio * 5)

      // Combined score
      let score =
        weights.otd * otdScore +
        weights.monthly * monthlyScore +
        weights.vehicle * vehicleScore +
        weights.dealer * dealerScore +
        weights.junkFee * junkFeeScore

      // Budget penalties
      if (maxOtdCents && otdCents > maxOtdCents * 1.1) {
        score -= 0.2
      }
      if (maxMonthlyCents && monthlyCents && monthlyCents > maxMonthlyCents * 1.1) {
        score -= 0.3
      }

      return {
        offer,
        score: Math.round(score * 100),
        monthlyPayment: monthlyCents,
        financingOption: chosenOption || null,
        explanation: `Balanced deal: strong on price, monthly payment, and vehicle quality`,
      }
    })

    return scored.sort((a, b) => b.score - a.score).slice(0, limit)
  }

  private static buildSnapshot(result: ScoredOffer, type: string, rank: number): BestPriceSnapshot {
    const offer = result.offer
    const feeBreakdown = (offer.fee_breakdown_json || offer.feeBreakdownJson || {}) as FeeBreakdown

    return {
      vehicle: {
        year: offer.vehicle?.year || 0,
        make: offer.vehicle?.make || "",
        model: offer.vehicle?.model || "",
        trim: offer.vehicle?.trim || null,
        mileage: offer.inventoryItem?.mileage || null,
        is_new: offer.inventoryItem?.is_new || offer.inventoryItem?.isNew || false,
      },
      dealer: {
        id: offer.dealer?.id || "",
        name: offer.dealer?.name || offer.dealer?.businessName || "",
        city: offer.dealer?.city || offer.inventoryItem?.location_city || null,
        state: offer.dealer?.state || offer.inventoryItem?.location_state || null,
        integrity_score: offer.dealer?.integrityScore || null,
      },
      price: {
        cash_otd_cents: this.getOfferOtdCents(offer),
        fee_breakdown: feeBreakdown,
        junk_fee_ratio: offer.junkFeeRatio,
      },
      financing: {
        selected_option: result.financingOption
          ? {
              lender_name: result.financingOption.lender_name || result.financingOption.lenderName || null,
              apr: result.financingOption.apr,
              term_months: this.getTermMonths(result.financingOption),
              down_payment_cents:
                result.financingOption.down_payment_cents ||
                Math.round((result.financingOption.downPayment || 0) * 100),
              est_monthly_payment_cents: this.getMonthlyPaymentCents(result.financingOption),
            }
          : null,
      },
      meta: {
        type,
        rank,
        score: result.score,
        explanation: result.explanation,
      },
    }
  }

  private static async logRun(
    auctionId: string,
    runType: string,
    offerCount: number,
    validOfferCount: number,
    notes: string,
    weightsUsed?: any,
  ) {
    try {
      await prisma.$executeRaw`
        INSERT INTO best_price_run_logs (id, auction_id, run_type, offer_count, valid_offer_count, notes, weights_used)
        VALUES (gen_random_uuid()::text, ${auctionId}, ${runType}, ${offerCount}, ${validOfferCount}, ${notes}, ${weightsUsed ? JSON.stringify(weightsUsed) : null}::jsonb)
      `
    } catch {
      // Non-critical, ignore errors
    }
  }

  static async getBestPriceOptions(auctionId: string) {
    const options = await prisma.bestPriceOption.findMany({
      where: { auctionId },
      orderBy: [{ type: "asc" }, { rank: "asc" }],
    })

    // Group by type
    const grouped = {
      best_cash: { primary: null as unknown, alternatives: [] as unknown[] },
      best_monthly: { primary: null as unknown, alternatives: [] as unknown[] },
      balanced: { primary: null as unknown, alternatives: [] as unknown[] },
    }

    for (const option of options) {
      // const _typeKey = option.type.toLowerCase().replace("_", "_") as keyof typeof grouped
      const mappedKey =
        option.type === "BEST_CASH" ? "best_cash" : option.type === "BEST_MONTHLY" ? "best_monthly" : "balanced"

      const optionData = {
        id: option.id,
        rank: option.rank,
        score: option.score,
        is_declined: option.is_declined,
        declined_at: option.declined_at,
        snapshot: option.snapshot_json,
        offerId: option.offerId,
        inventoryItemId: option.inventoryItemId,
        dealerId: option.dealerId,
        cashOtd: option.cashOtd,
        monthlyPayment: option.monthlyPayment,
        financingOptionId: option.financingOptionId,
      }

      // First non-declined option is primary
      if (!option.is_declined && !grouped[mappedKey].primary) {
        grouped[mappedKey].primary = optionData
      } else {
        grouped[mappedKey].alternatives.push(optionData)
      }
    }

    return grouped
  }

  static async getRawOptions(auctionId: string) {
    return prisma.bestPriceOption.findMany({
      where: { auctionId },
      orderBy: [{ type: "asc" }, { rank: "asc" }],
    })
  }

  static async declineOption(auctionId: string, optionId: string, buyerId: string) {
    // Verify auction ownership
    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
    })

    if (!auction || auction.buyerId !== buyerId) {
      throw new Error("Auction not found or unauthorized")
    }

    // Find the option
    const option = await prisma.bestPriceOption.findUnique({
      where: { id: optionId },
    })

    if (!option || option.auctionId !== auctionId) {
      throw new Error("Option not found")
    }

    if (option.is_declined) {
      throw new Error("Option already declined")
    }

    // Mark as declined
    await prisma.bestPriceOption.update({
      where: { id: optionId },
      data: {
        is_declined: true,
        declined_at: new Date(),
      },
    })

    // Record decision
    await prisma.auctionOfferDecision.create({
      data: {
        auctionId,
        offerId: option.offerId,
        buyerId,
        decision: "DECLINED",
        declinedAt: new Date(),
      },
    })

    // Find next available option for that type
    const nextOption = await prisma.bestPriceOption.findFirst({
      where: {
        auctionId,
        type: option.type,
        is_declined: false,
      },
      orderBy: { rank: "asc" },
    })

    return {
      declined_option_id: optionId,
      next_option: nextOption
        ? {
            id: nextOption.id,
            type: nextOption.type,
            rank: nextOption.rank,
            snapshot: nextOption.snapshot_json,
          }
        : null,
    }
  }

  static async declineOffer(auctionId: string, offerId: string, buyerId: string) {
    // Find the option by offerId
    const option = await prisma.bestPriceOption.findFirst({
      where: {
        auctionId,
        offerId,
        is_declined: false,
      },
    })

    if (option) {
      return this.declineOption(auctionId, option.id, buyerId)
    }

    // Fallback: just record the decision
    await prisma.auctionOfferDecision.create({
      data: {
        auctionId,
        offerId,
        buyerId,
        decision: "DECLINED",
        declinedAt: new Date(),
      },
    })

    // Recompute
    await this.computeBestPriceOptions(auctionId, "RECOMPUTE")
    return this.getBestPriceOptions(auctionId)
  }

  static async selectDeal(buyerId: string, auctionId: string, offerId: string, financingOptionId?: string) {
    const offer = await prisma.auctionOffer.findUnique({
      where: { id: offerId },
      include: {
        financingOptions: true,
        auction: true,
        participant: {
          include: { dealer: true },
        },
      },
    })

    if (!offer || offer.auctionId !== auctionId) {
      throw new Error("Invalid offer")
    }

    if (!offer.auction?.workspaceId) {
      throw new Error("Auction workspaceId is required to create a deal")
    }

    // Record the selection
    await prisma.auctionOfferDecision.create({
      data: {
        auctionId,
        offerId,
        buyerId,
        decision: "ACCEPTED",
        acceptedAt: new Date(),
      },
    })

    const otdCents = offer.cash_otd_cents || offer.cashOtdCents || Math.round((offer.cashOtd || 0) * 100)

    // Create selected deal
    const deal = await prisma.selectedDeal.create({
      data: {
        buyerId,
        auctionId,
        offerId,
        inventoryItemId: offer.inventoryItemId,
        dealerId: offer.participant.dealerId,
        workspaceId: offer.auction.workspaceId,
        status: "PENDING_FINANCING",
        cashOtd: otdCents / 100,
        taxAmount: (offer.taxAmountCents || offer.tax_amount_cents || Math.round((offer.taxAmount || 0) * 100)) / 100,
        feesBreakdown: (offer.fee_breakdown_json || offer.feeBreakdownJson || offer.feesBreakdown) as object,
        total_otd_amount_cents: otdCents,
      },
    })

    // If financing option selected, create financing offer
    if (financingOptionId) {
      const financingOption = offer.financingOptions.find((f: any) => f.id === financingOptionId)

      if (financingOption) {
        const downPaymentCents =
          financingOption.down_payment_cents || Math.round((financingOption.downPayment || 0) * 100)
        const monthlyCents =
          financingOption.est_monthly_payment_cents || Math.round((financingOption.monthlyPayment || 0) * 100)

        await prisma.financingOffer.create({
          data: {
            dealId: deal.id,
            workspaceId: deal.workspaceId,
            lenderName: financingOption.lender_name || financingOption.lenderName || "AutoLenis Partner Finance",
            apr: financingOption.apr,
            termMonths: financingOption.term_months || financingOption.termMonths || 60,
            downPayment: downPaymentCents / 100,
            monthlyPayment: monthlyCents / 100,
            totalFinanced: (otdCents - downPaymentCents) / 100,
            approved: false,
          },
        })
      }
    }

    // Mark auction as completed
    await prisma.auction.update({
      where: { id: auctionId },
      data: { status: "COMPLETED" },
    })

    // Mark inventory item as reserved
    await prisma.inventoryItem.update({
      where: { id: offer.inventoryItemId },
      data: { status: "RESERVED" },
    })

    // Log compliance event
    await prisma.complianceEvent.create({
      data: {
        eventType: "DEAL_SELECTED",
        userId: buyerId,
        relatedId: deal.id,
        details: {
          auctionId,
          offerId,
          cashOtdCents: otdCents,
        },
      },
    })

    return deal
  }
}

export const bestPriceService = new BestPriceService()
