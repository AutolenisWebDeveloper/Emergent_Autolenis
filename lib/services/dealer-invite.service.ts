import { prisma } from "@/lib/prisma"
import { createHash, randomBytes } from "crypto"

/**
 * Dealer Invite Service
 * Manage dealer invite tokens and the invite flow.
 */

const DEFAULT_PAGE = 1
const DEFAULT_PER_PAGE = 20
const DEFAULT_EXPIRY_HOURS = 72

export async function createInvite(params: {
  prospectId?: string
  dealerId?: string
  dealerEmail?: string
  dealerName?: string
  dealerPhone?: string
  buyerRequestId?: string
  coverageGapTaskId?: string
  expiryHours?: number
}): Promise<{ invite: unknown; token: string }> {
  if (!params.dealerEmail && !params.prospectId && !params.dealerId) {
    throw new Error("At least one of dealerEmail, prospectId, or dealerId is required")
  }

  const rawToken = randomBytes(32).toString("hex")
  const tokenHash = createHash("sha256").update(rawToken).digest("hex")
  const expiryHours = params.expiryHours ?? DEFAULT_EXPIRY_HOURS

  const invite = await prisma.dealerIntelligenceInvite.create({
    data: {
      prospectId: params.prospectId ?? null,
      dealerId: params.dealerId ?? null,
      dealerEmail: params.dealerEmail ?? null,
      dealerName: params.dealerName ?? null,
      dealerPhone: params.dealerPhone ?? null,
      buyerRequestId: params.buyerRequestId ?? null,
      coverageGapTaskId: params.coverageGapTaskId ?? null,
      tokenHash,
      tokenExpiresAt: new Date(Date.now() + expiryHours * 60 * 60 * 1000),
      status: "sent",
    },
  })

  return { invite, token: rawToken }
}

export async function validateToken(token: string) {
  if (!token) throw new Error("token is required")

  const tokenHash = createHash("sha256").update(token).digest("hex")

  const invite = await prisma.dealerIntelligenceInvite.findUnique({
    where: { tokenHash },
  })

  if (!invite) throw new Error("Invalid token")
  if (invite.tokenExpiresAt < new Date()) throw new Error("Token has expired")
  if (invite.status === "expired") throw new Error("Token has expired")
  if (invite.respondedAt) throw new Error("Token has already been used")

  return invite
}

export async function markViewed(token: string) {
  if (!token) throw new Error("token is required")

  const tokenHash = createHash("sha256").update(token).digest("hex")

  const invite = await prisma.dealerIntelligenceInvite.findUnique({
    where: { tokenHash },
  })
  if (!invite) throw new Error("Invalid token")

  return prisma.dealerIntelligenceInvite.update({
    where: { id: invite.id },
    data: { viewedAt: new Date() },
  })
}

export async function markResponded(token: string) {
  if (!token) throw new Error("token is required")

  const tokenHash = createHash("sha256").update(token).digest("hex")

  const invite = await prisma.dealerIntelligenceInvite.findUnique({
    where: { tokenHash },
  })
  if (!invite) throw new Error("Invalid token")

  return prisma.dealerIntelligenceInvite.update({
    where: { id: invite.id },
    data: { respondedAt: new Date(), status: "responded" },
  })
}

export async function getInvites(filters: {
  status?: string
  prospectId?: string
  page?: number
  perPage?: number
}): Promise<{ invites: unknown[]; total: number; page: number; perPage: number }> {
  const page = Math.max(1, filters.page ?? DEFAULT_PAGE)
  const perPage = Math.min(100, Math.max(1, filters.perPage ?? DEFAULT_PER_PAGE))

  const where: Record<string, unknown> = {}
  if (filters.status) where.status = filters.status
  if (filters.prospectId) where.prospectId = filters.prospectId

  const [invites, total] = await Promise.all([
    prisma.dealerIntelligenceInvite.findMany({
      where,
      orderBy: { sentAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: { prospect: { select: { id: true, businessName: true } } },
    }),
    prisma.dealerIntelligenceInvite.count({ where }),
  ])

  return { invites, total, page, perPage }
}

export async function getInviteById(inviteId: string) {
  if (!inviteId) throw new Error("inviteId is required")

  const invite = await prisma.dealerIntelligenceInvite.findUnique({
    where: { id: inviteId },
    include: {
      prospect: { select: { id: true, businessName: true, status: true } },
      quickOffers: true,
    },
  })
  if (!invite) throw new Error(`Invite not found: ${inviteId}`)
  return invite
}

export async function expireStaleInvites(): Promise<number> {
  const result = await prisma.dealerIntelligenceInvite.updateMany({
    where: {
      tokenExpiresAt: { lt: new Date() },
      status: "sent",
      respondedAt: null,
    },
    data: { status: "expired" },
  })

  return result.count
}
