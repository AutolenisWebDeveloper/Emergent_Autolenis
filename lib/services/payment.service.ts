import { getSupabase } from "@/lib/db"
import { stripe } from "@/lib/stripe"
import { DEPOSIT_AMOUNT_CENTS, PREMIUM_FEE_CENTS } from "@/lib/constants"
import { PRICING, type PlanId, depositAppliesTo } from "@/src/config/pricingConfig"
import {
  PaymentStatus,
  LenderDisbursementStatus,
} from "@/lib/constants/statuses"
import { logger } from "@/lib/logger"
import { writeEventAsync } from "@/lib/services/event-ledger"
import { PlatformEventType, EntityType, ActorType } from "@/lib/services/event-ledger"

export class PaymentService {
  /**
   * V2: Premium plan has a flat $499 fee regardless of vehicle price.
   * FREE plan has no concierge fee.
   *
   * The totalOtdCents parameter is retained for backward compatibility
   * but is no longer used for fee calculation (V1 OTD-threshold pricing
   * has been removed).
   */
  static calculateBaseFee(_totalOtdCents: number, plan?: PlanId): number {
    // V2 flat plan-based pricing — no OTD-threshold tiers
    if (plan === "FREE") return 0
    // Default to PREMIUM fee ($499) when plan is PREMIUM or unspecified
    return PRICING.premiumFeeCents
  }

  /**
   * V2: Calculate the remaining premium fee after deposit credit.
   * Only applicable for PREMIUM plan.
   */
  static calculatePremiumFeeRemaining(depositPaid: boolean): number {
    if (!depositPaid) return PREMIUM_FEE_CENTS
    return PRICING.premiumFeeRemainingCents // $499 - $99 = $400
  }

  /**
   * V2: Determine how the deposit is applied based on plan.
   */
  static getDepositAppliesTo(plan: PlanId) {
    return depositAppliesTo(plan)
  }

  static async createDepositPayment(buyerId: string, auctionId: string) {
    const supabase = getSupabase()

    // Check if deposit already paid
    const { data: existing } = await supabase
      .from("DepositPayment")
      .select("*")
      .eq("buyerId", buyerId)
      .eq("auctionId", auctionId)
      .in("status", ["PAID", "SUCCEEDED"])
      .limit(1)
      .maybeSingle()

    if (existing) {
      return { payment: existing, alreadyPaid: true }
    }

    // Resolve workspaceId from auction
    const { data: auction } = await supabase
      .from("Auction")
      .select("workspaceId")
      .eq("id", auctionId)
      .single()

    if (!auction?.workspaceId) {
      throw new Error("Cannot create deposit payment: auction workspaceId is required")
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: DEPOSIT_AMOUNT_CENTS,
      currency: "usd",
      metadata: {
        buyerId,
        auctionId,
        type: "deposit",
      },
    })

    const now = new Date().toISOString()

    const { data: payment, error } = await supabase
      .from("DepositPayment")
      .insert({
        id: crypto.randomUUID(),
        buyerId,
        auctionId,
        workspaceId: auction.workspaceId,
        amountCents: DEPOSIT_AMOUNT_CENTS,
        amount_cents: DEPOSIT_AMOUNT_CENTS,
        status: PaymentStatus.PENDING,
        provider: "stripe",
        providerPaymentId: paymentIntent.id,
        provider_payment_id: paymentIntent.id,
        createdAt: now,
        updatedAt: now,
      })
      .select()
      .single()

    if (error) throw new Error(`Failed to create deposit payment: ${error.message}`)

