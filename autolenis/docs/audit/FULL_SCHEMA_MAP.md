# FULL_SCHEMA_MAP.md — AutoLenis Database Schema

## Database: PostgreSQL (via Prisma ORM + Supabase)

## Enums (20)

| Enum | Values |
|------|--------|
| WorkspaceMode | LIVE, TEST |
| UserRole | BUYER, DEALER, ADMIN, AFFILIATE, SYSTEM_AGENT |
| CreditTier | EXCELLENT, GOOD, FAIR, POOR, DECLINED |
| AuctionStatus | PENDING_DEPOSIT, ACTIVE, CLOSED, COMPLETED, CANCELLED |
| BestPriceType | BEST_CASH, BEST_MONTHLY, BALANCED |
| DealStatus | SELECTED, FINANCING_PENDING, FINANCING_APPROVED, FEE_PENDING, FEE_PAID, INSURANCE_PENDING, INSURANCE_COMPLETE, CONTRACT_PENDING, CONTRACT_REVIEW, CONTRACT_APPROVED, SIGNING_PENDING, SIGNED, PICKUP_SCHEDULED, COMPLETED, CANCELLED |
| InsuranceStatus | QUOTE_REQUESTED, QUOTE_RECEIVED, POLICY_SELECTED, POLICY_BOUND, EXTERNAL_UPLOADED |
| ContractStatus | UPLOADED, SCANNING, ISSUES_FOUND, PASSED, FAILED |
| ESignStatus | CREATED, SENT, VIEWED, SIGNED, COMPLETED, DECLINED, EXPIRED |
| PickupStatus | SCHEDULED, CONFIRMED, BUYER_ARRIVED, COMPLETED, CANCELLED |
| PaymentStatus | PENDING, PROCESSING, SUCCEEDED, FAILED, REFUNDED |
| FeePaymentMethod | CARD, LOAN_INCLUSION |
| DocumentStatus | UPLOADED, PENDING_REVIEW, APPROVED, REJECTED |
| DocumentRequestStatus | REQUESTED, UPLOADED, APPROVED, REJECTED |
| RefinanceQualificationStatus | PENDING, QUALIFIED, DISQUALIFIED |
| VehicleCondition | EXCELLENT, GOOD, FAIR, POOR |
| MarketingRestriction | NONE, NO_CREDIT_SOLICITATION |
| NotificationPriority | P0, P1, P2 |
| NotificationCategory | PAYMENT, USER, DEAL, DOC, AFFILIATE, SYSTEM, SECURITY, WEBHOOK |
| TransactionType | PAYMENT, REFUND, CHARGEBACK, PAYOUT |
| TransactionStatus | SUCCEEDED, PENDING, FAILED |

## Models (70+)

### Workspace & Tenancy
| Model | Key Fields | Relations |
|-------|-----------|-----------|
| Workspace | id, name, mode (LIVE/TEST) | → All system models (cascade root) |

### Users & Identity
| Model | Key Fields | Relations |
|-------|-----------|-----------|
| User | id, email, passwordHash, role, mfaSecret, mfaEnabled, emailVerified | → BuyerProfile, Dealer, AdminUser, Affiliate |
| BuyerProfile | id, userId, firstName, lastName, phone, address | → User, PreQualification, Auction, Shortlist |
| Dealer | id, userId, businessName, license, address | → User, InventoryItem, AuctionParticipant |
| DealerUser | id, userId, dealerId, permissions | → User, Dealer |
| AdminUser | id, userId, department | → User |
| Affiliate | id, userId, referralCode, pendingEarnings, lifetimePaidCents | → User, Referral, Commission |

### System 1: Pre-Qualification
| Model | Key Fields | Relations |
|-------|-----------|-----------|
| PreQualification | id, buyerId, creditScore, creditTier, maxOtd, monthlyMin, monthlyMax, softPullDate | → BuyerProfile |

### System 2: Vehicle Discovery
| Model | Key Fields | Relations |
|-------|-----------|-----------|
| BuyerPreferences | id, buyerId, makes[], bodyStyles[], yearMin, yearMax, mileageMax, distanceMax | → BuyerProfile |
| Vehicle | id, vin, year, make, model, mileage, color, transmission, engine, images[] | → InventoryItem |
| InventoryItem | id, dealerId, vehicleId, askingPrice, status | → Dealer, Vehicle, ShortlistItem |
| Shortlist | id, buyerId, name | → BuyerProfile, ShortlistItem |
| ShortlistItem | id, shortlistId, inventoryItemId | → Shortlist, InventoryItem |

