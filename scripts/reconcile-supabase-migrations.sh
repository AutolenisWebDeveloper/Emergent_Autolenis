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

# ── Known historical renames ────────────────────────────────
# Map: OLD_VERSION → NEW_VERSION
# These are versions that were renamed in git history.
# If they appear in the remote schema_migrations table, they must be
# marked as "reverted" so supabase db push doesn't reject them.
declare -A KNOWN_RENAMES=(
  ["20240101000025"]="20260325000001"   # insurance_readiness_workflow timestamp corrected
  ["20240101000020"]="20240101000021"   # canonical_inventory_tables (was 20b, invalid suffix)
)

# Known removed versions — baselines or migrations deleted from the repo.
# If found in remote schema_migrations, they must be reverted.
# Add entries here when a migration file is intentionally removed and
# should be marked as reverted if it appears in the remote history.
declare -A KNOWN_REMOVED=(
  ["20260119104146"]="baseline_schema.sql — removed from repo"
)

# Invalid timestamps that Supabase CLI would have skipped entirely.
# These should NEVER appear in the remote schema_migrations table.
INVALID_TIMESTAMPS=("20240101000020b" "202603280001")

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
for lv in "${unique_local[@]}"; do
  count=$(ls "$MIGRATIONS_DIR"/${lv}_*.sql 2>/dev/null | wc -l)
  if [[ $count -gt 1 ]]; then
    echo "    $lv — $count files (multi-file timestamp)"
  fi
done
echo ""

# ── 3. Get remote migration versions ───────────────────────
echo "═══ Step 3: Fetch remote migration history ═══"
echo "  Running: pnpm supabase migration list"
remote_output=$(pnpm supabase migration list 2>&1) || {
  echo "  ❌ Failed to list remote migrations."
  echo "  Ensure SUPABASE_ACCESS_TOKEN is set and project is linked."
  echo ""
  echo "  To link:"
  echo "    export SUPABASE_ACCESS_TOKEN=<your-token>"
  echo "    pnpm supabase link --project-ref <your-project-ref>"
  echo ""
  echo "  Output: $remote_output"
  exit 1
}
echo "$remote_output"
echo ""

# ── 4. Identify mismatches ─────────────────────────────────
echo "═══ Step 4: Identify mismatches ═══"

# Parse remote versions from migration list output.
# Supabase CLI outputs a table; versions are 14-digit numbers.
mapfile -t remote_versions < <(echo "$remote_output" | grep -oE '\b[0-9]{14}\b' | sort -u)

echo "  Remote versions:  ${#remote_versions[@]}"
echo "  Local versions:   ${#unique_local[@]}"
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
    # Check if this is a known rename
    if [[ -n "${KNOWN_RENAMES[$rv]:-}" ]]; then
      echo "  ⚠️  $rv — KNOWN RENAME → ${KNOWN_RENAMES[$rv]} (will repair --status reverted)"
    # Check if this is a known removed version
    elif [[ -n "${KNOWN_REMOVED[$rv]:-}" ]]; then
      echo "  🗑️  $rv — KNOWN REMOVED (will repair --status reverted)"
    else
      echo "  ❌ $rv — UNKNOWN remote-only version (needs investigation)"
    fi
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

# ── 5. Known renames & removed versions reference ──────────
echo "═══ Step 5: Known renamed versions ═══"
echo "  OLD VERSION       → NEW VERSION         IN REMOTE"
echo "  ────────────────────────────────────────────────────────"
for old in "${!KNOWN_RENAMES[@]}"; do
  new="${KNOWN_RENAMES[$old]}"
  # Check if old version is in remote
  in_remote="no"
  for rv in "${remote_versions[@]}"; do
    if [[ "$rv" == "$old" ]]; then in_remote="YES — needs repair"; break; fi
  done
  echo "  $old    → $new      $in_remote"
done
echo ""
echo "  Known removed versions (deleted from repo):"
for rem in "${!KNOWN_REMOVED[@]}"; do
  in_remote="no"
  for rv in "${remote_versions[@]}"; do
    if [[ "$rv" == "$rem" ]]; then in_remote="YES — needs repair"; break; fi
  done
  echo "    $rem — ${KNOWN_REMOVED[$rem]}      $in_remote"
done
echo ""
echo "  Invalid timestamps (never recorded by CLI):"
for inv in "${INVALID_TIMESTAMPS[@]}"; do
  echo "    $inv — skipped by Supabase CLI (invalid format)"
done
echo ""

# ── 6. Safety check ───────────────────────────────────────
unknown_remote_only=()
for rv in "${remote_only[@]}"; do
  if [[ -n "${KNOWN_RENAMES[$rv]:-}" ]]; then
    continue  # known rename — safe
  fi
  if [[ -n "${KNOWN_REMOVED[$rv]:-}" ]]; then
    continue  # known removed — safe
  fi
  unknown_remote_only+=("$rv")
done

if [[ ${#unknown_remote_only[@]} -gt 0 ]]; then
  echo "═══ ⛔ UNSAFE: Unknown remote-only versions ═══"
  echo "  The following versions are in remote but not in local and are"
  echo "  NOT known renames. Manual investigation required."
  echo ""
  for rv in "${unknown_remote_only[@]}"; do
    echo "  ❌ $rv"
  done
  echo ""
  echo "  Do NOT proceed with --apply until these are resolved."
  echo "  Options:"
  echo "    1. Restore the missing local migration file"
  echo "    2. Mark as reverted: pnpm supabase migration repair <version> --status reverted"
  echo "    3. Investigate via: SELECT * FROM supabase_migrations.schema_migrations ORDER BY version;"
  exit 1
fi

# ── 7. Execute repairs (if --apply) ────────────────────────
if [[ ${#remote_only[@]} -gt 0 ]]; then
  echo "═══ Step 6: Repair remote-only versions ═══"
  for rv in "${remote_only[@]}"; do
    if $APPLY; then
      echo "  🔧 Repairing: pnpm supabase migration repair $rv --status reverted"
      pnpm supabase migration repair "$rv" --status reverted || {
        echo "  ❌ Repair failed for version $rv"
        exit 1
      }
      echo "  ✅ Repaired: $rv"
    else
      echo "  🔧 Would run: pnpm supabase migration repair $rv --status reverted"
    fi
  done
  echo ""
fi

# ── 8. Summary ─────────────────────────────────────────────
echo "═══ Summary ═══"
echo "  Local migration files:    $(ls "$MIGRATIONS_DIR"/*.sql | wc -l)"
echo "  Unique local versions:    ${#unique_local[@]}"
echo "  Remote versions:          ${#remote_versions[@]}"
echo "  Remote-only (mismatch):   ${#remote_only[@]}"
echo "  Local-only (pending):     ${#local_only[@]}"
echo "  Unknown mismatches:       ${#unknown_remote_only[@]}"
echo ""

if [[ ${#remote_only[@]} -eq 0 ]]; then
  echo "  ✅ Migration history is reconciled. Safe to run: pnpm supabase db push"
  exit 0
elif $APPLY; then
  echo "  ✅ Repairs applied. Re-run this script to verify reconciliation."
  echo "  Then run: pnpm supabase db push"
  exit 0
else
  echo "  ⚠️  Mismatches found. Run with --apply to repair:"
  echo "    bash scripts/reconcile-supabase-migrations.sh --apply"
  echo ""
  echo "  Or manually repair each version:"
  for rv in "${remote_only[@]}"; do
    echo "    pnpm supabase migration repair $rv --status reverted"
  done
  exit 0
fi
