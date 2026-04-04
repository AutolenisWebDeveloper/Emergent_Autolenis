# DATA_MODEL_ATLAS.md
> Generated on: 2026-02-22 | Repository: AutoLenis/VercelAutoLenis
> Source: `prisma/schema.prisma` (2,188 lines)

## Enums

| Enum | Values |
|------|--------|
| `WorkspaceMode` | LIVE, TEST |
| `UserRole` | BUYER, DEALER, ADMIN, AFFILIATE, SYSTEM_AGENT |
| `CreditTier` | EXCELLENT, GOOD, FAIR, POOR, DECLINED |
| `AuctionStatus` | PENDING_DEPOSIT, ACTIVE, CLOSED, COMPLETED, CANCELLED |
| `BestPriceType` | BEST_CASH, BEST_MONTHLY, BALANCED |
| `DealStatus` | SELECTED, FINANCING_PENDING, FINANCING_APPROVED, FEE_PENDING, FEE_PAID, INSURANCE_PENDING, INSURANCE_COMPLETE, CONTRACT_PENDING, CONTRACT_REVIEW, CONTRACT_APPROVED, SIGNING_PENDING, SIGNED, PICKUP_SCHEDULED, COMPLETED, CANCELLED |
| `InsuranceStatus` | QUOTE_REQUESTED, QUOTE_RECEIVED, POLICY_SELECTED, POLICY_BOUND, EXTERNAL_UPLOADED |
| `ContractStatus` | UPLOADED, SCANNING, ISSUES_FOUND, PASSED, FAILED |
| `ESignStatus` | CREATED, SENT, VIEWED, SIGNED, COMPLETED, DECLINED, EXPIRED |
| `PickupStatus` | SCHEDULED, CONFIRMED, BUYER_ARRIVED, COMPLETED, CANCELLED |
| `PaymentStatus` | PENDING, PROCESSING, SUCCEEDED, FAILED, REFUNDED |
| `FeePaymentMethod` | CARD, LOAN_INCLUSION |
| `DocumentStatus` | UPLOADED, PENDING_REVIEW, APPROVED, REJECTED |
| `DocumentRequestStatus` | REQUESTED, UPLOADED, APPROVED, REJECTED |
| `RefinanceQualificationStatus` | PENDING, QUALIFIED, DISQUALIFIED |
| `VehicleCondition` | EXCELLENT, GOOD, FAIR, POOR |
| `MarketingRestriction` | NONE, NO_CREDIT_SOLICITATION |
| `NotificationPriority` | P0, P1, P2 |
| `NotificationCategory` | PAYMENT, USER, DEAL, DOC, AFFILIATE, SYSTEM, SECURITY, WEBHOOK |
| `TransactionType` | PAYMENT, REFUND, CHARGEBACK, PAYOUT |
| `TransactionStatus` | SUCCEEDED, PENDING, FAILED |
| `PreQualSource` | INTERNAL, EXTERNAL_MANUAL |
| `ExternalPreApprovalStatus` | SUBMITTED, IN_REVIEW, APPROVED, REJECTED, EXPIRED, SUPERSEDED |

## Models Overview

### Workspace & Identity (System 0)

| Model | Key Fields | Relationships | Notes |
|-------|-----------|--------------|-------|
| **Workspace** | id, name, mode (`WorkspaceMode`), createdBy | Has-many: User, BuyerProfile, Dealer, Affiliate, all domain models | Root tenant; every domain table has `workspaceId` FK |
| **User** | id, email (unique), passwordHash, role (`UserRole`), is_email_verified, mfa_enrolled, mfa_factor_id, mfa_secret, force_password_reset | Has-one: BuyerProfile, Dealer, DealerUser, AdminUser, Affiliate; belongs-to Workspace | Central identity; indexed on email, workspaceId |
| **BuyerProfile** | id, userId (unique), firstName, lastName, phone, address, city, state, zip, employment, annualIncome, dateOfBirth | Has-one: PreQualification, BuyerPreferences; has-many: Shortlist, Auction, SelectedDeal, PickupAppointment, Referral | PII-rich; cascade delete from User |
| **Dealer** | id, userId (unique), businessName, licenseNumber (unique), integrityScore, verified, active | Has-many: InventoryItem, AuctionParticipant, ContractDocument, ContractShieldScan, PickupAppointment, DealerUser | Indexed on licenseNumber |
| **DealerUser** | id, userId (unique), dealerId, roleLabel | Belongs-to: User, Dealer | Sub-users of a dealership |
| **AdminUser** | id, userId (unique), firstName, lastName, role (default "ADMIN") | Belongs-to: User | Admin profile extension |
| **Affiliate** | id, userId (unique), referralCode (unique), totalEarnings, pendingEarnings | Has-many: Referral, Click, Commission, Payout, AffiliatePayment | Indexed on referralCode |

