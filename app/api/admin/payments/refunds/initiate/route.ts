import { NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { isTestWorkspace } from "@/lib/app-mode"
import { mockActions } from "@/lib/mocks/mockStore"
import { randomUUID } from "crypto"
import { prisma } from "@/lib/db"
import { stripe } from "@/lib/stripe"
import { workspaceInsert } from "@/lib/workspace-scope"

/**
 * POST /api/admin/payments/refunds/initiate
 *
 * Stripe-first refund execution (FIX 3):
 * 1. Validate the related payment and resolve the Stripe payment intent ID
 * 2. Issue the refund via Stripe FIRST (external side effect)
 * 3. Only after Stripe succeeds, write the Refund record to the DB
 * 4. Update the related payment status to REFUNDED
 */
export async function POST(request: Request) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { buyerId, relatedPaymentId, relatedPaymentType, amount, reason } = body

    if (!buyerId || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "buyerId and a positive amount are required" },
        { status: 400 },
      )
    }

    if (!reason) {
      return NextResponse.json(
        { error: "A reason is required for refunds" },
        { status: 400 },
      )
    }

    if (isTestWorkspace(user)) {
      const record = mockActions.initiateRefund({
        buyerId,
        relatedPaymentId,
        relatedPaymentType,
        amount,
        reason,
        createdBy: user.userId,
      })
      return NextResponse.json({ success: true, data: record })
    }

    // --- Stripe-first refund execution ---

    // 1. Resolve the Stripe payment intent ID from the related payment
    let stripePaymentIntentId: string | null = null
    let depositPaymentId: string | undefined
    let serviceFeePaymentId: string | undefined

    if (relatedPaymentId && relatedPaymentType) {
      if (relatedPaymentType === "deposit") {
        const dp = await prisma.depositPayment.findUnique({
          where: { id: relatedPaymentId },
          select: { id: true, stripePaymentIntentId: true },
        })
        if (dp) {
          stripePaymentIntentId = dp.stripePaymentIntentId ?? null
          depositPaymentId = dp.id
        }
      } else if (relatedPaymentType === "service_fee") {
        const sfp = await prisma.serviceFeePayment.findUnique({
          where: { id: relatedPaymentId },
          select: { id: true, stripePaymentIntentId: true },
        })
        if (sfp) {
          stripePaymentIntentId = sfp.stripePaymentIntentId ?? null
          serviceFeePaymentId = sfp.id
        }
      }
    }

    // 2. Issue refund via Stripe FIRST (if we have a payment intent)
    let stripeRefundId: string | undefined
    if (stripePaymentIntentId) {
      const amountCents = Math.round(amount * 100)
      const stripeRefund = await stripe.refunds.create({
        payment_intent: stripePaymentIntentId,
        amount: amountCents,
        reason: "requested_by_customer",
        metadata: {
          adminUserId: user.userId,
          refundReason: reason,
          buyerId,
        },
      })
      stripeRefundId = stripeRefund.id
    }

    // 3. Write Refund record to DB (only after Stripe succeeds)
    const refundRecord = await prisma.refund.create({
      data: {
        buyerId,
        amount,
        reason,
        status: "PROCESSING",
        createdBy: user.userId,
        stripeRefundId: stripeRefundId ?? null,
        relatedPaymentId: relatedPaymentId ?? null,
        relatedPaymentType: relatedPaymentType ?? null,
        depositPaymentId: depositPaymentId ?? null,
        serviceFeePaymentId: serviceFeePaymentId ?? null,
        ...workspaceInsert(user),
      },
    })

    // 4. Update related payment status to REFUNDED
    if (depositPaymentId) {
      await prisma.depositPayment.update({
        where: { id: depositPaymentId },
        data: { status: "REFUNDED", refunded: true, refundedAt: new Date() },
      })
    } else if (serviceFeePaymentId) {
      await prisma.serviceFeePayment.update({
        where: { id: serviceFeePaymentId },
        data: { status: "REFUNDED" },
      })
    }

    return NextResponse.json({ success: true, data: { id: refundRecord.id, status: refundRecord.status } })
  } catch (error) {
    console.error("[Admin Refund Initiate Error]", error)
    return NextResponse.json(
      { error: "Failed to initiate refund", correlationId: randomUUID() },
      { status: 500 },
    )
  }
}
