#!/usr/bin/env bash
# ============================================================================
# safe-rollback.sh — Production-safe Git branch rollback script
#
# Purpose:  Roll back a branch to a known good commit — either specified
#           directly via --commit <SHA> or computed from a time-based cutoff
#           via --months N.  Uses a recovery-safe process suitable for shared
#           production repos.
#
# Usage:    ./scripts/safe-rollback.sh --commit <SHA> [--branch BRANCH] [--dry-run|--execute] [--push]
#           ./scripts/safe-rollback.sh --months N     [--branch BRANCH] [--dry-run|--execute] [--push]
#
# Defaults: --branch (current branch), --dry-run (no destructive ops)
#
# Safety:   Creates backup branch + tag before any destructive operation.
#           Uses --force-with-lease (never plain --force) for remote pushes.
#           Aborts if no valid rollback target exists.
# ============================================================================
set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration & defaults
# ---------------------------------------------------------------------------
MONTHS=""
TARGET_COMMIT=""
TARGET_BRANCH=""
DRY_RUN=true
PUSH_REMOTE=false
BACKUP_PREFIX="backup/rollback"
TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --commit)    TARGET_COMMIT="$2"; shift 2 ;;
    --months)    MONTHS="$2";        shift 2 ;;
    --branch)    TARGET_BRANCH="$2"; shift 2 ;;
    --dry-run)   DRY_RUN=true;       shift   ;;
    --execute)   DRY_RUN=false;      shift   ;;
    --push)      PUSH_REMOTE=true;   shift   ;;
    --help|-h)
      echo "Usage: $0 [--commit SHA | --months N] [--branch BRANCH] [--dry-run|--execute] [--push]"
      echo ""
      echo "  --commit SHA    Target commit hash to roll back to (preferred)"
      echo "  --months N      Number of months of history to remove (time-based fallback)"
      echo "  --branch BRANCH Target branch to roll back (default: current branch)"
      echo "  --dry-run       Analyze only, no destructive changes (default)"
      echo "  --execute       Perform the actual rollback after analysis"
      echo "  --push          Push changes to remote with --force-with-lease"
      exit 0
      ;;
    *) echo "ERROR: Unknown option: $1"; exit 1 ;;
  esac
done

# Validate that at least one targeting mode was specified
if [[ -z "$TARGET_COMMIT" && -z "$MONTHS" ]]; then
  echo "ERROR: Specify either --commit <SHA> or --months <N>."
  echo "Run $0 --help for usage."
  exit 1
fi

# ---------------------------------------------------------------------------
# Utility functions
# ---------------------------------------------------------------------------
log()   { echo "[$(date -u +"%H:%M:%S")] $*"; }
info()  { log "INFO:  $*"; }
warn()  { log "WARN:  $*"; }
error() { log "ERROR: $*"; }
abort() { error "$*"; exit 1; }

separator() {
  echo ""
  echo "============================================================================"
  echo "  $*"
  echo "============================================================================"
  echo ""
}

# ---------------------------------------------------------------------------
# Step 1: Detect current branch
# ---------------------------------------------------------------------------
separator "Step 1: Detect Current Branch"

if [[ -z "$TARGET_BRANCH" ]]; then
  TARGET_BRANCH=$(git branch --show-current)
  if [[ -z "$TARGET_BRANCH" ]]; then
    abort "Not on any branch (detached HEAD). Specify --branch explicitly."
  fi
fi

info "Target branch: $TARGET_BRANCH"
info "Mode: $(if $DRY_RUN; then echo 'DRY RUN (analysis only)'; else echo 'EXECUTE (will modify history)'; fi)"
info "Push to remote: $PUSH_REMOTE"

# Resolve the effective ref — use local branch if it exists, otherwise origin/<branch>
if git rev-parse --verify "$TARGET_BRANCH" >/dev/null 2>&1; then
  EFFECTIVE_REF="$TARGET_BRANCH"
elif git rev-parse --verify "origin/$TARGET_BRANCH" >/dev/null 2>&1; then
  EFFECTIVE_REF="origin/$TARGET_BRANCH"
  info "Local branch '$TARGET_BRANCH' not found — using remote ref '$EFFECTIVE_REF'"