### System 1: Pre-Qualification

| Model | Key Fields | Relationships | Notes |
|-------|-----------|--------------|-------|
| **PreQualification** | id, buyerId (unique), creditScore, creditTier, maxOtd, estimatedMonthlyMin/Max, dti, softPullCompleted, consentGiven, consentDate, source (`PreQualSource`, default INTERNAL), externalSubmissionId?, providerName?, expiresAt | Belongs-to: BuyerProfile | One-to-one with buyer; consent tracking for compliance; `source=EXTERNAL_MANUAL` when created from admin-approved bank pre-approval |
| **ExternalPreApprovalSubmission** | id, buyerId, lenderName, approvedAmount, maxOtdAmountCents, apr?, aprBps?, termMonths?, expiresAt?, status (`ExternalPreApprovalStatus`), documentStoragePath?, originalFileName?, fileSizeBytes?, mimeType?, sha256?, storageBucket?, submissionNotes?, reviewedBy?, reviewedAt?, decisionAt?, reviewNotes?, rejectionReason?, rejectionReasonCode?, preQualificationId?, supersededById?, workspaceId? | Belongs-to: BuyerProfile; links to PreQualification on approval | Buyer-submitted bank pre-approval; reviewed by admin; OWASP-compliant file storage |

### System 2: Vehicle Discovery & Shortlisting

| Model | Key Fields | Relationships | Notes |
|-------|-----------|--------------|-------|
| **BuyerPreferences** | id, buyerId (unique), makes[], bodyStyles[], minYear, maxYear, maxMileage, maxDistance | Belongs-to: BuyerProfile | Search filter preferences |
| **Vehicle** | id, vin (unique), year, make, model, trim, bodyStyle, mileage, images[] | Has-many: InventoryItem | Canonical vehicle record |
| **InventoryItem** | id, dealerId, vehicleId, price, status (default "AVAILABLE") | Belongs-to: Dealer, Vehicle; has-many: ShortlistItem, AuctionOffer | Dealer-specific listing |
| **Shortlist** | id, buyerId, name | Has-many: ShortlistItem, Auction; belongs-to: BuyerProfile | Buyer's saved vehicle list |
| **ShortlistItem** | id, shortlistId, inventoryItemId, addedAt | Belongs-to: Shortlist, InventoryItem | Unique constraint: [shortlistId, inventoryItemId] |

### System 3: Silent Reverse Auction

| Model | Key Fields | Relationships | Notes |
|-------|-----------|--------------|-------|
| **Auction** | id, buyerId, shortlistId, status (`AuctionStatus`), startsAt, endsAt, closedAt | Has-many: AuctionParticipant, AuctionOffer, BestPriceOption | Indexed on status |
| **AuctionParticipant** | id, auctionId, dealerId, invitedAt, viewedAt | Belongs-to: Auction, Dealer | Unique: [auctionId, dealerId] |
| **AuctionOffer** | id, auctionId, participantId, inventoryItemId, cashOtd, taxAmount, feesBreakdown (JSON) | Has-many: AuctionOfferFinancingOption, SelectedDeal | Dealer's bid |
| **AuctionOfferFinancingOption** | id, offerId, apr, termMonths, downPayment, monthlyPayment | Belongs-to: AuctionOffer | Financing options per offer |

