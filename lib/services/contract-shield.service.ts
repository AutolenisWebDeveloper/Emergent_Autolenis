import { prisma } from "@/lib/db"
import { logger } from "@/lib/logger"
import { emailService } from "@/lib/services/email.service"

// Contract Shield Service - Automated contract review assistant
// NOTE: This is an informational tool only. It does not provide legal, tax, or financial advice.

// ---------------------------------------------------------------------------
// Object-level authorization helpers
// ---------------------------------------------------------------------------

/**
 * Assert that the actor can access a deal's contract documents.
 * Throws if the actor is not the deal's buyer, dealer, or an admin.
 */
export async function assertCanAccessDealContract(
  actor: { userId: string; role: string },
  dealId: string,
): Promise<void> {
  const isAdmin = actor.role === "ADMIN" || actor.role === "SUPER_ADMIN"
  if (isAdmin) return

  const deal = await prisma.selectedDeal.findUnique({
    where: { id: dealId },
    select: {
      auction: {
        select: {
          buyerId: true,
          buyer: { select: { userId: true } },
        },
      },
      dealerId: true,
      dealer: { select: { userId: true } },
    },
  })

  if (!deal) {
    const err = new Error("Deal not found") as Error & { statusCode: number }
    err.statusCode = 404
    throw err
  }

  const isBuyer = deal.auction?.buyer?.userId === actor.userId
  const isDealer = deal.dealer?.userId === actor.userId

  if (!isBuyer && !isDealer) {
    const err = new Error("Not authorized to access this deal's contracts") as Error & { statusCode: number }
    err.statusCode = 403
    throw err
  }
}

/**
 * Assert that the actor can modify a fix item.
 * Only the dealer who owns the parent deal can resolve fix items.
 */
export async function assertCanModifyContractFix(
  actor: { userId: string; role: string },
  fixItemId: string,
): Promise<void> {
  const isAdmin = actor.role === "ADMIN" || actor.role === "SUPER_ADMIN"
  if (isAdmin) return

  const fixItem = await prisma.fixListItem.findUnique({
    where: { id: fixItemId },
    select: {
      scan: {
        select: {
          deal: {
            select: {
              dealerId: true,
              dealer: { select: { userId: true } },
            },
          },
        },
      },
    },
  })

  if (!fixItem) {
    const err = new Error("Fix item not found") as Error & { statusCode: number }
    err.statusCode = 404
    throw err
  }

  const isDealer = fixItem.scan?.deal?.dealer?.userId === actor.userId

  if (!isDealer) {
    const err = new Error("Not authorized to modify this fix item") as Error & { statusCode: number }
    err.statusCode = 403
    throw err
  }
}

// Document types
export const DOCUMENT_TYPES = [
  "BUYERS_ORDER",
  "FINANCE_CONTRACT",
  "ADDENDUM",
  "WARRANTY_FORM",
  "GAP_FORM",
  "ITEMIZED_FEES",
  "OTHER",
] as const

export type DocumentType = (typeof DOCUMENT_TYPES)[number]

export type IssueSeverity = "INFO" | "REVIEW" | "IMPORTANT" | "CRITICAL"

export type ScanStatus = "PENDING" | "RUNNING" | "REVIEW_READY" | "PASS" | "FAIL"

// These are optional add-ons that buyers may want to review
const FLAGGED_ADD_ONS = [
  "nitrogen_tire",
  "vin_etching",
  "market_adjustment",
  "dealer_prep",
  "additional_dealer_markup",
  "addendum_sticker",
  "dealer_add_on",
  "protection_package",
  "paint_protection",
  "fabric_protection",
]

// These are typical ranges we've observed - not legal limits
const STATE_DOC_FEE_REFERENCE: Record<string, { typical: number; note: string }> = {
  CA: { typical: 85, note: "CA has a statutory cap" },
  FL: { typical: 999, note: "No statutory cap" },
  TX: { typical: 150, note: "Typical range" },
  NY: { typical: 75, note: "Typical range" },
  GA: { typical: 699, note: "No statutory cap" },
  NC: { typical: 699, note: "No statutory cap" },
  VA: { typical: 499, note: "No statutory cap" },
  OH: { typical: 250, note: "Typical range" },
  PA: { typical: 300, note: "Must be disclosed" },
  IL: { typical: 336, note: "Typical range" },
}