### System 3: Silent Reverse Auction
| Model | Key Fields | Relations |
|-------|-----------|-----------|
| Auction | id, buyerId, status, depositPaid, expiresAt, closedAt | → BuyerProfile, AuctionParticipant, AuctionOffer, DepositPayment |
| AuctionParticipant | id, auctionId, dealerId, invitedAt, viewedAt | → Auction, Dealer |
| AuctionOffer | id, auctionId, dealerId, inventoryItemId, cashOtd, tax, fees, totalOtd | → Auction, Dealer, InventoryItem, AuctionOfferFinancingOption |
| AuctionOfferFinancingOption | id, offerId, lender, apr, termMonths, downPayment, monthlyPayment | → AuctionOffer |

### System 4: Best Price Engine
| Model | Key Fields | Relations |
|-------|-----------|-----------|
| BestPriceOption | id, auctionId, offerId, type (BEST_CASH/BEST_MONTHLY/BALANCED), score, rank | → Auction, AuctionOffer |

### System 5: Financing & Deal Selection
| Model | Key Fields | Relations |
|-------|-----------|-----------|
| SelectedDeal | id, buyerId, offerId, auctionId, status (15 states), dealStage | → BuyerProfile, AuctionOffer, FinancingOffer, InsurancePolicy |
| FinancingOffer | id, dealId, lender, apr, termMonths, downPayment, monthlyPayment, approved | → SelectedDeal |
| ExternalPreApproval | id, buyerId, lender, maxAmount, apr, expiresAt | → BuyerProfile |

### System 6: Insurance
| Model | Key Fields | Relations |
|-------|-----------|-----------|
| InsuranceQuote | id, dealId, carrier, premium, coverageType, deductible | → SelectedDeal |
| InsurancePolicy | id, dealId, quoteId, carrier, policyNumber, effectiveDate, status | → SelectedDeal, InsuranceQuote |
| InsuranceDocRequest | id, dealId, adminId, documentType, status | → SelectedDeal |
| InsuranceEvent | id, dealId, eventType, details, timestamp | → SelectedDeal |

### System 7: Contract Shield™
| Model | Key Fields | Relations |
|-------|-----------|-----------|
| ContractDocument | id, dealId, dealerId, documentType, fileUrl, version | → SelectedDeal, Dealer |
| ContractShieldScan | id, documentId, status, aprMatch, paymentMatch, otdMatch, junkFeeCount, overallScore, issuesCount | → ContractDocument, FixListItem |
| FixListItem | id, scanId, severity, category, description, expectedFix, resolved | → ContractShieldScan |
| ContractShieldOverride | id, scanId, adminId, action (FORCE_PASS/FORCE_FAIL), reason, buyerAcknowledged, buyerAckAt | → ContractShieldScan |
| ContractShieldRule | id, ruleKey, thresholdValue, enabled, description | (standalone config) |
| ContractShieldNotification | id, scanId, channel, sentAt | → ContractShieldScan |
| ContractShieldReconciliation | id, jobType, startedAt, completedAt, itemsProcessed | (standalone) |

### System 8: E-Signature
| Model | Key Fields | Relations |
|-------|-----------|-----------|
| ESignEnvelope | id, dealId, provider, providerEnvelopeId, status, signingUrl, completedAt | → SelectedDeal |

### System 9: Pickup & Delivery
| Model | Key Fields | Relations |
|-------|-----------|-----------|
| PickupAppointment | id, dealId, dealerId, scheduledAt, status, qrCode, arrivedAt, completedAt | → SelectedDeal, Dealer |

### System 10: Affiliate & Referral
| Model | Key Fields | Relations |
|-------|-----------|-----------|
| Referral | id, affiliateId, referredUserId, utmSource, utmMedium, dealCompleted | → Affiliate, User |
| Click | id, affiliateId, ip, userAgent, timestamp | → Affiliate |
| Commission | id, affiliateId, referralId, dealId, amountCents, level, status | → Affiliate, Referral |
| Payout | id, affiliateId, amountCents, status, processedAt | → Affiliate, AffiliatePayment |
| AffiliatePayment | id, payoutId, stripePaymentId, status | → Payout |
| AffiliateShareEvent | id, affiliateId, channel, sharedAt | → Affiliate |
| AffiliateDocument | id, affiliateId, type (W9/ID/BANK/VOIDED_CHECK), fileUrl, status | → Affiliate |