else
  abort "Branch '$TARGET_BRANCH' not found locally or on remote."
fi

CURRENT_HEAD=$(git rev-parse "$EFFECTIVE_REF")
info "Current HEAD: $CURRENT_HEAD"

# ---------------------------------------------------------------------------
# Step 2: Fetch latest remote state
# ---------------------------------------------------------------------------
separator "Step 2: Fetch Latest Remote State"

info "Command: git fetch origin"
FETCH_OUTPUT=$(git fetch origin 2>&1) || warn "Fetch failed or partial — continuing with local state"
if [[ -n "$FETCH_OUTPUT" ]]; then
  echo "$FETCH_OUTPUT" | head -20
fi

REMOTE_REF="origin/$TARGET_BRANCH"
if git rev-parse --verify "$REMOTE_REF" >/dev/null 2>&1; then
  REMOTE_HEAD=$(git rev-parse "$REMOTE_REF")
  info "Remote HEAD ($REMOTE_REF): $REMOTE_HEAD"
  if [[ "$CURRENT_HEAD" != "$REMOTE_HEAD" ]]; then
    warn "Local HEAD differs from remote HEAD — local may be ahead or behind"
  fi
else
  warn "Remote tracking branch $REMOTE_REF not found"
  REMOTE_HEAD=""
fi

# ---------------------------------------------------------------------------
# Step 3: Create backup branch and tag
# ---------------------------------------------------------------------------
separator "Step 3: Create Safety Backups"

BACKUP_BRANCH="${BACKUP_PREFIX}-${TARGET_BRANCH}-${TIMESTAMP}"
BACKUP_TAG="${BACKUP_PREFIX}-tag-${TARGET_BRANCH}-${TIMESTAMP}"

info "Backup branch name: $BACKUP_BRANCH"
info "Backup tag name:    $BACKUP_TAG"

if ! $DRY_RUN; then
  # Create backup branch
  info "Command: git branch '$BACKUP_BRANCH' '$CURRENT_HEAD'"
  git branch "$BACKUP_BRANCH" "$CURRENT_HEAD"

  # Create backup tag
  info "Command: git tag -a '$BACKUP_TAG' '$CURRENT_HEAD' -m 'Pre-rollback backup...'"
  git tag -a "$BACKUP_TAG" "$CURRENT_HEAD" \
    -m "Pre-rollback backup of $TARGET_BRANCH at $TIMESTAMP. HEAD was $CURRENT_HEAD."

  # Verify both exist
  if git rev-parse --verify "$BACKUP_BRANCH" >/dev/null 2>&1; then
    info "✓ Backup branch verified: $BACKUP_BRANCH -> $(git rev-parse "$BACKUP_BRANCH")"
  else
    abort "CRITICAL: Backup branch creation failed. Aborting."
  fi

  if git rev-parse --verify "refs/tags/$BACKUP_TAG" >/dev/null 2>&1; then
    info "✓ Backup tag verified: $BACKUP_TAG -> $(git rev-parse "refs/tags/$BACKUP_TAG")"
  else
    abort "CRITICAL: Backup tag creation failed. Aborting."
  fi

  # Push backups to remote for safety
  if $PUSH_REMOTE; then
    info "Command: git push origin '$BACKUP_BRANCH'"
    git push origin "$BACKUP_BRANCH" 2>&1 || warn "Could not push backup branch to remote"
    info "Command: git push origin '$BACKUP_TAG'"
    git push origin "$BACKUP_TAG" 2>&1 || warn "Could not push backup tag to remote"
  fi
else
  info "[DRY RUN] Would create backup branch: $BACKUP_BRANCH"
  info "[DRY RUN] Would create backup tag: $BACKUP_TAG"
fi

# ---------------------------------------------------------------------------
# Step 4: Identify rollback target commit
# ---------------------------------------------------------------------------
separator "Step 4: Identify Rollback Commit"

TOTAL_COMMITS=$(git rev-list --count "$EFFECTIVE_REF")
EARLIEST_COMMIT_DATE=$( (git log --format="%ai" --reverse "$EFFECTIVE_REF" || true) | head -1)

