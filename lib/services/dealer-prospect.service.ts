import { prisma } from "@/lib/prisma"

/**
 * Dealer Prospect Service
 * Manage dealer prospecting workflow (delegates to dealer-discovery for queries).
 */

const DEFAULT_PAGE = 1
const DEFAULT_PER_PAGE = 20

export async function getProspects(filters: {
  status?: string
  zip?: string
  page?: number
  perPage?: number
}): Promise<{ prospects: unknown[]; total: number; page: number; perPage: number }> {
  const page = Math.max(1, filters.page ?? DEFAULT_PAGE)
  const perPage = Math.min(100, Math.max(1, filters.perPage ?? DEFAULT_PER_PAGE))

  const where: Record<string, unknown> = {}
  if (filters.status) where.status = filters.status
  if (filters.zip) where.zip = filters.zip

  const [prospects, total] = await Promise.all([
    prisma.dealerProspect.findMany({
      where,
      orderBy: { discoveredAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.dealerProspect.count({ where }),
  ])

  return { prospects, total, page, perPage }
}

export async function getProspectById(id: string) {
  if (!id) throw new Error("prospectId is required")

  const prospect = await prisma.dealerProspect.findUnique({
    where: { id },
    include: {
      sources: true,
      invites: { orderBy: { sentAt: "desc" }, take: 20 },
      quickOffers: { orderBy: { createdAt: "desc" }, take: 10 },
      conversions: { orderBy: { startedAt: "desc" }, take: 5 },
      lifecycleEvents: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  })
  if (!prospect) throw new Error(`Prospect not found: ${id}`)
  return prospect
}

export async function inviteProspect(
  prospectId: string,
  params: {
    email?: string
    phone?: string
    buyerRequestId?: string
    coverageGapTaskId?: string
  }
) {
  if (!prospectId) throw new Error("prospectId is required")

  const prospect = await prisma.dealerProspect.findUnique({
    where: { id: prospectId },
    select: { id: true, status: true, email: true, phone: true, businessName: true },
  })
  if (!prospect) throw new Error(`Prospect not found: ${prospectId}`)

  const email = params.email ?? prospect.email
  if (!email) throw new Error("No email provided or available on prospect record")

  const { createHash, randomBytes } = await import("crypto")
  const rawToken = randomBytes(32).toString("hex")
  const tokenHash = createHash("sha256").update(rawToken).digest("hex")

  const invite = await prisma.dealerIntelligenceInvite.create({
    data: {
      prospectId,
      tokenHash,
      tokenExpiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
      dealerEmail: email,
      dealerName: prospect.businessName,
      dealerPhone: params.phone ?? prospect.phone,
      buyerRequestId: params.buyerRequestId ?? null,
      coverageGapTaskId: params.coverageGapTaskId ?? null,
      status: "sent",
    },
  })

  // Update prospect status if still in DISCOVERED
  if (prospect.status === "DISCOVERED") {
    await prisma.dealerProspect.update({
      where: { id: prospectId },
      data: { status: "CONTACTED" as never },
    })
  }

  return { invite, token: rawToken }
}

export async function getProspectInvites(prospectId: string) {
  if (!prospectId) throw new Error("prospectId is required")

  const prospect = await prisma.dealerProspect.findUnique({
    where: { id: prospectId },
    select: { id: true },
  })
  if (!prospect) throw new Error(`Prospect not found: ${prospectId}`)

  return prisma.dealerIntelligenceInvite.findMany({
    where: { prospectId },
    orderBy: { sentAt: "desc" },
  })
}
