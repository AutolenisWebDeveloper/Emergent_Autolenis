# RLS Policy Atlas

## Overview

This document catalogs all Row-Level Security (RLS) policies applied to the AutoLenis database. RLS is enforced by Supabase and relies on `auth.uid()` mapped to internal user identity via helper functions.

## Helper Functions

| Function | Returns | Description |
|----------|---------|-------------|
| `public.current_user_id()` | `TEXT` (User.id) | Maps `auth.uid()` to internal `User.id` |
| `public.current_workspace_id()` | `TEXT` (workspaceId) | Returns current user's workspace ID |
| `public.is_admin()` | `BOOLEAN` | True if user role is `ADMIN` or `SUPER_ADMIN` |
| `public.in_current_workspace(ws_id)` | `BOOLEAN` | True if given workspace ID matches current user's |

## Core Table Policies

### User

| Policy | Operation | Rule |
|--------|-----------|------|
| `user_select_own` | SELECT | Own row OR admin |
| `user_update_own` | UPDATE | Own row OR admin (WITH CHECK) |

### BuyerProfile

| Policy | Operation | Rule |
|--------|-----------|------|
| `buyer_profile_select` | SELECT | Own profile (via userId) OR admin |
| `buyer_profile_update` | UPDATE | Own profile (via userId) OR admin (WITH CHECK) |

### Dealer

| Policy | Operation | Rule |
|--------|-----------|------|
| `dealer_select` | SELECT | Owner (via userId) OR member (via DealerUser) OR admin |
| `dealer_update` | UPDATE | Owner (via userId) OR admin (WITH CHECK) |

### DealerUser

| Policy | Operation | Rule |
|--------|-----------|------|
| `dealer_user_select` | SELECT | Own row (via userId) OR admin |
| `dealer_user_insert` | INSERT | Admin only (WITH CHECK) |
| `dealer_user_update` | UPDATE | Admin only (WITH CHECK) |

### Affiliate

| Policy | Operation | Rule |
|--------|-----------|------|
| `affiliate_select` | SELECT | Own record (via userId) OR admin |
| `affiliate_update` | UPDATE | Own record (via userId) OR admin (WITH CHECK) |

### AdminUser

| Policy | Operation | Rule |
|--------|-----------|------|
| `admin_user_select` | SELECT | Own record (via userId) OR admin |

## Workspace-Scoped Tables

These tables have a `workspaceId` column and use a generic workspace-scoped policy:

| Table | Policy | Rule |
|-------|--------|------|
| Deal | `ws_select` | `workspaceId = current_workspace_id()` OR admin |
| PreQualification | `ws_select` | `workspaceId = current_workspace_id()` OR admin |
| Auction | `ws_select` | `workspaceId = current_workspace_id()` OR admin |
| FinancingOffer | `ws_select` | `workspaceId = current_workspace_id()` OR admin |
| InsuranceQuote | `ws_select` | `workspaceId = current_workspace_id()` OR admin |
| ContractShieldScan | `ws_select` | `workspaceId = current_workspace_id()` OR admin |
| Document | `ws_select` | `workspaceId = current_workspace_id()` OR admin |
| Payment | `ws_select` | `workspaceId = current_workspace_id()` OR admin |

## Service Role Bypass

The Supabase service role key (`SUPABASE_SERVICE_ROLE_KEY`) bypasses all RLS policies. It should ONLY be used in:

- `/api/webhooks/**` — Stripe webhook handlers (signature-verified)
- `/api/cron/**` — Scheduled jobs (secret-verified)
- Admin break-glass operations (audited in `AdminAuditLog`)
- Backfill/migration scripts

All normal portal request paths (Buyer, Dealer, Affiliate, Admin) must use the RLS-enforced SSR client (`lib/supabase/server.ts`).

## Migration Reference

- Schema: `migrations/100-auth-hardening-schema.sql`
- Policies: `migrations/101-rls-functions-and-policies.sql`