if [[ -n "$TARGET_COMMIT" ]]; then
  # ---- Mode A: Direct commit hash ----
  info "Mode: Direct commit targeting (--commit)"

  # Resolve short SHA / validate the commit exists
  RESOLVED_COMMIT=$(git rev-parse --verify "$TARGET_COMMIT" 2>/dev/null) || true
  if [[ -z "$RESOLVED_COMMIT" ]]; then
    abort "Commit '$TARGET_COMMIT' does not exist in this repository."
  fi

  # Verify it's a commit object (not a tree/blob)
  OBJ_TYPE=$(git cat-file -t "$RESOLVED_COMMIT" 2>/dev/null) || true
  if [[ "$OBJ_TYPE" != "commit" ]]; then
    abort "'$TARGET_COMMIT' is a $OBJ_TYPE, not a commit."
  fi

  # Verify the commit is an ancestor of the current branch HEAD
  if ! git merge-base --is-ancestor "$RESOLVED_COMMIT" "$CURRENT_HEAD" 2>/dev/null; then
    abort "Commit $RESOLVED_COMMIT is NOT an ancestor of $TARGET_BRANCH HEAD ($CURRENT_HEAD). Refusing to roll back to an unrelated commit."
  fi

  ROLLBACK_COMMIT="$RESOLVED_COMMIT"

  # Check it's not the current HEAD (no-op)
  if [[ "$ROLLBACK_COMMIT" == "$CURRENT_HEAD" ]]; then
    info "Target commit IS the current HEAD — nothing to roll back."
    separator "Final Summary"
    echo "  Status:                NO-OP (target == current HEAD)"
    echo "  Branch:                $TARGET_BRANCH"
    echo "  Current HEAD:          $CURRENT_HEAD"
    echo "  Rollback commit:       $ROLLBACK_COMMIT"
    exit 0
  fi

  info "Total commits on branch: $TOTAL_COMMITS"
  info "Target commit resolved:  $ROLLBACK_COMMIT"
  CUTOFF_DATE="(not applicable — direct commit mode)"

else
  # ---- Mode B: Time-based cutoff (legacy) ----
  info "Mode: Time-based cutoff (--months $MONTHS)"

  # Compute cutoff date — handle both GNU (Linux) and BSD (macOS) date syntax
  if date -u -d "1 day ago" +"%s" >/dev/null 2>&1; then
    CUTOFF_DATE=$(date -u -d "$MONTHS months ago" +"%Y-%m-%dT%H:%M:%SZ")
  else
    CUTOFF_DATE=$(date -u -v-"${MONTHS}m" +"%Y-%m-%dT%H:%M:%SZ")
  fi
  info "Cutoff date ($MONTHS months ago): $CUTOFF_DATE"

  # Find the most recent commit before the cutoff date
  ROLLBACK_COMMIT=$(git log --format="%H" --until="$CUTOFF_DATE" -1 "$EFFECTIVE_REF" 2>/dev/null || true)

  COMMITS_AFTER_CUTOFF=$(git rev-list --count --since="$CUTOFF_DATE" "$EFFECTIVE_REF")
  COMMITS_BEFORE_CUTOFF=$((TOTAL_COMMITS - COMMITS_AFTER_CUTOFF))

  info "Total commits on branch:         $TOTAL_COMMITS"
  info "Commits within last $MONTHS months:    $COMMITS_AFTER_CUTOFF"
  info "Commits before cutoff:           $COMMITS_BEFORE_CUTOFF"
  info "Earliest commit date:            $EARLIEST_COMMIT_DATE"
fi

