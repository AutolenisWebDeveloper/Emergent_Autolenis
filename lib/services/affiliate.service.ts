import { prisma } from "@/lib/db"
import { supabase } from "@/lib/db"
import { nanoid } from "nanoid"
import { EmailService, emailService } from "./email.service"
import { getReferralCode, buildReferralLink } from "@/lib/utils/referral-code"
import { logger } from "@/lib/logger"
import { CommissionStatus, PayoutStatus, PaymentStatus } from "@/lib/constants/statuses"
import { writeEventAsync } from "@/lib/services/event-ledger"
import { PlatformEventType, EntityType, ActorType } from "@/lib/services/event-ledger"

/**
 * Payment statuses that represent a successful/completed payment.
 * Includes canonical SUCCEEDED and legacy "PAID" for backward compatibility
 * with records created before the PaymentStatus enum was standardized.
 */
const SUCCEEDED_PAYMENT_STATUSES: readonly string[] = [PaymentStatus.SUCCEEDED, "PAID"]

export class AffiliateService {
  // Updated commission rates per specification (% of concierge fee)
  private readonly COMMISSION_RATES = {
    1: 0.15, // 15% Level 1
    2: 0.03, // 3% Level 2
    3: 0.02, // 2% Level 3
  }

  // Cookie attribution window in days
  private readonly COOKIE_WINDOW_DAYS = 30

  // Generate a short, unique referral code
  generateReferralCode(): string {
    return `AL${nanoid(6).toUpperCase()}`
  }

  // Generate SEO-friendly landing slug
  generateLandingSlug(firstName: string, lastName: string): string {
    const base = `${firstName}-${lastName}`
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
    const unique = nanoid(4).toLowerCase()
    return `${base}-${unique}`
  }

  // Create or get affiliate for a user
  async createAffiliate(userId: string, firstName?: string, lastName?: string) {
    // Check if affiliate already exists
    const existing = await prisma.affiliate.findFirst({
      where: { userId },
    })

    if (existing) {
      return existing
    }

    const refCode = this.generateReferralCode()
    const landingSlug = this.generateLandingSlug(firstName || "user", lastName || userId.substring(0, 4))

    const affiliate = await prisma.affiliate.create({
      data: {
        userId,
        firstName: firstName || "",
        lastName: lastName || "",
        refCode,
        referralCode: refCode, // Keep for backwards compatibility
        ref_code: refCode, // Keep for backwards compatibility
        landing_slug: landingSlug,
        landingSlug: landingSlug,
        totalEarnings: 0,
        pendingEarnings: 0,
        status: "ACTIVE",
        available_balance_cents: 0,
        lifetime_earnings_cents: 0,
        lifetime_paid_cents: 0,
      },
    })

    // Log event
    await this.logEvent(affiliate.id, "AFFILIATE_CREATED", { userId, refCode })

    return affiliate
  }

  // Auto-enroll buyer as affiliate
  async autoEnrollBuyerAsAffiliate(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new Error("User not found")
    }

    const affiliate = await this.createAffiliate(userId, user.first_name || "", user.last_name || "")

    await prisma.user.update({
      where: { id: userId },
      data: { is_affiliate: true },
    })