### System 11: Payments & Fees
| Model | Key Fields | Relations |
|-------|-----------|-----------|
| DepositPayment | id, buyerId, auctionId, amountCents, status, stripePaymentIntentId, refunded | → BuyerProfile, Auction |
| ServiceFeePayment | id, dealId, buyerId, amountCents, method (CARD/LOAN_INCLUSION), status, stripePaymentIntentId | → SelectedDeal, BuyerProfile |
| FeeFinancingDisclosure | id, dealId, consentGiven, disclosureText, agreedAt | → SelectedDeal |
| LenderFeeDisbursement | id, dealId, lender, amountCents, disbursedAt | → SelectedDeal |
| DepositRequest | id, auctionId, adminId, status | → Auction |
| ConciergeFeeRequest | id, dealId, adminId, status | → SelectedDeal |
| Refund | id, paymentType, paymentId, amountCents, reason, stripeRefundId, status | (polymorphic) |
| PaymentMethod | id, userId, stripePaymentMethodId, last4, brand | → User |
| PaymentProviderEvent | id, provider, eventType, eventId, payload, processedAt | (standalone) |

### Financial Reporting
| Model | Key Fields | Relations |
|-------|-----------|-----------|
| Transaction | id, type (PAYMENT/REFUND/CHARGEBACK/PAYOUT), amountCents, status, stripePaymentIntentId | → Chargeback |
| Chargeback | id, transactionId, stripeDisputeId, reason, status | → Transaction |
| FinancialAuditLog | id, action, userId, details, ipAddress | (standalone) |

### Admin & Compliance
| Model | Key Fields | Relations |
|-------|-----------|-----------|
| AdminAuditLog | id, adminId, action, targetType, targetId, details, ipAddress, userAgent | → AdminUser |
| AdminLoginAttempt | id, email, success, ipAddress, timestamp | (standalone) |
| AdminNotification | id, title, message, priority (P0/P1/P2), category, read, actionUrl | (standalone) |
| AdminSetting | id, key, value, description | (standalone) |
| ComplianceEvent | id, dealId, eventType, details, timestamp | → SelectedDeal |

### Trade-In
| Model | Key Fields | Relations |
|-------|-----------|-----------|
| TradeIn | id, dealId, vin, year, make, model, mileage, condition, estimatedValue, loanPayoff | → SelectedDeal |

### Documents
| Model | Key Fields | Relations |
|-------|-----------|-----------|
| DealDocument | id, dealId, userId, documentType, fileUrl, status | → SelectedDeal, User |
| DocumentRequest | id, dealId, adminId, documentType, status, message | → SelectedDeal |

### Refinance (OpenRoad)
| Model | Key Fields | Relations |
|-------|-----------|-----------|
| RefinanceLead | id, userId, currentLender, currentApr, vehicleValue, loanBalance, qualificationStatus | → User |
| FundedLoan | id, leadId, newLender, newApr, amountFunded, commissionCents | → RefinanceLead |

### AI System
| Model | Key Fields | Relations |
|-------|-----------|-----------|
| AiConversation | id, userId, agentType, startedAt | → User, AiMessage |
| AiMessage | id, conversationId, role, content, riskScore | → AiConversation |
| AiAdminAction | id, conversationId, adminId, actionType, details | → AiConversation |
| AiToolCall | id, messageId, toolName, input, output, latencyMs | → AiMessage |
| AiLead | id, conversationId, name, email, phone, interest | → AiConversation |
| AiSeoDraft | id, pageUrl, title, description, keywords, status | (standalone) |
| AiContractExtraction | id, documentId, parties, vehicle, pricing, fees, terms, redFlags | → ContractDocument |

### Communication
| Model | Key Fields | Relations |
|-------|-----------|-----------|
| ContactMessage | id, name, email, subject, message, createdAt | (standalone) |
| EmailLog | id, to, subject, template, resendId, status, sentAt | (standalone) |
