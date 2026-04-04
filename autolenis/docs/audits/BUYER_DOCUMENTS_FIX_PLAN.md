# Buyer Documents Fix Plan

## Problem

The Buyer Documents tab was not visible in the Buyer Dashboard sidebar/navigation, despite the page existing at `app/buyer/documents/page.tsx`.

## Root Cause

The `nav` array in `app/buyer/layout.tsx` was missing an entry for the Documents page.

---

## Fix Steps

### Step 1: Add Documents navigation entry ✅

**File:** `app/buyer/layout.tsx`

Add the following entry to the `nav` array (after "Contracts", before "Referrals & Earnings"):

```ts
{ href: "/buyer/documents", label: "Documents", icon: "FileText" },
```

**No other files need modification** — the `FileText` icon is already imported and mapped in `layout-client.tsx`, and both desktop sidebar and mobile menu render from the same `nav` prop.

---

## Files Modified

| File | Change |
|------|--------|
| `app/buyer/layout.tsx` | Added Documents entry to `nav` array (1 line) |

## Files NOT Modified (Reuse Confirmed)

| File | Reason |
|------|--------|
| `app/buyer/layout-client.tsx` | Icon already in map; renders nav from prop |
| `app/buyer/documents/page.tsx` | Already fully implemented |
| `components/layout/protected-route.tsx` | Auth guard already works |

---

## Acceptance Criteria

- [x] Buyer sees "Documents" tab in desktop sidebar
- [x] Buyer sees "Documents" tab in mobile navigation menu
- [x] Clicking "Documents" navigates to `/buyer/documents`
- [x] Document Center page renders with upload, search, tabs, and document cards
- [x] Auth is enforced (non-BUYER users redirected)
- [x] No duplicate routes, pages, components, or API endpoints created
- [x] Navigation works on both desktop and mobile (same `nav` array powers both)