### System 4: Best Price Engine

| Model | Key Fields | Relationships | Notes |
|-------|-----------|--------------|-------|
| **BestPriceOption** | id, auctionId, type (`BestPriceType`), offerId, inventoryItemId, dealerId, cashOtd, monthlyPayment, score | Belongs-to: Auction | Ranked recommendation |

### System 5: Financing & Selected Deal

| Model | Key Fields | Relationships | Notes |
|-------|-----------|--------------|-------|
| **SelectedDeal** | id, buyerId, auctionId, offerId, inventoryItemId, dealerId, status (`DealStatus`, 15 states), cashOtd, taxAmount, feesBreakdown (JSON) | Has-one: FinancingOffer, ServiceFeePayment, InsurancePolicy, ContractShieldScan, ESignEnvelope, PickupAppointment, TradeIn; has-many: ContractDocument | Central deal record; state machine |
| **FinancingOffer** | id, dealId (unique), lenderName, apr, termMonths, downPayment, monthlyPayment, totalFinanced, approved | Belongs-to: SelectedDeal | One-to-one with deal |
| **ExternalPreApproval** | id, buyerId, lenderName, approvedAmount, apr, termMonths, documentUrl | Standalone | Buyer-uploaded pre-approval |

### System 6: Insurance

| Model | Key Fields | Relationships | Notes |
|-------|-----------|--------------|-------|
| **InsuranceQuote** | id, buyerId, vehicleId, carrier, coverageType, monthlyPremium, sixMonthPremium, coverageLimits (JSON), deductibles (JSON), expiresAt | Standalone | Multiple duplicate field conventions (legacy migration) |
| **InsurancePolicy** | id, dealId (unique), status (`InsuranceStatus`), carrier, policyNumber, coverageType, monthlyPremium, effectiveDate, expirationDate, documentUrl | Belongs-to: SelectedDeal | One-to-one with deal |
| **InsuranceDocRequest** | id, dealId, buyerId, requestedByRole, requestedByUserId, type, status, dueDate, notes, documentUrl | Standalone | Doc requests for insurance verification |
| **InsuranceEvent** | id, selected_deal_id, user_id, type, provider_name, details (JSON) | Standalone | Audit log; mapped to `insurance_events` table |

### System 7: Contract Shield

| Model | Key Fields | Relationships | Notes |
|-------|-----------|--------------|-------|
| **ContractDocument** | id, dealId, dealerId, documentUrl, documentType, version | Belongs-to: SelectedDeal, Dealer; has-one: ContractShieldScan | Versioned uploads |
| **ContractShieldScan** | id, dealId (unique), dealerId, contractDocumentId (unique), status (`ContractStatus`), aprMatch, paymentMatch, otdMatch, junkFeesDetected, missingAddendums[], overallScore | Has-many: ContractShieldOverride, ContractShieldNotification, FixListItem | Main scan result |
| **FixListItem** | id, scanId, category, description, severity, expectedFix, resolved | Belongs-to: ContractShieldScan | Individual issues |
| **ContractShieldOverride** | id, scanId, adminId, action (FORCE_PASS/FORCE_FAIL), reason, buyerAcknowledged, buyerAckAt, buyerAckComment, previousStatus, newStatus | Belongs-to: ContractShieldScan, User | Admin override with buyer consent tracking |
| **ContractShieldRule** | id, ruleKey (unique), ruleName, ruleDescription, ruleType, severity, enabled, thresholdValue, configJson | Standalone | Configurable scan rules |
| **ContractShieldNotification** | id, scanId, recipientId, notificationType, status, subject, message, sentAt | Belongs-to: ContractShieldScan, User | In-app/email notifications |
| **ContractShieldReconciliation** | id, jobType, status, itemsProcessed, itemsUpdated, itemsFailed, errorLog, resultSummary (JSON) | Standalone | Cron job audit trail |

### System 8: E-Signature

