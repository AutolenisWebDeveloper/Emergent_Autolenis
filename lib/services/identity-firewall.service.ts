import { prisma } from "@/lib/prisma"

/**
 * Identity Firewall Service
 * Manage identity masking and controlled release within deals.
 *
 * Identity lifecycle: ANONYMOUS → CONDITIONAL_HOLD → RELEASED
 *
 * Release conditions:
 *  1) Offer selected
 *  2) Deposit satisfied
 *  3) Dealer active (or onboarding gates met)
 *  4) Agreement accepted
 *  5) Deal committed
 */

const DEFAULT_PER_PAGE = 20

export async function createMaskedProfiles(params: {
  dealId: string
  buyerId: string
  dealerId?: string
  prospectId?: string
  buyerReadiness?: object
}): Promise<{ buyerProfile: unknown; dealerProfile: unknown | null }> {
  if (!params.dealId) throw new Error("dealId is required")
  if (!params.buyerId) throw new Error("buyerId is required")

  const buyerProfile = await prisma.maskedPartyProfile.create({
    data: {
      dealId: params.dealId,
      buyerId: params.buyerId,
      partyType: "BUYER",
      identityState: "ANONYMOUS",
      readinessPayload: (params.buyerReadiness as never) ?? null,
    },
  })

  let dealerProfile = null
  if (params.dealerId || params.prospectId) {
    dealerProfile = await prisma.maskedPartyProfile.create({
      data: {
        dealId: params.dealId,
        dealerId: params.dealerId ?? null,
        prospectId: params.prospectId ?? null,
        partyType: "DEALER",
        identityState: "ANONYMOUS",
      },
    })
  }

  return { buyerProfile, dealerProfile }
}

export async function getMaskedProfile(maskedId: string) {
  if (!maskedId) throw new Error("maskedId is required")

  const profile = await prisma.maskedPartyProfile.findUnique({
    where: { maskedId },
  })

  if (!profile) throw new Error(`Masked profile not found: ${maskedId}`)
  return profile
}

export async function getBuyerReadinessPayload(
  buyerId: string,
  dealId: string
): Promise<object | null> {
  if (!buyerId) throw new Error("buyerId is required")
  if (!dealId) throw new Error("dealId is required")

  const profile = await prisma.maskedPartyProfile.findFirst({
    where: { buyerId, dealId, partyType: "BUYER" },
    select: { readinessPayload: true, identityState: true },
  })

  if (!profile) return null

  // Only return readiness data when identity is still masked
  if (profile.identityState === "RELEASED") return null

  return (profile.readinessPayload as object) ?? null
}

interface ReleaseConditions {
  offerSelected: boolean
  depositSatisfied: boolean
  dealerActive: boolean
  agreementAccepted: boolean
  dealCommitted: boolean
  allConditionsMet: boolean
}

export async function evaluateIdentityRelease(
  dealId: string
): Promise<{ shouldRelease: boolean; conditions: ReleaseConditions }> {
  if (!dealId) throw new Error("dealId is required")

  const deal = await prisma.selectedDeal.findUnique({
    where: { id: dealId },
    include: {
      serviceFeePayment: true,
      contracts: true,
    },
  })

  if (!deal) throw new Error(`Deal not found: ${dealId}`)

  // 1) Offer selected – deal exists with an offerId or sourcedOfferId
  const offerSelected = !!(deal.offerId || deal.sourcedOfferId)

  // 2) Deposit satisfied – serviceFeePayment exists and is captured
  const depositSatisfied = !!(
    deal.serviceFeePayment && deal.serviceFeePayment.status === "CAPTURED"
  )

  // 3) Dealer active – dealer has been assigned
  const dealerActive = !!deal.dealerId

  // 4) Agreement accepted – at least one signed contract exists
  const agreementAccepted = deal.contracts.some(
    (c: { status: string }) => c.status === "SIGNED" || c.status === "EXECUTED"
  )

  // 5) Deal committed – deal status beyond SELECTED
  const committedStatuses = ["COMMITTED", "IN_PROGRESS", "COMPLETED", "FUNDED"]
  const dealCommitted = committedStatuses.includes(deal.status)

  const allConditionsMet =
    offerSelected &&
    depositSatisfied &&
    dealerActive &&
    agreementAccepted &&
    dealCommitted

  if (allConditionsMet) {
    await performRelease(dealId, "SYSTEM", "All release conditions met")
  }

  return {
    shouldRelease: allConditionsMet,
    conditions: {
      offerSelected,
      depositSatisfied,
      dealerActive,
      agreementAccepted,
      dealCommitted,
      allConditionsMet,
    },
  }
}

export async function forceIdentityRelease(
  dealId: string,
  performedBy: string,
  reason: string
) {
  if (!dealId) throw new Error("dealId is required")
  if (!performedBy) throw new Error("performedBy is required")
  if (!reason) throw new Error("reason is required for forced release")

  return performRelease(dealId, performedBy, `ADMIN OVERRIDE: ${reason}`)
}

export async function getIdentityState(
  dealId: string
): Promise<{ dealId: string; profiles: unknown[]; currentState: string }> {
  if (!dealId) throw new Error("dealId is required")

  const profiles = await prisma.maskedPartyProfile.findMany({
    where: { dealId },
  })

  // Determine overall state: most advanced state among profiles
  const states = profiles.map((p: { identityState: string }) => p.identityState)
  let currentState = "ANONYMOUS"
  if (states.includes("RELEASED")) {
    currentState = "RELEASED"
  } else if (states.includes("CONDITIONAL_HOLD")) {
    currentState = "CONDITIONAL_HOLD"
  }

  return { dealId, profiles, currentState }
}

