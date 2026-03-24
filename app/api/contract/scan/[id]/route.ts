import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { isAdminRole } from "@/lib/authz/roles"
import { DEALER_ROLES } from "@/lib/authz/guard"
import { ContractShieldService } from "@/lib/services/contract-shield.service"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

type ScanWithDetails = Awaited<ReturnType<typeof ContractShieldService.getScanWithDetails>>

async function verifyScanOwnership(scanId: string, userId: string, role: string): Promise<{ allowed: boolean; scan: ScanWithDetails }> {
  const scan = await ContractShieldService.getScanWithDetails(scanId)
  if (!scan) return { allowed: false, scan: null }

  const isAdmin = isAdminRole(role)
  if (isAdmin) return { allowed: true, scan }

  // Trace ownership through the deal
  const deal = await prisma.selectedDeal.findUnique({
    where: { id: scan.dealId },
    select: { buyerId: true, dealerId: true, user_id: true },
  })
  if (!deal) return { allowed: false, scan }

  const isBuyerOwner = deal.buyerId === userId || deal.user_id === userId
  const isDealerOwner = deal.dealerId === userId
  return { allowed: isBuyerOwner || isDealerOwner, scan }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const correlationId = crypto.randomUUID()

  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHENTICATED", message: "Authentication required" }, correlationId },
        { status: 401 },
      )
    }

    // Only dealers and admins can view scan details
    if (!(DEALER_ROLES as readonly string[]).includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const { allowed, scan } = await verifyScanOwnership(id, user.userId, user.role)

    if (!scan) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Scan not found" }, correlationId },
        { status: 404 },
      )
    }
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Ownership check: non-admin users must be associated with the deal
    if (!isAdminRole(user.role) && scan.selectedDeal) {
      const dealDealerId = (scan.selectedDeal as any).dealerId
      if (dealDealerId && dealDealerId !== user.workspace_id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    return NextResponse.json({
      success: true,
      data: { scan },
    })
  } catch (error: unknown) {
    console.error("[v0] Get scan error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Trigger re-scan
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const correlationId = crypto.randomUUID()

  try {
    const user = await getSessionUser()
    if (!user || !(DEALER_ROLES as readonly string[]).includes(user.role)) {
      return NextResponse.json(
        { error: { code: "UNAUTHENTICATED", message: "Authentication required" }, correlationId },
        { status: 401 },
      )
    }

    const { id } = await params
    const { allowed, scan: existingScan } = await verifyScanOwnership(id, user.userId, user.role)

    if (!existingScan || !existingScan.dealId) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 })
    }
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Ownership check: non-admin users must be associated with the deal
    if (!isAdminRole(user.role) && existingScan.selectedDeal) {
      const dealDealerId = (existingScan.selectedDeal as any).dealerId
      if (dealDealerId && dealDealerId !== user.workspace_id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    // Trigger re-scan
    const scan = await ContractShieldService.scanContract(existingScan.dealId)

    return NextResponse.json({
      success: true,
      data: { scan },
    })
  } catch (error: unknown) {
    console.error("[v0] Re-scan error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
