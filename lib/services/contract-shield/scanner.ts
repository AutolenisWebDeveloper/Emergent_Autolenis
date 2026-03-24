import { prisma } from "@/lib/db"
import { logEvent } from "./helpers"
import { getScanWithDetails } from "./queries"
import type { IssueSeverity, ScanIssueItem, ScanStatus } from "./types"
import { FLAGGED_ADD_ONS, STATE_DOC_FEE_REFERENCE } from "./types"
import { writeEventAsync } from "@/lib/services/event-ledger"
import { PlatformEventType, EntityType, ActorType } from "@/lib/services/event-ledger"

export async function scanContract(selectedDealId: string) {
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

  const items: ScanIssueItem[] = []

  // Run all checks
  const mathItems = await checkMathConsistency(deal, documents)
  items.push(...mathItems)

  const feeItems = await reviewFees(deal)
  items.push(...feeItems)

  const docItems = await checkDocumentCompleteness(documents)
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

  const summary = generateSummary(items, status)

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

  await logEvent(selectedDealId, "SCAN_COMPLETED", {
    scanId: scan.id,
    status,
    itemsCount: items.length,
    criticalCount,
    importantCount,
  })

  // Emit canonical event for contract scan completion
  const scanEventType = status === "PASS"
    ? PlatformEventType.CONTRACT_PASSED
    : status === "FAIL"
      ? PlatformEventType.CONTRACT_FAILED
      : PlatformEventType.CONTRACT_SCAN_COMPLETED
  writeEventAsync({
    eventType: scanEventType,
    entityType: EntityType.SCAN,
    entityId: scan.id,
    parentEntityId: selectedDealId,
    actorId: "SYSTEM",
    actorType: ActorType.SYSTEM,
    sourceModule: "contract-shield.scanner",
    correlationId: crypto.randomUUID(),
    idempotencyKey: `scan-${scan.id}-${status}`,
    payload: { status, criticalCount, importantCount, itemsCount: items.length },
  }).catch(() => { /* non-critical */ })

  return getScanWithDetails(scan.id)
}

export async function checkMathConsistency(deal: any, _documents: any[]) {
  const items: ScanIssueItem[] = []

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

export async function reviewFees(deal: any) {
  const items: ScanIssueItem[] = []

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

export async function checkDocumentCompleteness(documents: any[]) {
  const items: ScanIssueItem[] = []

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

export async function resolveFixItem(
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
      return scanContract(scan.selectedDealId)
    }
  }

  return fixItem
}

function generateSummary(items: any[], status: ScanStatus): string {
  if (status === "PASS") {
    return "Our review didn't find any items that need attention. You should still review the contract carefully before signing."
  }

  const criticalCount = items.filter((i: any) => i.severity === "CRITICAL").length
  const importantCount = items.filter((i: any) => i.severity === "IMPORTANT").length
  const reviewCount = items.filter((i: any) => i.severity === "REVIEW").length

  let summary = `We found ${items.length} item(s) you may want to review: `

  const parts = []
  if (criticalCount > 0) parts.push(`${criticalCount} that need attention`)
  if (importantCount > 0) parts.push(`${importantCount} worth discussing`)
  if (reviewCount > 0) parts.push(`${reviewCount} informational`)

  summary += parts.join(", ") + "."
  summary += " Review these with the dealer before signing."

  return summary
}
