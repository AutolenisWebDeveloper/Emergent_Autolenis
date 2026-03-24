import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: Request) {
  try {
    const session = await requireAuth(["ADMIN", "SUPER_ADMIN"])
    const { searchParams } = new URL(request.url)
    const q = searchParams.get("q")?.trim()

    if (!q || q.length < 2) {
      return NextResponse.json({ results: [] })
    }

    const supabase = createAdminClient()
    const workspaceId = session.workspace_id
    const pattern = `%${q}%`
    const results: { type: string; items: { id: string; label: string; sub?: string; href: string }[] }[] = []

    // Search Buyers (by name, email, phone — searches User table with BuyerProfile join)
    try {
      let query = supabase
        .from("User")
        .select("id, email, first_name, last_name, BuyerProfile(id, firstName, lastName, phone)")
        .eq("role", "BUYER")
        .or(`email.ilike.${pattern},first_name.ilike.${pattern},last_name.ilike.${pattern}`)
        .limit(5)
      if (workspaceId) {
        query = query.eq("workspaceId", workspaceId)
      }
      const { data: buyerUsers } = await query
      if (buyerUsers && buyerUsers.length > 0) {
        results.push({
          type: "Buyers",
          items: buyerUsers.map((u: any) => {
            const profile = Array.isArray(u.BuyerProfile) ? u.BuyerProfile[0] : u.BuyerProfile
            const name = `${profile?.firstName || u.first_name || ""} ${profile?.lastName || u.last_name || ""}`.trim()
            return {
              id: u.id,
              label: name || u.email,
              sub: u.email,
              href: `/admin/buyers/${u.id}`,
            }
          }),
        })
      }
    } catch {
      // Buyer search failed, continue
    }

    // Search Dealers
    try {
      let query = supabase
        .from("Dealer")
        .select("id, name, businessName")
        .or(`name.ilike.${pattern},businessName.ilike.${pattern}`)
        .limit(5)
      if (workspaceId) {
        query = query.eq("workspaceId", workspaceId)
      }
      const { data: dealers } = await query
      if (dealers && dealers.length > 0) {
        results.push({
          type: "Dealers",
          items: dealers.map((d: any) => ({
            id: d.id,
            label: d.businessName || d.name || d.id,
            sub: d.name !== d.businessName ? d.name : undefined,
            href: `/admin/dealers/${d.id}`,
          })),
        })
      }
    } catch {
      // Dealer search failed, continue
    }

    // Search Affiliates (by name, email, referral code — searches User table with Affiliate join)
    try {
      let query = supabase
        .from("User")
        .select("id, email, first_name, last_name, Affiliate(id, firstName, lastName, referralCode)")
        .eq("role", "AFFILIATE")
        .or(`email.ilike.${pattern},first_name.ilike.${pattern},last_name.ilike.${pattern}`)
        .limit(5)
      if (workspaceId) {
        query = query.eq("workspaceId", workspaceId)
      }
      const { data: affiliateUsers } = await query
      if (affiliateUsers && affiliateUsers.length > 0) {
        results.push({
          type: "Affiliates",
          items: affiliateUsers.map((u: any) => {
            const aff = Array.isArray(u.Affiliate) ? u.Affiliate[0] : u.Affiliate
            const name = `${aff?.firstName || u.first_name || ""} ${aff?.lastName || u.last_name || ""}`.trim()
            return {
              id: aff?.id || u.id,
              label: name || u.email,
              sub: aff?.referralCode || u.email,
              href: `/admin/affiliates/${aff?.id || u.id}`,
            }
          }),
        })
      }
    } catch {
      // Affiliate search failed, continue
    }

    // Search Deals
    try {
      let query = supabase
        .from("SelectedDeal")
        .select("id, status")
        .or(`id.ilike.${pattern},status.ilike.${pattern}`)
        .limit(5)
      if (workspaceId) {
        query = query.eq("workspaceId", workspaceId)
      }
      const { data: deals } = await query
      if (deals && deals.length > 0) {
        results.push({
          type: "Deals",
          items: deals.map((d: any) => ({
            id: d.id,
            label: d.id,
            sub: d.status || undefined,
            href: `/admin/deals/${d.id}`,
          })),
        })
      }
    } catch {
      // Deal search failed, continue
    }

    // Search Users (by email)
    try {
      let query = supabase
        .from("User")
        .select("id, email, role, first_name, last_name")
        .or(`email.ilike.${pattern},first_name.ilike.${pattern},last_name.ilike.${pattern}`)
        .limit(5)
      if (workspaceId) {
        query = query.eq("workspaceId", workspaceId)
      }
      const { data: users } = await query
      if (users && users.length > 0) {
        results.push({
          type: "Users",
          items: users.map((u: any) => ({
            id: u.id,
            label: `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email,
            sub: `${u.email} (${u.role})`,
            href: `/admin/users/${u.id}`,
          })),
        })
      }
    } catch {
      // User search failed, continue
    }

    return NextResponse.json({ results })
  } catch (error: any) {
    if (error?.statusCode === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error?.statusCode === 403) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    return NextResponse.json({ error: "Search failed" }, { status: 500 })
  }
}
