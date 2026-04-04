# MODEL_TO_SYSTEM_MATRIX.md — Model to Core System Mapping

## Matrix

| Model | S1 Buyer | S2 Vehicle | S3 Auction | S4 BestPrice | S5 Finance | S6 Insurance | S7 Contract | S8 ESign | S9 Pickup | S10 Affiliate | S11 Dealer | S12 Admin |
|-------|:--------:|:----------:|:----------:|:------------:|:----------:|:------------:|:-----------:|:--------:|:---------:|:--------------:|:----------:|:---------:|
| Workspace | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● |
| User | ● | | | | | | | | | ● | ● | ● |
| BuyerProfile | ● | ● | ● | | ● | | | | | | | ● |
| Dealer | | | ● | | | | ● | | ● | | ● | ● |
| DealerUser | | | | | | | | | | | ● | ● |
| AdminUser | | | | | | | | | | | | ● |
| Affiliate | | | | | | | | | | ● | | ● |
| PreQualification | ● | | | | | | | | | | | |
| BuyerPreferences | ● | ● | | | | | | | | | | |
| Vehicle | | ● | | | | | | | | | ● | |
| InventoryItem | | ● | ● | | | | | | | | ● | |
| Shortlist | | ● | ● | | | | | | | | | |
| ShortlistItem | | ● | ● | | | | | | | | | |
| Auction | | | ● | ● | | | | | | | | ● |
| AuctionParticipant | | | ● | | | | | | | | ● | |
| AuctionOffer | | | ● | ● | ● | | | | | | ● | |
| AuctionOfferFinancingOption | | | ● | ● | ● | | | | | | ● | |
| BestPriceOption | | | | ● | ● | | | | | | | |
| SelectedDeal | | | | | ● | ● | ● | ● | ● | | | ● |
| FinancingOffer | | | | | ● | | | | | | | |
| ExternalPreApproval | | | | | ● | | | | | | | |
| InsuranceQuote | | | | | | ● | | | | | | |
| InsurancePolicy | | | | | | ● | | | | | | ● |
| InsuranceDocRequest | | | | | | ● | | | | | | ● |
| InsuranceEvent | | | | | | ● | | | | | | |
| ContractDocument | | | | | | | ● | | | | ● | |
| ContractShieldScan | | | | | | | ● | | | | | ● |
| FixListItem | | | | | | | ● | | | | ● | |
| ContractShieldOverride | | | | | | | ● | | | | | ● |
| ContractShieldRule | | | | | | | ● | | | | | ● |
| ContractShieldNotification | | | | | | | ● | | | | | |
| ContractShieldReconciliation | | | | | | | ● | | | | | ● |
| ESignEnvelope | | | | | | | | ● | | | | |
| PickupAppointment | | | | | | | | | ● | | ● | |
| Referral | | | | | | | | | | ● | | |
| Click | | | | | | | | | | ● | | |
| Commission | | | | | | | | | | ● | | ● |
| Payout | | | | | | | | | | ● | | ● |
| AffiliatePayment | | | | | | | | | | ● | | ● |
| AffiliateShareEvent | | | | | | | | | | ● | | |
| AffiliateDocument | | | | | | | | | | ● | | ● |
| DepositPayment | | | ● | | | | | | | | | ● |
| DepositRequest | | | ● | | | | | | | | | ● |
| ServiceFeePayment | | | | | ● | | | | | | | ● |
| ConciergeFeeRequest | | | | | ● | | | | | | | ● |
| FeeFinancingDisclosure | | | | | ● | | | | | | | |
| LenderFeeDisbursement | | | | | ● | | | | | | | |
| Refund | | | | | | | | | | | | ● |
| PaymentMethod | ● | | | | | | | | | | | |
| PaymentProviderEvent | | | | | | | | | | | | ● |
| Transaction | | | | | | | | | | | | ● |
| Chargeback | | | | | | | | | | | | ● |
| FinancialAuditLog | | | | | | | | | | | | ● |
| TradeIn | | | | | ● | | | | | | | |
| DealDocument | | | | | ● | | | | | | | ● |
| DocumentRequest | | | | | | | | | | | | ● |
| AdminAuditLog | | | | | | | | | | | | ● |
| AdminLoginAttempt | | | | | | | | | | | | ● |
| AdminNotification | | | | | | | | | | | | ● |
| AdminSetting | | | | | | | | | | | | ● |
| ComplianceEvent | | | | | | | ● | | | | | ● |
| RefinanceLead | | | | | ● | | | | | | | ● |
| FundedLoan | | | | | ● | | | | | | | ● |
| ContactMessage | | | | | | | | | | | | ● |
| EmailLog | | | | | | | | | | | | ● |

## Legend
- ● = Model is used by this system
- S1–S12 correspond to the 12 Core Systems

## Summary by System

| System | # Models | Status |
|--------|----------|--------|
| S1 — Buyer Onboarding | 5 | ✅ Complete |
| S2 — Vehicle Discovery | 6 | ✅ Complete |
| S3 — Silent Auction | 7 | ✅ Complete |
| S4 — Best Price Engine | 4 | ✅ Complete |
| S5 — Financing | 11 | ✅ Complete |
| S6 — Insurance | 5 | ✅ Complete |
| S7 — Contract Shield™ | 9 | ✅ Complete |
| S8 — E-Sign | 1 | ✅ Complete |
| S9 — Pickup & Delivery | 2 | ✅ Complete |
| S10 — Affiliate & Referral | 8 | ✅ Complete |
| S11 — Dealer Portal | 11 | ✅ Complete |
| S12 — Admin Console | 30+ | ✅ Complete |
