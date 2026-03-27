import { getSupabase, prisma } from "@/lib/db"
import { stripe } from "@/lib/stripe"
import { DEPOSIT_AMOUNT, DEPOSIT_AMOUNT_CENTS, PREMIUM_FEE, FEE_ELIGIBLE_DEAL_STATUSES } from "@/lib/constants"
import { InventoryStatus } from "@/lib/constants/statuses"

/**
 * Checkout session statuses that are still open / usable by the buyer.
 * Stripe checkout sessions transition: open → complete | expired.
 */
const REUSABLE_SESSION_STATUSES = ["open"]

/**
 * Canonical checkout service.
 *
 * Every entry point (server action, API route) MUST delegate to these
 * methods for deposit and service-fee checkout session creation.
 *
 * Idempotency approach:
 * 1. Look up the existing PENDING payment row.
 * 2. If the payment row has a `checkoutSessionId`, retrieve the Stripe session.
 * 3. If the session is still open, return it (reuse).
 * 4. Otherwise create a new Stripe checkout session, update the payment row with the new session id,
 *    and derive a unique idempotency key from the payment row id + attempt counter.
 */
export class CheckoutService {
  // ─── Deposit Checkout ──────────────────────────────────────────────

  /**
   * Get or create a deposit checkout session.
   * Caller must have already authenticated the user and resolved the buyerId.
   */
  static async getOrCreateDepositCheckout(params: {
    buyerId: string
    auctionId: string
    successUrl?: string
    cancelUrl?: string
  }): Promise<{ url: string | null; clientSecret: string | null; sessionId: string; alreadyPaid?: boolean }> {
    const supabase = getSupabase()

    // 1. Reject if already paid
    const { data: paidDeposit } = await supabase
      .from("DepositPayment")
      .select("id")
      .eq("buyerId", params.buyerId)
      .eq("auctionId", params.auctionId)
      .in("status", ["SUCCEEDED", "PAID"])
      .eq("refunded", false)
      .limit(1)
      .maybeSingle()

    if (paidDeposit) {
      throw new CheckoutError("Deposit already paid", "ALREADY_PAID")
    }

    // 2. Look up existing PENDING payment row
    const { data: pendingPayment } = await supabase
      .from("DepositPayment")
      .select("*")
      .eq("buyerId", params.buyerId)
      .eq("auctionId", params.auctionId)
      .eq("status", "PENDING")
      .limit(1)
      .maybeSingle()

    // 3. If PENDING row exists and has a checkout session, try to reuse it
    if (pendingPayment?.checkoutSessionId) {
      try {
        const existing = await stripe.checkout.sessions.retrieve(pendingPayment.checkoutSessionId)
        if (REUSABLE_SESSION_STATUSES.includes(existing.status ?? "")) {
          return {
            url: existing.url,
            clientSecret: existing.client_secret,
            sessionId: existing.id,
          }
        }
      } catch {
        // Session retrieval failed (deleted, network error, etc.) — create a new one
      }
    }

    // 4. Create the PENDING payment row if needed
    let paymentId = pendingPayment?.id
    if (!paymentId) {
      const id = crypto.randomUUID()
      const { error } = await supabase.from("DepositPayment").insert({
        id,
        buyerId: params.buyerId,
        auctionId: params.auctionId,
        amount: DEPOSIT_AMOUNT,
        amountCents: DEPOSIT_AMOUNT_CENTS,
        amount_cents: DEPOSIT_AMOUNT_CENTS,
        status: "PENDING",
      })
      if (error) throw new Error(`Failed to create deposit payment: ${error.message}`)
      paymentId = id
    }

    // 5. Atomic HOLD reservation: reserve all shortlisted inventory before Stripe session
    const auction = await prisma.auction.findUnique({
      where: { id: params.auctionId },
      select: { shortlistId: true },
    })

    if (auction?.shortlistId) {
      await prisma.$transaction(async (tx: typeof prisma) => {
        const shortlistItems = await tx.shortlistItem.findMany({
          where: { shortlistId: auction.shortlistId },
          select: { inventoryItemId: true },
        })

        const itemIds = shortlistItems
          .map((si: { inventoryItemId: string | null }) => si.inventoryItemId)
          .filter(Boolean) as string[]

        if (itemIds.length === 0) {
          return
        }

        const items = await tx.inventoryItem.findMany({
          where: { id: { in: itemIds } },
          select: { id: true, status: true },
        })

        const unavailable = items.filter(
          (i: { id: string; status: string }) => i.status !== InventoryStatus.AVAILABLE
        )

        if (unavailable.length > 0) {
          throw new CheckoutError(
            `Vehicle(s) ${unavailable.map((i: { id: string }) => i.id).join(", ")} are no longer available`,
            "INVENTORY_UNAVAILABLE"
          )
        }

        const holdResult = await tx.inventoryItem.updateMany({
          where: {
            id: { in: itemIds },
            status: InventoryStatus.AVAILABLE,
          },
          data: {
            status: InventoryStatus.HOLD,
            reservedAt: new Date(),
          },
        })

        if (holdResult.count !== itemIds.length) {
          throw new CheckoutError(
            "One or more vehicles became unavailable during checkout.",
            "INVENTORY_UNAVAILABLE"
          )
        }
      })
    }

    // 6. Create a new Stripe checkout session with payment-row-derived idempotency key
    const attemptCount = (pendingPayment?.checkoutAttempt ?? 0) + 1
    const idempotencyKey = `deposit_cs_${paymentId}_${attemptCount}`

    const session = await stripe.checkout.sessions.create({
      ui_mode: params.successUrl ? "hosted" as any : "embedded",
      redirect_on_completion: params.successUrl ? undefined : "never",
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "AutoLenis Deposit",
              description: "Refundable deposit for vehicle auction",
            },
            unit_amount: DEPOSIT_AMOUNT_CENTS,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      metadata: {
        type: "deposit",
        buyerId: params.buyerId,
        auctionId: params.auctionId,
        paymentId,
      },
    }, {
      idempotencyKey,
    })

