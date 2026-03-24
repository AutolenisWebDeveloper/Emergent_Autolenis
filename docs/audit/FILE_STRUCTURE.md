# FILE_STRUCTURE.md — AutoLenis Repository Structure

## Directory Tree (3 Levels Deep)

```
/
├── app/                          # Next.js 16 App Router
│   ├── about/                    # Public about page
│   ├── actions/                  # Server actions (Stripe)
│   ├── admin/                    # Admin portal (~80 pages)
│   │   ├── affiliates/           # Affiliate management
│   │   ├── auctions/             # Auction oversight
│   │   ├── buyers/               # Buyer management
│   │   ├── compliance/           # Compliance dashboard
│   │   ├── contracts/            # Contract review
│   │   ├── contract-shield/      # Rules & overrides
│   │   ├── dashboard/            # Admin dashboard
│   │   ├── dealers/              # Dealer management
│   │   ├── deals/                # Deal oversight
│   │   ├── documents/            # Document management
│   │   ├── financial-reporting/  # Financial reports
│   │   ├── insurance/            # Insurance oversight
│   │   ├── mfa/                  # MFA enrollment/challenge
│   │   ├── notifications/        # Admin notifications
│   │   ├── offers/               # Offer management
│   │   ├── payments/             # Payment management
│   │   ├── payouts/              # Payout management
│   │   ├── refinance/            # Refinance management
│   │   ├── reports/              # Operational reports
│   │   ├── seo/                  # SEO management
│   │   ├── settings/             # System settings
│   │   ├── trade-ins/            # Trade-in management
│   │   ├── users/                # User management
│   │   └── layout.tsx
│   ├── affiliate/                # Affiliate portal (~20 pages)
│   │   ├── dashboard/
│   │   ├── portal/               # Full affiliate portal
│   │   ├── onboarding/
│   │   └── layout.tsx
│   ├── api/                      # API routes (~180+ endpoints)
│   │   ├── admin/                # Admin-only APIs
│   │   ├── affiliate/            # Affiliate APIs
│   │   ├── ai/                   # AI chat endpoint
│   │   ├── auth/                 # Auth endpoints
│   │   ├── auction/              # Auction APIs
│   │   ├── buyer/                # Buyer APIs
│   │   ├── contact/              # Contact form
│   │   ├── contract/             # Contract APIs
│   │   ├── cron/                 # Cron job handlers
│   │   ├── dealer/               # Dealer APIs
│   │   ├── documents/            # Document APIs
│   │   ├── email/                # Email sending
│   │   ├── esign/                # E-signature APIs
│   │   ├── health/               # Health checks
│   │   ├── insurance/            # Insurance APIs
│   │   ├── payments/             # Payment APIs
│   │   ├── pickup/               # Pickup scheduling
│   │   ├── refinance/            # Refinance APIs
│   │   ├── seo/                  # SEO APIs
│   │   ├── test/                 # Test-only routes
│   │   └── webhooks/             # Webhook handlers
│   ├── auth/                     # Auth pages (7 routes)
│   ├── buyer/                    # Buyer portal (~40 pages)
│   │   ├── auction/
│   │   ├── billing/
│   │   ├── contracts/
│   │   ├── dashboard/
│   │   ├── deal/
│   │   ├── deals/
│   │   ├── deposit/
│   │   ├── documents/
│   │   ├── insurance/
│   │   ├── onboarding/
│   │   ├── pickup/
│   │   ├── prequal/
│   │   ├── profile/
│   │   ├── search/
│   │   ├── shortlist/
│   │   ├── sign/
│   │   ├── trade-in/
│   │   └── layout.tsx
│   ├── contact/                  # Contact page
│   ├── dealer/                   # Dealer portal (~30 pages)
│   │   ├── auctions/
│   │   ├── contracts/
│   │   ├── dashboard/
│   │   ├── deals/
│   │   ├── documents/
│   │   ├── inventory/
│   │   ├── messages/
│   │   ├── onboarding/
│   │   ├── pickups/
│   │   ├── profile/
│   │   └── layout.tsx
│   ├── dealer-application/       # Dealer signup
│   ├── faq/                      # FAQ page
│   ├── for-dealers/              # Dealer landing page
│   ├── health/                   # Health check route
│   ├── how-it-works/             # How it works page
│   ├── insurance/                # Insurance public page
│   ├── legal/                    # Legal pages
│   ├── pricing/                  # Pricing page
│   ├── ref/                      # Referral tracking
│   ├── refinance/                # Refinance page
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Homepage
├── components/                   # React UI components
│   ├── admin/                    # Admin-specific components
│   ├── affiliate/                # Affiliate components
│   ├── buyer/                    # Buyer components
│   ├── dealer/                   # Dealer components
│   ├── email/                    # Email templates (React Email)
│   ├── ui/                       # Shared UI (Radix + shadcn)
│   └── ...                       # Feature-specific components
├── hooks/                        # Custom React hooks (4 files)
├── lib/                          # Shared libraries & services
│   ├── ai/                       # AI orchestrator + Gemini
│   ├── middleware/                # Rate limiting, error handling
│   ├── services/                 # Business logic (20+ services)
│   ├── seo/                      # SEO utilities
│   ├── supabase/                 # Supabase client management
│   ├── utils/                    # Utility functions
│   ├── auth.ts                   # JWT creation/verification
│   ├── auth-edge.ts              # Edge-compatible auth
│   ├── auth-server.ts            # Server-side session mgmt
│   ├── admin-auth.ts             # Admin auth (MFA, rate limit)
│   ├── auth-utils.ts             # Password hashing, role utils
│   ├── db.ts                     # Prisma client
│   ├── stripe.ts                 # Stripe singleton
│   ├── resend.ts                 # Email client
│   └── workspace-scope.ts        # Workspace isolation
├── prisma/                       # Database schema
│   └── schema.prisma             # 70+ models, 17+ enums
├── __tests__/                    # Unit tests (44 files, Vitest)
├── e2e/                          # E2E tests (15 files, Playwright)
├── scripts/                      # Build, migration, seed scripts
├── migrations/                   # Database migrations
├── mocks/                        # Mock data
├── public/                       # Static assets
├── styles/                       # Global CSS
├── docs/                         # Documentation
├── .github/workflows/            # CI/CD pipelines
│   ├── ci.yml                    # Main CI pipeline
│   └── production-readiness-gate.yml  # Pre-deploy checks
├── package.json                  # Dependencies (pnpm)
├── tsconfig.json                 # TypeScript config
├── next.config.mjs               # Next.js config
├── vitest.config.ts              # Vitest configuration
├── playwright.config.ts          # Playwright configuration
├── eslint.config.mjs             # ESLint configuration
├── proxy.ts                      # Edge middleware (route protection)
└── .env.example                  # Environment variable template
```

