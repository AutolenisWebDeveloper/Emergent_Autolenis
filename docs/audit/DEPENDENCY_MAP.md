# DEPENDENCY_MAP.md — AutoLenis Dependency Analysis

## Core Framework

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 16.0.10 | React framework (App Router) |
| `react` | 19.2.0 | UI library |
| `react-dom` | 19.2.0 | React DOM renderer |
| `typescript` | ^5 | Type system |

## Database & ORM

| Package | Version | Purpose |
|---------|---------|---------|
| `@prisma/client` | 6.16.0 | Prisma ORM client |
| `prisma` | 6.16.0 | Schema management (dev) |
| `@supabase/supabase-js` | 2.49.8 | Supabase client SDK |
| `@supabase/ssr` | 0.6.1 | Supabase SSR integration |

## Authentication

| Package | Version | Purpose |
|---------|---------|---------|
| `next-auth` | 4.24.13 | Session management |
| `@auth/core` | 0.34.3 | Core auth library |
| `jose` | 6.1.2 | JWT signing/verification |
| `bcryptjs` | 3.0.3 | Password hashing |
| `@simplewebauthn/server` | latest | WebAuthn (passkeys) server |
| `@simplewebauthn/browser` | latest | WebAuthn (passkeys) browser |

## Payments

| Package | Version | Purpose |
|---------|---------|---------|
| `stripe` | 20.0.0 | Stripe SDK (server) |
| `@stripe/stripe-js` | 8.5.3 | Stripe SDK (browser) |
| `@stripe/react-stripe-js` | 5.4.1 | Stripe React components |

## UI Components

| Package | Version | Purpose |
|---------|---------|---------|
| `@radix-ui/*` | Various | 20+ headless UI primitives |
| `tailwindcss` | ^4.1.9 | Utility-first CSS |
| `tailwind-merge` | ^2.6.0 | Tailwind class merging |
| `class-variance-authority` | ^0.7.1 | Component variants |
| `lucide-react` | ^0.454.0 | Icon library |
| `framer-motion` | ^12.0.0 | Animation library |
| `recharts` | 2.15.4 | Charting library |
| `embla-carousel-react` | 8.5.1 | Carousel component |
| `cmdk` | 1.0.4 | Command palette |
| `sonner` | ^1.7.4 | Toast notifications |
| `vaul` | ^1.1.2 | Drawer component |
| `react-day-picker` | 9.8.0 | Date picker |
| `input-otp` | 1.4.1 | OTP input |
| `react-resizable-panels` | ^2.1.7 | Resizable panels |
| `next-themes` | ^0.4.6 | Theme management |
| `geist` | ^1.7.0 | Geist font |

## Forms & Validation

| Package | Version | Purpose |
|---------|---------|---------|
| `react-hook-form` | ^7.60.0 | Form management |
| `@hookform/resolvers` | ^3.10.0 | Zod resolver for forms |
| `zod` | 3.25.76 | Schema validation |

## Email

| Package | Version | Purpose |
|---------|---------|---------|
| `resend` | 6.5.2 | Email delivery service |
| `@react-email/components` | 1.0.1 | React email templates |
| `@react-email/render` | latest | Email rendering |

## AI

| Package | Version | Purpose |
|---------|---------|---------|
| `@google/generative-ai` | 0.24.1 | Google Gemini AI SDK |

## Utilities

| Package | Version | Purpose |
|---------|---------|---------|
| `date-fns` | 4.1.0 | Date manipulation |
| `nanoid` | 5.1.6 | Unique ID generation |
| `qrcode` | 1.5.4 | QR code generation |
| `swr` | 2.3.6 | Data fetching/caching |
| `clsx` | ^2.1.1 | Conditional classnames |
| `server-only` | 0.0.1 | Server-only module marker |
| `yaml` | latest | YAML parsing |

## Testing

| Package | Version | Type | Purpose |
|---------|---------|------|---------|
| `vitest` | 4.0.16 | prod | Unit test runner |
| `@vitest/coverage-v8` | ^4.0.16 | dev | Coverage reporting |
| `@vitest/ui` | ^4.0.16 | dev | Test UI |
| `@playwright/test` | ^1.49.0 | dev | E2E testing |
| `@testing-library/react` | ^16.1.0 | dev | React testing utils |
| `@testing-library/dom` | latest | prod | DOM testing utils |
| `@testing-library/user-event` | ^14.5.2 | dev | User event simulation |
| `@testing-library/jest-dom` | 6.9.1 | prod | DOM matchers |
| `happy-dom` | ^20.0.2 | dev | Test DOM environment |

## Build & Tooling

| Package | Version | Purpose |
|---------|---------|---------|
| `eslint` | ^9.39.2 | Linting |
| `eslint-config-next` | ^16.1.6 | Next.js ESLint config |
| `postcss` | ^8.5 | CSS processing |
| `@tailwindcss/postcss` | ^4.1.9 | Tailwind PostCSS |
| `@next/bundle-analyzer` | ^16.0.10 | Bundle analysis |
| `@vercel/analytics` | 1.3.1 | Vercel analytics |
| `@opentelemetry/api` | latest | Observability |

## Dependency Graph (System → Package Mapping)

```
12 Core Systems → Package Dependencies
─────────────────────────────────────────

System 1  (Buyer Onboarding)     → zod, react-hook-form, @supabase/supabase-js
System 2  (Vehicle Discovery)    → @supabase/supabase-js, swr, @prisma/client
System 3  (Silent Auction)       → stripe, @prisma/client, nanoid
System 4  (Best Price Engine)    → @prisma/client (pure computation)
System 5  (Financing)            → stripe, @prisma/client, zod
System 6  (Insurance)            → @prisma/client, resend (notification)
System 7  (Contract Shield™)     → @prisma/client, zod, resend
System 8  (E-Sign)               → @prisma/client, jose (webhook verification)
System 9  (Pickup & Delivery)    → qrcode, @prisma/client, date-fns
System 10 (Affiliate & Referral) → stripe, @prisma/client, nanoid
System 11 (Dealer Portal)        → @supabase/supabase-js, @prisma/client
System 12 (Admin Console)        → All of the above + recharts, @google/generative-ai
```

## Security Notes

- `happy-dom >= 20.0.2` — CI enforces this minimum version (security patch)
- `bcryptjs@3.0.3` — Password hashing (no known vulnerabilities)
- `jose@6.1.2` — JWT operations (actively maintained)
- `stripe@20.0.0` — Latest major version with full webhook verification
- All `@radix-ui` packages at stable versions

## Package Manager

- **pnpm** 10.28.0 (enforced via `packageManager` field)
- **Node.js** 22.x (enforced via `engines` field)
- **Override**: `@prisma/client` pinned to 6.16.0
