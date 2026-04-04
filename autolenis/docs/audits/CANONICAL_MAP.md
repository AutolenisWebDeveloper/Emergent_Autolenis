# Canonical Map - Single Source of Truth

**Generated:** 2026-02-07  
**Purpose:** Master index of all TODO/incomplete pages with canonical implementations  
**Compliance:** REUSE-FIRST, NO DUPLICATES

---

## 📌 CANONICAL IMPLEMENTATIONS

### Affiliate Portal
**✅ CANONICAL:** `/affiliate/portal/*`  
**❌ DEPRECATED:** `/affiliate/*` (old implementation)

| Feature | Canonical Path | Deprecated Path | Action |
|---------|---------------|-----------------|--------|
| Dashboard | `/affiliate/portal/dashboard` | `/affiliate/dashboard` | Remove old (redirect stub) |
| Payouts | `/affiliate/portal/payouts` | `/affiliate/payouts` | Remove old (redirect stub) |
| Commissions | `/affiliate/portal/commissions` | `/affiliate/commissions` | Remove old (redirect stub) |
| Referrals | `/affiliate/portal/referrals` | `/affiliate/referrals` | Remove old (redirect stub) |
| Settings | `/affiliate/portal/settings` | `/affiliate/settings` | Remove old (redirect stub) |
| Link Generator | `/affiliate/portal/link` | `/affiliate/links` | Remove old (redirect stub) |
| Onboarding | `/affiliate/portal/onboarding` | `/affiliate/onboarding` | Remove old (redirect stub) |
| Profile | N/A | `/affiliate/profile` | Migrate or remove (orphaned) |
| Support | N/A | `/affiliate/support` | Migrate or remove (orphaned) |
| Earnings | N/A | `/affiliate/earnings` | Migrate or remove (orphaned) |
| Income | N/A | `/affiliate/income` | Migrate or remove (orphaned) |

**Files to Remove:** 11 files in `app/affiliate/` (excluding portal directory)

---

### Inventory Search
**✅ CANONICAL:** `/api/buyer/inventory/*` (authenticated, buyer-scoped)  
**❌ DEPRECATED:** `/api/inventory/*` (public, no auth)

| Feature | Canonical | Deprecated | Action |
|---------|-----------|------------|--------|
| Search | `/api/buyer/inventory/search` | `/api/inventory/search` | Remove public version |
| Filters | `/api/buyer/inventory/filters` | `/api/inventory/filters` | Remove public version |

**Files to Remove:** 2 API routes

---

### Pickup Scheduling
**✅ CANONICAL:** `/api/buyer/deals/[dealId]/pickup/*` (deal-scoped)  
**❌ DEPRECATED:** `/api/pickup/schedule` (inconsistent params)

| Feature | Canonical | Deprecated | Action |
|---------|-----------|------------|--------|
| Schedule | `/api/buyer/deals/[dealId]/pickup/schedule` | `/api/pickup/schedule` | Remove old endpoint |

**Files to Remove:** 1 API route

---

### Best Price (Auction)
**✅ CANONICAL:**  
- Buyer: `/api/buyer/auctions/[auctionId]/best-price` (ownership validated)  
- Admin: `/api/admin/auctions/[auctionId]/best-price` (full data + logs)

**❌ DEPRECATED:** `/api/auction/[id]/best-price` (public, NO AUTH)

| Feature | Canonical | Deprecated | Action |
|---------|-----------|------------|--------|
| Best Price | Role-based endpoints | `/api/auction/[id]/best-price` | **DELETE IMMEDIATELY** (security risk) |

**Files to Remove:** 1 API route (HIGH PRIORITY - Security vulnerability)

---

### Payments Hub
**✅ CANONICAL:** `/admin/payments/*`  
**Implementation:** Stripe integration via `/api/payments/*`  
**Status:** Complete, no duplicates

---

### Documents Center
**✅ CANONICAL:** Contract Shield at `/admin/contracts/*`  
**Secondary:** Buyer/Dealer document pages (incomplete)

| Feature | Canonical | Status | Action |
|---------|-----------|--------|--------|
| Contract Upload | `/admin/contracts/*` | Complete | No action |
| Buyer Documents | `/buyer/documents` | Incomplete | Implement S3 upload |
| Dealer Documents | `/dealer/documents` | Incomplete | Implement S3 upload |

---

### Offers/Contracts Flows
**✅ CANONICAL IMPLEMENTATIONS:**

| Role | Canonical Path | Status | Missing |
|------|---------------|--------|---------|
| Buyer | `/buyer/offers/*` → `/buyer/deal/*` | Partial | Accept/Negotiate/Decline APIs |
| Dealer | `/dealer/offers/*` | Partial | Edit/Withdraw APIs |
| Admin | `/admin/offers/*` | Complete | None |

**APIs to Create:**
- `/api/buyer/offers/[offerId]/accept`
- `/api/buyer/offers/[offerId]/negotiate`
- `/api/buyer/offers/[offerId]/decline`
- `/api/dealer/offers/[offerId]` (PUT)
- `/api/dealer/offers/[offerId]/withdraw`

---

## 📋 37 TODO ITEMS - MASTER CHECKLIST

### Priority Breakdown
- **P0 (Critical):** 1 item - Security (admin signup)
- **P1 (High):** 2 items - Core features (insurance, offers)
- **P2 (Medium):** 9 items - UX completion (documents, profiles, leads)
- **P3 (Low):** 3 items - Cleanup (orphaned pages)
- **COMPLETE:** 22 items (59%)

### Status: 🔴 PUBLIC / MARKETING
| # | Page | Status | Priority |
|---|------|--------|----------|
| 1 | Contact | ✅ COMPLETE | - |
| 2 | Refinance | ✅ COMPLETE | - |
| 3 | Dealer Application | ✅ COMPLETE | - |