    return { payment, clientSecret: paymentIntent.client_secret }
  }

  static async confirmDepositPayment(paymentIntentId: string) {
    const supabase = getSupabase()

    const { data: payment } = await supabase
      .from("DepositPayment")
      .select("*")
      .or(`providerPaymentId.eq.${paymentIntentId},provider_payment_id.eq.${paymentIntentId}`)
      .limit(1)
      .maybeSingle()

    if (!payment) {
      throw new Error("Payment not found")
    }

    await supabase
      .from("DepositPayment")
      .update({ status: "PAID", updatedAt: new Date().toISOString() })
      .eq("id", payment.id)

    const { error: auditError } = await supabase.from("ComplianceEvent").insert({
      eventType: "DEPOSIT_PAYMENT",
      action: "DEPOSIT_PAID",
      userId: payment.buyerId,
      buyerId: payment.buyerId,
      details: {
        amountCents: ((payment as Record<string, unknown>)["amountCents"] as number) || ((payment as Record<string, unknown>)["amount_cents"] as number) || payment.amount,
        paymentIntentId,
      },
    })
    if (auditError) {
      logger.error("[Payment] ComplianceEvent write failed for DEPOSIT_PAID", { error: auditError, paymentIntentId })
      throw new Error(`Audit log write failed: ${auditError.message}`)
    }

    return payment
  }

  static async getFeeOptions(dealId: string) {
    const supabase = getSupabase()

    const { data: deal } = await supabase
      .from("SelectedDeal")
      .select(`
        *,
        buyer:BuyerProfile(*)
      `)
      .eq("id", dealId)
      .single()

    if (!deal) {
      throw new Error("Deal not found")
    }

    const totalOtdCents =
      deal.totalOtdAmountCents || deal.total_otd_amount_cents || (deal.cashOtd ? Math.round(deal.cashOtd * 100) : 0)

    const baseFeeCents = PaymentService.calculateBaseFee(totalOtdCents)

    const { data: depositPayment } = await supabase
      .from("DepositPayment")
      .select("*")
      .eq("buyerId", deal.buyerId)
      .in("status", ["PAID", "SUCCEEDED"])
      .order("createdAt", { ascending: false })
      .limit(1)
      .maybeSingle()

    const depositAppliedCents = depositPayment ? DEPOSIT_AMOUNT_CENTS : 0
    const remainingCents = baseFeeCents - depositAppliedCents

    const { data: existingPayment } = await supabase
      .from("ServiceFeePayment")
      .select("*")
      .eq("dealId", dealId)
      .limit(1)
      .maybeSingle()

    return {
      dealId,
      totalOtdCents,
      baseFeeCents,
      depositAppliedCents,
      remainingCents,
      existingPayment,
      options: {
        payDirectly: true,
        includeInLoan: true,
      },
    }
  }

  static async createServiceFeePayment(dealId: string, userId: string) {
    const supabase = getSupabase()
    const feeOptions = await this.getFeeOptions(dealId)

    if (feeOptions.existingPayment?.status === "PAID" || feeOptions.existingPayment?.status === "SUCCEEDED") {
      return { payment: feeOptions.existingPayment, alreadyPaid: true }
    }

    // Resolve workspaceId from deal
    const { data: deal } = await supabase
      .from("SelectedDeal")
      .select("workspaceId")
      .eq("id", dealId)
      .single()

    if (!deal?.workspaceId) {
      throw new Error("Cannot create service fee payment: deal workspaceId is required")
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: feeOptions.remainingCents,
      currency: "usd",
      metadata: {
        dealId,
        userId,
        type: "service_fee",
        baseFeeCents: feeOptions.baseFeeCents.toString(),
        depositAppliedCents: feeOptions.depositAppliedCents.toString(),
      },
    })

    const now = new Date().toISOString()
    const paymentId = feeOptions.existingPayment?.id || crypto.randomUUID()

    const { data: payment, error } = feeOptions.existingPayment
      ? await supabase
          .from("ServiceFeePayment")
          .update({
            providerPaymentId: paymentIntent.id,
            provider_payment_id: paymentIntent.id,
            status: PaymentStatus.PENDING,
            updatedAt: now,
          })
          .eq("id", paymentId)
          .select()
          .single()
      : await supabase
          .from("ServiceFeePayment")
          .insert({
            id: paymentId,
            dealId,
            workspaceId: deal.workspaceId,
            baseFeeCents: feeOptions.baseFeeCents,
            base_fee_cents: feeOptions.baseFeeCents,
            depositAppliedCents: feeOptions.depositAppliedCents,
            deposit_applied_cents: feeOptions.depositAppliedCents,
            remainingCents: feeOptions.remainingCents,
            remaining_cents: feeOptions.remainingCents,
            method: "CARD_DIRECT",
            status: PaymentStatus.PENDING,
            provider: "stripe",
            providerPaymentId: paymentIntent.id,
            provider_payment_id: paymentIntent.id,
            user_id: userId,
            createdAt: now,
            updatedAt: now,
          })
          .select()
          .single()

    if (error) throw new Error(`Failed to create service fee payment: ${error.message}`)

    return { payment, clientSecret: paymentIntent.client_secret, feeOptions }
  }

  static async confirmServiceFeePayment(paymentIntentId: string) {
    const supabase = getSupabase()

    const { data: payment } = await supabase
      .from("ServiceFeePayment")
      .select("*")
      .or(`providerPaymentId.eq.${paymentIntentId},provider_payment_id.eq.${paymentIntentId}`)
      .limit(1)
      .maybeSingle()

    if (!payment) {
      throw new Error("Payment not found")
    }

    await supabase
      .from("ServiceFeePayment")
      .update({ status: "PAID", method: "CARD_DIRECT", updatedAt: new Date().toISOString() })
      .eq("id", payment.id)

    if (payment.dealId) {
      // FIX 6 — FeeFinancingDisclosure consent gate (LOAN_INCLUSION only):
      // For loan-inclusion fee method, a disclosure consent record must exist
      // with buyerConsented=true before the deal can advance to FEE_PAID.
      const feeMeth = ((payment as Record<string, unknown>)["method"] as string) || ((payment as Record<string, unknown>)["paymentMethod"] as string)
      if (feeMeth === "LOAN_INCLUSION") {
        const { prisma: prismaClient } = await import("@/lib/db")
        const feeDisclosure = await prismaClient.feeFinancingDisclosure.findFirst({
          where: { selected_deal_id: payment.dealId },
        }).catch(() => null)
        if (!feeDisclosure?.buyerConsented) {
          logger.error("[Payment] FEE_PAID blocked: FeeFinancingDisclosure consent required", {
            dealId: payment.dealId,
          })
          throw new Error("FeeFinancingDisclosure consent is required before FEE_PAID transition")
        }
      }

      const { data: deal } = await supabase
        .from("SelectedDeal")
        .update({
          status: "FEE_PAID",
          updatedAt: new Date().toISOString(),
        })
        .eq("id", payment.dealId)
        .select(`
          *,
          buyer:BuyerProfile(
            *,
            user:User(*)
          )
        `)
        .single()

      // Commission creation is handled by the canonical idempotent path
      // in affiliateService.createCommissionsForPayment (called from webhook handler)

      const { error: auditError } = await supabase.from("ComplianceEvent").insert({
        eventType: "SERVICE_FEE_PAYMENT",
        action: "FEE_PAID",
        userId: ((payment as Record<string, unknown>)["user_id"] as string) || deal?.buyerId,
        dealId: payment.dealId,
        details: {
          baseFeeCents: payment.baseFeeCents || payment.base_fee_cents,
          depositAppliedCents: ((payment as Record<string, unknown>)["depositAppliedCents"] as number) || ((payment as Record<string, unknown>)["deposit_applied_cents"] as number),
          remainingCents: ((payment as Record<string, unknown>)["remainingCents"] as number) || ((payment as Record<string, unknown>)["remaining_cents"] as number),
          method: "CARD_DIRECT",
          paymentIntentId,
        },
      })
      if (auditError) {
        logger.error("[Payment] ComplianceEvent write failed for FEE_PAID", { error: auditError, paymentIntentId })
        throw new Error(`Audit log write failed: ${auditError.message}`)
      }
    }

    return payment
  }

  static calculateLoanImpact(feeAmountCents: number, apr: number, termMonths: number, baseMonthlyPaymentCents: number) {
    const monthlyRate = apr / 12 / 100
    const feeAmount = feeAmountCents / 100

    const feeMonthly =
      (feeAmount * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / (Math.pow(1 + monthlyRate, termMonths) - 1)

    const baseMonthly = baseMonthlyPaymentCents / 100
    const newMonthly = baseMonthly + feeMonthly
    const totalExtraCost = feeMonthly * termMonths

    return {
      feeAmountCents,
      apr,
      termMonths,
      baseMonthlyPaymentCents,
      baseMonthlyCents: baseMonthlyPaymentCents,
      newMonthlyCents: Math.round(newMonthly * 100),
      deltaMonthlyCents: Math.round(feeMonthly * 100),
      totalExtraCostCents: Math.round(totalExtraCost * 100),
      feeAmount: feeAmount,
      baseMonthly: baseMonthly,
      newMonthly: newMonthly,
      monthlyIncrease: feeMonthly,
      totalExtraCost: totalExtraCost,
    }
  }

  static async getLoanImpact(dealId: string) {
    const supabase = getSupabase()

    const { data: deal } = await supabase.from("SelectedDeal").select("*").eq("id", dealId).single()

    if (!deal) {
      throw new Error("Deal not found")
    }

    const feeOptions = await this.getFeeOptions(dealId)

    const apr = deal.apr || 7.9
    const termMonths = deal.termMonths || 60
    const baseLoanCents =
      deal.baseLoanAmountCents || deal.base_loan_amount_cents || Math.round((deal.cashOtd || 0) * 100)

    const monthlyRate = apr / 12 / 100
    const baseMonthlyPaymentCents = Math.round(
      (((baseLoanCents / 100) * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
        (Math.pow(1 + monthlyRate, termMonths) - 1)) *
        100,
    )

    const impact = this.calculateLoanImpact(feeOptions.remainingCents, apr, termMonths, baseMonthlyPaymentCents)

    return { ...impact, dealId, feeOptions }
  }

  static async agreeLoanInclusion(dealId: string, userId: string, ipAddress: string, userAgent: string) {
    const supabase = getSupabase()
    const impact = await this.getLoanImpact(dealId)
    const now = new Date().toISOString()

    const { data: existingPayment } = await supabase
      .from("ServiceFeePayment")
      .select("*")
      .eq("dealId", dealId)
      .limit(1)
      .maybeSingle()

    const paymentId = existingPayment?.id || crypto.randomUUID()

    const { data: payment } = existingPayment
      ? await supabase
          .from("ServiceFeePayment")
          .update({
            method: "LENDER_DIRECT",
            status: PaymentStatus.PENDING,
            updatedAt: now,
          })
          .eq("id", paymentId)
          .select()
          .single()
      : await supabase
          .from("ServiceFeePayment")
          .insert({
            id: paymentId,
            dealId,
            baseFeeCents: impact.feeOptions.baseFeeCents,
            base_fee_cents: impact.feeOptions.baseFeeCents,
            depositAppliedCents: impact.feeOptions.depositAppliedCents,
            deposit_applied_cents: impact.feeOptions.depositAppliedCents,
            remainingCents: impact.feeOptions.remainingCents,
            remaining_cents: impact.feeOptions.remainingCents,
            method: "LENDER_DIRECT",
            status: PaymentStatus.PENDING,
            user_id: userId,
            createdAt: now,
            updatedAt: now,
          })
          .select()
          .single()

    const { data: disclosure } = await supabase
      .from("FeeFinancingDisclosure")
      .insert({
        id: crypto.randomUUID(),
        selected_deal_id: dealId,
        user_id: userId,
        fee_amount_cents: impact.feeAmountCents,
        base_loan_amount_cents: impact.feeOptions.totalOtdCents,
        base_monthly_cents: impact.baseMonthlyCents,
        new_monthly_cents: impact.newMonthlyCents,
        delta_monthly_cents: impact.deltaMonthlyCents,
        total_extra_cost_cents: impact.totalExtraCostCents,
        consent_at: new Date(),
        auth_ip: ipAddress,
        auth_user_agent: userAgent,
        snapshot_json: {
          apr: impact.apr,
          termMonths: impact.termMonths,
          baseFeeCents: impact.feeOptions.baseFeeCents,
          depositAppliedCents: impact.feeOptions.depositAppliedCents,
          remainingCents: impact.feeOptions.remainingCents,
        },
        created_at_v2: now,
      })
      .select()
      .single()

    await supabase
      .from("SelectedDeal")
      .update({
        status: "FEE_PENDING",
        updatedAt: now,
      })
      .eq("id", dealId)

    const { error: auditError } = await supabase.from("ComplianceEvent").insert({
      eventType: "FEE_FINANCING_DISCLOSURE",
      action: "FEE_LOAN_INCLUSION_AGREED",
      userId,
      dealId,
      ipAddress,
      details: {
        feeAmountCents: impact.feeAmountCents,
        deltaMonthlyCents: impact.deltaMonthlyCents,
        totalExtraCostCents: impact.totalExtraCostCents,
        disclosureId: disclosure.id,
      },
    })
    if (auditError) {
      logger.error("[Payment] ComplianceEvent write failed for FEE_LOAN_INCLUSION_AGREED", { error: auditError, dealId })
      throw new Error(`Audit log write failed: ${auditError.message}`)
    }

    return { payment, disclosure, impact }
  }

  static async processLenderDisbursement(dealId: string) {
    const supabase = getSupabase()

    const { data: payment } = await supabase
      .from("ServiceFeePayment")
      .select("*")
      .eq("dealId", dealId)
      .eq("method", "LENDER_DIRECT")
      .limit(1)
      .maybeSingle()

    if (!payment) {
      throw new Error("No lender-direct payment found for this deal")
    }

    const now = new Date().toISOString()

    const { data: disbursement } = await supabase
      .from("LenderFeeDisbursement")
      .insert({
        id: crypto.randomUUID(),
        dealId,
        amount_cents: ((payment as Record<string, unknown>)["remainingCents"] as number) || ((payment as Record<string, unknown>)["remaining_cents"] as number) || 0,
        status: LenderDisbursementStatus.PENDING,
        requested_at_v2: now,
      })
      .select()
      .single()

    await supabase
      .from("LenderFeeDisbursement")
      .update({
        status: LenderDisbursementStatus.DISBURSED,
        disbursed_timestamp: now,
      })
      .eq("id", disbursement.id)

    await supabase.from("ServiceFeePayment").update({ status: "PAID", updatedAt: now }).eq("id", payment.id)

    const { data: deal } = await supabase
      .from("SelectedDeal")
      .update({
        status: "FEE_PAID",
        updatedAt: now,
      })
      .eq("id", dealId)
      .select(`
        *,
        buyer:BuyerProfile(
          *,
          user:User(*)
        )
      `)
      .single()

    // Commission creation is handled by the canonical idempotent path
    // in affiliateService.createCommissionsForPayment (called from webhook handler)

    return disbursement
  }

  static async processRefund(paymentId: string, type: "deposit" | "service_fee", reason: string, adminId: string) {
    const supabase = getSupabase()
    const now = new Date().toISOString()

    if (type === "deposit") {
      const { data: payment } = await supabase.from("DepositPayment").select("*").eq("id", paymentId).single()

      if (!payment) throw new Error("Deposit payment not found")

      // Idempotency: reject if already refunded
      if (payment.status === PaymentStatus.REFUNDED) {
        return { success: true, refundId: payment.refundId, alreadyRefunded: true }
      }

      const providerPaymentId = payment.providerPaymentId || payment.provider_payment_id

      if (!providerPaymentId) {
        throw new Error("No payment provider ID found — cannot process refund")
      }

      const refund = await stripe.refunds.create({
        payment_intent: providerPaymentId,
        reason: "requested_by_customer",
      })

      await supabase
        .from("DepositPayment")
        .update({
          status: PaymentStatus.REFUNDED,
          refundId: refund.id,
          refundedAt: now,
          refunded_timestamp: now,
          reason,
          updatedAt: now,
        })
        .eq("id", paymentId)

      const { error: auditError } = await supabase.from("ComplianceEvent").insert({
        eventType: "DEPOSIT_REFUND",
        action: "DEPOSIT_REFUNDED",
        userId: adminId,
        details: {
          paymentId,
          amountCents: ((payment as Record<string, unknown>)["amountCents"] as number) || ((payment as Record<string, unknown>)["amount_cents"] as number) || payment.amount,
          reason,
          refundId: refund.id,
        },
      })
      if (auditError) {
        logger.error("[Payment] ComplianceEvent write failed for DEPOSIT_REFUNDED", { error: auditError, paymentId })
        throw new Error(`Audit log write failed: ${auditError.message}`)
      }

      // Emit canonical platform event (non-blocking)
      writeEventAsync({
        eventType: PlatformEventType.REFUND_APPROVED,
        entityType: EntityType.REFUND,
        entityId: refund.id,
        parentEntityId: paymentId,
        actorId: adminId,
        actorType: ActorType.ADMIN,
        sourceModule: "payment.service",
        correlationId: crypto.randomUUID(),
        idempotencyKey: `refund-deposit-${paymentId}`,
        payload: { type: "deposit", reason, amountCents: ((payment as Record<string, unknown>)["amountCents"] as number) || ((payment as Record<string, unknown>)["amount_cents"] as number) || payment.amount },
      }).catch(() => { /* non-critical */ })

      return { success: true, refundId: refund.id }
    } else {
      const { data: payment } = await supabase.from("ServiceFeePayment").select("*").eq("id", paymentId).single()

      if (!payment) throw new Error("Service fee payment not found")

      // Idempotency: reject if already refunded
      if (payment.status === PaymentStatus.REFUNDED) {
        return { success: true, refundId: payment.refundId, alreadyRefunded: true }
      }

      const providerPaymentId = payment.providerPaymentId || payment.provider_payment_id

      if (providerPaymentId && payment.method === "CARD_DIRECT") {
        const refund = await stripe.refunds.create({
          payment_intent: providerPaymentId,
          reason: "requested_by_customer",
        })

        await supabase
          .from("ServiceFeePayment")
          .update({
            status: PaymentStatus.REFUNDED,
            refundId: refund.id,
            refundedAt: now,
            refunded_timestamp: now,
            updatedAt: now,
          })
          .eq("id", paymentId)

        await supabase
          .from("Commission")
          .update({ status: "REVERSED", updatedAt: now })
          .or(`serviceFeePaymentId.eq.${paymentId},service_fee_payment_id.eq.${paymentId}`)

        const { error: auditError } = await supabase.from("ComplianceEvent").insert({
          eventType: "SERVICE_FEE_REFUND",
          action: "FEE_REFUNDED",
          userId: adminId,
          details: {
            paymentId,
            amountCents: ((payment as Record<string, unknown>)["remainingCents"] as number) || ((payment as Record<string, unknown>)["remaining_cents"] as number),
            reason,
            refundId: refund.id,
          },
        })
        if (auditError) {
          logger.error("[Payment] ComplianceEvent write failed for FEE_REFUNDED", { error: auditError, paymentId })
          throw new Error(`Audit log write failed: ${auditError.message}`)
        }

        // Emit canonical platform event (non-blocking)
        writeEventAsync({
          eventType: PlatformEventType.REFUND_APPROVED,
          entityType: EntityType.REFUND,
          entityId: refund.id,
          parentEntityId: paymentId,
          actorId: adminId,
          actorType: ActorType.ADMIN,
          sourceModule: "payment.service",
          correlationId: crypto.randomUUID(),
          idempotencyKey: `refund-fee-${paymentId}`,
          payload: { type: "service_fee", reason, amountCents: ((payment as Record<string, unknown>)["remainingCents"] as number) || ((payment as Record<string, unknown>)["remaining_cents"] as number) },
        }).catch(() => { /* non-critical */ })

        return { success: true, refundId: refund.id }
      }

      throw new Error("Payment method does not support refund or no provider payment ID")
    }
  }

  static async getAllPayments(filters?: { type?: string; status?: string }) {
    const supabase = getSupabase()

    const depositsQuery = supabase
      .from("DepositPayment")
      .select(`
        *,
        buyer:BuyerProfile(
          *,
          user:User(*)
        )
      `)
      .order("createdAt", { ascending: false })
      .limit(100)

    if (filters?.status) {
      depositsQuery.eq("status", filters.status)
    }

    const { data: deposits } = await depositsQuery

    const serviceFeesQuery = supabase
      .from("ServiceFeePayment")
      .select(`
        *,
        deal:SelectedDeal(
          *,
          buyer:BuyerProfile(*)
        )
      `)
      .order("createdAt", { ascending: false })
      .limit(100)

    if (filters?.status) {
      serviceFeesQuery.eq("status", filters.status)
    }

    const { data: serviceFees } = await serviceFeesQuery

    return { deposits: deposits || [], serviceFees: serviceFees || [] }
  }

  static async getBuyerPaymentHistory(buyerId: string) {
    const supabase = getSupabase()

    const { data: deposits } = await supabase
      .from("DepositPayment")
      .select("*")
      .eq("buyerId", buyerId)
      .order("createdAt", { ascending: false })

    const { data: serviceFees } = await supabase
      .from("ServiceFeePayment")
      .select(`
        *,
        deal:SelectedDeal(*)
      `)
      .eq("deal.buyerId", buyerId)
      .order("createdAt", { ascending: false })

    return { deposits: deposits || [], serviceFees: serviceFees || [] }
  }

  async checkIfDepositPaid(buyerId: string, auctionId: string) {
    const supabase = getSupabase()
    const { data: existing } = await supabase
      .from("DepositPayment")
      .select("id, status, amount")
      .eq("buyerId", buyerId)
      .eq("auctionId", auctionId)
      .in("status", ["PAID", "SUCCEEDED"])
      .limit(1)
      .maybeSingle()

    return existing !== null
  }

  async processDepositPaymentIntent(paymentIntentId: string) {
    const supabase = getSupabase()
    const { data: payment } = await supabase
      .from("DepositPayment")
      .select("id, buyerId, auctionId, status, amount, providerPaymentId, provider_payment_id")
      .or(`providerPaymentId.eq.${paymentIntentId},provider_payment_id.eq.${paymentIntentId}`)
      .limit(1)
      .maybeSingle()

    if (!payment) {
      throw new Error("Payment not found")
    }

    await supabase
      .from("DepositPayment")
      .update({ status: "PAID", updatedAt: new Date().toISOString() })
      .eq("id", payment.id)

    const { error: auditError } = await supabase.from("ComplianceEvent").insert({
      eventType: "DEPOSIT_PAYMENT",
      action: "DEPOSIT_PAID",
      userId: payment.buyerId,
      buyerId: payment.buyerId,
      details: {
        amountCents: ((payment as Record<string, unknown>)["amountCents"] as number) || ((payment as Record<string, unknown>)["amount_cents"] as number) || payment.amount,
        paymentIntentId,
      },
    })
    if (auditError) {
      logger.error("[Payment] ComplianceEvent write failed for DEPOSIT_PAID", { error: auditError, paymentIntentId })
      throw new Error(`Audit log write failed: ${auditError.message}`)
    }

    return payment
  }

  async getOrCreateServiceFeePayment(dealId: string) {
    const supabase = getSupabase()
    const { data: deal } = await supabase
      .from("SelectedDeal")
      .select(`
        *,
        buyer:BuyerProfile(*)
      `)
      .eq("id", dealId)
      .single()

    if (!deal) {
      throw new Error("Deal not found")
    }

    const totalOtdCents =
      deal.totalOtdAmountCents || deal.total_otd_amount_cents || (deal.cashOtd ? Math.round(deal.cashOtd * 100) : 0)

    const baseFeeCents = PaymentService.calculateBaseFee(totalOtdCents)

    const { data: depositPayment } = await supabase
      .from("DepositPayment")
      .select("id, amount, status, createdAt")
      .eq("buyerId", deal.buyerId)
      .in("status", ["PAID", "SUCCEEDED"])
      .order("createdAt", { ascending: false })
      .limit(1)
      .maybeSingle()

    const depositAppliedCents = depositPayment ? DEPOSIT_AMOUNT_CENTS : 0
    const remainingCents = baseFeeCents - depositAppliedCents

    const { data: existingPayment } = await supabase
      .from("ServiceFeePayment")
      .select("id, dealId, status, baseFeeCents, base_fee_cents")
      .eq("dealId", dealId)
      .limit(1)
      .maybeSingle()

    if (existingPayment?.status === "PAID" || existingPayment?.status === "SUCCEEDED") {
      return { payment: existingPayment, alreadyPaid: true }
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: remainingCents,
      currency: "usd",
      metadata: {
        dealId,
        type: "service_fee",
        baseFeeCents: baseFeeCents.toString(),
        depositAppliedCents: depositAppliedCents.toString(),
      },
    })

    const now = new Date().toISOString()
    const paymentId = existingPayment?.id || crypto.randomUUID()

    const { data: payment, error } = existingPayment
      ? await supabase
          .from("ServiceFeePayment")
          .update({
            providerPaymentId: paymentIntent.id,
            provider_payment_id: paymentIntent.id,
            status: PaymentStatus.PENDING,
            updatedAt: now,
          })
          .eq("id", paymentId)
          .select()
          .single()
      : await supabase
          .from("ServiceFeePayment")
          .insert({
            id: paymentId,
            dealId,
            baseFeeCents,
            base_fee_cents: baseFeeCents,
            depositAppliedCents,
            deposit_applied_cents: depositAppliedCents,
            remainingCents,
            remaining_cents: remainingCents,
            method: "CARD_DIRECT",
            status: PaymentStatus.PENDING,
            provider: "stripe",
            providerPaymentId: paymentIntent.id,
            provider_payment_id: paymentIntent.id,
            createdAt: now,
            updatedAt: now,
          })
          .select()
          .single()

    if (error) throw new Error(`Failed to create service fee payment: ${error.message}`)

    return { payment, clientSecret: paymentIntent.client_secret }
  }

  async processServiceFeePaymentIntent(paymentIntentId: string) {
    const supabase = getSupabase()
    const { data: payment } = await supabase
      .from("ServiceFeePayment")
      .select(`
        id, 
        dealId, 
        buyerId, 
        status, 
        baseFeeCents, 
        base_fee_cents,
        providerPaymentId,
        provider_payment_id
      `)
      .or(`providerPaymentId.eq.${paymentIntentId},provider_payment_id.eq.${paymentIntentId}`)
      .limit(1)
      .maybeSingle()

    if (!payment) {
      throw new Error("Payment not found")
    }

    await supabase
      .from("ServiceFeePayment")
      .update({ status: "PAID", method: "CARD_DIRECT", updatedAt: new Date().toISOString() })
      .eq("id", payment.id)

    if (payment.dealId) {
      const { data: deal } = await supabase
        .from("SelectedDeal")
        .update({
          status: "FEE_PAID",
          updatedAt: new Date().toISOString(),
        })
        .eq("id", payment.dealId)
        .select(`
          *,
          buyer:BuyerProfile(
            *,
            user:User(*)
          )
        `)
        .single()

      // Commission creation is handled by the canonical idempotent path
      // in affiliateService.createCommissionsForPayment (called from webhook handler)

      const { error: auditError } = await supabase.from("ComplianceEvent").insert({
        eventType: "SERVICE_FEE_PAYMENT",
        action: "FEE_PAID",
        userId: ((payment as Record<string, unknown>)["user_id"] as string) || deal?.buyerId,
        dealId: payment.dealId,
        details: {
          baseFeeCents: payment.baseFeeCents || payment.base_fee_cents,
          depositAppliedCents: ((payment as Record<string, unknown>)["depositAppliedCents"] as number) || ((payment as Record<string, unknown>)["deposit_applied_cents"] as number),
          remainingCents: ((payment as Record<string, unknown>)["remainingCents"] as number) || ((payment as Record<string, unknown>)["remaining_cents"] as number),
          method: "CARD_DIRECT",
          paymentIntentId,
        },
      })
      if (auditError) {
        logger.error("[Payment] ComplianceEvent write failed for FEE_PAID", { error: auditError, paymentIntentId })
        throw new Error(`Audit log write failed: ${auditError.message}`)
      }
    }

    return payment
  }

  async getPaymentHistoryForBuyer(buyerId: string) {
    const supabase = getSupabase()

    const { data: deposits } = await supabase
      .from("DepositPayment")
      .select("id, amount, status, method, createdAt, auctionId")
      .eq("buyerId", buyerId)
      .order("createdAt", { ascending: false })

    const { data: serviceFees } = await supabase
      .from("ServiceFeePayment")
      .select(`
        id,
        baseFeeCents,
        base_fee_cents,
        status,
        method,
        createdAt,
        dealId
      `)
      .eq("deal.buyerId", buyerId)
      .order("createdAt", { ascending: false })

    return { deposits: deposits || [], serviceFees: serviceFees || [] }
  }
}

export const paymentService = new PaymentService()
export default paymentService
