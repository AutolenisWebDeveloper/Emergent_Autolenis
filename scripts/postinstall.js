#!/usr/bin/env node

/**
 * Postinstall script that runs prisma generate with a fallback URL
 * when POSTGRES_PRISMA_URL is not set.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Provide a placeholder URL if POSTGRES_PRISMA_URL is not set or is empty
if (!process.env['POSTGRES_PRISMA_URL'] || process.env['POSTGRES_PRISMA_URL'] === '') {
  process.env['POSTGRES_PRISMA_URL'] = 'postgresql://placeholder';
}

// Suppress the Prisma CLI update notification
process.env['PRISMA_HIDE_UPDATE_MESSAGE'] = '1';

try {
  const command = 'prisma generate';
  
  // Check if we're in a pnpm workspace by looking for pnpm-lock.yaml
  const hasPnpm = fs.existsSync(path.join(process.cwd(), 'pnpm-lock.yaml'));
  
  console.log('Running prisma generate...');
  
  if (hasPnpm) {
    execSync(`pnpm exec ${command}`, { stdio: 'inherit' });
  } else {
    execSync(`npx ${command}`, { stdio: 'inherit' });
  }
  
  console.log('Prisma client generated successfully');
} catch (error) {
  console.warn('Warning: prisma generate failed:', error.message);
  console.warn('This is expected if @prisma/client is not installed.');
  console.warn('The app will use Supabase client for database operations.');
  // Don't fail the install - allow the app to continue with Supabase only
  process.exit(0);
}
