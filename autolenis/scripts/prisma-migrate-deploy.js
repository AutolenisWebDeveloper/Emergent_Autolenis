#!/usr/bin/env node

/**
 * Conditional Prisma migrate deploy wrapper for Vercel builds.
 *
 * Runs `prisma migrate deploy` only when both database environment
 * variables (POSTGRES_PRISMA_URL, POSTGRES_URL_NON_POOLING) are set.
 * Skips gracefully for preview deployments or environments without
 * database access — the build continues with `pnpm build` regardless.
 *
 * If the variables ARE set and the migration fails, the script exits
 * with a non-zero code so the deploy is correctly blocked.
 */

const { execSync } = require('child_process');

const prismaUrl = process.env['POSTGRES_PRISMA_URL'];
const directUrl = process.env['POSTGRES_URL_NON_POOLING'];

if (!prismaUrl || !directUrl) {
  console.log('⏭  Skipping prisma migrate deploy (database env vars not configured)');
  console.log('   Set POSTGRES_PRISMA_URL and POSTGRES_URL_NON_POOLING to enable migrations.');
  process.exit(0);
}

try {
  console.log('Running prisma migrate deploy...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  console.log('✓ Prisma migrations applied successfully');
} catch (error) {
  console.error('✗ prisma migrate deploy failed');
  process.exit(1);
}