export async function getIdentityReleaseEvents(filters: {
  dealId?: string
  page?: number
}) {
  const page = Math.max(1, filters.page ?? 1)

  const where: Record<string, unknown> = {}
  if (filters.dealId) where.dealId = filters.dealId

  const [events, total] = await Promise.all([
    prisma.identityReleaseEvent.findMany({
      where,
      orderBy: { releasedAt: "desc" },
      skip: (page - 1) * DEFAULT_PER_PAGE,
      take: DEFAULT_PER_PAGE,
    }),
    prisma.identityReleaseEvent.count({ where }),
  ])

  return { events, total, page, perPage: DEFAULT_PER_PAGE }
}

// ─── Internal helpers ───────────────────────────────────────────────────────

async function performRelease(dealId: string, triggeredBy: string, reason: string) {
  const profiles = await prisma.maskedPartyProfile.findMany({
    where: { dealId, identityState: { not: "RELEASED" } },
  })

  if (profiles.length === 0) return { released: 0 }

  const updates = profiles.map((p: { id: string }) =>
    prisma.maskedPartyProfile.update({
      where: { id: p.id },
      data: { identityState: "RELEASED" as never },
    })
  )

  const events = profiles.map((p: { buyerId: string | null; dealerId: string | null; identityState: string }) =>
    prisma.identityReleaseEvent.create({
      data: {
        dealId,
        buyerId: p.buyerId,
        dealerId: p.dealerId,
        previousState: p.identityState,
        newState: "RELEASED" as never,
        reason,
        triggeredBy,
      },
    })
  )

  await Promise.all([...updates, ...events])

  return { released: profiles.length }
}

// ─── Identity Firewall Text Scanner ─────────────────────────────────────────
// Synchronous PII detection and redaction for in-app messaging.
// Detects phone numbers, emails, URLs, social handles, and street addresses.

/** US phone numbers: (555) 555-5555, 555-555-5555, 555.555.5555, +1 555 555 5555 */
const PHONE_RE = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g

/** Email addresses */
const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g

/** URLs (http/https) */
const URL_RE = /https?:\/\/[^\s"'<>]+/gi

/** Social handles: @username (3+ chars) */
const SOCIAL_RE = /(?:^|[\s(])@([a-zA-Z0-9_]{3,30})\b/g

/** Platform-specific username patterns (instagram, snapchat, etc.) */
const PLATFORM_RE =
  /\b(?:instagram|snapchat|telegram|whatsapp|signal|facebook|tiktok|twitter|venmo|zelle|cashapp)[:\s]+[a-zA-Z0-9_.]{3,30}\b/gi

/** Street addresses: 1234 Main Street, 500 Oak Ave, etc. */
const ADDRESS_RE =
  /\b\d{1,5}\s+[a-zA-Z]+\s+(?:street|st|avenue|ave|boulevard|blvd|road|rd|drive|dr|lane|ln|way|court|ct|place|pl|circle|cir)\b/gi

const REDACTED = "[REDACTED]"

interface Detection {
  type: string
  original: string
  replacement: string
}

function collectMatches(body: string, regex: RegExp, type: string, out: Detection[]) {
  regex.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = regex.exec(body)) !== null) {
    out.push({ type, original: match[0].trim(), replacement: REDACTED })
  }
}

function redactText(body: string): string {
  let text = body
  text = text.replace(URL_RE, REDACTED)
  text = text.replace(EMAIL_RE, REDACTED)
  text = text.replace(PHONE_RE, REDACTED)
  text = text.replace(SOCIAL_RE, (m) => {
    const prefix = m.charAt(0) === "@" ? "" : m.charAt(0)
    return prefix + REDACTED
  })
  text = text.replace(PLATFORM_RE, REDACTED)
  text = text.replace(ADDRESS_RE, REDACTED)
  return text
}

export class IdentityFirewallService {
  scan(body: string): {
    containsSensitiveData: boolean
    detections: Detection[]
    redactedText: string
  } {
    if (!body) {
      return { containsSensitiveData: false, detections: [], redactedText: body || "" }
    }

    const detections: Detection[] = []

    collectMatches(body, PHONE_RE, "phone", detections)
    collectMatches(body, EMAIL_RE, "email", detections)
    collectMatches(body, URL_RE, "url", detections)

    // Social handles (@handle and platform:username patterns)
    SOCIAL_RE.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = SOCIAL_RE.exec(body)) !== null) {
      detections.push({ type: "social_handle", original: match[0].trim(), replacement: REDACTED })
    }
    PLATFORM_RE.lastIndex = 0
    while ((match = PLATFORM_RE.exec(body)) !== null) {
      detections.push({ type: "social_handle", original: match[0].trim(), replacement: REDACTED })
    }

    collectMatches(body, ADDRESS_RE, "address", detections)

    return {
      containsSensitiveData: detections.length > 0,
      detections,
      redactedText: detections.length > 0 ? redactText(body) : body,
    }
  }
}

export const identityFirewallService = new IdentityFirewallService()