export class ContractShieldService {
  // ============================================
  // STEP 1: Upload Contract Documents
  // ============================================
  static async uploadDocument(
    selectedDealId: string,
    dealerId: string,
    fileUrl: string,
    documentType: DocumentType,
    metaJson?: Record<string, any>,
  ) {
    // Resolve workspaceId from the deal
    const deal = await prisma.selectedDeal.findUnique({
      where: { id: selectedDealId },
      select: { workspaceId: true },
    })

    if (!deal) {
      throw new Error("Deal not found")
    }

    const existing = await prisma.contractDocument.findMany({
      where: { dealId: selectedDealId, documentType },
      orderBy: { version: "desc" },
    })

    const version = existing.length > 0 ? (existing[0].version || 0) + 1 : 1

    const document = await prisma.contractDocument.create({
      data: {
        dealId: selectedDealId,
        dealerId,
        documentType,
        type: documentType,
        fileUrl,
        documentUrl: fileUrl,
        file_url: fileUrl,
        metaJson: metaJson || {},
        meta_json: metaJson || {},
        version,
        workspaceId: deal.workspaceId,
      },
    })

    let scan = await prisma.contractShieldScan.findFirst({
      where: { selectedDealId },
    })

    if (!scan) {
      scan = await prisma.contractShieldScan.create({
        data: {
          selectedDealId,
          workspaceId: deal.workspaceId,
          status: "PENDING",
          issuesCount: 0,
          overallScore: 0,
        },
      })
    } else {
      scan = await prisma.contractShieldScan.update({
        where: { id: scan.id },
        data: { status: "PENDING" },
      })
    }

    await this.logEvent(selectedDealId, "DOC_UPLOADED", {
      documentType,
      documentId: document.id,
      version,
      dealerId,
    })

    return { document, scan }
  }

  // ============================================
  // STEP 2: Contract Review Scan
  // ============================================
  static async scanContract(selectedDealId: string) {
    const deal = await prisma.selectedDeal.findUnique({
      where: { id: selectedDealId },
      include: {
        buyer: { include: { profile: true } },
        dealer: true,
        offer: { include: { financingOptions: true } },
        inventoryItem: true,
      },
    })

    if (!deal) {
      throw new Error("Deal not found")
    }

    const documents = await prisma.contractDocument.findMany({
      where: { dealId: selectedDealId },
      orderBy: { version: "desc" },
    })

    if (documents.length === 0) {
      throw new Error("No documents uploaded yet")
    }

    let scan = await prisma.contractShieldScan.findFirst({
      where: { selectedDealId },
    })

    if (!scan) {
      scan = await prisma.contractShieldScan.create({
        data: {
          selectedDealId,
          workspaceId: deal.workspaceId,
          status: "RUNNING",
          issuesCount: 0,
          overallScore: 0,
        },
      })
    } else {
      await prisma.contractShieldScan.update({
        where: { id: scan.id },
        data: { status: "RUNNING" },
      })
    }

    // Clear previous items for re-scan
    await prisma.fixListItem.deleteMany({
      where: { scanId: scan.id },
    })

    const items: Array<{
      severity: IssueSeverity
      category: string
      fieldName: string
      fieldLabel: string
      description: string
      suggestedFix: string
    }> = []

    // Run all checks
    const mathItems = await this.checkMathConsistency(deal, documents)
    items.push(...mathItems)

    const feeItems = await this.reviewFees(deal)
    items.push(...feeItems)

    const docItems = await this.checkDocumentCompleteness(documents)
    items.push(...docItems)

    // Create fix list items
    for (const item of items) {
      await prisma.fixListItem.create({
        data: {
          scanId: scan.id,
          severity: item.severity,
          category: item.category,
          description: item.description,
          expectedFix: item.suggestedFix,
        },
      })
    }

    // Determine status
    const criticalCount = items.filter((i) => i.severity === "CRITICAL").length
    const importantCount = items.filter((i) => i.severity === "IMPORTANT").length
    const reviewCount = items.filter((i) => i.severity === "REVIEW").length

    let status: ScanStatus
    let overallScore: number

    if (criticalCount > 0) {
      status = "FAIL"
      overallScore = Math.max(0, 100 - criticalCount * 25 - importantCount * 10)
    } else if (importantCount > 0 || reviewCount > 0) {
      status = "REVIEW_READY"
      overallScore = Math.max(50, 100 - importantCount * 10 - reviewCount * 2)
    } else {
      status = "PASS"
      overallScore = 100
    }

    const aprMatch = !items.some((i) => i.category === "APR_DIFFERENCE")
    const paymentMatch = !items.some((i) => i.category === "PAYMENT_DIFFERENCE")
    const otdMatch = !items.some((i) => i.category === "OTD_DIFFERENCE")
    const feesReviewed = items.some((i) => i.category === "FEE_REVIEW" || i.category === "ADD_ON_REVIEW")

    const summary = this.generateSummary(items, status)

    scan = await prisma.contractShieldScan.update({
      where: { id: scan.id },
      data: {
        status,
        summary,
        issuesCount: items.length,
        overallScore,
        aprMatch,
        paymentMatch,
        otdMatch,
        junkFeesDetected: feesReviewed,
        scannedAt: new Date(),
      },
    })

    // Update deal status
    if (status === "PASS") {
      await prisma.selectedDeal.update({
        where: { id: selectedDealId },
        data: { status: "CONTRACT_APPROVED" },
      })
    } else {
      await prisma.selectedDeal.update({
        where: { id: selectedDealId },
        data: { status: "CONTRACT_REVIEW" },
      })
    }

    await this.logEvent(selectedDealId, "SCAN_COMPLETED", {
      scanId: scan.id,
      status,
      itemsCount: items.length,
      criticalCount,
      importantCount,
    })

    return this.getScanWithDetails(scan.id)
  }

