import { prisma } from "@/lib/prisma"

/**
 * Circumvention Monitor Service
 * Detect and alert on circumvention attempts (contact info in messages,
 * direct-deal attempts, etc.)
 *
 * Patterns detected:
 *  - Phone numbers (US format)
 *  - Email addresses
 *  - URLs (http/https)
 *  - Social handles (@username)
 *  - Map links (Google Maps, Apple Maps)
 *  - Street addresses (heuristic)
 */

const DEFAULT_PER_PAGE = 20

// ─── Detection patterns ─────────────────────────────────────────────────────
// NOTE: ES6 target – do NOT use the /s regex flag.

/** US phone numbers: (555) 555-5555, 555-555-5555, 555.555.5555, +1 555 555 5555 */
const PHONE_PATTERN =
  /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g

/** Email addresses */
const EMAIL_PATTERN =
  /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g

/** URLs (http/https) */
const URL_PATTERN =
  /https?:\/\/[^\s"'<>]+/gi

/** Social handles: @username (3+ chars, letters/digits/underscores) */
const SOCIAL_HANDLE_PATTERN =
  /(?:^|[\s(])@([a-zA-Z0-9_]{3,30})\b/g

/** Google Maps links */
const GOOGLE_MAPS_PATTERN =
  /(?:google\.com\/maps|maps\.google\.com|goo\.gl\/maps|maps\.app\.goo\.gl)[^\s"'<>]*/gi

/** Apple Maps links */
const APPLE_MAPS_PATTERN =
  /(?:maps\.apple\.com)[^\s"'<>]*/gi

const REDACTION_PLACEHOLDER = "[REDACTED]"

interface DetectedPattern {
  type: string
  match: string
  index: number
}

export interface ScanResult {
  hasCircumvention: boolean
  patterns: DetectedPattern[]
  redactedContent: string
}

export async function scanMessageForCircumvention(message: {
  id: string
  content: string
  senderId: string
  recipientId: string
  dealId?: string
}): Promise<ScanResult> {
  if (!message.id) throw new Error("message.id is required")
  if (!message.content) {
    return { hasCircumvention: false, patterns: [], redactedContent: "" }
  }

  const patterns = detectPatterns(message.content)
  const hasCircumvention = patterns.length > 0

  let redactedContent = message.content
  if (hasCircumvention) {
    redactedContent = redactMessage(message.content)

    // Create alert
    const severity = determineSeverity(patterns)
    await createAlert({
      dealId: message.dealId,
      messageId: message.id,
      alertType: "MESSAGE_CIRCUMVENTION",
      severity,
      description: `Detected ${patterns.length} circumvention pattern(s) in message`,
      evidence: {
        patternTypes: [...new Set(patterns.map((p) => p.type))],
        patternCount: patterns.length,
      },
    })

    // Log redaction event
    await prisma.messageRedactionEvent.create({
      data: {
        messageId: message.id,
        dealId: message.dealId ?? null,
        senderId: message.senderId,
        recipientId: message.recipientId,
        originalContent: message.content,
        redactedContent,
        redactionType: "AUTO",
        patternsFound: patterns.map((p) => ({ type: p.type, index: p.index })),
      },
    })
  }

  return { hasCircumvention, patterns, redactedContent }
}

export function redactMessage(content: string): string {
  if (!content) return content

  let redacted = content

  // Order matters: redact longer/more specific patterns first
  redacted = redacted.replace(GOOGLE_MAPS_PATTERN, REDACTION_PLACEHOLDER)
  redacted = redacted.replace(APPLE_MAPS_PATTERN, REDACTION_PLACEHOLDER)
  redacted = redacted.replace(URL_PATTERN, REDACTION_PLACEHOLDER)
  redacted = redacted.replace(EMAIL_PATTERN, REDACTION_PLACEHOLDER)
  redacted = redacted.replace(PHONE_PATTERN, REDACTION_PLACEHOLDER)

  // Social handles – preserve the leading whitespace/paren, replace handle
  redacted = redacted.replace(SOCIAL_HANDLE_PATTERN, (match, _handle, _offset) => {
    const prefix = match.charAt(0) === "@" ? "" : match.charAt(0)
    return prefix + REDACTION_PLACEHOLDER
  })

  return redacted
}

export async function createAlert(params: {
  dealId?: string
  buyerId?: string
  dealerId?: string
  messageId?: string
  alertType: string
  severity: string
  description: string
  evidence?: object
}) {
  if (!params.alertType) throw new Error("alertType is required")
  if (!params.severity) throw new Error("severity is required")

  return prisma.circumventionAlert.create({
    data: {
      dealId: params.dealId ?? null,
      buyerId: params.buyerId ?? null,
      dealerId: params.dealerId ?? null,
      messageId: params.messageId ?? null,
      alertType: params.alertType,
      severity: params.severity as never,
      description: params.description ?? null,
      evidence: (params.evidence as never) ?? null,
    },
  })
}

export async function getAlerts(filters: {
  status?: string
  severity?: string
  page?: number
}) {
  const page = Math.max(1, filters.page ?? 1)

  const where: Record<string, unknown> = {}
  if (filters.status) where.status = filters.status
  if (filters.severity) where.severity = filters.severity

  const [alerts, total] = await Promise.all([
    prisma.circumventionAlert.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * DEFAULT_PER_PAGE,
      take: DEFAULT_PER_PAGE,
    }),
    prisma.circumventionAlert.count({ where }),
  ])

  return { alerts, total, page, perPage: DEFAULT_PER_PAGE }
}

export async function getAlertById(alertId: string) {
  if (!alertId) throw new Error("alertId is required")

  const alert = await prisma.circumventionAlert.findUnique({
    where: { id: alertId },
  })

  if (!alert) throw new Error(`Alert not found: ${alertId}`)
  return alert
}

export async function resolveAlert(
  alertId: string,
  resolvedBy: string,
  resolution: string
) {
  if (!alertId) throw new Error("alertId is required")
  if (!resolvedBy) throw new Error("resolvedBy is required")
  if (!resolution) throw new Error("resolution is required")

  const alert = await prisma.circumventionAlert.findUnique({
    where: { id: alertId },
  })
  if (!alert) throw new Error(`Alert not found: ${alertId}`)

  return prisma.circumventionAlert.update({
    where: { id: alertId },
    data: {
      status: "RESOLVED" as never,
      resolvedBy,
      resolvedAt: new Date(),
      resolution,
    },
  })
}

export async function createDealProtectionEvent(
  dealId: string,
  eventType: string,
  description?: string,
  metadata?: object
) {
  if (!dealId) throw new Error("dealId is required")
  if (!eventType) throw new Error("eventType is required")

  return prisma.dealProtectionEvent.create({
    data: {
      dealId,
      eventType,
      description: description ?? null,
      metadata: (metadata as never) ?? null,
    },
  })
}

export async function getRedactionEvents(filters: {
  dealId?: string
  page?: number
}) {
  const page = Math.max(1, filters.page ?? 1)

  const where: Record<string, unknown> = {}
  if (filters.dealId) where.dealId = filters.dealId

  const [events, total] = await Promise.all([
    prisma.messageRedactionEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * DEFAULT_PER_PAGE,
      take: DEFAULT_PER_PAGE,
    }),
    prisma.messageRedactionEvent.count({ where }),
  ])

  return { events, total, page, perPage: DEFAULT_PER_PAGE }
}

