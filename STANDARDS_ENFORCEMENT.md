# Standards Enforcement Status

> Last updated: 2026-03-20 (Phase 2 — Phased Hard Enforcement)

## Enforcement Summary

| Standard | Enforcement Level | Scope | Mechanism | Violations |
|---|---|---|---|---|
| `await-thenable` | **ERROR** (blocks CI) | All `.ts/.tsx` | ESLint | 0 |
| `no-floating-promises` | **ERROR** (blocks CI) | `app/api/**`, `lib/**`, `scripts/governance/**` | ESLint scoped override | 0 |
| `no-floating-promises` | WARN (staged) | UI pages (`app/admin/`, `app/buyer/`, etc.) | ESLint | ~163 |
| `no-explicit-any` | **ERROR** (blocks CI) | `scripts/governance/**` | ESLint scoped override | 0 |
| `no-explicit-any` | WARN (staged) | All other `.ts/.tsx` | ESLint | ~1,192 |
| `no-misused-promises` | WARN (staged) | All `.ts/.tsx` | ESLint | ~9 |
| `no-unsafe-*` (5 rules) | **ERROR** (blocks CI) | `scripts/governance/**` | ESLint scoped override | 0 |
| `no-unsafe-*` (5 rules) | WARN (staged) | All other `.ts/.tsx` | ESLint | ~20K |
| `require-await` | WARN (staged) | All `.ts/.tsx` | ESLint | ~122 |
| Direct PrismaClient import | **ERROR** (blocks CI) | `app/**`, `lib/**` | ESLint `no-restricted-imports` | 0 |
| Buyer route auth | **ERROR** (blocks CI) | `app/api/buyer/**` | `check-architecture.ts` | 0 |
| Admin route auth | **ERROR** (blocks CI) | `app/api/admin/**` | `check-architecture.ts` | 0 |
| Direct Prisma in app/ | **ERROR** (blocks CI) | `app/**` | `check-architecture.ts` | 0 |
| Sensitive data logging | **ERROR** (blocks CI) | `app/**`, `lib/**` | `check-architecture.ts` | 0 |
| Service-role in user routes | WARN (tracked) | `app/api/buyer/**`, `app/api/dealer/**`, `app/api/affiliate/**` | `check-architecture.ts` | 0 |
| Workspace scoping | **ERROR** (blocks CI) | `lib/services/**` (non-exempt) | `check-architecture.ts` | 0 |
| Workspace scoping | WARN (staged) | 6 specific services | `check-architecture.ts` staged exemptions | 6 |
| Route error handling | **ERROR** (blocks CI) | `app/api/**` (routes with DB/external calls) | `check-architecture.ts` | 0 |
| TypeScript strict mode | **ERROR** (blocks CI) | All | `tsconfig.json` strict: true | 0 |
| TypeScript strictNullChecks | **ERROR** (blocks CI) | All | `tsconfig.json` | 0 |
| TypeScript noImplicitReturns | **ERROR** (blocks CI) | All | `tsconfig.json` | 0 |
| TypeScript noFallthroughCases | **ERROR** (blocks CI) | All | `tsconfig.json` | 0 |
| TypeScript noImplicitOverride | **ERROR** (blocks CI) | All | `tsconfig.json` | 0 |

## What Blocks CI

The following checks must pass for CI to succeed:

1. **`pnpm lint`** — ESLint with 0 errors (warnings allowed, tracked)
2. **`pnpm typecheck`** — TypeScript strict compilation
3. **`pnpm check:architecture`** — Architecture governance (0 errors required)
4. **`pnpm check:schema-contract`** — Schema contract enforcement
5. **`pnpm test:unit`** — All unit tests pass

## Phase 2 Promotions (This Pass)

| Category | Before | After |
|---|---|---|
| `no-floating-promises` | Warn everywhere | **Error** in API routes + lib + governance |
| `no-explicit-any` | Warn everywhere | **Error** in governance scripts |
| Admin route auth | Warn (41 false positives) | **Error** (0 violations, 0 false positives) |
| Workspace scoping | Warn (14 mixed) | **Error** for non-exempt + 6 explicitly staged |
| Route error handling | Warn (27 mixed) | **Error** (0 violations after fixes) |

## What Is Staged (Warnings, Not Yet Blocking)

These violations exist in the current codebase and are tracked for cleanup:

- **`no-explicit-any`**: ~1,192 violations in app/lib code. Fix by replacing `any` with proper types.
- **`no-floating-promises`**: ~163 violations in UI pages. Fix by awaiting, `.catch()`-ing, or `void`-prefixing.
- **`no-unsafe-*`**: ~20K violations. These resolve naturally as `any` types are removed.
- **Workspace scoping (staged)**: 6 data services need `workspace_id` scoping added:
  - `buyer-package.service.ts`, `buyer.service.ts`, `checkout.service.ts`
  - `dealer.service.ts`, `case.service.ts`, `dealer-portal.service.ts`

## Promotion Path

To promote a staged warning to a blocking error:

1. Fix all violations for that rule in the target scope
2. In `eslint.config.mjs`, add a scoped override block targeting the directory
3. Verify 0 errors with `pnpm lint`
4. Update this document

## TypeScript Strictness — Not Yet Enabled

| Setting | Error Count | Status |
|---|---|---|
| `noUncheckedIndexedAccess` | 552 | Too many to enable safely |
| `noUnusedLocals` | 196 (combined) | Too many to enable safely |
| `noUnusedParameters` | (combined above) | Too many to enable safely |

These settings are correct to enable eventually but require dedicated cleanup sprints.

## Commands

```bash
pnpm lint                  # ESLint (warnings + errors)
pnpm lint:strict           # ESLint with --max-warnings 0 (target state)
pnpm typecheck             # TypeScript strict compilation
pnpm check:architecture    # Architecture governance checks
pnpm check:schema-contract # Schema contract enforcement
pnpm test:unit             # Unit tests
```