  // ============================================
  // Math Consistency Checks
  // ============================================
  private static async checkMathConsistency(deal: any, _documents: any[]) {
    const items: Array<{
      severity: IssueSeverity
      category: string
      fieldName: string
      fieldLabel: string
      description: string
      suggestedFix: string
    }> = []

    const agreedOtd = deal.totalOtdAmountCents || deal.cashOtd * 100
    const offerOtd = deal.offer?.cashOtdCents || deal.offer?.cashOtd * 100

    if (Math.abs(agreedOtd - offerOtd) > 100) {
      items.push({
        severity: "CRITICAL",
        category: "OTD_DIFFERENCE",
        fieldName: "otd_total",
        fieldLabel: "Total Out-the-Door Price",
        description: `The total price ($${(agreedOtd / 100).toLocaleString()}) appears different from the accepted offer ($${(offerOtd / 100).toLocaleString()}). This may need clarification.`,
        suggestedFix: "Confirm the correct amount with the dealer and ensure it matches your accepted offer.",
      })
    }

    // Check fees breakdown
    const feesBreakdown = deal.feesBreakdown as Record<string, number> | null
    if (feesBreakdown) {
      const totalFees = Object.values(feesBreakdown).reduce((sum, val) => sum + (val || 0), 0)
      const taxAmount = deal.taxAmount || 0
      const calculatedOtd = (deal.offer?.cashOtd || 0) + totalFees + taxAmount

      if (Math.abs(calculatedOtd - (deal.cashOtd || 0)) > 50) {
        items.push({
          severity: "REVIEW",
          category: "FEE_CALCULATION",
          fieldName: "fee_total",
          fieldLabel: "Fee Breakdown",
          description: "The fee totals may not add up to the final price. You may want to review the itemization.",
          suggestedFix: "Ask the dealer to clarify how the fees are calculated.",
        })
      }
    }

    // Check APR consistency
    if (deal.apr && deal.offer?.financingOptions?.length > 0) {
      const selectedFinancing = deal.offer.financingOptions[0]
      if (selectedFinancing && Math.abs(deal.apr - selectedFinancing.apr) > 0.01) {
        items.push({
          severity: "CRITICAL",
          category: "APR_DIFFERENCE",
          fieldName: "apr",
          fieldLabel: "APR (Interest Rate)",
          description: `The contract APR (${deal.apr}%) appears different from the financing offer APR (${selectedFinancing.apr}%). This is worth reviewing.`,
          suggestedFix: "Confirm with the dealer that the APR matches your financing terms.",
        })
      }
    }

    // Check monthly payment
    if (deal.termMonths && deal.offer?.financingOptions?.length > 0) {
      const financing = deal.offer.financingOptions[0]
      if (financing) {
        const expectedMonthly = financing.monthlyPayment || financing.est_monthly_payment_cents / 100
        if (Math.abs((deal.monthlyPayment || 0) - expectedMonthly) > 5) {
          items.push({
            severity: "CRITICAL",
            category: "PAYMENT_DIFFERENCE",
            fieldName: "monthly_payment",
            fieldLabel: "Monthly Payment",
            description: "The monthly payment amount appears different from the financing terms.",
            suggestedFix: "Ask the dealer to explain how the payment was calculated.",
          })
        }
      }
    }

    return items
  }