| Model | Key Fields | Relationships | Notes |
|-------|-----------|--------------|-------|
| **ESignEnvelope** | id, dealId (unique), providerId, providerEnvelopeId, status (`ESignStatus`), documentsUrl[], signUrl, sentAt, viewedAt, signedAt, completedAt | Belongs-to: SelectedDeal | One-to-one with deal |

### System 9: Pickup Scheduling

| Model | Key Fields | Relationships | Notes |
|-------|-----------|--------------|-------|
| **PickupAppointment** | id, dealId (unique), buyerId, dealerId, status (`PickupStatus`), scheduledDate, scheduledTime, qrCode (unique), arrivedAt, completedAt | Belongs-to: SelectedDeal, BuyerProfile, Dealer | QR-based check-in |

### System 10: Affiliate Engine

| Model | Key Fields | Relationships | Notes |
|-------|-----------|--------------|-------|
| **Referral** | id, affiliateId, referredUserId, referredBuyerId, level, dealCompleted, dealId, commissionPaid, refCode, sourceUrl, utm*, status | Has-many: Commission; belongs-to: Affiliate, BuyerProfile | UTM tracking |
| **Click** | id, affiliateId, ipAddress, userAgent, referer, clickedAt | Belongs-to: Affiliate | Click tracking |
| **Commission** | id, affiliateId, referralId, level, dealId, baseAmount, commissionRate, commissionAmount, status, payoutId | Belongs-to: Affiliate, Referral, Payout | Multi-level commission |
| **Payout** | id, affiliateId, amount, status, paymentMethod, paymentId, paidAt | Has-many: Commission; belongs-to: Affiliate | Payout batch |
| **AffiliatePayment** | id, affiliateId, amount, method, status, notes, periodCovered, externalTransactionId, paidAt | Belongs-to: Affiliate | Direct payment record |
| **AffiliateShareEvent** | id, affiliateId, recipientEmail, message, referralLink, status, providerMessageId | Standalone | Email share tracking |
| **AffiliateDocument** | id, affiliateId, type (W9/ID/BANK/VOIDED_CHECK/OTHER), fileName, filePath, fileSize, mimeType, status, visibility | Standalone | KYC docs |

### System 13: Payments & Fee Inclusion

| Model | Key Fields | Relationships | Notes |
|-------|-----------|--------------|-------|
| **DepositPayment** | id, buyerId, auctionId, amount, status (`PaymentStatus`), stripePaymentIntentId (unique), refunded, refundedAt, refundReason | Standalone | $99 deposit |
| **ServiceFeePayment** | id, dealId (unique), baseFee, depositCredit, finalAmount, paymentMethod (`FeePaymentMethod`), status, stripePaymentIntentId (unique) | Has-one: LenderFeeDisbursement, FeeFinancingDisclosure; belongs-to: SelectedDeal | Concierge fee |
| **FeeFinancingDisclosure** | id, feePaymentId (unique), feeAmount, apr, termMonths, monthlyIncrease, totalExtraCost, consentGiven, consentTimestamp, ipAddress, userAgent | Belongs-to: ServiceFeePayment | TILA-like disclosure for loan inclusion |
| **LenderFeeDisbursement** | id, feePaymentId (unique), lenderName, disbursementAmount, status, requestedAt, disbursedAt | Belongs-to: ServiceFeePayment | Lender payout tracking |
| **DepositRequest** | id, buyerId, dealId, amount, notes, dueDate, status, createdBy | Standalone | Admin-initiated |
| **ConciergeFeeRequest** | id, buyerId, dealId, amount, notes, status, createdBy | Standalone | Admin-initiated |
| **Refund** | id, buyerId, relatedPaymentId, relatedPaymentType, amount, reason, status, createdBy | Standalone | Cross-type refund record |
| **PaymentMethod** | id, userId, stripePaymentMethodId (unique), type, last4, brand, isDefault | Standalone | Stored card |

### Other Models

