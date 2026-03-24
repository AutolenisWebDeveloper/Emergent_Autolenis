import { type NextRequest, NextResponse } from "next/server"
import { requireAuth, isAdminRole } from "@/lib/auth-server"
import { createClient } from "@/lib/supabase/server"
import { isTestWorkspace } from "@/lib/app-mode"
import { mockSelectors } from "@/lib/mocks/mockStore"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

export async function GET(_request: NextRequest, { params }: { params: Promise<{ affiliateId: string }> }) {
  try {
    const session = await requireAuth()
    if (!session || !isAdminRole(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { affiliateId } = await params

    if (isTestWorkspace(session)) {
      const data = mockSelectors.adminAffiliateDetail(affiliateId)
      if (!data) {
        return NextResponse.json({ error: "Affiliate not found" }, { status: 404 })
      }
      return NextResponse.json(data)
    }

    const supabase = await createClient()
    const workspace_id = session.workspace_id

    const { data: affiliate, error } = await supabase
      .from("Affiliate")
      .select(
        `
        *,
        user:User!Affiliate_userId_fkey(email, first_name, last_name),
        referrals:Referral(*),
        commissions:Commission(*),
        clicks:Click(*),
        payouts:Payout(*),
        documents:AffiliateDocument(*)
      `,
      )
      .eq("id", affiliateId)
      .eq("workspaceId", workspace_id)
      .single()

    if (error || !affiliate) {
      return NextResponse.json({ error: "Affiliate not found" }, { status: 404 })
    }

    // Fetch audit logs related to this affiliate
    const { data: auditLogs } = await supabase
      .from("AdminAuditLog")
      .select("*")
      .or(`details->>entityId.eq.${affiliateId},details->>affiliateId.eq.${affiliateId}`)
      .order("createdAt", { ascending: false })
      .limit(50)

    const { data: complianceEvents } = await supabase
      .from("ComplianceEvent")
      .select("*")
      .eq("entityId", affiliateId)
      .order("createdAt", { ascending: false })
      .limit(50)

    const totalClicks = affiliate.clicks?.length || 0
    const totalReferrals = affiliate.referrals?.length || 0
    const conversionRate = totalClicks > 0 ? (totalReferrals / totalClicks) * 100 : 0

    return NextResponse.json({
      affiliate: {
        id: affiliate.id,
        userId: affiliate.userId,
        status: affiliate.referralCode ? "ACTIVE" : "PENDING",
        referralCode: affiliate.referralCode,
        totalReferrals,
        totalEarnings: affiliate.totalEarnings || 0,
        pendingEarnings: affiliate.pendingEarnings || 0,
        paidEarnings: Math.max(0, (affiliate.totalEarnings || 0) - (affiliate.pendingEarnings || 0)),
        createdAt: affiliate.createdAt,
        totalClicks,
        conversionRate,
        user: affiliate.user
          ? {
              email: affiliate.user.email,
              firstName: affiliate.user.first_name,
              lastName: affiliate.user.last_name,
            }
          : null,
        bankDetails: null,
      },
      referrals: affiliate.referrals || [],
      commissions: affiliate.commissions || [],
      clicks: affiliate.clicks || [],
      payouts: (affiliate.payouts || []).map((p: any) => ({
        id: p.id,
        amount: p.total_amount_cents || p.totalAmountCents || p.amountCents || 0,
        status: p.status,
        method: p.provider || p.paymentMethod || null,
        providerRef: p.provider_ref || p.providerRef || p.paymentId || null,
        createdAt: p.createdAt,
        paidAt: p.paidAt || p.paid_timestamp || null,
      })),
      documents: affiliate.documents || [],
      auditLogs: auditLogs || [],
      complianceEvents: complianceEvents || [],
    })
  } catch (error: any) {
    if (error?.statusCode === 401 || error?.statusCode === 403) {
      return NextResponse.json({ error: error.statusCode === 403 ? "Forbidden" : "Unauthorized" }, { status: error.statusCode })
    }
    const correlationId = crypto.randomUUID()
    logger.error("[Admin Affiliate Detail API] Error:", error, { correlationId })
    return NextResponse.json({ error: "Failed to fetch affiliate", correlationId }, { status: 500 })
  }
}
