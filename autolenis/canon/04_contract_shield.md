---
id: contract-shield
version: "1.0.0"
updatedAt: "2026-02-23"
tags:
  - contract-shield
  - contract
  - verification
  - ai
  - compliance
roleVisibility:
  - public
  - buyer
  - dealer
  - admin
---

# Contract Shield

## What Is Contract Shield?

Contract Shield is AutoLenis's automated contract review system. It compares the final dealer contract against the accepted offer and standard fee ranges, flagging potential discrepancies so the dealer can clarify or correct them before the buyer signs.

## How It Works

1. Buyer accepts a dealer offer
2. Dealer submits the final contract
3. Contract Shield AI analyzes the contract against the accepted offer terms
4. A match score is calculated and the result is categorized:

| Result  | Score    | Meaning                                                        |
| ------- | -------- | -------------------------------------------------------------- |
| Pass    | ≥ 85%    | Contract aligns with the accepted offer                        |
| Warning | 70–84%   | Discrepancies detected — dealer should clarify or correct      |
| Fail    | Below 69%| Significant discrepancies — contract does not match the offer  |

5. Flagged items are sent to the dealer for resolution
6. Buyer reviews the final result before signing

## What Contract Shield Checks

- Vehicle price matches the accepted offer
- Fees and charges align with standard ranges
- Financing terms match pre-qualified estimates
- Add-on products and warranties are explicitly itemized
- No undisclosed fees or charges

## Required Disclosures (Non-Negotiable)

Contract Shield is an **informational tool only**. The following disclosures must always be presented:

- Contract Shield does **not** provide legal, tax, or financial advice
- Contract Shield does **not** guarantee contract correctness
- The user is **responsible** for reviewing all documents before signing
- For legal advice, consult a qualified attorney

## Roles and Contract Shield

| Role   | Interaction                                                     |
| ------ | --------------------------------------------------------------- |
| Buyer  | Views Contract Shield results; reviews flagged items            |
| Dealer | Receives flagged discrepancies; submits corrections             |
| Admin  | Oversight of Contract Shield results across all deals           |

## Thresholds

These thresholds are defined in the platform constants:

```
PASS:    85%
WARNING: 70%
FAIL:    69%
```

Scores at or above the PASS threshold indicate alignment. Scores between WARNING and PASS trigger review. Scores at or below FAIL indicate significant discrepancies requiring dealer action.
