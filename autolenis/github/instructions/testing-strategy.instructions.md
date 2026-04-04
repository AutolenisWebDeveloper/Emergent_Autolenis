---
applyTo: "__tests__/**|e2e/**|vitest.config.ts|vitest.setup.ts|playwright.config.ts|**/*.test.ts|**/*.test.tsx"
---
# Testing Strategy (Non-Negotiable)

## Unit Tests (Vitest)
- Test files live in `__tests__/` at the project root, named `*.test.ts` or `*.test.tsx`.
- Framework: Vitest with `happy-dom` environment and global test functions (`describe`, `it`, `expect`).
- Setup: `vitest.setup.ts` handles cleanup, env var mocking, and Next.js module mocks.
- Run with: `pnpm test:unit` (all tests) or `pnpm exec vitest run <file>` (single file).

## Mocking Conventions
- Mock external modules with `vi.mock()` at the top of the test file — never make real HTTP calls, DB connections, or third-party API calls.
- Database mocking: use custom query chain builders that simulate Supabase/Prisma behavior (pattern established in `__tests__/admin-inventory-action.test.ts`).
- Auth mocking: mock `getSessionUser()` / `getCurrentUser()` from `@/lib/auth-server` to control the test session.
- Use `vi.fn()` for function mocks; `vi.spyOn()` for observing existing implementations.

## Test Coverage Requirements
- Every service method must have tests covering:
  - **Happy path**: correct inputs produce correct outputs.
  - **Validation failures**: invalid inputs return appropriate errors with correct status codes.
  - **Auth/RBAC rejection**: unauthorized access returns 401/403 with the standard error shape.
  - **Edge cases**: boundary values, empty inputs, concurrent operations.
  - **Error contract**: verify `{ error: { code, message }, correlationId }` shape on failures.
- Every new API route must have tests for all HTTP methods it handles.
- State-changing operations must test idempotency (calling twice produces the same result).

## Test Isolation
- Use `beforeEach()` for state reset — never share mutable state between tests.
- Each test must be independently runnable without depending on execution order.
- Clean up any side effects (timers, event listeners, mock state) in `afterEach()`.

## E2E Tests (Playwright)
- E2E tests live in `e2e/` and exercise complete user workflows through the browser.
- Use the TEST workspace mode with mock data — no external service dependencies.
- Run with: `pnpm test:e2e`.