    return affiliate
  }

  // Get affiliate by ref code or landing slug
  async getAffiliateByCode(code: string) {
    return prisma.affiliate.findFirst({
      where: {
        OR: [
          { refCode: code },
          { referralCode: code },
          { ref_code: code },
          { landing_slug: code },
          { landingSlug: code },
        ],
        status: "ACTIVE",
      },
      include: {
        user: true,
      },
    })
  }

  async getAffiliateById(id: string) {
    return prisma.affiliate.findUnique({
      where: { id },
      include: { user: true },
    })
  }

  // Track click with cookie support
  async trackClick(
    affiliateId: string,
    metadata: {
      userAgent?: string | null
      referer?: string | null
      ip?: string
      cookieId?: string
    },
  ) {
    const affiliate = await prisma.affiliate.findUnique({
      where: { id: affiliateId },
    })

    if (!affiliate || affiliate.status !== "ACTIVE") {
      return null
    }

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + this.COOKIE_WINDOW_DAYS)

    const code = getReferralCode(affiliate)

    const click = await prisma.click.create({
      data: {
        affiliateId,
        userAgent: metadata?.userAgent || "",
        referer: metadata?.referer || "",
        ipAddress: metadata?.ip || "",
        ip: metadata?.ip || "",
        refCode: code,
        ref_code: code, // Keep for backwards compatibility
        cookie_id: metadata?.cookieId || nanoid(16),
        expires_at: expiresAt,
        clickedAt: new Date(),
      },
    })

    await this.logEvent(affiliateId, "CLICK_TRACKED", {
      clickId: click.id,
      ip: metadata?.ip,
    })

    return {
      click,
      cookieId: click.cookie_id,
      affiliateName: `${affiliate.firstName} ${affiliate.lastName}`.trim() || "A friend",
      expiresAt,
    }
  }

  // Build 3-level referral chain (idempotent)
  async buildReferralChain(
    referredUserId: string,
    level1AffiliateId: string,
    options?: { cookieId?: string; attributionSource?: string },
  ) {
    // Prevent self-referral
    const affiliate = await prisma.affiliate.findUnique({
      where: { id: level1AffiliateId },
    })

    if (affiliate?.userId === referredUserId) {
      await this.logEvent(level1AffiliateId, "SELF_REFERRAL_BLOCKED", { referredUserId })
      return []
    }

    // Check if referral chain already exists for this user
    const existingReferrals = await prisma.referral.findMany({
      where: { referredUserId },
    })

    if (existingReferrals.length > 0) {
      // Referral chain already exists - idempotent return
      return existingReferrals
    }

    const referrals = []

    // Create Level 1 referral
    const level1Referral = await prisma.referral.create({
      data: {
        affiliateId: level1AffiliateId,
        referredUserId,
        level: 1,
        dealCompleted: false,
        commissionPaid: false,
        attribution_source: options?.attributionSource || "LINK",
        cookie_id: options?.cookieId,
        is_self_referral: false,
      },
    })
    referrals.push(level1Referral)

    // Build Levels 2-5 by walking up the referrer's chain
    let currentAffiliateUserId = affiliate?.userId
    let currentLevel = 2

    while (currentLevel <= 5 && currentAffiliateUserId) {
      // Find who referred the current affiliate
      const uplineReferral = await prisma.referral.findFirst({
        where: {
          referredUserId: currentAffiliateUserId,
          level: 1, // Only look at direct referrals
        },
        include: { affiliate: true },
      })

      if (!uplineReferral || !uplineReferral.affiliate) break

      // Prevent loops
      if (uplineReferral.affiliate.userId === referredUserId) break

      // Create referral for this level
      const levelReferral = await prisma.referral.create({
        data: {
          affiliateId: uplineReferral.affiliateId,
          referredUserId,
          parentReferralId: level1Referral.id,
          parent_referral_id: level1Referral.id,
          level: currentLevel,
          dealCompleted: false,
          commissionPaid: false,
          attribution_source: "CHAIN",
          is_self_referral: false,
        },
      })
      referrals.push(levelReferral)

      currentAffiliateUserId = uplineReferral.affiliate.userId
      currentLevel++
    }

    await this.logEvent(level1AffiliateId, "REFERRAL_CHAIN_CREATED", {
      referredUserId,
      levels: referrals.length,
    })

    return referrals
  }

  // Process referral from cookie or URL param at signup
  async processSignupReferral(userId: string, refCode?: string, cookieId?: string) {
    let affiliate = null

    // Try ref code first
    if (refCode) {
      affiliate = await this.getAffiliateByCode(refCode)
    }

    // Fall back to cookie
    if (!affiliate && cookieId) {
      const click = await prisma.click.findFirst({
        where: {
          cookie_id: cookieId,
          expires_at: { gte: new Date() },
          attributed_user_id: null, // Not yet attributed
        },
        orderBy: { clickedAt: "desc" },
        include: { affiliate: true },
      })

      if (click?.affiliate) {
        affiliate = click.affiliate

        // Mark click as attributed
        await prisma.click.update({
          where: { id: click.id },
          data: {
            attributed_user_id: userId,
            attributed_at: new Date(),
          },
        })
      }
    }

    if (!affiliate) return null

    // Don't allow self-referral
    if (affiliate.userId === userId) {
      await this.logEvent(affiliate.id, "SELF_REFERRAL_BLOCKED", { userId })
      return null
    }

    // Build the referral chain
    return this.buildReferralChain(userId, affiliate.id, {
      cookieId,
      attributionSource: refCode ? "LINK" : "COOKIE",
    })
  }

  // Create commissions when service fee is paid (IDEMPOTENT)
  async createCommissionsForPayment(serviceFeePaymentId: string) {
    // Get the payment
    const payment = await prisma.serviceFeePayment.findUnique({
      where: { id: serviceFeePaymentId },
    })

    // Accept both canonical SUCCEEDED and legacy "PAID" status for backward compatibility
    // with records created before the PaymentStatus enum was standardized.
    if (!payment || !SUCCEEDED_PAYMENT_STATUSES.includes(payment.status)) {
      return { created: false, reason: "Payment not found or not paid" }
    }

    const userId = payment.user_id
    if (!userId) {
      return { created: false, reason: "No user associated with payment" }
    }

    // Check if commissions already exist (idempotency)
    const existingCommissions = await prisma.commission.findMany({
      where: { service_fee_payment_id: serviceFeePaymentId },
    })

    if (existingCommissions.length > 0) {
      return { created: false, reason: "Commissions already exist", commissions: existingCommissions }
    }

    // Find all referrals for this user (Levels 1-5)
    const referrals = await prisma.referral.findMany({
      where: {
        referredUserId: userId,
        level: { in: [1, 2, 3] },
      },
      include: { affiliate: { include: { user: true } } },
      orderBy: { level: "asc" },
    })

    if (referrals.length === 0) {
      return { created: false, reason: "No referrals found for user" }
    }

    const baseFee = payment.base_fee_cents || payment.baseFeeCents || 49500
    const commissions: any[] = []

    // Use transaction for atomicity
    await prisma.$transaction(async (tx: any) => {
      for (const referral of referrals) {
        const rate = this.COMMISSION_RATES[referral.level as 1 | 2 | 3] || 0
        const amountCents = Math.floor(baseFee * rate)

        if (amountCents <= 0) continue

        const commission = await tx.commission.create({
          data: {
            affiliateId: referral.affiliateId,
            referralId: referral.id,
            service_fee_payment_id: serviceFeePaymentId,
            serviceFeePaymentId: serviceFeePaymentId,
            level: referral.level,
            amount_cents: amountCents,
            amountCents: amountCents,
            commissionAmount: amountCents / 100,
            commissionRate: rate,
            baseAmount: baseFee / 100,
            status: CommissionStatus.PENDING,
          },
        })

        commissions.push(commission)

        // Update affiliate pending earnings
        await tx.affiliate.update({
          where: { id: referral.affiliateId },
          data: {
            pendingEarnings: { increment: amountCents / 100 },
            available_balance_cents: { increment: amountCents },
          },
        })

        // Update referral to mark deal completed
        await tx.referral.update({
          where: { id: referral.id },
          data: { dealCompleted: true },
        })
      }
    })

    // Log event
    for (const commission of commissions) {
      await this.logEvent(commission.affiliateId, "COMMISSION_CREATED", {
        commissionId: commission.id,
        serviceFeePaymentId,
        amount_cents: commission.amount_cents,
        level: commission.level,
      })

      // Emit canonical platform event (non-blocking)
      writeEventAsync({
        eventType: PlatformEventType.AFFILIATE_COMMISSION_CREATED,
        entityType: EntityType.COMMISSION,
        entityId: commission.id,
        parentEntityId: commission.affiliateId,
        actorId: "SYSTEM",
        actorType: ActorType.SYSTEM,
        sourceModule: "affiliate.service",
        correlationId: crypto.randomUUID(),
        idempotencyKey: `commission-created-${commission.id}`,
        payload: { serviceFeePaymentId, amountCents: commission.amount_cents, level: commission.level },
      }).catch(() => { /* non-critical */ })
    }

    // Send notification to Level 1 affiliate
    const level1Referral = referrals.find((r: any) => r.level === 1)
    if (level1Referral?.affiliate?.user) {
      await this.sendCommissionNotification(
        level1Referral.affiliate,
        level1Referral.affiliate.user,
        commissions.find((c) => c.level === 1)!,
        serviceFeePaymentId,
      )
    }

    return { created: true, commissions }
  }

  // Send commission notification email (with deduplication)
  private async sendCommissionNotification(affiliate: any, user: any, commission: any, serviceFeePaymentId: string) {
    // Check if notification already sent
    const existingNotification = (await prisma.$queryRaw`
      SELECT * FROM "notification_events" 
      WHERE "affiliate_id" = ${affiliate.id} 
      AND "event_type" = 'COMMISSION_EARNED' 
      AND "reference_id" = ${serviceFeePaymentId}
      LIMIT 1
    `) as any[]

    if (existingNotification.length > 0) {
      return // Already notified
    }

    try {
      const emailService = new EmailService()
      await emailService.sendNotification(
        user.email,
        "Commission Earned!",
        `Hi ${affiliate.firstName || "Affiliate"}, you've earned a Level ${commission.level} commission of $${(commission.amount_cents / 100).toFixed(2)}. Check your affiliate dashboard for details.`,
        "View Dashboard",
        `${process.env['NEXT_PUBLIC_APP_URL'] || 'https://autolenis.com'}/affiliate/dashboard`
      )

      // Record notification
      await prisma.$executeRaw`
        INSERT INTO "notification_events" 
        ("id", "affiliate_id", "event_type", "reference_id", "email_to", "status")
        VALUES (gen_random_uuid()::text, ${affiliate.id}, 'COMMISSION_EARNED', ${serviceFeePaymentId}, ${user.email}, 'SENT')
      `
    } catch (error) {
      // Log but don't fail commission creation
      await prisma.$executeRaw`
        INSERT INTO "notification_events" 
        ("id", "affiliate_id", "event_type", "reference_id", "email_to", "status", "error_message")
        VALUES (gen_random_uuid()::text, ${affiliate.id}, 'COMMISSION_EARNED', ${serviceFeePaymentId}, ${user.email}, 'FAILED', ${String(error)})
      `
    }
  }

  // Cancel commissions when payment is refunded
  async cancelCommissionsForPayment(serviceFeePaymentId: string, reason: string) {
    const commissions = await prisma.commission.findMany({
      where: {
        service_fee_payment_id: serviceFeePaymentId,
        status: { in: [CommissionStatus.PENDING, CommissionStatus.EARNED] }, // Only cancel unpaid
      },
    })

    for (const commission of commissions) {
      await prisma.$transaction(async (tx: any) => {
        await tx.commission.update({
          where: { id: commission.id },
          data: {
            status: CommissionStatus.CANCELLED,
            cancelled_at: new Date(),
            cancel_reason: reason,
          },
        })

        // Reduce affiliate balance
        await tx.affiliate.update({
          where: { id: commission.affiliateId },
          data: {
            pendingEarnings: { decrement: (commission.amount_cents || 0) / 100 },
            available_balance_cents: { decrement: commission.amount_cents || 0 },
          },
        })
      })

      await this.logEvent(commission.affiliateId, "COMMISSION_CANCELLED", {
        commissionId: commission.id,
        reason,
      })
    }

    return commissions.length
  }

  // Move commissions from PENDING to EARNED (after hold period)
  async approveCommission(commissionId: string) {
    const commission = await prisma.commission.update({
      where: { id: commissionId },
      data: {
        status: CommissionStatus.EARNED,
        earned_at: new Date(),
      },
    })

    await this.logEvent(commission.affiliateId, "COMMISSION_APPROVED", { commissionId })
    return commission
  }

  // Get referral links for affiliate dashboard
  getAffiliateLinks(affiliate: any) {
    const refCode = getReferralCode(affiliate)
    const slug = affiliate.landing_slug || affiliate.landingSlug

    return {
      primary: buildReferralLink(refCode, "/"),
      getStarted: buildReferralLink(refCode, "/get-started"),
      landingPage: slug ? `${process.env['NEXT_PUBLIC_APP_URL'] || "https://autolenis.com"}/a/${slug}` : null,
      refCode,
      landingSlug: slug,
    }
  }

  // Get full dashboard stats
  async getAffiliateDashboard(affiliateId: string) {
    const affiliate = await prisma.affiliate.findUnique({
      where: { id: affiliateId },
      include: { user: true },
    })

    if (!affiliate) {
      throw new Error("Affiliate not found")
    }

    const [
      totalClicks,
      totalReferrals,
      completedDeals,
      pendingCommissions,
      earnedCommissions,
      paidCommissions,
      recentCommissions,
      referralsByLevel,
    ] = await Promise.all([
      prisma.click.count({ where: { affiliateId } }),
      prisma.referral.count({ where: { affiliateId, level: 1 } }),
      prisma.referral.count({ where: { affiliateId, dealCompleted: true } }),
      prisma.commission.aggregate({
        where: { affiliateId, status: CommissionStatus.PENDING },
        _sum: { amount_cents: true },
        _count: true,
      }),
      prisma.commission.aggregate({
        where: { affiliateId, status: CommissionStatus.EARNED },
        _sum: { amount_cents: true },
        _count: true,
      }),
      prisma.commission.aggregate({
        where: { affiliateId, status: CommissionStatus.PAID },
        _sum: { amount_cents: true },
        _count: true,
      }),
      prisma.commission.findMany({
        where: { affiliateId },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.referral.groupBy({
        by: ["level"],
        where: { affiliateId },
        _count: true,
      }),
    ])

    // const links = this.getAffiliateLinks(affiliate)

    return {
      affiliate: {
        id: affiliate.id,
        name: `${affiliate.firstName} ${affiliate.lastName}`.trim(),
        email: affiliate.user?.email,
        refCode: getReferralCode(affiliate),
        status: affiliate.status,
      },
      stats: {
        totalClicks,
        totalReferrals,
        completedDeals,
        conversionRate: totalClicks > 0 ? ((totalReferrals / totalClicks) * 100).toFixed(2) : "0.00",
        dealConversionRate: totalReferrals > 0 ? ((completedDeals / totalReferrals) * 100).toFixed(2) : "0.00",
      },
      earnings: {
        pendingCents: pendingCommissions._sum.amount_cents || 0,
        pendingCount: pendingCommissions._count,
        earnedCents: earnedCommissions._sum.amount_cents || 0,
        earnedCount: earnedCommissions._count,
        paidCents: paidCommissions._sum.amount_cents || 0,
        paidCount: paidCommissions._count,
        availableBalanceCents: affiliate.available_balance_cents || 0,
        lifetimeEarningsCents: affiliate.lifetime_earnings_cents || 0,
        lifetimePaidCents: affiliate.lifetime_paid_cents || 0,
      },
      referralsByLevel: {
        level1: referralsByLevel.find((r: any) => r.level === 1)?._count || 0,
        level2: referralsByLevel.find((r: any) => r.level === 2)?._count || 0,
        level3: referralsByLevel.find((r: any) => r.level === 3)?._count || 0,
      },
      recentCommissions: recentCommissions.map((c: any) => ({
        id: c.id,
        amountCents: c.amount_cents || c.amountCents,
        level: c.level,
        status: c.status,
        createdAt: c.createdAt,
      })),
      commissionRates: this.COMMISSION_RATES,
    }
  }

  // Log affiliate event for audit trail
  private async logEvent(affiliateId: string, eventType: string, details: any) {
    try {
      await prisma.$executeRaw`
        INSERT INTO "affiliate_events" ("id", "affiliate_id", "event_type", "details")
        VALUES (gen_random_uuid()::text, ${affiliateId}, ${eventType}, ${JSON.stringify(details)}::jsonb)
      `
    } catch (e) {
      console.error("[AffiliateService] Failed to log event:", e)
    }
  }

  // Reconciliation job - check for missing commissions
  async runReconciliation() {
    const results = {
      paymentsChecked: 0,
      missingFound: 0,
      created: 0,
      discrepancies: [] as any[],
    }

    // Get all SUCCEEDED service fee payments (include legacy "PAID" for backward compatibility)
    const paidPayments = await prisma.serviceFeePayment.findMany({
      where: { status: { in: [...SUCCEEDED_PAYMENT_STATUSES] } },
    })

    results.paymentsChecked = paidPayments.length

    for (const payment of paidPayments) {
      if (!payment.user_id) continue

      // Check if user has referrals
      const referrals = await prisma.referral.findMany({
        where: { referredUserId: payment.user_id },
      })

      if (referrals.length === 0) continue

      // Check if commissions exist
      const commissions = await prisma.commission.findMany({
        where: { service_fee_payment_id: payment.id },
      })

      if (commissions.length < referrals.length) {
        results.missingFound++
        results.discrepancies.push({
          paymentId: payment.id,
          userId: payment.user_id,
          expectedLevels: referrals.length,
          actualCommissions: commissions.length,
        })

        // Try to create missing commissions
        const result = await this.createCommissionsForPayment(payment.id)
        if (result.created) {
          results.created += result.commissions?.length || 0
        }
      }
    }

    // Log reconciliation run
    await prisma.$executeRaw`
      INSERT INTO "commission_reconciliation_logs" 
      ("id", "service_fee_payments_checked", "missing_commissions_found", "commissions_created", "discrepancies")
      VALUES (
        gen_random_uuid()::text, 
        ${results.paymentsChecked}, 
        ${results.missingFound}, 
        ${results.created}, 
        ${JSON.stringify(results.discrepancies)}::jsonb
      )
    `

    return results
  }

  // Admin: Get affiliate tree/downline
  async getAffiliateTree(affiliateId: string) {
    const affiliate = await prisma.affiliate.findUnique({
      where: { id: affiliateId },
      include: { user: true },
    })

    if (!affiliate) throw new Error("Affiliate not found")

    // Get direct referrals (Level 1)
    const directReferrals = await prisma.referral.findMany({
      where: { affiliateId, level: 1 },
      include: {
        commissions: true,
      },
    })

    // Get counts by level
    const levelCounts = await prisma.referral.groupBy({
      by: ["level"],
      where: { affiliateId },
      _count: true,
    })

    // Get total commissions by status
    const commissionStats = await prisma.commission.groupBy({
      by: ["status"],
      where: { affiliateId },
      _sum: { amount_cents: true },
      _count: true,
    })

    return {
      affiliate: {
        id: affiliate.id,
        name: `${affiliate.firstName} ${affiliate.lastName}`.trim(),
        email: affiliate.user?.email,
        refCode: affiliate.refCode || affiliate.ref_code,
        status: affiliate.status,
      },
      tree: {
        level1: levelCounts.find((l: any) => l.level === 1)?._count || 0,
        level2: levelCounts.find((l: any) => l.level === 2)?._count || 0,
        level3: levelCounts.find((l: any) => l.level === 3)?._count || 0,
        total: levelCounts.reduce((sum: any, l: any) => sum + l._count, 0),
      },
      commissions: {
        pending: {
          count: commissionStats.find((s: any) => s.status === CommissionStatus.PENDING)?._count || 0,
          amountCents: commissionStats.find((s: any) => s.status === CommissionStatus.PENDING)?._sum.amount_cents || 0,
        },
        earned: {
          count: commissionStats.find((s: any) => s.status === CommissionStatus.EARNED)?._count || 0,
          amountCents: commissionStats.find((s: any) => s.status === CommissionStatus.EARNED)?._sum.amount_cents || 0,
        },
        paid: {
          count: commissionStats.find((s: any) => s.status === CommissionStatus.PAID)?._count || 0,
          amountCents: commissionStats.find((s: any) => s.status === CommissionStatus.PAID)?._sum.amount_cents || 0,
        },
        cancelled: {
          count: commissionStats.find((s: any) => s.status === CommissionStatus.CANCELLED)?._count || 0,
          amountCents: commissionStats.find((s: any) => s.status === CommissionStatus.CANCELLED)?._sum.amount_cents || 0,
        },
      },
      directReferrals: directReferrals.length,
    }
  }

  // Admin: Get user's referral chain
  async getUserReferralChain(userId: string) {
    const referrals = await prisma.referral.findMany({
      where: { referredUserId: userId },
      include: {
        affiliate: {
          include: { user: true },
        },
      },
      orderBy: { level: "asc" },
    })

    return {
      userId,
      levels: referrals.map((r: any) => ({
        level: r.level,
        affiliateId: r.affiliateId,
        affiliateName: `${r.affiliate?.firstName} ${r.affiliate?.lastName}`.trim(),
        affiliateEmail: r.affiliate?.user?.email,
        createdAt: r.createdAt,
      })),
    }
  }

  // Create payout for affiliate
  async createPayout(affiliateId: string) {
    const affiliate = await prisma.affiliate.findUnique({
      where: { id: affiliateId },
    })

    if (!affiliate) throw new Error("Affiliate not found")

    const availableBalance = affiliate.available_balance_cents || 0
    if (availableBalance <= 0) {
      throw new Error("No available balance for payout")
    }

    // Get all EARNED commissions
    const earnedCommissions = await prisma.commission.findMany({
      where: {
        affiliateId,
        status: CommissionStatus.EARNED,
        payoutId: null,
      },
    })

    if (earnedCommissions.length === 0) {
      throw new Error("No earned commissions available for payout")
    }

    const totalCents = earnedCommissions.reduce((sum: any, c: any) => sum + (c.amount_cents || 0), 0)

    const payout = await prisma.$transaction(async (tx: any) => {
      const newPayout = await tx.payout.create({
        data: {
          affiliateId,
          amount: totalCents / 100,
          totalAmountCents: totalCents,
          total_amount_cents: totalCents,
          status: PayoutStatus.PENDING,
          provider: "STRIPE",
        },
      })

      // Link commissions to payout
      for (const commission of earnedCommissions) {
        await tx.commission.update({
          where: { id: commission.id },
          data: {
            payoutId: newPayout.id,
            is_locked: true,
            locked_at: new Date(),
          },
        })
      }

      return newPayout
    })

    await this.logEvent(affiliateId, "PAYOUT_CREATED", {
      payoutId: payout.id,
      amountCents: totalCents,
      commissionCount: earnedCommissions.length,
    })

    // Emit canonical platform event (non-blocking)
    writeEventAsync({
      eventType: PlatformEventType.PAYOUT_HELD,
      entityType: EntityType.PAYOUT,
      entityId: payout.id,
      parentEntityId: affiliateId,
      actorId: "SYSTEM",
      actorType: ActorType.SYSTEM,
      sourceModule: "affiliate.service",
      correlationId: crypto.randomUUID(),
      idempotencyKey: `payout-created-${payout.id}`,
      payload: { amountCents: totalCents, commissionCount: earnedCommissions.length },
    }).catch(() => { /* non-critical */ })

    return payout
  }

  // Process payout (mark as paid after transfer)
  async processPayout(payoutId: string, providerRef: string) {
    const payout = await prisma.payout.findUnique({
      where: { id: payoutId },
      include: { commissions: true },
    })

    if (!payout) throw new Error("Payout not found")

    await prisma.$transaction(async (tx: any) => {
      await tx.payout.update({
        where: { id: payoutId },
        data: {
          status: PayoutStatus.COMPLETED,
          paidAt: new Date(),
          paid_timestamp: new Date(),
          providerRef,
          provider_ref: providerRef,
        },
      })

      // Mark all commissions as paid
      for (const commission of payout.commissions) {
        await tx.commission.update({
          where: { id: commission.id },
          data: { status: CommissionStatus.PAID },
        })
      }

      // Update affiliate balances
      await tx.affiliate.update({
        where: { id: payout.affiliateId },
        data: {
          available_balance_cents: { decrement: payout.total_amount_cents || payout.totalAmountCents || 0 },
          lifetime_paid_cents: { increment: payout.total_amount_cents || payout.totalAmountCents || 0 },
          pendingEarnings: { decrement: (payout.total_amount_cents || payout.totalAmountCents || 0) / 100 },
          totalEarnings: { increment: (payout.total_amount_cents || payout.totalAmountCents || 0) / 100 },
        },
      })
    })

    await this.logEvent(payout.affiliateId, "PAYOUT_COMPLETED", {
      payoutId,
      providerRef,
    })

    // Emit canonical platform event (non-blocking)
    writeEventAsync({
      eventType: PlatformEventType.PAYOUT_RELEASED,
      entityType: EntityType.PAYOUT,
      entityId: payoutId,
      parentEntityId: payout.affiliateId,
      actorId: "SYSTEM",
      actorType: ActorType.SYSTEM,
      sourceModule: "affiliate.service",
      correlationId: crypto.randomUUID(),
      idempotencyKey: `payout-released-${payoutId}`,
      payload: { providerRef, amountCents: payout.total_amount_cents || payout.totalAmountCents },
    }).catch(() => { /* non-critical */ })

    return payout
  }

  async trackReferral(affiliateId: string, referredUserId: string, metadata?: Record<string, unknown>) {
    // Validate affiliate exists
    const affiliate = await prisma.affiliate.findUnique({
      where: { id: affiliateId },
    })

    if (!affiliate) {
      return { success: false, reason: "Affiliate not found" }
    }

    // Prevent self-referral
    if (affiliate.userId === referredUserId) {
      await this.logEvent(affiliateId, "SELF_REFERRAL_BLOCKED", { referredUserId })
      return { success: false, reason: "Self-referral not allowed" }
    }

    // Check if referral chain already exists (idempotent)
    const existingReferrals = await prisma.referral.findMany({
      where: { referredUserId, affiliateId },
    })

    if (existingReferrals.length > 0) {
      return { success: true, affiliateId, referredUserId, referrals: existingReferrals, alreadyTracked: true }
    }

    // Build referral chain (creates level 1 + upstream levels)
    const referrals = await this.buildReferralChain(referredUserId, affiliateId, {
      attributionSource: (metadata?.source as string) || "LINK",
      cookieId: metadata?.cookieId as string | undefined,
    })

    await this.logEvent(affiliateId, "REFERRAL_TRACKED", {
      referredUserId,
      levels: referrals.length,
      source: metadata?.source || "LINK",
    })

    return { success: true, affiliateId, referredUserId, referrals }
  }

  async completeDealReferral(dealId: string, buyerId: string) {
    // Find the service fee payment for this deal
    const payment = await prisma.serviceFeePayment.findFirst({
      where: {
        OR: [
          { selected_deal_id: dealId },
          { selectedDealId: dealId },
        ],
        status: { in: [...SUCCEEDED_PAYMENT_STATUSES] },
      },
    })

    if (!payment) {
      return { success: false, reason: "No paid service fee found for deal" }
    }

    // Check if commissions were already created (idempotent)
    const existing = await prisma.commission.findMany({
      where: { service_fee_payment_id: payment.id },
    })

    if (existing.length > 0) {
      return { success: true, dealId, buyerId, commissions: existing, alreadyCompleted: true }
    }

    // Delegate to createCommissionsForPayment for atomic commission creation
    const result = await this.createCommissionsForPayment(payment.id)

    return { success: result.created, dealId, buyerId, ...result }
  }

  async processCommission(referrerId: string, userId: string, amount: number, type: string) {
    // Find the most recent paid/succeeded service fee payment for this user
    const payment = await prisma.serviceFeePayment.findFirst({
      where: {
        user_id: userId,
        status: { in: [...SUCCEEDED_PAYMENT_STATUSES] },
      },
      orderBy: { createdAt: "desc" },
    })

    if (!payment) {
      logger.warn("processCommission: No paid service fee payment found", { referrerId, userId, type })
      return { success: false, reason: "No paid service fee payment found" }
    }

    // Delegate to idempotent createCommissionsForPayment
    const result = await this.createCommissionsForPayment(payment.id)

    // Return success if commissions were created or already existed (idempotent)
    const alreadyExisted = !result.created && (result.commissions?.length ?? 0) > 0
    return { success: result.created || alreadyExisted, referrerId, amount, type, ...result }
  }
}

export const affiliateService = new AffiliateService()
export default affiliateService
