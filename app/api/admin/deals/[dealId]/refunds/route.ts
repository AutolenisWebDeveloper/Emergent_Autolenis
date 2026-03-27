import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { isTestWorkspace } from "@/lib/app-mode"
import { mockSelectors } from "@/lib/mocks/mockStore"
import { prisma } from "@/lib/db"
import { stripe } from "@/lib/stripe"
import type Stripe from "stripe"

export async function GET(_request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  try {
    const user = await requireAuth(["ADMIN", "SUPER_ADMIN"])
    const { dealId } = await params

    if (isTestWorkspace(user)) {
      return NextResponse.json({ success: true, data: mockSelectors.adminDealRefunds(dealId) })
    }

    // Fail-closed: require workspace_id for non-test workspaces
    const wsId = user.workspace_id
    if (!wsId) {
      return NextResponse.json({ success: false, error: "Forbidden: no workspace" }, { status: 403 })
    }

    return NextResponse.json({ success: true, data: { dealId, refunds: [] } })
  } catch (error: unknown) {
    console.error("[Admin Deal Refunds API]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  try {
    const user = await requireAuth(["ADMIN", "SUPER_ADMIN"])
    const { dealId } = await params
    const adminId = user.id

    const wsId = user.workspace_id
    if (!wsId) {
      return NextResponse.json({ success: false, error: "Forbidden: no workspace" }, { status: 403 })
    }

    const body = await request.json()
    const { paymentId, paymentType, amountCents } = body

    if (!paymentId || !paymentType || !amountCents) {
      return NextResponse.json(
        { error: "paymentId, paymentType, and amountCents are required" },
        { status: 400 },
      )
    }

    if (paymentType !== "DEPOSIT" && paymentType !== "SERVICE_FEE") {
      return NextResponse.json(
        { error: "paymentType must be DEPOSIT or SERVICE_FEE" },
        { status: 400 },
      )
    }

    if (typeof amountCents !== "number" || amountCents <= 0) {
      return NextResponse.json(
        { error: "amountCents must be a positive number" },
        { status: 400 },
      )
    }

    // 1. Resolve the original Stripe payment intent from the payment record
    const payment = paymentType === "DEPOSIT"
      ? await prisma.depositPayment.findUnique({ where: { id: paymentId } })
      : await prisma.serviceFeePayment.findUnique({ where: { id: paymentId } })

    if (!payment) {
      return NextResponse.json(
        { error: "Payment record not found" },
        { status: 404 },
      )
    }

    if (!payment.stripePaymentIntentId) {
      return NextResponse.json(
        { error: "No Stripe payment intent found on this payment record" },
        { status: 400 },
      )
    }

    // 2. Execute Stripe refund FIRST
    let stripeRefund: Stripe.Refund
    try {
      stripeRefund = await stripe.refunds.create({
        payment_intent: payment.stripePaymentIntentId,
        amount: amountCents,
        reason: "requested_by_customer",
        metadata: {
          dealId,
          adminId,
          platform: "autolenis",
        },
      })
    } catch (stripeErr) {
      console.error("[Admin Refund] Stripe refund failed:", (stripeErr as Error).message)
      return NextResponse.json(
        { error: "Stripe refund failed. Please verify the payment and try again." },
        { status: 502 },
      )
    }

    // 3. Only persist DB record after Stripe confirms
    const buyerId = (payment as Record<string, unknown>)["buyerId"] as string | undefined
    if (!buyerId) {
      return NextResponse.json(
        { error: "Payment record is missing buyerId" },
        { status: 400 },
      )
    }

    const refund = await prisma.refund.create({
      data: {
        stripeRefundId: stripeRefund.id,
        amountCents,
        amount: amountCents / 100,
        status: "SUCCEEDED",
        createdBy: adminId,
        buyerId,
        workspaceId: wsId,
        ...(paymentType === "DEPOSIT"
          ? { depositPaymentId: paymentId }
          : { serviceFeePaymentId: paymentId }),
      },
    })

    // 4. Log to FinancialAuditLog
    await prisma.financialAuditLog.create({
      data: {
        adminId,
        action: "REFUND_ISSUED",
        entityType: "Refund",
        entityId: refund.id,
        metadata: { stripeRefundId: stripeRefund.id, dealId, amountCents },
        workspaceId: wsId,
      },
    })

    return NextResponse.json({ success: true, data: refund })
  } catch (error: unknown) {
    console.error("[Admin Deal Refunds POST]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