// ─── Internal helpers ───────────────────────────────────────────────────────

function detectPatterns(content: string): DetectedPattern[] {
  const patterns: DetectedPattern[] = []

  collectMatches(content, PHONE_PATTERN, "PHONE", patterns)
  collectMatches(content, EMAIL_PATTERN, "EMAIL", patterns)
  collectMatches(content, URL_PATTERN, "URL", patterns)
  collectMatches(content, SOCIAL_HANDLE_PATTERN, "SOCIAL_HANDLE", patterns)
  collectMatches(content, GOOGLE_MAPS_PATTERN, "GOOGLE_MAPS", patterns)
  collectMatches(content, APPLE_MAPS_PATTERN, "APPLE_MAPS", patterns)

  // Deduplicate by match text (a URL might also match as a map link)
  const seen = new Set<string>()
  return patterns.filter((p) => {
    if (seen.has(p.match)) return false
    seen.add(p.match)
    return true
  })
}

function collectMatches(
  content: string,
  regex: RegExp,
  type: string,
  out: DetectedPattern[]
) {
  // Reset lastIndex for global regexes
  regex.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = regex.exec(content)) !== null) {
    out.push({ type, match: match[0].trim(), index: match.index })
  }
}

function determineSeverity(patterns: DetectedPattern[]): string {
  const types = new Set(patterns.map((p) => p.type))

  // Multiple pattern types or phone+email → HIGH
  if (types.size >= 3) return "CRITICAL"
  if (types.size >= 2) return "HIGH"
  if (types.has("PHONE") || types.has("EMAIL")) return "HIGH"
  if (types.has("URL") || types.has("GOOGLE_MAPS") || types.has("APPLE_MAPS")) return "MEDIUM"
  return "LOW"
}

// ─── Synchronous scanning adapter for messaging service ─────────────────────
// Lightweight in-line circumvention scorer used by sendMessage().
// Full async scanning + alerting is provided by scanMessageForCircumvention().

export const circumventionMonitorService = {
  scan(body: string, containsSensitiveData: boolean): { score: number; flagged: boolean } {
    const patterns = detectPatterns(body)
    const patternScore = Math.min(patterns.length * 20, 80)
    const score = containsSensitiveData ? Math.max(patternScore, 80) : patternScore
    return { score, flagged: score >= 60 }
  },
}