  // ============================================
  // Fee Review (not "Junk Fee Detection")
  // ============================================
  private static async reviewFees(deal: any) {
    const items: Array<{
      severity: IssueSeverity
      category: string
      fieldName: string
      fieldLabel: string
      description: string
      suggestedFix: string
    }> = []

    const feesBreakdown = deal.feesBreakdown as Record<string, number> | null
    if (!feesBreakdown) return items

    const flaggedAddOns: string[] = []
    for (const [feeKey, feeAmount] of Object.entries(feesBreakdown)) {
      const normalizedKey = feeKey.toLowerCase().replace(/\s+/g, "_")
      for (const flagged of FLAGGED_ADD_ONS) {
        if (normalizedKey.includes(flagged) && feeAmount > 0) {
          flaggedAddOns.push(feeKey)
          break
        }
      }
    }

    if (flaggedAddOns.length > 0) {
      items.push({
        severity: "IMPORTANT",
        category: "ADD_ON_REVIEW",
        fieldName: "add_ons",
        fieldLabel: "Optional Add-Ons",
        description: `Your contract includes these optional items: ${flaggedAddOns.join(", ")}. These are typically optional and you may want to confirm you requested them.`,
        suggestedFix: "Review these items with the dealer. If you didn't request them, ask to have them removed.",
      })
    }

    const docFee = feesBreakdown['doc_fee'] || feesBreakdown['documentation_fee'] || feesBreakdown['dealer_doc_fee'] || 0
    const dealerState = deal.dealer?.state?.toUpperCase()

    if (dealerState && STATE_DOC_FEE_REFERENCE[dealerState]) {
      const ref = STATE_DOC_FEE_REFERENCE[dealerState]
      if (docFee > ref.typical * 1.5) {
        items.push({
          severity: "REVIEW",
          category: "FEE_REVIEW",
          fieldName: "doc_fee",
          fieldLabel: "Documentation Fee",
          description: `The doc fee ($${docFee}) appears higher than typical for ${dealerState} (around $${ref.typical}). ${ref.note}.`,
          suggestedFix: "You may want to ask the dealer about this fee. Some variation is normal.",
        })
      }
    }

    return items
  }

  // ============================================
  // Document Completeness
  // ============================================
  private static async checkDocumentCompleteness(documents: any[]) {
    const items: Array<{
      severity: IssueSeverity
      category: string
      fieldName: string
      fieldLabel: string
      description: string
      suggestedFix: string
    }> = []

    const uploadedTypes = documents.map((d) => d.documentType)

    if (!uploadedTypes.includes("BUYERS_ORDER")) {
      items.push({
        severity: "CRITICAL",
        category: "MISSING_DOCUMENT",
        fieldName: "buyers_order",
        fieldLabel: "Buyer's Order",
        description: "We haven't received a Buyer's Order yet. This is typically the main purchase agreement.",
        suggestedFix: "Ask the dealer to upload the signed Buyer's Order.",
      })
    }

    return items
  }

  // ============================================
  // Dealer Fix Workflow
  // ============================================
  static async resolveFixItem(
    fixItemId: string,
    resolution: {
      resolved: boolean
      explanation?: string
      newDocumentId?: string
    },
  ) {
    const fixItem = await prisma.fixListItem.update({
      where: { id: fixItemId },
      data: { resolved: resolution.resolved },
    })

    const scan = await prisma.contractShieldScan.findUnique({
      where: { id: fixItem.scanId },
      include: { fixList: true },
    })

    if (scan) {
      const unresolvedCount = scan.fixList.filter((f: any) => !f.resolved).length
      if (unresolvedCount === 0 && scan.selectedDealId) {
        return this.scanContract(scan.selectedDealId)
      }
    }

    return fixItem
  }

  // ============================================
  // Admin Override
  // ============================================
  static async adminOverride(scanId: string, action: "FORCE_PASS" | "FORCE_FAIL", adminId: string, reason: string) {
    const scan = await prisma.contractShieldScan.findUnique({
      where: { id: scanId },
    })

    if (!scan) {
      throw new Error("Scan not found")
    }

    const newStatus = action === "FORCE_PASS" ? "PASS" : "FAIL"

    const updatedScan = await prisma.contractShieldScan.update({
      where: { id: scanId },
      data: {
        status: newStatus,
        summary: `${scan.summary || ""}\n\n[Admin note: Status changed to ${newStatus}] ${reason}`,
      },
    })

    if (scan.selectedDealId) {
      await prisma.selectedDeal.update({
        where: { id: scan.selectedDealId },
        data: {
          status: newStatus === "PASS" ? "CONTRACT_APPROVED" : "CONTRACT_REVIEW",
        },
      })

      await this.logEvent(scan.selectedDealId, "ADMIN_OVERRIDE", {
        scanId,
        action,
        adminId,
        reason,
        previousStatus: scan.status,
        newStatus,
      })
    }

    return updatedScan
  }