| Model | Key Fields | Relationships | Notes |
|-------|-----------|--------------|-------|
| **TradeIn** | id, buyerId, shortlistId, auctionId, selectedDealId (unique), hasTrade, vin, year, make, model, mileage, condition, photoUrls[], hasLoan, estimatedPayoffCents, estimatedValueCents | Belongs-to: SelectedDeal | Trade-in vehicle |
| **ComplianceEvent** | id, eventType, userId, buyerId, dealId, action, details (JSON), ipAddress, userAgent | Standalone | Audit trail |
| **AdminAuditLog** | id, userId, action, details (JSON), ipAddress, userAgent | Standalone | Admin audit trail |
| **AdminLoginAttempt** | id, identifier, attemptCount, firstAttempt, lockedUntil | Standalone | Brute-force protection |
| **PaymentProviderEvent** | id, provider, eventType, eventId (unique), paymentIntentId, payload (JSON), processed | Standalone | Webhook dedup |
| **AdminSetting** | id, key (unique), value (JSON) | Standalone | Dynamic config |
| **DealDocument** | id, ownerUserId, dealId, type, fileName, fileUrl, storagePath, status (`DocumentStatus`), requestId (unique) | Has-one: DocumentRequest | Generic deal doc |
| **DocumentRequest** | id, dealId, buyerId, requestedByUserId, requestedByRole, type, required, notes, dueDate, status (`DocumentRequestStatus`) | Has-one: DealDocument (resolved) | Doc request flow |
| **RefinanceLead** | id, firstName, lastName, email, phone, state, tcpaConsent, vehicle*, loan*, qualificationStatus, redirectedToPartnerAt, openroadFunded, fundedAmount, commissionAmount | Has-one: FundedLoan | OpenRoad partnership |
| **FundedLoan** | id, leadId (unique), partner, fundedAt, fundedAmount, commissionAmount | Belongs-to: RefinanceLead | Funded tracking |
| **ContactMessage** | id, name, email, message | Standalone | Contact form; mapped to `contact_messages` table |
| **AdminNotification** | id, workspaceId, priority, category, type, title, message, entityType, entityId, ctaPath, metadata, isRead, isArchived, dedupeKey | Belongs-to: Workspace | Admin notification queue |
| **Transaction** | id, stripePaymentIntentId, stripeChargeId, userId, userType, dealId, refinanceId, type (`TransactionType`), grossAmount, stripeFee, platformFee, netAmount, currency, status | Has-many: Chargeback | Financial ledger |
| **Chargeback** | id, transactionId, stripeDisputeId, amount, status (OPEN/WON/LOST) | Belongs-to: Transaction | Dispute tracking |
| **FinancialAuditLog** | id, adminId, action, entityType, entityId, metadata | Standalone | Financial audit trail |
| **AiConversation** | id, userId, role, agent, intent | Has-many: AiMessage | AI chat session |
| **AiMessage** | id, conversationId, sender, content, toolUsed, riskLevel | Belongs-to: AiConversation | Chat message |
| **AiAdminAction** | id, adminId, actionType, payload | Standalone | Admin AI control |
| **AiToolCall** | id, conversationId, toolName, input, output, status, latencyMs, error | Standalone | AI tool audit |
| **AiLead** | id, name, email, phone, intent, source, conversationId | Standalone | AI-captured lead |
| **AiSeoDraft** | id, title, keywords, content, metaTitle, metaDescription, slug, status | Standalone | AI-generated SEO content |
| **AiContractExtraction** | id, dealId, documentId, parties, vehicle, pricing, fees, terms, redFlags, disclaimer | Standalone | AI contract parsing |
| **EmailLog** | id, templateKey, to, from, subject, userId, resendMessageId, status, errorMessage, correlationId | Standalone | Email audit trail |

## Cascade Rules

| Parent → Child | onDelete |
|---------------|----------|
| User → BuyerProfile | Cascade |
| User → Dealer | Cascade |
| User → DealerUser | Cascade |
| User → AdminUser | Cascade |
| User → Affiliate | Cascade |
| BuyerProfile → PreQualification | Cascade |
| BuyerProfile → BuyerPreferences | Cascade |
| Shortlist → ShortlistItem | Cascade |
| Auction → AuctionParticipant | Cascade |
| Auction → AuctionOffer | Cascade |
| Auction → BestPriceOption | Cascade |
| AuctionOffer → AuctionOfferFinancingOption | Cascade |
| ContractShieldScan → FixListItem | Cascade |
| ContractShieldScan → ContractShieldOverride | Cascade |
| ContractShieldScan → ContractShieldNotification | Cascade |
| AiConversation → AiMessage | Cascade |
| RefinanceLead → FundedLoan | Cascade |

