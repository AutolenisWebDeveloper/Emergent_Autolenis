---
id: knowledge-changelog
version: "1.0.0"
updatedAt: "2026-02-23"
tags:
  - changelog
  - history
roleVisibility:
  - admin
---

# Knowledge Changelog

## v1.0.0 — 2026-02-23

**Initial release of the Canon Knowledge Pack.**

All content derived from the existing knowledge corpus (`lib/ai/knowledge/corpus.ts`), system prompt (`lib/ai/prompts/system-prompt.ts`), and platform constants (`lib/constants.ts`).

### Documents Created

| Doc ID                      | Title                      | Description                                           |
| --------------------------- | -------------------------- | ----------------------------------------------------- |
| product-overview            | Product Overview           | What AutoLenis is, value prop, positioning             |
| roles-and-permissions       | Roles and Permissions      | Buyer, Dealer, Admin, Affiliate roles with permissions |
| end-to-end-flow             | End-to-End Flow            | Full lifecycle from application to delivery            |
| contract-shield             | Contract Shield            | Contract Shield AI verification feature                |
| insurance                   | Insurance                  | Insurance quote comparison feature                     |
| payments-and-fees           | Payments and Fees          | Fee structure, deposit, payment options                |
| dealer-workflows            | Dealer Workflows           | How dealers participate in auctions, submit offers     |
| affiliate-program           | Affiliate Program          | Affiliate referral program, commissions, payouts       |
| refinance                   | Refinance Program          | Refinance program details                              |
| compliance-and-disclosures  | Compliance and Disclosures | Required disclosures, compliance rules                 |
| glossary                    | Glossary                   | Key terms and definitions                              |

### Source Constants (as of v1.0.0)

| Constant                  | Value                                           |
| ------------------------- | ----------------------------------------------- |
| PREMIUM_FEE               | $499 (flat concierge fee)                        |
| DEPOSIT_AMOUNT            | $99 (Serious Buyer Deposit)                      |
| COMMISSION_RATES          | L1: 15%, L2: 3%, L3: 2%                         |
| AUCTION_DURATION_HOURS    | 48                                               |
| PREQUAL_EXPIRY_DAYS       | 30                                               |
| CREDIT_TIERS              | Excellent: 740–850, Good: 670–739, Fair: 580–669, Poor: 300–579 |
| MAX_SHORTLIST_ITEMS       | 5                                                |
| CONTRACT_SHIELD_THRESHOLDS| Pass: 85%, Warning: 70%, Fail: 69%              |
