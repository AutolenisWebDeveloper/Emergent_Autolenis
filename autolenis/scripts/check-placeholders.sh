#!/usr/bin/env bash
# -------------------------------------------------------------------
# Production Readiness Gate – placeholder / mock content checker
#
# Scans production source paths for indicator strings that should not
# appear in production code.  Test-workspace-gated code (inside
# isTestWorkspace blocks) is allowed to contain test-related terms
# since those paths never execute for production users.
#
# Exit 0 = clean, Exit 1 = violations found
# -------------------------------------------------------------------

set -euo pipefail

DIRS="app components lib"
EXCLUDE_PATTERNS=(
  "__tests__"
  "*.test.*"
  "e2e"
  "scripts"
  "node_modules"
  ".next"
)

# Build grep exclude args
EXCLUDE_ARGS=""
for pat in "${EXCLUDE_PATTERNS[@]}"; do
  EXCLUDE_ARGS="$EXCLUDE_ARGS --exclude-dir=$pat --exclude=$pat"
done

# Patterns that indicate placeholder/mock content in production code.
# We search case-insensitively for these in .ts/.tsx/.js/.jsx files.
PATTERNS=(
  'lorem ipsum'
  'placeholder text'
  'TODO:'
  'FIXME:'
  'not implemented'
)

VIOLATIONS=0

for pattern in "${PATTERNS[@]}"; do
  # shellcheck disable=SC2086
  HITS=$(grep -rni --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' \
    $EXCLUDE_ARGS "$pattern" $DIRS 2>/dev/null || true)
  if [ -n "$HITS" ]; then
    echo "⚠️  Found '$pattern':"
    echo "$HITS"
    echo ""
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
done

# Check for fake success in AI tool handlers (return statements only)
AI_FAKE=$(grep -rn 'return.*success: true' lib/ai/tools/ --include='*.ts' 2>/dev/null | grep -v 'test' | grep -v '__tests__' || true)
if [ -n "$AI_FAKE" ]; then
  echo "⚠️  Found 'success: true' in AI tool handlers (tools should delegate to real services):"
  echo "$AI_FAKE"
  echo ""
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# Check for "in production this would" / "in production, " comments (suggests incomplete code)
PROD_COMMENTS=$(grep -rni --include='*.ts' --include='*.tsx' \
  $EXCLUDE_ARGS 'in production.* would\|in production.* use \|in production.* call \|in production.* store ' \
  $DIRS 2>/dev/null || true)
if [ -n "$PROD_COMMENTS" ]; then
  echo "⚠️  Found 'in production would/use/call/store' comments (suggests incomplete implementation):"
  echo "$PROD_COMMENTS"
  echo ""
  VIOLATIONS=$((VIOLATIONS + 1))
fi

if [ "$VIOLATIONS" -gt 0 ]; then
  echo "❌ Found $VIOLATIONS placeholder/mock violation(s) in production code."
  exit 1
else
  echo "✅ No placeholder/mock violations found in production code."
  exit 0
fi