  // ============================================
  // Admin Override with Buyer Consent
  // ============================================
  static async adminOverrideWithConsent(
    scanId: string,
    action: "FORCE_PASS" | "FORCE_FAIL",
    adminId: string,
    reason: string,
  ) {
    const scan = await prisma.contractShieldScan.findUnique({
      where: { id: scanId },
      include: {
        selectedDeal: {
          include: {
            buyer: { include: { profile: true } },
          },
        },
      },
    })

    if (!scan) {
      throw new Error("Scan not found")
    }

    const newStatus = action === "FORCE_PASS" ? "PASS" : "FAIL"
    const previousStatus = scan.status

    // Create override record
    const override = await prisma.contractShieldOverride.create({
      data: {
        scanId,
        adminId,
        action,
        reason,
        previousStatus,
        newStatus,
        buyerAcknowledged: false,
      },
    })

    // Update scan status
    const updatedScan = await prisma.contractShieldScan.update({
      where: { id: scanId },
      data: {
        status: newStatus,
        summary: `${scan.summary || ""}\n\n[Admin Override: ${action}] ${reason}\n\n⚠️ This override requires buyer acknowledgment before proceeding.`,
      },
    })

    // Update deal status
    if (scan.selectedDealId) {
      await prisma.selectedDeal.update({
        where: { id: scan.selectedDealId },
        data: {
          status: "CONTRACT_REVIEW", // Keep in review until buyer acknowledges
        },
      })

      await this.logEvent(scan.selectedDealId, "ADMIN_OVERRIDE_CREATED", {
        scanId,
        overrideId: override.id,
        action,
        adminId,
        reason,
        previousStatus,
        newStatus,
      })

      // Send notification to buyer
      if (scan.selectedDeal?.buyer?.id) {
        await this.sendOverrideNotification(scan.selectedDeal.buyer.id, scanId, override.id, action, reason)
      }
    }

    logger.info("Admin override created with buyer consent requirement", {
      scanId,
      overrideId: override.id,
      action,
      adminId,
    })

    return { scan: updatedScan, override }
  }

  static async buyerAcknowledgeOverride(overrideId: string, buyerId: string, comment?: string) {
    const override = await prisma.contractShieldOverride.findUnique({
      where: { id: overrideId },
      include: {
        scan: {
          include: {
            selectedDeal: true,
          },
        },
      },
    })

    if (!override) {
      throw new Error("Override not found")
    }

    // Verify buyer owns this deal
    if (override.scan.selectedDeal?.buyerId !== buyerId) {
      throw new Error("Unauthorized")
    }

    if (override.buyerAcknowledged) {
      throw new Error("Override already acknowledged")
    }

    // Update override
    const updatedOverride = await prisma.contractShieldOverride.update({
      where: { id: overrideId },
      data: {
        buyerAcknowledged: true,
        buyerAckAt: new Date(),
        buyerAckComment: comment,
      },
    })

    // Update deal status to allow progression
    if (override.scan.selectedDealId && override.newStatus === "PASS") {
      await prisma.selectedDeal.update({
        where: { id: override.scan.selectedDealId },
        data: {
          status: "CONTRACT_APPROVED",
        },
      })

      await this.logEvent(override.scan.selectedDealId, "BUYER_ACKNOWLEDGED_OVERRIDE", {
        overrideId,
        buyerId,
        comment,
      })
    }

    logger.info("Buyer acknowledged admin override", {
      overrideId,
      buyerId,
      scanId: override.scanId,
    })

    return updatedOverride
  }