if [[ -z "$ROLLBACK_COMMIT" ]]; then
  separator "⚠ ROLLBACK ABORTED — No Valid Target"

  echo "FINDING: All $TOTAL_COMMITS commits on branch '$TARGET_BRANCH' fall within"
  echo "         the last $MONTHS months (after $CUTOFF_DATE)."
  echo ""
  echo "         Earliest commit: $EARLIEST_COMMIT_DATE"
  echo "         Cutoff date:     $CUTOFF_DATE"
  echo ""
  echo "         There is NO commit before the cutoff date to roll back to."
  echo "         Rolling back would leave the branch with zero commits, which"
  echo "         is equivalent to deleting all code — this is not safe."
  echo ""
  echo "RECOMMENDATION: Use --commit <SHA> to specify an exact target commit,"
  echo "                or use 'git revert' to undo specific recent commits."
  echo ""

  # Print summary even on abort
  separator "Final Summary"
  echo "  Status:                ABORTED (no valid rollback target)"
  echo "  Branch:                $TARGET_BRANCH"
  echo "  Current HEAD:          $CURRENT_HEAD"
  echo "  Cutoff date:           $CUTOFF_DATE"
  echo "  Total commits:         $TOTAL_COMMITS"
  echo "  Earliest commit date:  $EARLIEST_COMMIT_DATE"
  echo "  Rollback commit:       (none — all history is within the rollback window)"
  if ! $DRY_RUN; then
    echo "  Backup branch:         $BACKUP_BRANCH (created, safe to delete)"
    echo "  Backup tag:            $BACKUP_TAG (created, safe to delete)"
  else
    echo "  Backup branch:         (not created — dry run)"
    echo "  Backup tag:            (not created — dry run)"
  fi
  echo "  Remote rewritten:      No"
  echo ""
  exit 2
fi

# ---------------------------------------------------------------------------
# Step 5: Show rollback commit details
# ---------------------------------------------------------------------------
separator "Step 5: Rollback Commit Details"

ROLLBACK_DATE=$(git log --format="%ai" -1 "$ROLLBACK_COMMIT")
ROLLBACK_MSG=$(git log --format="%s" -1 "$ROLLBACK_COMMIT")
ROLLBACK_AUTHOR=$(git log --format="%an <%ae>" -1 "$ROLLBACK_COMMIT")
COMMITS_TO_REMOVE=$((TOTAL_COMMITS - $(git rev-list --count "$ROLLBACK_COMMIT")))

info "Rollback commit hash:    $ROLLBACK_COMMIT"
info "Rollback commit date:    $ROLLBACK_DATE"
info "Rollback commit message: $ROLLBACK_MSG"
info "Rollback commit author:  $ROLLBACK_AUTHOR"
info "Commits to be removed:   $COMMITS_TO_REMOVE"
echo ""

if [[ -n "$TARGET_COMMIT" ]]; then
  echo "--- Context: 5 commits at and around the rollback target ---"
  git log --format="  %h %ai %s" -5 "$ROLLBACK_COMMIT"
  echo ""
  echo "--- Context: 5 commits AFTER the rollback target (to be removed) ---"
  NEXT_COMMITS=$(git rev-list --ancestry-path "${ROLLBACK_COMMIT}..${CURRENT_HEAD}" 2>/dev/null | tail -5 || true)
  if [[ -n "$NEXT_COMMITS" ]]; then
    echo "$NEXT_COMMITS" | while read -r sha; do
      git log --format="  %h %ai %s" -1 "$sha"
    done
  else
    echo "  (none)"
  fi
else
  echo "--- Context: Last 5 commits BEFORE cutoff ---"
  git log --format="  %h %ai %s" --until="$CUTOFF_DATE" -5 "$EFFECTIVE_REF"
  echo ""
  echo "--- Context: First 5 commits AFTER cutoff ---"
  (git log --format="  %h %ai %s" --since="$CUTOFF_DATE" --reverse "$EFFECTIVE_REF" || true) | head -5
fi
echo ""

# ---------------------------------------------------------------------------
# Step 6: Perform the reset
# ---------------------------------------------------------------------------
separator "Step 6: Reset Branch"

if $DRY_RUN; then
  info "[DRY RUN] Would execute: git reset --hard $ROLLBACK_COMMIT"
  info "[DRY RUN] This would remove $COMMITS_TO_REMOVE commits from '$TARGET_BRANCH'"
