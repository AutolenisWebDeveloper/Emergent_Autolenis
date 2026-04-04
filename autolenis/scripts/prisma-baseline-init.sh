#!/usr/bin/env bash
# ============================================================
# Prisma Migration Baseline Initialization Script
# ============================================================
# This script registers the existing database state as the
# initial Prisma migration baseline. Run this ONCE against
# the target database (staging or production) to establish
# the migration history.
#
# Prerequisites:
#   - POSTGRES_PRISMA_URL or DATABASE_URL must be set
#   - The target database must already have the schema applied
#   - Node.js and npx must be available
#
# Usage:
#   export POSTGRES_PRISMA_URL="postgresql://..."
#   bash scripts/prisma-baseline-init.sh
# ============================================================

set -euo pipefail

echo "=========================================="
echo "Prisma Migration Baseline Initialization"
echo "=========================================="
echo ""

# Verify environment
if [ -z "${POSTGRES_PRISMA_URL:-${DATABASE_URL:-}}" ]; then
  echo "ERROR: POSTGRES_PRISMA_URL or DATABASE_URL must be set."
  echo "Export the connection string and re-run."
  exit 1
fi

echo "Step 1: Validate Prisma schema..."
npx prisma validate
echo "✓ Schema is valid"
echo ""

echo "Step 2: Pull current database schema (prisma db pull)..."
npx prisma db pull
echo "✓ Database schema pulled"
echo ""

echo "Step 3: Generate Prisma client..."
npx prisma generate
echo "✓ Prisma client generated"
echo ""

echo "Step 4: Mark baseline migration as applied..."
npx prisma migrate resolve --applied 0001_initial_baseline
echo "✓ Baseline migration marked as applied"
echo ""

echo "Step 5: Check migration status..."
npx prisma migrate status
echo ""

echo "=========================================="
echo "Baseline initialization complete."
echo ""
echo "Next steps:"
echo "  1. Verify 'prisma migrate status' shows no pending migrations"
echo "  2. Run the refund data migration if needed:"
echo "     psql \$DATABASE_URL < migrations/M007-refund-status-canonicalization.sql"
echo "  3. Optionally enable automatic migrations in vercel.json buildCommand"
echo "     (see DEPLOYMENT_VERIFICATION.md for details)"
echo "=========================================="
