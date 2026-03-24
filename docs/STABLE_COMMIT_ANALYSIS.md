# Stable Commit Analysis — Rollback Point Identification

> **Purpose**: Identify the most recent known stable commit on `main` before the
> dashboard/auth/deployment issues began.
>
> **Status**: Analysis only — no resets or destructive changes performed.

---

## Recommended Rollback Point

| Field | Value |
|-------|-------|
| **Commit Hash** | `3f90225f804c5d8f93737d28cce53c9466da6754` |
| **Short Hash** | `3f90225f` |
| **Date** | February 20, 2026 — 20:16:01 CST (2026-02-21T02:16:01Z) |
| **Author** | autolenis01 |
| **Message** | Merge pull request #168 from Autolenis/copilot/redesign-footer-to-brand-colors |
| **PR** | #168 — "Redesign footer with premium brand purple background" |

---

## Why This Commit Is the Best Rollback Point

### 1. Last merge before cascading system changes

After this commit, three major architectural changes were introduced that cascaded
into the persistent dashboard/auth/deployment issues:

| Date | Change | Impact |
|------|--------|--------|
| Feb 22 | External bank pre-approval system (PRs #174–#176) | New schema models, service layer, and API routes touching auth and buyer profiles |
| Mar 1 | Distributed rate limiting (`distributed-rate-limit.ts`) | Introduced Redis dependency; when Redis was unavailable, API routes returned **503 errors**, directly causing the dashboard login failures fixed in PRs #311 and #313 |
| Mar 3–7 | Email verification rewrites (3+ attempts), schema remediation, security patches | Each fix attempt introduced new regressions in auth flow, Prisma schema, and deployment |

### 2. Stable feature window before the inflection

The PRs merged in the days leading up to this commit were purely additive
UI/feature work with no system-level side effects:

| PR | Date | Description |
|----|------|-------------|
| #164 | Feb 20 | Add email triggers and log model |
| #166 | Feb 20 | Redesign/refine pages |
| #167 | Feb 20 | Update refinance page design |
| #168 | Feb 20 | Redesign footer to brand colors |
| #163 | Feb 20 | v0 design iteration (UI only) |
| #162 | Feb 20 | v0 design iteration (UI only) |

### 3. Fix frequency analysis confirms the boundary

Fix/error commit frequency by period (first-parent merges only):

| Period | Fix PRs | Total PRs | Fix Ratio |
|--------|---------|-----------|-----------|
| Feb 16–20 | 3 | 19 | 16% |
| Feb 22–27 | 8 | 29 | 28% |
| Mar 1–5 | 12 | 26 | 46% |
| Mar 6–8 | 14 | 22 | 64% |
| Mar 9–11 | 7 | 16 | 44% |

The fix ratio more than doubled immediately after Feb 20 and continued to
escalate, confirming this date as the inflection point.

### 4. Feb 21 commits are safe to preserve

The 8 commits on Feb 21 (between this commit and the first code PR on Feb 22)
added only governance/instruction markdown files and a CodeQL workflow
configuration — **no runtime code changes**. The effective application code at
`fa4097e6` (Feb 21) is identical to `3f90225f` (Feb 20).

---

## Key Issue Chains Traced to Post-Feb-20 Changes

### Dashboard Login Failures (PRs #311, #313)
- **Root cause**: Rate limiting middleware (`distributed-rate-limit.ts`, committed
  directly to main on Mar 1) returned 503 when Redis was unavailable.
- **Fix (Mar 8)**: PR #313 added graceful degradation to allow login when Redis
  is down. This code did not exist before Feb 20.

### Buyer Request-a-Car Submission Errors (PRs #321, #331)
- **Root cause**: `isDatabaseConfigured()` pattern introduced in Mar 8 refactors
  (PR #311) checked database env vars eagerly at import time, causing false
  "database not configured" errors.
- **Fix (Mar 8–9)**: PRs #311 → #313 → #321 → #331 each attempted fixes with
  partial success. The underlying pattern did not exist before Feb 20.

### Email Verification Failures (PRs #239, #240, #241)
- **Root cause**: Pre-approval system (Feb 22) changed auth flow interactions.
  Email verification was rewritten three times on Mar 3 before stabilizing.
- **Fix (Mar 3)**: Three separate PRs attempted to fix the same email
  verification system within hours.

### Deployment Failures (PRs #181, #196, #203, #258)
- **Root cause**: Schema changes from the pre-approval system (Feb 22) and
  subsequent Prisma model additions caused repeated Vercel build failures.
- **Fix**: Each deployment fix introduced further changes, creating a
  fix-upon-fix cycle.

### Redis Adapter Null Errors (PRs #271, #272, #275, #276)
- **Root cause**: Rate limiting introduced Redis as a runtime dependency (Mar 1).
  Null checks were missing in the adapter.
- **Fix (Mar 5–6)**: Four separate PRs attempted to fix Redis null handling.

---

## Alternative Candidates Considered

| Commit | Date | Reason Considered | Reason Rejected |
|--------|------|-------------------|-----------------|
| `fa4097e6` | Feb 21 | Last commit before code PRs resumed | Identical runtime code to `3f90225f`; acceptable as equivalent alternative |
| `a7828b36` | Feb 27 | Last merge before March crisis | Already contained pre-approval system changes and deployment fix PRs |
| `12c980ac` | Feb 14 | "run-production-cleanup" PR | Preceded another round of DealStatus and deployment fixes on Feb 15 |
| `c3f90582` | Feb 10 | "stabilize-production-dashboards" PR | Followed immediately by more dashboard fix PRs |
| `aff7a2ae` | Jan 18 | "make-autolenis-production-ready" PR | Too early; loses all Feb feature work |

---

## Verification Commands (Non-Destructive)

```bash
# View the commit details
git show 3f90225f

# Verify it exists and is an ancestor of current HEAD
git merge-base --is-ancestor 3f90225f HEAD && echo "✅ Valid ancestor"

# Count commits that would be rolled back
git rev-list --count 3f90225f..HEAD

# List all merges after this commit (what would be undone)
git log --oneline --first-parent 3f90225f..HEAD

# Dry-run with the safe-rollback script
./scripts/safe-rollback.sh --commit 3f90225f --branch main --dry-run
```

---

## Next Steps (When Authorized)

1. **Run dry-run** of `safe-rollback.sh` to verify backup creation works
2. **Create a backup branch** from current `main` before any reset
3. **Execute rollback** to `3f90225f` using the safe-rollback script
4. **Selectively cherry-pick** any Feb 21 governance commits (non-code, safe)
5. **Re-deploy** to Vercel and verify dashboard/auth/deployment stability
6. **Re-introduce features** incrementally with proper testing

---

*Analysis performed: March 11, 2026*
*Repository: autolenis01/VercelAutoLenis*
*Total commits analyzed: 1,813*
*Commit range: 8ddc9f16 (Jan 16) → 99b2d691 (Mar 11)*
