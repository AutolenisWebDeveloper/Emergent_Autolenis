import { getSupabase } from "@/lib/db"
import { logger } from "@/lib/logger"

// ---------------------------------------------------------------------------
// Executive dashboard — aggregates all analytics views into a single payload
// ---------------------------------------------------------------------------

export async function getExecutiveDashboard() {
  const supabase = getSupabase()

  const [inventory, leads, cases, invites, offers, conversions, ops] =
    await Promise.all([
      supabase.from("analytics_inventory_overview").select("*").single(),
      supabase.from("analytics_lead_funnel").select("*").single(),
      supabase.from("analytics_sourcing_case_funnel").select("*").single(),
      supabase.from("analytics_invite_performance").select("*").single(),
      supabase.from("analytics_offer_performance").select("*").single(),
      supabase.from("analytics_conversion_performance").select("*").single(),
      supabase.from("analytics_ops_risk_overview").select("*").single(),
    ])

  const errors = [
    inventory.error,
    leads.error,
    cases.error,
    invites.error,
    offers.error,
    conversions.error,
    ops.error,
  ].filter(Boolean)

  if (errors.length > 0) {
    logger.warn("Analytics view query errors", { errors })
  }

  return {
    inventory: inventory.data ?? {},
    leads: leads.data ?? {},
    cases: cases.data ?? {},
    invites: invites.data ?? {},
    offers: offers.data ?? {},
    conversions: conversions.data ?? {},
    ops: ops.data ?? {},
  }
}

// ---------------------------------------------------------------------------
// Inventory source breakdown — groups canonical listings by source × status
// ---------------------------------------------------------------------------

interface SourceBreakdownEntry {
  source: string
  total: number
  byStatus: Record<string, number>
}

export async function getInventorySourceBreakdown(): Promise<
  SourceBreakdownEntry[]
> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from("inventory_listings_canonical")
    .select("source, status")

  if (error) {
    logger.error("Failed to fetch inventory source breakdown", { error })
    throw error
  }

  const grouped = new Map<string, Record<string, number>>()

  for (const row of (data ?? []) as Array<{ source: string; status: string }>) {
    const src = row.source ?? "UNKNOWN"
    const st = row.status ?? "UNKNOWN"

    if (!grouped.has(src)) {
      grouped.set(src, {})
    }

    const bucket = grouped.get(src)!
    bucket[st] = (bucket[st] ?? 0) + 1
  }

  const result: SourceBreakdownEntry[] = []

  for (const [source, byStatus] of grouped) {
    const total = Object.values(byStatus).reduce((sum, n) => sum + n, 0)
    result.push({ source, total, byStatus })
  }

  result.sort((a, b) => b.total - a.total)
  return result
}

// ---------------------------------------------------------------------------
// Daily snapshot writer — persists a single metric into the daily snapshot table
// ---------------------------------------------------------------------------

export async function writeDailySnapshot(params: {
  snapshotDate: string
  metricGroup: string
  metricKey: string
  metricValue: number
  dimension1?: string
  dimension2?: string
  payload?: Record<string, unknown>
}) {
  const supabase = getSupabase()

  const { error } = await supabase
    .from("analytics_daily_snapshots")
    .upsert(
      {
        snapshot_date: params.snapshotDate,
        metric_group: params.metricGroup,
        metric_key: params.metricKey,
        metric_value: params.metricValue,
        dimension_1: params.dimension1 ?? null,
        dimension_2: params.dimension2 ?? null,
        payload: params.payload ?? {},
      },
      {
        onConflict:
          "snapshot_date,metric_group,metric_key,coalesce(dimension_1, ''),coalesce(dimension_2, '')",
      }
    )

  if (error) {
    logger.error("Failed to write daily snapshot", {
      params,
      error,
    })
    throw error
  }
}

// ---------------------------------------------------------------------------
// Daily snapshot reader — retrieves snapshots for a date range / metric group
// ---------------------------------------------------------------------------

export async function getDailySnapshots(params: {
  metricGroup: string
  startDate: string
  endDate: string
  metricKey?: string
}) {
  const supabase = getSupabase()

  let query = supabase
    .from("analytics_daily_snapshots")
    .select("*")
    .eq("metric_group", params.metricGroup)
    .gte("snapshot_date", params.startDate)
    .lte("snapshot_date", params.endDate)
    .order("snapshot_date", { ascending: true })

  if (params.metricKey) {
    query = query.eq("metric_key", params.metricKey)
  }

  const { data, error } = await query

  if (error) {
    logger.error("Failed to fetch daily snapshots", { params, error })
    throw error
  }

  return data ?? []
}
