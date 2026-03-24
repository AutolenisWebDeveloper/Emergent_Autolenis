import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { InventoryService, type SearchFilters } from "@/lib/services/inventory.service"
import { searchInventory, type SearchParams } from "@/lib/services/inventory-search.service"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

// GET /api/buyer/inventory/search - Search inventory with budget filtering
// Supports dual-lane search: verified inventory first, market inventory second.
// Accepts ?source=all|verified|market to control which lane(s) to search.
// Supports approval-aware filtering: autolenis prequal, external approval, or cash.
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || user.role !== "BUYER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const sourceFilter = (searchParams.get("source") ?? "all") as "all" | "verified" | "market"

    // Parse filters from query params
    const filters = {
      makes: searchParams.get("makes")?.split(",").filter(Boolean),
      models: searchParams.get("models")?.split(",").filter(Boolean),
      bodyStyles: searchParams.get("bodyStyles")?.split(",").filter(Boolean),
      minYear: searchParams.get("minYear") ? Number.parseInt(searchParams.get("minYear")!, 10) : undefined,
      maxYear: searchParams.get("maxYear") ? Number.parseInt(searchParams.get("maxYear")!, 10) : undefined,
      minPriceCents: searchParams.get("minPrice")
        ? Number.parseInt(searchParams.get("minPrice")!, 10) * 100
        : undefined,
      maxPriceCents: searchParams.get("maxPrice")
        ? Number.parseInt(searchParams.get("maxPrice")!, 10) * 100
        : undefined,
      minMileage: searchParams.get("minMileage") ? Number.parseInt(searchParams.get("minMileage")!, 10) : undefined,
      maxMileage: searchParams.get("maxMileage") ? Number.parseInt(searchParams.get("maxMileage")!, 10) : undefined,
      isNew: searchParams.get("isNew") ? searchParams.get("isNew") === "true" : undefined,
      sortBy: (["price_asc", "price_desc", "year_desc", "year_asc", "mileage_asc", "mileage_desc"] as const).includes(searchParams.get("sortBy") as never)
        ? (searchParams.get("sortBy") as SearchFilters["sortBy"])
        : undefined,
      page: searchParams.get("page") ? Number.parseInt(searchParams.get("page")!, 10) : 1,
      pageSize: searchParams.get("pageSize") ? Number.parseInt(searchParams.get("pageSize")!, 10) : 20,
      budgetOnly: searchParams.get("budgetOnly") === "true",
    }

    // ── Resolve buyer budget from multiple readiness paths ──
    let buyerMaxOtdCents: number | undefined
    let approvalType: "autolenis" | "external" | "cash" | undefined

    const supabase = await createClient()

    if (filters.budgetOnly) {
      // 1. Try AutoLenis pre-qualification first
      const { data: prequal } = await supabase
        .from("PreQualification")
        .select("maxOtdAmountCents, maxOtd")
        .eq("buyerId", user.userId)
        .gt("expiresAt", new Date().toISOString())
        .eq("prequalStatus", "APPROVED")
        .order("createdAt", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (prequal?.maxOtdAmountCents) {
        buyerMaxOtdCents = prequal.maxOtdAmountCents
        approvalType = "autolenis"
      } else if (prequal?.maxOtd) {
        buyerMaxOtdCents = Math.round(prequal.maxOtd * 100)
        approvalType = "autolenis"
      }

      // 2. Try external pre-approval if no AutoLenis prequal
      if (!buyerMaxOtdCents) {
        const { data: extApproval } = await supabase
          .from("external_preapproval_submissions")
          .select("approved_amount, max_otd_amount_cents, expires_at, status")
          .eq("buyer_id", user.userId)
          .eq("status", "APPROVED")
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()

        if (extApproval) {
          buyerMaxOtdCents = extApproval.max_otd_amount_cents
            ?? Math.round((extApproval.approved_amount ?? 0) * 100)
          approvalType = "external"
        }
      }

      // 3. Try cash buyer budget from buyer preferences
      if (!buyerMaxOtdCents) {
        const { data: prefs } = await supabase
          .from("BuyerPreferences")
          .select("maxBudgetCents")
          .eq("buyerId", user.userId)
          .maybeSingle()

        if (prefs?.maxBudgetCents) {
          buyerMaxOtdCents = prefs.maxBudgetCents
          approvalType = "cash"
        }
      }

      // If budgetOnly requested but no budget found from any source
      if (!buyerMaxOtdCents) {
        return NextResponse.json(
          { error: "No active pre-qualification, external approval, or cash budget found." },
          { status: 400 },
        )
      }
    }

    // ── Dual-lane search: verified first, market second ──
    if (sourceFilter !== "all" || searchParams.has("source")) {
      // Use the new inventory intelligence search service for dual-lane queries
      const intelligenceParams: SearchParams = {
        make: filters.makes?.[0],
        model: filters.models?.[0],
        yearMin: filters.minYear,
        yearMax: filters.maxYear,
        priceMin: filters.minPriceCents,
        priceMax: filters.maxPriceCents ?? buyerMaxOtdCents,
        bodyStyle: filters.bodyStyles?.[0],
        source: sourceFilter,
        sortBy: filters.sortBy,
        page: filters.page,
        perPage: filters.pageSize,
        maxBudgetCents: buyerMaxOtdCents,
      }

      const dualResult = await searchInventory(intelligenceParams)

      return NextResponse.json({
        success: true,
        data: { items: dualResult.results, total: dualResult.total },
        page: dualResult.page,
        perPage: dualResult.perPage,
        budgetMaxOtdCents: buyerMaxOtdCents,
        approvalType,
        sourceFilter,
      })
    }

    // ── Standard verified-only search (existing flow) ──
    const result = await InventoryService.search(filters, buyerMaxOtdCents)

    return NextResponse.json({
      success: true,
      ...result,
      budgetMaxOtdCents: buyerMaxOtdCents,
      approvalType,
      sourceFilter: "verified",
    })
  } catch (error) {
    console.error("[v0] Buyer search error:", error)
    return NextResponse.json({ error: "Failed to search inventory" }, { status: 500 })
  }
}
