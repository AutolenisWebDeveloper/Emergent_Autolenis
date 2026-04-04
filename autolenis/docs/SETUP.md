# AutoLenis Platform Setup Guide

This guide will help you set up the AutoLenis platform for development or deployment.

## Prerequisites

- Node.js 18+ or Bun
- A Supabase or Neon PostgreSQL database
- Stripe account (for payments)
- Vercel account (for deployment)

## Environment Variables Setup

### 1. Database Configuration

The platform uses Supabase/Neon PostgreSQL. You need to set the following variables:

\`\`\`bash
# Primary database URL for Prisma (uses connection pooling)
POSTGRES_PRISMA_URL="postgresql://user:pass@host:5432/db?pgbouncer=true"

# Other database URLs (automatically set by Supabase)
POSTGRES_URL="postgresql://user:pass@host:5432/db"
POSTGRES_URL_NON_POOLING="postgresql://user:pass@host:5432/db"
\`\`\`

**How to get these:**
1. Go to your Supabase project dashboard
2. Click "Project Settings" → "Database"
3. Copy the connection strings (they're automatically provided)

### 2. Supabase Configuration

\`\`\`bash
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
# Optional: for verifying Supabase-issued JWTs
# SUPABASE_JWT_SECRET="your-jwt-secret"
\`\`\`

**How to get these:**
1. Go to Supabase Project Settings → API
2. Copy the Project URL, anon key, and service_role key

### 3. Authentication

\`\`\`bash
JWT_SECRET="your-secure-random-string-min-32-chars"
\`\`\`

Generate a secure secret:
\`\`\`bash
openssl rand -base64 32
\`\`\`

### 4. Stripe Configuration

\`\`\`bash
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
\`\`\`

**How to get these:**
1. Go to Stripe Dashboard → Developers → API Keys
2. Copy your test keys (use live keys for production)

### 5. Application URLs

\`\`\`bash
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL="http://localhost:3000/auth/callback"
\`\`\`

## Database Setup

### Option 1: Automated Setup (Recommended)

Run the setup script:

\`\`\`bash
bun run scripts/setup-database.ts
\`\`\`

This will:
- Generate Prisma Client
- Push schema to database
- Initialize database with required extensions and indexes

### Option 2: Manual Setup

1. Generate Prisma Client:
\`\`\`bash
npx prisma generate
\`\`\`

2. Push schema to database:
\`\`\`bash
npx prisma db push
\`\`\`

3. Initialize database (optional):
\`\`\`bash
psql $POSTGRES_URL < scripts/01-initialize-database.sql
\`\`\`

## Supabase ↔ GitHub Integration

To link your Supabase project to this GitHub repository (enables database branching and preview environments), follow the [Supabase GitHub Integration Guide](SUPABASE_GITHUB_INTEGRATION.md).

## Verify Setup

### Check Database Connection

\`\`\`bash
npx prisma studio
\`\`\`

This opens a GUI to view your database. If it works, your connection is configured correctly.

### Check Environment Variables

Create a test file:

\`\`\`typescript
// test-env.ts
console.log({
  database: !!process.env.POSTGRES_PRISMA_URL,
  supabase: !!process.env.SUPABASE_URL,
  stripe: !!process.env.STRIPE_SECRET_KEY,
  jwt: !!process.env.JWT_SECRET,
})
\`\`\`

Run: `bun run test-env.ts`

All values should be `true`.

## Development

Start the development server:

\`\`\`bash
bun run dev
\`\`\`

Visit: http://localhost:3000

## Deployment to Vercel

### 1. Connect Repository

1. Push code to GitHub
2. Import project in Vercel
3. Vercel will auto-detect Next.js

### 2. Set Environment Variables

In Vercel Dashboard → Project Settings → Environment Variables, add all variables from `.env.example`.

**Important:** All variables must be set in Vercel, not just copied from local `.env`.

### 3. Connect Integrations

1. Supabase: Vercel Marketplace → Supabase → Connect
2. Stripe: Vercel Marketplace → Stripe → Connect

These automatically set up the required environment variables.

### 4. Deploy

\`\`\`bash
git push origin main
\`\`\`

Vercel will automatically deploy on push.

## Troubleshooting

### "Cannot find module .prisma/client"

**Solution:** Run `npx prisma generate` or add to package.json:
\`\`\`json
"scripts": {
  "postinstall": "prisma generate"
}
\`\`\`

### "Invalid DATABASE_URL"

**Solution:** Use `POSTGRES_PRISMA_URL` instead of `DATABASE_URL` in schema.prisma.

### "0 tables found" in database

**Solution:** Run the database setup script:
\`\`\`bash
bun run scripts/setup-database.ts
\`\`\`

### Build fails on Vercel

**Common causes:**
1. Environment variables not set in Vercel
2. Prisma client not generated (add postinstall script)
3. TypeScript errors (set `ignoreBuildErrors: true` temporarily)

## Support

For issues:
1. Check the docs/TROUBLESHOOTING.md file
2. Review Vercel build logs
3. Check Supabase database logs
4. Contact support at vercel.com/help
