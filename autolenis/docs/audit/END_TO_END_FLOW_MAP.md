# END_TO_END_FLOW_MAP.md — AutoLenis User Journey Validation

## Complete Buyer Journey

```
Onboarding → PreQual → Search → Shortlist → Auction → Best Price →
Financing → Fee → Insurance → Contract → E-Sign → Pickup → Affiliate
```

---

## Step 1: Onboarding
| Check | Status | Details |
|-------|--------|---------|
| Page exists | ✅ | `/auth/signup`, `/buyer/onboarding` |
| API wired | ✅ | `POST /api/auth/signup` |
| Error handling | ✅ | Zod validation, duplicate email check |
| Loading states | ✅ | Form submission states |
| Access protection | ✅ | Public route (pre-auth) |

---

## Step 2: Pre-Qualification
| Check | Status | Details |
|-------|--------|---------|
| Page exists | ✅ | `/buyer/prequal` |
| API wired | ✅ | `POST /api/buyer/prequal`, `GET /api/buyer/prequal` |
| Error handling | ✅ | Validation errors, credit tier assignment |
| Loading states | ✅ | Form + result loading |
| Access protection | ✅ | BUYER role required |

---

## Step 3: Search
| Check | Status | Details |
|-------|--------|---------|
| Page exists | ✅ | `/buyer/search` |
| API wired | ✅ | `GET /api/buyer/inventory` |
| Error handling | ✅ | Empty results, filter validation |
| Loading states | ✅ | Search results loading |
| Access protection | ✅ | BUYER role required |

---

## Step 4: Shortlist
| Check | Status | Details |
|-------|--------|---------|
| Page exists | ✅ | `/buyer/shortlist` |
| API wired | ✅ | `POST /api/buyer/shortlist`, `GET /api/buyer/shortlist` |
| Error handling | ✅ | Duplicate prevention |
| Loading states | ✅ | List loading states |
| Access protection | ✅ | BUYER role required |

---

## Step 5: Auction
| Check | Status | Details |
|-------|--------|---------|
| Page exists | ✅ | `/buyer/auction`, `/buyer/auction/[id]` |
| API wired | ✅ | `POST /api/buyer/auctions`, `GET /api/auction/[id]` |
| Error handling | ✅ | Deposit required validation, expiry handling |
| Loading states | ✅ | Auction status loading |
| Access protection | ✅ | BUYER role + deposit validation |

---

## Step 6: Best Price
| Check | Status | Details |
|-------|--------|---------|
| Page exists | ✅ | `/buyer/auction/[id]/offers` |
| API wired | ✅ | `GET /api/auction/[id]/best-price` |
| Error handling | ✅ | No offers scenario |
| Loading states | ✅ | Ranking computation loading |
| Access protection | ✅ | BUYER role + auction owner |

---

## Step 7: Financing
| Check | Status | Details |
|-------|--------|---------|
| Page exists | ✅ | `/buyer/deals/[dealId]/financing`, `/buyer/funding` |
| API wired | ✅ | `GET /api/buyer/deals/[dealId]/financing` |
| Error handling | ✅ | No financing offers scenario |
| Loading states | ✅ | Offer loading |
| Access protection | ✅ | BUYER role + deal owner |

---

## Step 8: Fee Payment
| Check | Status | Details |
|-------|--------|---------|
| Page exists | ✅ | `/buyer/deals/[dealId]/fee`, `/buyer/billing` |
| API wired | ✅ | `POST /api/payments/fee/pay-card`, `POST /api/payments/fee/loan-agree` |
| Error handling | ✅ | Payment failure handling, Stripe errors |
| Loading states | ✅ | Payment processing states |
| Access protection | ✅ | BUYER role + deal owner |

---

## Step 9: Insurance
| Check | Status | Details |
|-------|--------|---------|
| Page exists | ✅ | `/buyer/insurance`, `/buyer/deal/insurance/*` |
| API wired | ✅ | `POST /api/insurance/quotes`, `POST /api/insurance/select` |
| Error handling | ✅ | No quotes, provider errors |
| Loading states | ✅ | Quote loading, binding states |
| Access protection | ✅ | BUYER role + deal owner |