## Key Directory Identification

| Directory | Purpose | Status |
|-----------|---------|--------|
| `/app` | Next.js App Router routes | ✅ Present |
| `/pages` | Legacy pages directory | ❌ Not used (App Router only) |
| `/components` | React UI components | ✅ Present |
| `/lib` | Shared libraries & services | ✅ Present |
| `/lib/services` | Business logic services (20+) | ✅ Present |
| `/prisma` | Database schema (Prisma ORM) | ✅ Present |
| `/hooks` | Custom React hooks | ✅ Present (4 files) |
| `/proxy.ts` | Edge middleware | ✅ Present (root-level) |
| `/lib/middleware` | Rate limiting & error handling | ✅ Present |

## Build & Test Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `build` | `prisma generate && next build` | Production build |
| `dev` | `next dev` | Development server |
| `lint` | `eslint . --no-error-on-unmatched-pattern` | Linting |
| `typecheck` | `tsc --noEmit` | Type checking |
| `test` | `vitest` | Unit tests (watch) |
| `test:unit` | `vitest run --reporter=verbose` | Unit tests (CI) |
| `test:coverage` | `vitest --coverage` | Coverage report |
| `test:e2e` | `playwright test` | E2E tests |
| `db:push` | `prisma db push` | Schema push |
| `db:migrate` | `run-migrations.ts` | Run migrations |

## Framework & Runtime

| Component | Version |
|-----------|---------|
| Next.js | 16.0.10 |
| React | 19.2.0 |
| Node.js | 22.x |
| pnpm | 10.28.0 |
| TypeScript | 5.x |
| Prisma | 6.16.0 |

## Confirmed Integrations

| Integration | Status | Details |
|-------------|--------|---------|
| Stripe | ✅ Confirmed | `stripe@20.0.0` + React components |
| Supabase | ✅ Confirmed | `@supabase/supabase-js@2.49.8` + SSR |
| Prisma | ✅ Confirmed | `prisma@6.16.0` + PostgreSQL |
| Auth | ✅ Confirmed | Custom JWT + NextAuth 4 + Supabase Auth + WebAuthn + MFA |
| Test Framework | ✅ Confirmed | Vitest 4.0.16 + Playwright 1.49.0 |
| Email | ✅ Confirmed | Resend 6.5.2 |
| AI | ✅ Confirmed | Google Gemini 0.24.1 |

## Environment Variables (from .env.example)

**Required:**
- `NEXT_PUBLIC_APP_URL` — Application domain
- `JWT_SECRET` — Custom JWT signing key
- `NEXTAUTH_SECRET` — NextAuth session secret
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase client
- `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_URL` — Supabase server
- `POSTGRES_PRISMA_URL` — PostgreSQL connection
- `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` / `STRIPE_WEBHOOK_SECRET` — Stripe
- `RESEND_API_KEY` / `FROM_EMAIL` / `FROM_NAME` — Email service
- `CRON_SECRET` / `ESIGN_WEBHOOK_SECRET` / `INTERNAL_API_KEY` — Internal secrets
- `GEMINI_API_KEY` — Google AI

**Optional:**
- `DEV_EMAIL_TO` — Dev email override
- `NEXT_PUBLIC_SENTRY_DSN` — Error tracking
- `ADMIN_SUBDOMAIN_ENABLED` — Admin subdomain toggle
- `AI_ACTIONS_DISABLED` — AI kill switch