else
  # Ensure we are on the target branch before resetting
  ACTIVE_BRANCH=$(git branch --show-current)
  if [[ "$ACTIVE_BRANCH" != "$TARGET_BRANCH" ]]; then
    info "Switching to target branch '$TARGET_BRANCH' before reset..."
    if git rev-parse --verify "$TARGET_BRANCH" >/dev/null 2>&1; then
      info "Command: git checkout $TARGET_BRANCH"
      git checkout "$TARGET_BRANCH"
    else
      info "Command: git checkout -b $TARGET_BRANCH $EFFECTIVE_REF"
      git checkout -b "$TARGET_BRANCH" "$EFFECTIVE_REF"
    fi
  fi

  info "Performing reset..."
  info "Command: git reset --hard $ROLLBACK_COMMIT"
  git reset --hard "$ROLLBACK_COMMIT"

  NEW_HEAD=$(git rev-parse HEAD)
  info "Branch '$TARGET_BRANCH' now at: $NEW_HEAD"

  if [[ "$NEW_HEAD" != "$ROLLBACK_COMMIT" ]]; then
    abort "CRITICAL: Reset verification failed. HEAD ($NEW_HEAD) != target ($ROLLBACK_COMMIT)"
  fi
  info "✓ Reset verified: HEAD matches rollback target"
fi

# ---------------------------------------------------------------------------
# Step 7: Push to remote (if requested)
# ---------------------------------------------------------------------------
separator "Step 7: Remote Update"

REMOTE_REWRITTEN=false

if $PUSH_REMOTE && ! $DRY_RUN; then
  info "Pushing with --force-with-lease (never plain --force)"
  info "Command: git push --force-with-lease origin $TARGET_BRANCH"
  if git push --force-with-lease origin "$TARGET_BRANCH" 2>&1; then
    REMOTE_REWRITTEN=true
    info "✓ Remote branch updated successfully"
  else
    error "Remote push failed. The remote may have been updated since fetch."
    error "Re-fetch and retry, or investigate before forcing."
  fi
elif $PUSH_REMOTE && $DRY_RUN; then
  info "[DRY RUN] Would execute: git push --force-with-lease origin $TARGET_BRANCH"
else
  info "Remote push not requested. Use --push to update remote."
fi

# ---------------------------------------------------------------------------
# Step 8: Final verification and summary
# ---------------------------------------------------------------------------
separator "Step 8: Verification & Summary"

if ! $DRY_RUN; then
  echo "--- Post-rollback: Last 10 commits ---"
  git log --oneline -10
  echo ""
fi

separator "ROLLBACK SUMMARY"

echo "  Status:                $(if $DRY_RUN; then echo 'DRY RUN COMPLETE'; else echo 'ROLLBACK COMPLETE'; fi)"
echo "  Branch:                $TARGET_BRANCH"
echo "  Previous HEAD:         $CURRENT_HEAD"
echo "  Rollback commit:       $ROLLBACK_COMMIT"
echo "  Rollback commit date:  $ROLLBACK_DATE"
echo "  Rollback commit msg:   $ROLLBACK_MSG"
echo "  Targeting mode:        $(if [[ -n "$TARGET_COMMIT" ]]; then echo "direct commit (--commit $TARGET_COMMIT)"; else echo "time-based (--months $MONTHS, cutoff $CUTOFF_DATE)"; fi)"
echo "  Commits removed:       $COMMITS_TO_REMOVE"
echo "  Backup branch:         $BACKUP_BRANCH"
echo "  Backup tag:            $BACKUP_TAG"
echo "  Remote rewritten:      $REMOTE_REWRITTEN"
echo ""

separator "RECOVERY STEPS (if rollback needs to be undone)"

cat <<RECOVERY
  To restore the branch to its pre-rollback state:

  Option 1 — Reset to backup branch:
    git fetch origin
    git checkout $TARGET_BRANCH
    git reset --hard $BACKUP_BRANCH
    git push --force-with-lease origin $TARGET_BRANCH

  Option 2 — Reset to backup tag:
    git fetch origin --tags
    git checkout $TARGET_BRANCH
    git reset --hard $BACKUP_TAG
    git push --force-with-lease origin $TARGET_BRANCH

  Option 3 — Reset to exact commit hash:
    git checkout $TARGET_BRANCH
    git reset --hard $CURRENT_HEAD
    git push --force-with-lease origin $TARGET_BRANCH

  After recovery, verify with:
    git log --oneline -5
    git diff $CURRENT_HEAD HEAD  # should show no diff

  Cleanup (only after confirming rollback is permanent):
    git branch -D $BACKUP_BRANCH
    git tag -d $BACKUP_TAG
    git push origin --delete $BACKUP_BRANCH
    git push origin --delete $BACKUP_TAG
RECOVERY

echo ""
info "Script complete."
