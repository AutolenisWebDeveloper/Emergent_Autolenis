#!/usr/bin/env bash
# ============================================================
# Supabase Migration Reconciliation Script
# ============================================================
# Purpose:  Identify and repair remote/local migration mismatches
#           after filename renames or manual interventions.
#
# Prerequisites:
#   - SUPABASE_ACCESS_TOKEN env var set
#   - Supabase project linked:  pnpm supabase link --project-ref <ref>
#
# Usage:
#   bash scripts/reconcile-supabase-migrations.sh          # dry-run (report only)
#   bash scripts/reconcile-supabase-migrations.sh --apply  # execute repairs
# ============================================================
set -euo pipefail

MIGRATIONS_DIR="supabase/migrations"
APPLY=false

if [[ "${1:-}" == "--apply" ]]; then
  APPLY=true
  echo "⚡ Running in APPLY mode — will execute migration repairs"
else
  echo "🔍 Running in DRY-RUN mode — pass --apply to execute repairs"
fi
echo ""

# ── 1. Validate local migration filenames ───────────────────
echo "═══ Step 1: Validate local migration filenames ═══"
invalid=0
for f in "$MIGRATIONS_DIR"/*.sql; do
  basename=$(basename "$f")
  if ! echo "$basename" | grep -Eq '^[0-9]{14}_.*\.sql$'; then
    echo "  ❌ INVALID: $basename (must match YYYYMMDDHHMMSS_name.sql)"
    invalid=$((invalid + 1))
  fi
done
if [[ $invalid -eq 0 ]]; then
  echo "  ✅ All local filenames are valid"
else
  echo ""
  echo "  ⚠️  Fix invalid filenames before proceeding."
  exit 1
fi
echo ""

# ── 2. Extract local versions ──────────────────────────────
echo "═══ Step 2: Extract local migration versions ═══"
local_versions=()
for f in "$MIGRATIONS_DIR"/*.sql; do
  basename=$(basename "$f")
  version="${basename%%_*}"
  local_versions+=("$version")
done

# Deduplicate (multiple files can share a timestamp)
mapfile -t unique_local < <(printf '%s\n' "${local_versions[@]}" | sort -u)
echo "  Local versions: ${#unique_local[@]} unique timestamps"
echo ""

# ── 3. Get remote migration versions ───────────────────────
echo "═══ Step 3: Fetch remote migration history ═══"
echo "  Running: pnpm supabase migration list"
remote_output=$(pnpm supabase migration list 2>&1) || {
  echo "  ❌ Failed to list remote migrations."
  echo "  Ensure SUPABASE_ACCESS_TOKEN is set and project is linked."
  echo "  Output: $remote_output"
  exit 1
}
echo "$remote_output"
echo ""

# ── 4. Identify mismatches ─────────────────────────────────
echo "═══ Step 4: Identify mismatches ═══"

# Parse remote versions from migration list output.
# Supabase CLI outputs a table; versions are 14-digit numbers in the first column.
mapfile -t remote_versions < <(echo "$remote_output" | grep -oE '\b[0-9]{14}\b' | sort -u)

echo "  Remote versions found: ${#remote_versions[@]}"
echo ""

# Remote-only versions (in remote, not in local)
echo "  ── Remote-only (need repair --status reverted or local restore) ──"
remote_only=()
for rv in "${remote_versions[@]}"; do
  found=false
  for lv in "${unique_local[@]}"; do
    if [[ "$rv" == "$lv" ]]; then
      found=true
      break
    fi
  done
  if ! $found; then
    remote_only+=("$rv")
    echo "  ⚠️  $rv — in remote but NOT in local"
  fi
done
if [[ ${#remote_only[@]} -eq 0 ]]; then
  echo "  ✅ No remote-only versions"
fi
echo ""

# Local-only versions (pending — will be applied by db push)
echo "  ── Local-only (pending — will be applied by db push) ──"
local_only=()
for lv in "${unique_local[@]}"; do
  found=false
  for rv in "${remote_versions[@]}"; do
    if [[ "$lv" == "$rv" ]]; then
      found=true
      break
    fi
  done
  if ! $found; then
    local_only+=("$lv")
    echo "  📦 $lv — local only, pending apply"
  fi
done
if [[ ${#local_only[@]} -eq 0 ]]; then
  echo "  ✅ No pending local migrations"
fi
echo ""

# ── 5. Known renames (from git history analysis) ───────────
echo "═══ Step 5: Known renamed versions ═══"
echo "  The following versions were renamed in git history."
echo "  If present in remote, they need repair --status reverted:"
echo ""
echo "  OLD VERSION       → NEW VERSION         STATUS"
echo "  ────────────────────────────────────────────────────────"
echo "  20240101000025    → 20260325000001      Renamed (R100, identical content)"
echo "  20240101000020b   → 20240101000021      Renamed (invalid timestamp fixed)"
echo "  202603280001      → 20260328000100      Renamed (12→14 digit timestamp)"
echo ""
echo "  Note: 20240101000020b and 202603280001 had invalid timestamps and were"
echo "  likely never recorded by Supabase CLI. Only 20240101000025 is at risk."
echo ""

# ── 6. Execute repairs (if --apply) ────────────────────────
if [[ ${#remote_only[@]} -gt 0 ]]; then
  echo "═══ Step 6: Repair remote-only versions ═══"
  for rv in "${remote_only[@]}"; do
    if $APPLY; then
      echo "  🔧 Repairing: supabase migration repair $rv --status reverted"
      pnpm supabase migration repair "$rv" --status reverted || {
        echo "  ❌ Repair failed for version $rv"
      }
    else
      echo "  🔧 Would run: supabase migration repair $rv --status reverted"
    fi
  done
  echo ""
fi

# ── 7. Summary ─────────────────────────────────────────────
echo "═══ Summary ═══"
echo "  Local migration files:    $(ls "$MIGRATIONS_DIR"/*.sql | wc -l)"
echo "  Unique local versions:    ${#unique_local[@]}"
echo "  Remote versions:          ${#remote_versions[@]}"
echo "  Remote-only (mismatch):   ${#remote_only[@]}"
echo "  Local-only (pending):     ${#local_only[@]}"
echo ""

if [[ ${#remote_only[@]} -eq 0 ]]; then
  echo "  ✅ Migration history is reconciled. Safe to run: pnpm supabase db push"
else
  if $APPLY; then
    echo "  ✅ Repairs applied. Re-run this script to verify reconciliation."
  else
    echo "  ⚠️  Mismatches found. Run with --apply to repair, or manually:"
    for rv in "${remote_only[@]}"; do
      echo "    pnpm supabase migration repair $rv --status reverted"
    done
  fi
fi