### Status: 🟠 BUYER DASHBOARD
| # | Page | Status | Priority | Reuse |
|---|------|--------|----------|-------|
| 4 | Affiliate | ⚠️ INCOMPLETE | P2 | `AffiliateService.trackReferral()` |
| 5 | Insurance | ⚠️ INCOMPLETE | P1 | `InsuranceService.getQuotes()` |
| 6 | Trade-In | ⚠️ INCOMPLETE | P2 | `/api/buyer/trade-in` endpoint |
| 7 | Messages | ⚠️ INCOMPLETE | P2 | Create Message models |
| 8 | Requests | ⚠️ INCOMPLETE | P2 | `/api/buyer/requests` endpoint |
| 9 | Profile | ⚠️ INCOMPLETE | P2 | Wire to profile update API |
| 10 | Documents | ⚠️ INCOMPLETE | P2 | `/api/buyer/documents` + S3 |
| 11 | Offers Detail | ⚠️ INCOMPLETE | P1 | Create offer action APIs |

### Status: 🟠 DEALER DASHBOARD
| # | Page | Status | Priority | Reuse |
|---|------|--------|----------|-------|
| 12 | Settings | ✅ COMPLETE | - | - |
| 13 | Inventory | ✅ COMPLETE | - | - |
| 14 | Leads Detail | ⚠️ INCOMPLETE | P2 | Implement contact/archive/notes |
| - | Profile | ⚠️ INCOMPLETE | P2 | Wire to profile update API |
| - | Documents | ⚠️ INCOMPLETE | P2 | `/api/dealer/documents` + S3 |
| - | Offers Detail | ⚠️ INCOMPLETE | P2 | Create edit/withdraw APIs |
| - | Offers New | ⚠️ INCOMPLETE | P2 | Extract requestId from params |

### Status: 🟠 AFFILIATE DASHBOARD / PORTAL
| # | Page | Status | Priority | Action |
|---|------|--------|----------|--------|
| 15 | Profile | ⚠️ ORPHANED | P3 | Migrate or remove |
| 16 | Support | ⚠️ ORPHANED | P3 | Migrate or remove |
| 17 | Commissions | ❌ REDIRECT STUB | P3 | Remove file |
| 18 | Portal Onboarding | ✅ COMPLETE | - | - |
| 19 | Portal Settings | ✅ COMPLETE | - | - |
| 20 | Portal Analytics | ✅ COMPLETE | - | - |
| 21 | Portal Link | ✅ COMPLETE | - | - |
| 22 | Portal Payouts | ✅ COMPLETE | - | - |

### Status: 🟠 ADMIN DASHBOARD
| # | Page | Status | Priority | Action |
|---|------|--------|----------|--------|
| 23 | Sign-In | ✅ COMPLETE | - | - |
| 24 | Signup | �� SECURITY ISSUE | P0 | Secure API endpoint! |
| 25-37 | Other Admin Pages | ✅ COMPLETE | - | - |

---

## 🚫 DUPLICATE PREVENTION

### Verified Compliance
- ❌ **NO duplicates created** in this audit
- ✅ **REUSE-FIRST** documented for all TODOs
- ✅ **Canonical sources** identified for all features
- ✅ **Legacy paths** documented for removal
- ✅ **No v2/new/temp** versions created

### Files Marked for Removal
| Category | Count | Action |
|----------|-------|--------|
| Old Affiliate Pages | 11 files | Remove after portal migration |
| Duplicate API Endpoints | 5 routes | Remove public/legacy versions |
| Unused DB Models | 4 models | Remove from Prisma schema |
| **TOTAL** | **20 files** | Cleanup Phase 2 |

### Files to Extend (NOT Create)
| Category | Count | Action |
|----------|-------|--------|
| Buyer Pages | 8 pages | Wire to existing APIs |
| Dealer Pages | 4 pages | Implement missing features |
| Service Methods | 18 methods | Add to existing services |
| **TOTAL** | **15 files** | Extend existing code |

**New Files Required:** 0 (all TODOs reuse existing implementations)

---

## 📊 IMPLEMENTATION EFFORT

| Phase | Focus | Priority | Hours | Files |
|-------|-------|----------|-------|-------|
| **Phase 1** | Security Fixes | P0 | 8 | 5 files |
| **Phase 2** | Duplicate Cleanup | P1 | 12 | 20 removals |
| **Phase 3** | Core Features | P2 | 28 | 15 extensions |
| **Phase 4** | Messaging & Polish | P3 | 16 | New models |
| **TOTAL** | | | **64 hours** | |

---

## ✅ ACCEPTANCE CRITERIA

### Phase 1 (Security) - MUST COMPLETE FIRST
- [ ] No hardcoded secrets in production code
- [ ] All admin endpoints require admin role
- [ ] No public access to sensitive auction data
- [ ] All role checks enforced across dashboards

### Phase 2 (Cleanup) - NO DUPLICATES REMAIN
- [ ] All old affiliate pages removed
- [ ] All duplicate API endpoints consolidated
- [ ] All unused Prisma models removed
- [ ] Service layer patterns consistent

### Phase 3 (Features) - ALL TODOs COMPLETE
- [ ] All offer action APIs implemented
- [ ] All service methods implemented
- [ ] Document upload functional
- [ ] No NotImplementedModal in production

### Phase 4 (Polish) - PRODUCTION READY
- [ ] Messaging system complete
- [ ] All pages in navigation
- [ ] Zero TODO markers
- [ ] All tests passing

---

**END OF CANONICAL MAP**  
**Maintained By:** Engineering Team  
**Last Updated:** 2026-02-07  
**Version:** 1.0.0