    // 7. Persist the checkout session ID on the payment row
    await supabase
      .from("DepositPayment")
      .update({
        checkoutSessionId: session.id,
        checkoutAttempt: attemptCount,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", paymentId)

    return {
      url: session.url,
      clientSecret: session.client_secret,
      sessionId: session.id,
    }
  }

  // ─── Service Fee Checkout ──────────────────────────────────────────

  /**
   * Get or create a service-fee checkout session.
   * Caller must have already authenticated the user and resolved the buyerId.
   *
   * Enforces:
   *  - Deal ownership (buyerId must match deal.buyerId)
   *  - Lifecycle state (deal must be in FEE_ELIGIBLE_DEAL_STATUSES)
   *  - Already-paid rejection
   */
  static async getOrCreateServiceFeeCheckout(params: {
    buyerId: string
    dealId: string
    successUrl?: string
    cancelUrl?: string
  }): Promise<{ url: string | null; clientSecret: string | null; sessionId: string; alreadyPaid?: boolean }> {
    const supabase = getSupabase()

    // 1. Load deal + validate ownership + lifecycle
    const { data: deal, error: dealError } = await supabase
      .from("SelectedDeal")
      .select("id, buyerId, status")
      .eq("id", params.dealId)
      .single()

    if (dealError || !deal) {
      throw new CheckoutError("Deal not found", "NOT_FOUND")
    }

    if (deal.buyerId !== params.buyerId) {
      throw new CheckoutError("Unauthorized: deal does not belong to this buyer", "UNAUTHORIZED")
    }

    const dealStatus = String(deal.status || "").toUpperCase()
    if (!FEE_ELIGIBLE_DEAL_STATUSES.includes(dealStatus as any)) {
      throw new CheckoutError("Deal is not in a valid state for fee payment", "INVALID_STATE")
    }

    // 2. Reject if already paid
    const { data: existingFee } = await supabase
      .from("ServiceFeePayment")
      .select("*")
      .eq("dealId", params.dealId)
      .limit(1)
      .maybeSingle()

    if (existingFee?.status === "PAID" || existingFee?.status === "SUCCEEDED") {
      throw new CheckoutError("Service fee already paid", "ALREADY_PAID")
    }

    // 3. If pending row exists and has a checkout session, try to reuse
    if (existingFee?.checkoutSessionId) {
      try {
        const existing = await stripe.checkout.sessions.retrieve(existingFee.checkoutSessionId)
        if (REUSABLE_SESSION_STATUSES.includes(existing.status ?? "")) {
          return {
            url: existing.url,
            clientSecret: existing.client_secret,
            sessionId: existing.id,
          }
        }
      } catch {
        // Session retrieval failed — create a new one
      }
    }

    // 4. Calculate amount
    const baseFee = PREMIUM_FEE

    const { data: depositPayment } = await supabase
      .from("DepositPayment")
      .select("id")
      .eq("buyerId", params.buyerId)
      .in("status", ["SUCCEEDED", "PAID"])
      .eq("refunded", false)
      .order("createdAt", { ascending: false })
      .limit(1)
      .maybeSingle()

    const depositCredit = depositPayment ? DEPOSIT_AMOUNT : 0
    const finalAmount = baseFee - depositCredit

    // 5. Ensure PENDING payment row exists
    let paymentId = existingFee?.id
    if (!paymentId) {
      const id = crypto.randomUUID()
      const { error } = await supabase.from("ServiceFeePayment").insert({
        id,
        dealId: params.dealId,
        baseFee,
        depositCredit,
        finalAmount,
        paymentMethod: "CARD",
        status: "PENDING",
      })
      if (error) throw new Error(`Failed to create service fee payment: ${error.message}`)
      paymentId = id
    } else if (existingFee.status !== "PENDING") {
      await supabase
        .from("ServiceFeePayment")
        .update({ status: "PENDING", updatedAt: new Date().toISOString() })
        .eq("id", paymentId)
    }

    // 6. Create new Stripe checkout session with payment-row-derived idempotency key
    const attemptCount = (existingFee?.checkoutAttempt ?? 0) + 1
    const idempotencyKey = `svc_fee_cs_${paymentId}_${attemptCount}`

    const session = await stripe.checkout.sessions.create({
      ui_mode: params.successUrl ? "hosted" as any : "embedded",
      redirect_on_completion: params.successUrl ? undefined : "never",
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "AutoLenis Concierge Fee",
              description: "One-time service fee for vehicle purchase assistance",
            },
            unit_amount: finalAmount * 100,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      metadata: {
        type: "service_fee",
        dealId: params.dealId,
        buyerId: params.buyerId,
        paymentId,
      },
    }, {
      idempotencyKey,
    })

    // 7. Persist the checkout session ID on the payment row
    await supabase
      .from("ServiceFeePayment")
      .update({
        checkoutSessionId: session.id,
        checkoutAttempt: attemptCount,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", paymentId)

    return {
      url: session.url,
      clientSecret: session.client_secret,
      sessionId: session.id,
    }
  }
}

/**
 * Typed error for checkout flows, includes a machine-readable code.
 */
export class CheckoutError extends Error {
  code: string
  constructor(message: string, code: string) {
    super(message)
    this.name = "CheckoutError"
    this.code = code
  }
}