---

## Step 10: Contract Review
| Check | Status | Details |
|-------|--------|---------|
| Page exists | ✅ | `/buyer/contracts`, `/buyer/contract-shield` |
| API wired | ✅ | `GET /api/contract/scan/[id]`, `POST /api/buyer/contracts/acknowledge-override` |
| Error handling | ✅ | Scan failures, override workflow |
| Loading states | ✅ | Scan progress, results loading |
| Access protection | ✅ | BUYER role + deal owner |

---

## Step 11: E-Sign
| Check | Status | Details |
|-------|--------|---------|
| Page exists | ✅ | `/buyer/esign`, `/buyer/sign/[dealId]` |
| API wired | ✅ | `POST /api/esign/create`, `GET /api/esign/status` |
| Error handling | ✅ | Contract not PASSED gating, provider errors |
| Loading states | ✅ | Signing redirect, status polling |
| Access protection | ✅ | BUYER role + deal owner + contract PASSED |

---

## Step 12: Pickup
| Check | Status | Details |
|-------|--------|---------|
| Page exists | ✅ | `/buyer/pickup/[dealId]`, `/buyer/delivery` |
| API wired | ✅ | `POST /api/pickup/schedule`, `GET /api/pickup/[dealId]` |
| Error handling | ✅ | Scheduling conflicts, QR errors |
| Loading states | ✅ | Appointment loading |
| Access protection | ✅ | BUYER role + deal owner + signed |

---

## Step 13: Affiliate (Cross-cutting)
| Check | Status | Details |
|-------|--------|---------|
| Page exists | ✅ | `/affiliate/portal/*` (10+ pages) |
| API wired | ✅ | `POST /api/affiliate/enroll`, `GET /api/affiliate/dashboard` |
| Error handling | ✅ | Enrollment validation, payout errors |
| Loading states | ✅ | Dashboard + analytics loading |
| Access protection | ✅ | AFFILIATE role or BUYER+is_affiliate |

---

## Dealer Journey

```
Application → Onboarding → Inventory → Auction Response →
Contract Upload → Fix Resolution → Pickup Management
```

| Step | Page | API | Protection |
|------|------|-----|------------|
| Application | `/dealer-application` | `POST /api/dealer/register` | Public |
| Onboarding | `/dealer/onboarding` | Internal | DEALER |
| Inventory | `/dealer/inventory/*` | `POST/GET /api/dealer/inventory` | DEALER |
| Auction Response | `/dealer/auctions/*` | `POST /api/dealer/auctions/[id]/offer` | DEALER |
| Contract Upload | `/dealer/contracts/*` | `POST /api/contract/upload` | DEALER |
| Fix Resolution | (within contract) | `POST /api/contract/fix` | DEALER |
| Pickup | `/dealer/pickups` | `GET /api/dealer/pickups` | DEALER |

---

## Admin Journey

All admin routes protected by ADMIN/SUPER_ADMIN role + MFA requirement.

80+ pages covering oversight of all 12 systems.

---

## Gap Analysis

| Gap | Severity | Description |
|-----|----------|-------------|
| None Critical | — | All 13 buyer journey steps have pages, APIs, and protection |
| Mock Providers | Medium | Insurance and E-Sign use mock providers (production needs real integrations) |
| Credit Bureau | Medium | Pre-qualification uses mock credit data |

---

## Frontend Protection Summary

| Route Group | Protection Method | Verified |
|-------------|-------------------|----------|
| `/buyer/*` | Edge middleware (proxy.ts) → BUYER role | ✅ |
| `/dealer/*` | Edge middleware → DEALER/DEALER_USER role | ✅ |
| `/admin/*` | Edge middleware → ADMIN/SUPER_ADMIN + MFA | ✅ |
| `/affiliate/portal/*` | Edge middleware → AFFILIATE role check | ✅ |
| `/auth/*` | Public (pre-auth) | ✅ |
| `/api/admin/*` | API handler → requireAuth(["ADMIN"]) | ✅ |
| `/api/buyer/*` | API handler → getSessionUser() + role check | ✅ |
| `/api/dealer/*` | API handler → getSessionUser() + dealer ownership | ✅ |