  // ============================================
  // Enhanced Notifications
  // ============================================
  private static async sendOverrideNotification(
    userId: string,
    scanId: string,
    overrideId: string,
    action: string,
    reason: string,
  ) {
    const notification = await prisma.contractShieldNotification.create({
      data: {
        scanId,
        recipientId: userId,
        notificationType: "EMAIL",
        status: "PENDING",
        subject: "Action Required: Contract Review Status Update",
        message: `An admin has updated your Contract Shield review status.\n\nAction: ${action}\nReason: ${reason}\n\nPlease log in to review and acknowledge this change.`,
      },
    })

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      })

      if (user?.email) {
        await emailService.sendNotification(
          user.email,
          "Override Acknowledgment Required",
          `An override action (${action}) has been requested for your contract. Reason: ${reason}`,
          "Review Override",
          `${process.env['NEXT_PUBLIC_APP_URL']}/buyer/contracts`
        )

        await prisma.contractShieldNotification.update({
          where: { id: notification.id },
          data: {
            status: "SENT",
            sentAt: new Date(),
          },
        })

        logger.info("Override notification sent", {
          notificationId: notification.id,
          userId,
          scanId,
        })
      }
    } catch (error) {
      await prisma.contractShieldNotification.update({
        where: { id: notification.id },
        data: {
          status: "FAILED",
          failedReason: error instanceof Error ? error.message : "Unknown error",
        },
      })

      logger.error("Failed to send override notification", {
        notificationId: notification.id,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }

    return notification
  }

  static async sendStatusChangeNotification(scanId: string, oldStatus: string, newStatus: string) {
    const scan = await prisma.contractShieldScan.findUnique({
      where: { id: scanId },
      include: {
        selectedDeal: {
          include: {
            buyer: true,
            dealer: true,
          },
        },
      },
    })

    if (!scan?.selectedDeal) return

    // Notify buyer
    if (scan.selectedDeal.buyer?.id) {
      const notification = await prisma.contractShieldNotification.create({
        data: {
          scanId,
          recipientId: scan.selectedDeal.buyer.id,
          notificationType: "EMAIL",
          status: "PENDING",
          subject: `Contract Review Update: ${newStatus.replace("_", " ")}`,
          message: `Your contract review status has changed from ${oldStatus} to ${newStatus}.\n\nLog in to view the details.`,
        },
      })

      try {
        if (scan.selectedDeal.buyer.email) {
          await emailService.sendNotification(
            scan.selectedDeal.buyer.email,
            "Contract Shield Status Changed",
            `Your contract shield status has changed from ${oldStatus} to ${newStatus}.`,
            "Review Contract",
            `${process.env['NEXT_PUBLIC_APP_URL']}/buyer/contracts`
          )

          await prisma.contractShieldNotification.update({
            where: { id: notification.id },
            data: { status: "SENT", sentAt: new Date() },
          })
        }
      } catch (error) {
        await prisma.contractShieldNotification.update({
          where: { id: notification.id },
          data: {
            status: "FAILED",
            failedReason: error instanceof Error ? error.message : "Unknown error",
          },
        })
      }
    }

    // Notify dealer
    if (scan.selectedDeal.dealer?.id) {
      const notification = await prisma.contractShieldNotification.create({
        data: {
          scanId,
          recipientId: scan.selectedDeal.dealer.id,
          notificationType: "EMAIL",
          status: "PENDING",
          subject: `Contract Review Update: ${newStatus.replace("_", " ")}`,
          message: `A contract review status has changed from ${oldStatus} to ${newStatus}.`,
        },
      })

      try {
        if (scan.selectedDeal.dealer.email) {
          await emailService.sendNotification(
            scan.selectedDeal.dealer.email,
            "Contract Shield Status Changed",
            `Contract shield status has changed from ${oldStatus} to ${newStatus}.`,
            "Review Contract",
            `${process.env['NEXT_PUBLIC_APP_URL']}/dealer/contracts`
          )

          await prisma.contractShieldNotification.update({
            where: { id: notification.id },
            data: { status: "SENT", sentAt: new Date() },
          })
        }
      } catch (error) {
        await prisma.contractShieldNotification.update({
          where: { id: notification.id },
          data: {
            status: "FAILED",
            failedReason: error instanceof Error ? error.message : "Unknown error",
          },
        })
      }
    }
  }

  // ============================================
  // Configurable Rules Engine
  // ============================================
  static async getActiveRules() {
    return prisma.contractShieldRule.findMany({
      where: { enabled: true },
      orderBy: { ruleName: "asc" },
    })
  }

  static async updateRule(
    ruleId: string,
    updates: {
      enabled?: boolean
      thresholdValue?: number
      severity?: string
      configJson?: Record<string, any>
    },
  ) {
    const rule = await prisma.contractShieldRule.update({
      where: { id: ruleId },
      data: updates,
    })

    logger.info("Contract Shield rule updated", {
      ruleId,
      updates,
    })

    return rule
  }

  static async initializeDefaultRules() {
    const defaultRules = [
      {
        ruleKey: "APR_THRESHOLD",
        ruleName: "APR Variance Threshold",
        ruleDescription: "Maximum allowed difference between offered and contract APR",
        ruleType: "THRESHOLD",
        severity: "CRITICAL",
        thresholdValue: 0.5, // 0.5%
        enabled: true,
      },
      {
        ruleKey: "OTD_THRESHOLD",
        ruleName: "Out-the-Door Price Threshold",
        ruleDescription: "Maximum allowed dollar difference in OTD price",
        ruleType: "THRESHOLD",
        severity: "CRITICAL",
        thresholdValue: 100, // $100
        enabled: true,
      },
      {
        ruleKey: "DOC_FEE_CA_MAX",
        ruleName: "California Doc Fee Maximum",
        ruleDescription: "Maximum allowed documentation fee in California",
        ruleType: "THRESHOLD",
        severity: "CRITICAL",
        thresholdValue: 85,
        enabled: true,
        configJson: { state: "CA" },
      },
      {
        ruleKey: "ADD_ON_ALERT",
        ruleName: "Optional Add-On Alert",
        ruleDescription: "Flag contracts with optional add-ons for buyer review",
        ruleType: "ALERT",
        severity: "IMPORTANT",
        enabled: true,
        configJson: {
          flaggedItems: FLAGGED_ADD_ONS,
        },
      },
      {
        ruleKey: "PAYMENT_VARIANCE",
        ruleName: "Monthly Payment Variance",
        ruleDescription: "Maximum allowed dollar difference in monthly payment",
        ruleType: "THRESHOLD",
        severity: "CRITICAL",
        thresholdValue: 5, // $5
        enabled: true,
      },
    ]

    for (const rule of defaultRules) {
      await prisma.contractShieldRule.upsert({
        where: { ruleKey: rule.ruleKey },
        update: {},
        create: rule,
      })
    }

    logger.info("Contract Shield default rules initialized")
  }

  // ============================================
  // Automated Reconciliation Jobs
  // ============================================
  static async runReconciliationJob(jobType: "SYNC_STATUSES" | "CHECK_STALE_SCANS" | "NOTIFY_PENDING") {
    const job = await prisma.contractShieldReconciliation.create({
      data: {
        jobType,
        status: "RUNNING",
        startedAt: new Date(),
      },
    })

    try {
      let itemsProcessed = 0
      let itemsUpdated = 0
      let itemsFailed = 0

      if (jobType === "SYNC_STATUSES") {
        // Sync scan statuses with deal statuses
        const scans = await prisma.contractShieldScan.findMany({
          where: {
            status: { in: ["PASS", "FAIL"] },
          },
          include: { selectedDeal: true },
        })

        for (const scan of scans) {
          itemsProcessed++
          if (scan.selectedDeal) {
            const expectedDealStatus = scan.status === "PASS" ? "CONTRACT_APPROVED" : "CONTRACT_REVIEW"
            if (scan.selectedDeal.status !== expectedDealStatus) {
              try {
                await prisma.selectedDeal.update({
                  where: { id: scan.selectedDealId! },
                  data: { status: expectedDealStatus },
                })
                itemsUpdated++
              } catch (error) {
                itemsFailed++
              }
            }
          }
        }
      } else if (jobType === "CHECK_STALE_SCANS") {
        // Find scans stuck in RUNNING for > 1 hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
        const staleScans = await prisma.contractShieldScan.findMany({
          where: {
            status: "RUNNING",
            scannedAt: { lt: oneHourAgo },
          },
        })

        for (const scan of staleScans) {
          itemsProcessed++
          try {
            await prisma.contractShieldScan.update({
              where: { id: scan.id },
              data: {
                status: "REVIEW_READY",
                summary: "Scan timed out and was automatically moved to review.",
              },
            })
            itemsUpdated++
          } catch (error) {
            itemsFailed++
          }
        }
      } else if (jobType === "NOTIFY_PENDING") {
        // Send notifications for pending acknowledgments
        const pendingOverrides = await prisma.contractShieldOverride.findMany({
          where: {
            buyerAcknowledged: false,
            createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // > 24 hours old
          },
          include: {
            scan: {
              include: {
                selectedDeal: {
                  include: { buyer: true },
                },
              },
            },
          },
        })

        for (const override of pendingOverrides) {
          itemsProcessed++
          if (override.scan.selectedDeal?.buyer?.id) {
            try {
              await this.sendOverrideNotification(
                override.scan.selectedDeal.buyer.id,
                override.scanId,
                override.id,
                override.action,
                override.reason,
              )
              itemsUpdated++
            } catch (error) {
              itemsFailed++
            }
          }
        }
      }

      await prisma.contractShieldReconciliation.update({
        where: { id: job.id },
        data: {
          status: "COMPLETED",
          itemsProcessed,
          itemsUpdated,
          itemsFailed,
          completedAt: new Date(),
          resultSummary: {
            jobType,
            itemsProcessed,
            itemsUpdated,
            itemsFailed,
          },
        },
      })

      logger.info("Reconciliation job completed", {
        jobId: job.id,
        jobType,
        itemsProcessed,
        itemsUpdated,
        itemsFailed,
      })

      return job
    } catch (error) {
      await prisma.contractShieldReconciliation.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          errorLog: error instanceof Error ? error.message : "Unknown error",
        },
      })

      logger.error("Reconciliation job failed", {
        jobId: job.id,
        jobType,
        error: error instanceof Error ? error.message : "Unknown error",
      })

      throw error
    }
  }

  // ============================================
  // Overrides Ledger Query
  // ============================================
  static async getOverridesLedger(filters?: {
    scanId?: string
    adminId?: string
    buyerAcknowledged?: boolean
    startDate?: Date
    endDate?: Date
  }) {
    return prisma.contractShieldOverride.findMany({
      where: {
        ...(filters?.scanId && { scanId: filters.scanId }),
        ...(filters?.adminId && { adminId: filters.adminId }),
        ...(filters?.buyerAcknowledged !== undefined && { buyerAcknowledged: filters.buyerAcknowledged }),
        ...(filters?.startDate && { createdAt: { gte: filters.startDate } }),
        ...(filters?.endDate && { createdAt: { lte: filters.endDate } }),
      },
      include: {
        admin: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        scan: {
          include: {
            selectedDeal: {
              include: {
                buyer: {
                  select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                  },
                },
                inventoryItem: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })
  }

  // ============================================
  // Helper Methods
  // ============================================
  private static generateSummary(items: any[], status: ScanStatus): string {
    if (status === "PASS") {
      return "Our review didn't find any items that need attention. You should still review the contract carefully before signing."
    }

    const criticalCount = items.filter((i) => i.severity === "CRITICAL").length
    const importantCount = items.filter((i) => i.severity === "IMPORTANT").length
    const reviewCount = items.filter((i) => i.severity === "REVIEW").length

    let summary = `We found ${items.length} item(s) you may want to review: `

    const parts = []
    if (criticalCount > 0) parts.push(`${criticalCount} that need attention`)
    if (importantCount > 0) parts.push(`${importantCount} worth discussing`)
    if (reviewCount > 0) parts.push(`${reviewCount} informational`)

    summary += parts.join(", ") + "."
    summary += " Review these with the dealer before signing."

    return summary
  }

  private static async logEvent(dealId: string, eventType: string, details: Record<string, any>) {
    try {
      await prisma.complianceEvent.create({
        data: {
          dealId,
          eventType,
          details: details as Record<string, unknown>,
        },
      })
    } catch (error) {
      logger.error("Failed to log event:", error)
    }
  }

  // ============================================
  // Query Methods
  // ============================================
  static async getScanWithDetails(scanId: string) {
    return prisma.contractShieldScan.findUnique({
      where: { id: scanId },
      include: {
        fixList: true,
        selectedDeal: {
          include: {
            buyer: { include: { profile: true } },
            dealer: true,
            offer: true,
            inventoryItem: true,
          },
        },
      },
    })
  }

  static async getScanByDealId(dealId: string) {
    return prisma.contractShieldScan.findFirst({
      where: { selectedDealId: dealId },
      include: { fixList: true },
    })
  }

  static async getDocumentsByDealId(dealId: string) {
    return prisma.contractDocument.findMany({
      where: { dealId },
      orderBy: { createdAt: "desc" },
    })
  }

  static async uploadContract(dealId: string, dealerId: string, documentUrl: string, documentType: string) {
    // Delegate to uploadDocument which handles versioning, scan initialization, and audit logging
    return ContractShieldService.uploadDocument(
      dealId,
      dealerId,
      documentUrl,
      documentType as DocumentType,
    )
  }
}

export const contractShieldService = new ContractShieldService()
