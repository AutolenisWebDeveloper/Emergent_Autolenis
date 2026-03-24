/**
 * Workspace bootstrap helper.
 *
 * Ensures the default workspace rows (ws_live_default, ws_test_default)
 * exist in the Workspace table.  Called during sign-in BEFORE workspace
 * lookup so that missing rows never block authentication.
 *
 * Safe behaviour:
 *  - If the Workspace table does not exist yet → logs warning, returns.
 *  - If the rows already exist → no-op.
 *  - If inserts fail (permissions, etc.) → logs warning, does NOT throw.
 */

import { isDatabaseConfigured } from "@/lib/db"

const WS_LIVE_DEFAULT = "ws_live_default"
const WS_TEST_DEFAULT = "ws_test_default"

export async function ensureDefaultWorkspacesExist(): Promise<void> {
  if (!isDatabaseConfigured()) {
    return
  }

  try {
    // Dynamic import to avoid pulling in the admin client at module scope
    const { createAdminClient } = await import("@/lib/supabase/admin")
    const supabase = createAdminClient()

    // Check which defaults already exist
    const { data: existing, error: selectError } = await supabase
      .from("Workspace")
      .select("id")
      .in("id", [WS_LIVE_DEFAULT, WS_TEST_DEFAULT])

    if (selectError) {
      // Table might not exist yet — safe to ignore
      console.warn(
        `[workspace-bootstrap] Cannot read Workspace table: ${selectError.message}`
      )
      return
    }

    const existingIds = new Set((existing ?? []).map((r: { id: string }) => r.id))
    const toInsert: Array<{ id: string; mode: string; name: string; createdAt: string }> = []
    const now = new Date().toISOString()

    if (!existingIds.has(WS_LIVE_DEFAULT)) {
      toInsert.push({
        id: WS_LIVE_DEFAULT,
        mode: "LIVE",
        name: "Default Live Workspace",
        createdAt: now,
      })
    }

    if (!existingIds.has(WS_TEST_DEFAULT)) {
      toInsert.push({
        id: WS_TEST_DEFAULT,
        mode: "TEST",
        name: "Default Test Workspace",
        createdAt: now,
      })
    }

    if (toInsert.length === 0) {
      return
    }

    const { error: insertError } = await supabase
      .from("Workspace")
      .insert(toInsert)

    if (insertError) {
      console.warn(
        `[workspace-bootstrap] Could not create default workspaces: ${insertError.message}`
      )
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn(`[workspace-bootstrap] Bootstrap failed (non-fatal): ${message}`)
  }
}