## PII Map

| Field(s) | Model(s) | Sensitivity |
|----------|---------|-------------|
| email | User, RefinanceLead, AiLead, ContactMessage, AffiliateShareEvent | PII |
| passwordHash | User | Secret (hashed) |
| mfa_secret, mfa_factor_id | User | Secret |
| firstName, lastName | BuyerProfile, AdminUser, Affiliate, RefinanceLead, AiLead, ContactMessage | PII |
| phone | BuyerProfile, Dealer, RefinanceLead, AiLead | PII |
| address, city, state, zip, postalCode | BuyerProfile, Dealer | PII |
| dateOfBirth | BuyerProfile | Sensitive PII |
| annualIncome, monthlyIncome, monthlyHousing | BuyerProfile, RefinanceLead | Financial PII |
| employment, employer, employerName | BuyerProfile | PII |
| creditScore, creditTier, dti | PreQualification | Financial PII |
| loanBalance, currentMonthlyPayment | RefinanceLead | Financial PII |
| stripePaymentIntentId, stripePaymentMethodId | DepositPayment, ServiceFeePayment, PaymentMethod | Financial |
| last4, brand | PaymentMethod | Payment card info |
| ipAddress, userAgent | ComplianceEvent, FeeFinancingDisclosure | Tracking |
| vin | Vehicle, TradeIn | Vehicle PII |
| licenseNumber | Dealer | Business PII |
| policyNumber | InsurancePolicy | Insurance PII |
| estimatedPayoffCents, estimatedValueCents | TradeIn | Financial |
| ssn | (Not present in schema) | N/A — No SSN stored |

## Model Ownership (Authoritative Writer)

| Service | Models Owned |
|---------|-------------|
| `auth.service.ts` | User |
| `prequal.service.ts` | PreQualification |
| `external-preapproval.service.ts` | ExternalPreApprovalSubmission, PreQualification (upsert on approval) |
| `buyer.service.ts` | BuyerProfile, BuyerPreferences |
| `inventory.service.ts` | Vehicle, InventoryItem |
| `shortlist.service.ts` | Shortlist, ShortlistItem |
| `auction.service.ts` | Auction, AuctionParticipant, AuctionOffer, AuctionOfferFinancingOption |
| `best-price.service.ts` | BestPriceOption |
| `deal.service.ts` | SelectedDeal, FinancingOffer |
| `insurance.service.ts` | InsuranceQuote, InsurancePolicy, InsuranceDocRequest, InsuranceEvent |
| `contract-shield.service.ts` | ContractDocument, ContractShieldScan, FixListItem, ContractShieldOverride, ContractShieldRule, ContractShieldNotification, ContractShieldReconciliation |
| `esign.service.ts` | ESignEnvelope |
| `pickup.service.ts` | PickupAppointment |
| `affiliate.service.ts` | Affiliate, Referral, Click, Commission, Payout, AffiliatePayment, AffiliateShareEvent, AffiliateDocument |
| `payment.service.ts` | DepositPayment, ServiceFeePayment, FeeFinancingDisclosure, LenderFeeDisbursement, Refund, DepositRequest, ConciergeFeeRequest, PaymentMethod, Transaction, Chargeback |
| `dealer.service.ts` | Dealer, DealerUser |
| `dealer-approval.service.ts` | Dealer (status updates) |
| `admin.service.ts` | AdminUser, AdminSetting, AdminNotification |
| `seo.service.ts` | AiSeoDraft |
| `email.service.tsx` | EmailLog |
| Stripe webhook handler | PaymentProviderEvent |
| Various API routes | ComplianceEvent, AdminAuditLog |
