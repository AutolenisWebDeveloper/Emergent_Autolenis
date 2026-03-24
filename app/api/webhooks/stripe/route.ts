import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { constructWebhookEvent } from "@/lib/stripe"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/db"
import { affiliateService } from "@/lib/services/affiliate.service"
import { logger } from "@/lib/logger"
import { notifyAdmin } from "@/lib/notifications/notification.service"
import { markDepositPaid, markDepositFailed, markDepositRefunded, recordPremiumFeePayment } from "@/lib/services/buyer-package.service"
import type Stripe from "stripe"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = constructWebhookEvent(body, signature)
  } catch (err: any) {
    logger.error("Webhook Error: Stripe signature verification failed", { error: err.message })
    return NextResponse.json({ error: "Webhook Error: signature verification failed" }, { status: 400 })
  }

  // Event-level idempotency: check if this Stripe event has already been processed
  const supabaseIdempotency = await createClient()
  const { data: existingEvent } = await supabaseIdempotency
    .from("ComplianceEvent")
    .select("id")
    .eq("action", `STRIPE_EVENT_${event.id}`)
    .limit(1)
    .maybeSingle()

  if (existingEvent) {
    logger.debug("Stripe webhook event already processed, skipping", { eventId: event.id, type: event.type })
    return NextResponse.json({ received: true, deduplicated: true })
  }

  // Mark event as being processed (idempotency marker)
  // If insert fails (e.g., race condition with concurrent request), treat as already-processed
  const { error: insertError } = await supabaseIdempotency.from("ComplianceEvent").insert({
    eventType: "WEBHOOK_PROCESSED",
    action: `STRIPE_EVENT_${event.id}`,
    details: { stripeEventId: event.id, type: event.type },
  })

  if (insertError) {
    logger.debug("Stripe webhook idempotency insert conflict, treating as duplicate", { eventId: event.id, error: insertError.message })
    return NextResponse.json({ received: true, deduplicated: true })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session)
        break
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        await handlePaymentIntentSucceeded(paymentIntent)
        break
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        await handlePaymentIntentFailed(paymentIntent)
        break
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge
        await handleChargeRefunded(charge)
        break
      }

      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute
        await handleDisputeCreated(dispute)
        break
      }

      case "payout.paid": {
        const payout = event.data.object as Stripe.Payout
        await handlePayoutPaid(payout)
        break
      }

      default:
        logger.debug("Unhandled Stripe webhook event type", { type: event.type })
    }

    return NextResponse.json({ received: true })
  } catch (error: unknown) {
    logger.error("Stripe webhook handler error", error instanceof Error ? error : undefined)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// Webhook handlers — multi-step writes use Prisma $transaction for atomicity.
// Prisma and Supabase share the same PostgreSQL database, so Prisma transactions
// provide real ACID guarantees for the same tables.
// Admin notifications are fire-and-forget side effects kept outside transactions.
// ---------------------------------------------------------------------------

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const metadata = session.metadata || {}
  const type = metadata['type']

  if (type === "deposit") {
    // Transaction: update deposit status + log compliance event
    const depositRecord = await prisma.$transaction(async (tx: any) => {
      await tx.depositPayment.updateMany({
        where: {
          buyerId: metadata['buyerId'],
          auctionId: metadata['auctionId'],
          status: "PENDING",
        },
        data: {
          status: "SUCCEEDED",
          stripePaymentIntentId: session.payment_intent as string,
        },
      })

      await tx.complianceEvent.create({
        data: {
          eventType: "DEPOSIT_PAYMENT",
          buyerId: metadata['buyerId'],
          action: "DEPOSIT_PAID",
          details: {
            amount: session.amount_total ? session.amount_total / 100 : 0,
            sessionId: session.id,
            paymentIntentId: session.payment_intent,
          },
        },
      })

      return tx.depositPayment.findFirst({
        where: {
          buyerId: metadata['buyerId'],
          auctionId: metadata['auctionId'],
        },
        select: { workspaceId: true },
      })
    })

    // Fire-and-forget admin notification (outside transaction)
    if (depositRecord?.workspaceId) {
      const amt = session.amount_total ? `$${(session.amount_total / 100).toFixed(2)}` : ""
      await notifyAdmin({
        workspaceId: depositRecord.workspaceId,
        priority: "P1",
        category: "PAYMENT",
        type: "payment.deposit.succeeded",
        title: `Deposit payment succeeded ${amt}`,
        message: `Buyer deposit of ${amt} for auction ${metadata['auctionId']?.slice(0, 8) ?? "unknown"} completed.`,
        entityType: "Payment",
        entityId: session.payment_intent as string,
        ctaPath: `/admin/payments`,
        metadata: { amount: session.amount_total ? session.amount_total / 100 : 0, sessionId: session.id },
        dedupeKey: `deposit.succeeded.${session.payment_intent}`,
      })
    }

    // Sync deposit status to canonical buyer_package_billing via RPC (best-effort)
    if (metadata['buyerId']) {
      try {
        await markDepositPaid(
          metadata['buyerId'],
          session.payment_intent as string,
          session.amount_total ? session.amount_total / 100 : 99,
          { sessionId: session.id, auctionId: metadata['auctionId'] },
        )
      } catch (rpcErr) {
        logger.error("mark_buyer_deposit_paid RPC failed (non-blocking)", rpcErr instanceof Error ? rpcErr : undefined)
      }
    }
  } else if (type === "service_fee") {
    // Read payment record before transaction (Supabase join for nested select)
    const supabase = await createClient()
    const { data: payment } = await supabase
      .from("ServiceFeePayment")
      .select("id, finalAmount, deal:SelectedDeal(id, buyerId)")
      .eq("dealId", metadata['dealId'])
      .eq("status", "PENDING")
      .single()

    if (payment) {
      // Transaction: update service fee + update deal status + log compliance event
      await prisma.$transaction(async (tx: any) => {
        await tx.serviceFeePayment.update({
          where: { id: payment.id },
          data: {
            status: "SUCCEEDED",
            stripePaymentIntentId: session.payment_intent as string,
          },
        })

        await tx.selectedDeal.update({
          where: { id: metadata['dealId'] },
          data: { status: "FEE_PAID" },
        })

        await tx.complianceEvent.create({
          data: {
            eventType: "SERVICE_FEE_PAYMENT",
            buyerId: (payment.deal as any)?.buyerId,
            dealId: metadata['dealId'],
            action: "FEE_PAID_CARD",
            details: {
              amount: payment.finalAmount,
              sessionId: session.id,
              paymentIntentId: session.payment_intent,
            },
          },
        })
      })

      // Process affiliate commission (outside transaction — external service call)
      if ((payment.deal as any)?.buyerId) {
        const buyer = await prisma.buyerProfile.findUnique({
          where: { id: (payment.deal as any)?.buyerId },
          select: { userId: true, user: { select: { referredBy: true } } },
        })

        if ((buyer?.user as any)?.referredBy) {
          await affiliateService.processCommission((buyer?.user as any)?.referredBy, buyer!.userId, payment.finalAmount, "PURCHASE")
        }
      }

      // Fire-and-forget admin notification (outside transaction)
      const feeRecord = await prisma.serviceFeePayment.findUnique({
        where: { id: payment.id },
        select: { workspaceId: true },
      })

      if (feeRecord?.workspaceId) {
        await notifyAdmin({
          workspaceId: feeRecord.workspaceId,
          priority: "P1",
          category: "PAYMENT",
          type: "payment.service_fee.succeeded",
          title: `Service fee paid — $${payment.finalAmount}`,
          message: `Service fee payment for deal ${metadata['dealId']?.slice(0, 8) ?? "unknown"} succeeded.`,
          entityType: "Deal",
          entityId: metadata['dealId'],
          ctaPath: `/admin/deals/${metadata['dealId']}`,
          metadata: { amount: payment.finalAmount, sessionId: session.id },
          dedupeKey: `service_fee.succeeded.${session.payment_intent}`,
        })
      }

      // Sync premium fee payment to canonical buyer_package_billing via RPC
      // This records the concierge fee payment for PREMIUM buyers and updates
      // the remaining balance in buyer_package_billing.
      if ((payment.deal as any)?.buyerId) {
        try {
          await recordPremiumFeePayment(
            (payment.deal as any).buyerId,
            payment.finalAmount || 0,
            session.payment_intent as string,
            { sessionId: session.id, dealId: metadata['dealId'] },
          )
        } catch (rpcErr) {
          logger.error("record_premium_fee_payment RPC failed (non-blocking)", rpcErr instanceof Error ? rpcErr : undefined)
        }
      }
    }
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const metadata = paymentIntent.metadata || {}

  // Transaction: update payment status + mirror to Transaction ledger
  await prisma.$transaction(async (tx: any) => {
    if (metadata['type'] === "deposit") {
      await tx.depositPayment.updateMany({
        where: { stripePaymentIntentId: paymentIntent.id },
        data: { status: "SUCCEEDED" },
      })
    }

    if (metadata['type'] === "service_fee") {
      await tx.serviceFeePayment.updateMany({
        where: { stripePaymentIntentId: paymentIntent.id },
        data: { status: "SUCCEEDED" },
      })
    }

    // Mirror to Transaction ledger (dedup inside transaction)
    const existing = await tx.transaction.findFirst({
      where: { stripePaymentIntentId: paymentIntent.id },
      select: { id: true },
    })

    if (!existing) {
      const workspaceId = await resolveWorkspaceId(metadata, tx)
      const grossAmount = (paymentIntent.amount || 0) / 100
      await tx.transaction.create({
        data: {
          stripePaymentIntentId: paymentIntent.id,
          userId: metadata['buyerId'] || null,
          userType: "BUYER",
          dealId: metadata['dealId'] || null,
          type: "PAYMENT",
          grossAmount,
          stripeFee: 0,
          platformFee: 0,
          netAmount: grossAmount,
          currency: paymentIntent.currency || "usd",
          status: "SUCCEEDED",
          workspaceId,
        },
      })
    }
  })
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const metadata = paymentIntent.metadata || {}

  if (metadata['type'] === "deposit") {
    await prisma.depositPayment.updateMany({
      where: { stripePaymentIntentId: paymentIntent.id },
      data: { status: "FAILED" },
    })

    // Admin notification — P0 payment failure
    const dp = await prisma.depositPayment.findFirst({
      where: { stripePaymentIntentId: paymentIntent.id },
      select: { workspaceId: true },
    })

    if (dp?.workspaceId) {
      await notifyAdmin({
        workspaceId: dp.workspaceId,
        priority: "P0",
        category: "PAYMENT",
        type: "payment.deposit.failed",
        title: "Deposit payment failed",
        message: `Stripe payment_intent ${paymentIntent.id.slice(0, 12)}… failed. Error: ${paymentIntent.last_payment_error?.message || "unknown"}.`,
        entityType: "Payment",
        entityId: paymentIntent.id,
        ctaPath: `/admin/payments`,
        metadata: { errorCode: paymentIntent.last_payment_error?.code, piId: paymentIntent.id },
        dedupeKey: `deposit.failed.${paymentIntent.id}`,
      })
    }

    // Sync deposit failure to canonical buyer_package_billing via RPC (best-effort)
    if (metadata['buyerId']) {
      try {
        await markDepositFailed(
          metadata['buyerId'],
          paymentIntent.id,
          (paymentIntent.amount || 9900) / 100,
          { errorCode: paymentIntent.last_payment_error?.code },
        )
      } catch (rpcErr) {
        logger.error("mark_buyer_deposit_failed RPC failed (non-blocking)", rpcErr instanceof Error ? rpcErr : undefined)
      }
    }
  }

  if (metadata['type'] === "service_fee") {
    await prisma.serviceFeePayment.updateMany({
      where: { stripePaymentIntentId: paymentIntent.id },
      data: { status: "FAILED" },
    })

    // Admin notification — P0 service fee failure
    const sf = await prisma.serviceFeePayment.findFirst({
      where: { stripePaymentIntentId: paymentIntent.id },
      select: { workspaceId: true },
    })

    if (sf?.workspaceId) {
      await notifyAdmin({
        workspaceId: sf.workspaceId,
        priority: "P0",
        category: "PAYMENT",
        type: "payment.service_fee.failed",
        title: "Service fee payment failed",
        message: `Service fee payment_intent ${paymentIntent.id.slice(0, 12)}… failed.`,
        entityType: "Payment",
        entityId: paymentIntent.id,
        ctaPath: `/admin/payments`,
        metadata: { errorCode: paymentIntent.last_payment_error?.code, piId: paymentIntent.id },
        dedupeKey: `service_fee.failed.${paymentIntent.id}`,
      })
    }
  }
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  const paymentIntentId = charge.payment_intent as string

  // Look up deposit payment via Prisma
  const depositPayment = await prisma.depositPayment.findFirst({
    where: { stripePaymentIntentId: paymentIntentId },
    select: { id: true, amount: true, buyerId: true, workspaceId: true },
  })

  if (depositPayment) {
    // Transaction: mark deposit refunded + log compliance event + ledger entry
    await prisma.$transaction(async (tx: any) => {
      await tx.depositPayment.update({
        where: { id: depositPayment.id },
        data: { refunded: true },
      })

      await tx.complianceEvent.create({
        data: {
          eventType: "DEPOSIT_REFUND",
          buyerId: depositPayment.buyerId,
          action: "DEPOSIT_REFUNDED",
          details: {
            amount: depositPayment.amount,
            chargeId: charge.id,
          },
        },
      })

      // Mirror refund to Transaction ledger (inside transaction for atomicity)
      await tx.transaction.create({
        data: {
          stripePaymentIntentId: paymentIntentId,
          stripeChargeId: charge.id,
          userId: depositPayment.buyerId,
          userType: "BUYER",
          type: "REFUND",
          grossAmount: (charge.amount_refunded || 0) / 100,
          stripeFee: 0,
          platformFee: 0,
          netAmount: (charge.amount_refunded || 0) / 100,
          currency: charge.currency || "usd",
          status: "SUCCEEDED",
          workspaceId: depositPayment.workspaceId,
        },
      })
    })

    // Fire-and-forget admin notification (outside transaction)
    if (depositPayment.workspaceId) {
      await notifyAdmin({
        workspaceId: depositPayment.workspaceId,
        priority: "P1",
        category: "PAYMENT",
        type: "payment.refund.completed",
        title: `Deposit refunded — $${depositPayment.amount}`,
        message: `Deposit refund for buyer ${depositPayment.buyerId.slice(0, 8)}… completed via Stripe.`,
        entityType: "Payment",
        entityId: charge.id,
        ctaPath: `/admin/payments/refunds`,
        metadata: { amount: depositPayment.amount, chargeId: charge.id },
        dedupeKey: `refund.completed.${charge.id}`,
      })
    }

    // Sync deposit refund to canonical buyer_package_billing via RPC (best-effort)
    try {
      await markDepositRefunded(
        depositPayment.buyerId,
        paymentIntentId,
        depositPayment.amount || 99,
        { chargeId: charge.id },
      )
    } catch (rpcErr) {
      logger.error("mark_buyer_deposit_refunded RPC failed (non-blocking)", rpcErr instanceof Error ? rpcErr : undefined)
    }
  }

  // Handle service fee refund
  const serviceFeePayment = await prisma.serviceFeePayment.findFirst({
    where: { stripePaymentIntentId: paymentIntentId },
    select: { id: true, finalAmount: true, workspaceId: true, deal: { select: { id: true, buyerId: true } } },
  })

  if (serviceFeePayment) {
    // Transaction: mark service fee refunded + log compliance event + ledger entry
    await prisma.$transaction(async (tx: any) => {
      await tx.serviceFeePayment.update({
        where: { id: serviceFeePayment.id },
        data: { status: "REFUNDED" },
      })

      await tx.complianceEvent.create({
        data: {
          eventType: "SERVICE_FEE_REFUND",
          buyerId: serviceFeePayment.deal?.buyerId || null,
          action: "SERVICE_FEE_REFUNDED",
          details: {
            amount: serviceFeePayment.finalAmount,
            chargeId: charge.id,
          },
        },
      })

      // Mirror refund to Transaction ledger (inside transaction for atomicity)
      await tx.transaction.create({
        data: {
          stripePaymentIntentId: paymentIntentId,
          stripeChargeId: charge.id,
          userId: serviceFeePayment.deal?.buyerId || null,
          userType: "BUYER",
          type: "REFUND",
          grossAmount: (charge.amount_refunded || 0) / 100,
          stripeFee: 0,
          platformFee: 0,
          netAmount: (charge.amount_refunded || 0) / 100,
          currency: charge.currency || "usd",
          status: "SUCCEEDED",
          workspaceId: serviceFeePayment.workspaceId,
        },
      })
    })

    // Reverse affiliate commissions (outside transaction — external service call)
    const cancelledCount = await affiliateService.cancelCommissionsForPayment(serviceFeePayment.id, "Service fee refunded")

    logger.info("Service fee refund processed — commissions reversed", {
      serviceFeePaymentId: serviceFeePayment.id,
      cancelledCommissions: cancelledCount,
      chargeId: charge.id,
    })

    // Fire-and-forget admin notification (outside transaction)
    if (serviceFeePayment.workspaceId) {
      await notifyAdmin({
        workspaceId: serviceFeePayment.workspaceId,
        priority: "P1",
        category: "PAYMENT",
        type: "payment.service_fee.refunded",
        title: `Service fee refunded — $${serviceFeePayment.finalAmount}`,
        message: `Service fee refund completed. ${cancelledCount} affiliate commission(s) reversed.`,
        entityType: "Payment",
        entityId: charge.id,
        ctaPath: `/admin/payments/refunds`,
        metadata: { amount: serviceFeePayment.finalAmount, chargeId: charge.id, cancelledCommissions: cancelledCount },
        dedupeKey: `service_fee.refund.${charge.id}`,
      })
    }
  }
}

async function handleDisputeCreated(dispute: Stripe.Dispute) {
  const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id
  const piId = typeof dispute.payment_intent === "string" ? dispute.payment_intent : null
  const amount = (dispute.amount || 0) / 100

  // Transaction: create chargeback + mirror to Transaction ledger atomically
  await prisma.$transaction(async (tx: any) => {
    // Find parent transaction
    let transactionId: string | null = null
    if (piId) {
      const parentTx = await tx.transaction.findFirst({
        where: { stripePaymentIntentId: piId },
        select: { id: true },
      })
      transactionId = parentTx?.id || null
    }

    // Create chargeback record if we have a parent transaction
    if (transactionId) {
      await tx.chargeback.create({
        data: {
          transactionId,
          stripeDisputeId: dispute.id,
          amount,
          status: "OPEN",
        },
      })
    }

    // Mirror to Transaction ledger as CHARGEBACK
    await tx.transaction.create({
      data: {
        stripePaymentIntentId: piId,
        stripeChargeId: chargeId || null,
        type: "CHARGEBACK",
        grossAmount: amount,
        stripeFee: 0,
        platformFee: 0,
        netAmount: amount,
        currency: dispute.currency || "usd",
        status: "SUCCEEDED",
      },
    })
  })

  // Fire-and-forget admin notification (outside transaction)
  if (piId) {
    const parentTx = await prisma.transaction.findFirst({
      where: { stripePaymentIntentId: piId },
      select: { workspaceId: true },
    })

    if (parentTx?.workspaceId) {
      await notifyAdmin({
        workspaceId: parentTx.workspaceId,
        priority: "P0",
        category: "PAYMENT",
        type: "payment.chargeback.created",
        title: `Chargeback — $${amount.toFixed(2)}`,
        message: `A dispute (${dispute.id.slice(0, 12)}…) was opened for $${amount.toFixed(2)}.`,
        entityType: "Payment",
        entityId: dispute.id,
        ctaPath: `/admin/financial-reporting`,
        metadata: { amount, disputeId: dispute.id, chargeId },
        dedupeKey: `chargeback.created.${dispute.id}`,
      })
    }
  }
}

async function handlePayoutPaid(payout: Stripe.Payout) {
  const amount = (payout.amount || 0) / 100

  // Single write — no transaction needed
  await prisma.transaction.create({
    data: {
      type: "PAYOUT",
      grossAmount: amount,
      stripeFee: 0,
      platformFee: 0,
      netAmount: amount,
      currency: payout.currency || "usd",
      status: "SUCCEEDED",
    },
  })
}

/** Resolve workspaceId from payment metadata by looking up related records */
async function resolveWorkspaceId(metadata: Record<string, string>, client?: any): Promise<string | null> {
  const db = client || prisma
  if (metadata['buyerId']) {
    const record = await db.depositPayment.findFirst({
      where: { buyerId: metadata['buyerId'] },
      select: { workspaceId: true },
    })
    if (record?.workspaceId) return record.workspaceId
  }
  if (metadata['dealId']) {
    const record = await db.serviceFeePayment.findFirst({
      where: { dealId: metadata['dealId'] },
      select: { workspaceId: true },
    })
    if (record?.workspaceId) return record.workspaceId
  }
  return null
}
