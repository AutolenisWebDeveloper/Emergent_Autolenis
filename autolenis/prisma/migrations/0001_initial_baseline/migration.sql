-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."WorkspaceMode" AS ENUM ('LIVE', 'TEST');

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('BUYER', 'DEALER', 'DEALER_USER', 'ADMIN', 'SUPER_ADMIN', 'COMPLIANCE_ADMIN', 'AFFILIATE', 'AFFILIATE_ONLY', 'SYSTEM_AGENT');

-- CreateEnum
CREATE TYPE "public"."CreditTier" AS ENUM ('EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DECLINED');

-- CreateEnum
CREATE TYPE "public"."PreQualSource" AS ENUM ('INTERNAL', 'EXTERNAL_MANUAL', 'MICROBILT', 'IPREDICT', 'PROVIDER_BACKED');

-- CreateEnum
CREATE TYPE "public"."ConsentCaptureMethod" AS ENUM ('WEB', 'PHONE', 'WRITTEN');

-- CreateEnum
CREATE TYPE "public"."AuctionStatus" AS ENUM ('PENDING_DEPOSIT', 'ACTIVE', 'CLOSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."BestPriceType" AS ENUM ('BEST_CASH', 'BEST_MONTHLY', 'BALANCED');

-- CreateEnum
CREATE TYPE "public"."DealStatus" AS ENUM ('SELECTED', 'FINANCING_PENDING', 'FINANCING_APPROVED', 'FEE_PENDING', 'FEE_PAID', 'INSURANCE_PENDING', 'INSURANCE_COMPLETE', 'CONTRACT_PENDING', 'CONTRACT_REVIEW', 'CONTRACT_MANUAL_REVIEW_REQUIRED', 'CONTRACT_INTERNAL_FIX_IN_PROGRESS', 'CONTRACT_ADMIN_OVERRIDE_APPROVED', 'CONTRACT_APPROVED', 'SIGNING_PENDING', 'SIGNED', 'PICKUP_SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."ExternalPreApprovalStatus" AS ENUM ('SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "public"."InsuranceStatus" AS ENUM ('QUOTE_REQUESTED', 'QUOTE_RECEIVED', 'POLICY_SELECTED', 'POLICY_BOUND', 'EXTERNAL_UPLOADED');

-- CreateEnum
CREATE TYPE "public"."ContractStatus" AS ENUM ('UPLOADED', 'SCANNING', 'ISSUES_FOUND', 'PASSED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."ManualReviewStatus" AS ENUM ('OPEN', 'PENDING_SECOND_APPROVAL', 'APPROVED', 'RETURNED_INTERNAL_FIX', 'REVOKED');

-- CreateEnum
CREATE TYPE "public"."ManualApprovalMode" AS ENUM ('MANUAL_VALIDATED', 'EXCEPTION_OVERRIDE', 'RETURN_TO_INTERNAL_FIX');

-- CreateEnum
CREATE TYPE "public"."CmaRootCauseCategory" AS ENUM ('FALSE_POSITIVE_SCAN', 'INTERNAL_DATA_MISMATCH', 'DEPENDENCY_FAILURE', 'POLICY_RULES_DISCREPANCY', 'MISSING_INTERNAL_ATTESTATION', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."CmaInternalFixQueue" AS ENUM ('OPS', 'ENGINEERING', 'POLICY');

-- CreateEnum
CREATE TYPE "public"."ESignStatus" AS ENUM ('CREATED', 'SENT', 'VIEWED', 'SIGNED', 'COMPLETED', 'DECLINED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."PickupStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'BUYER_ARRIVED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "public"."FeePaymentMethod" AS ENUM ('CARD', 'LOAN_INCLUSION');

-- CreateEnum
CREATE TYPE "public"."DocumentStatus" AS ENUM ('UPLOADED', 'PENDING_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."DocumentRequestStatus" AS ENUM ('REQUESTED', 'UPLOADED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."RefinanceQualificationStatus" AS ENUM ('PENDING', 'QUALIFIED', 'DISQUALIFIED');

-- CreateEnum
CREATE TYPE "public"."VehicleCondition" AS ENUM ('EXCELLENT', 'GOOD', 'FAIR', 'POOR');

-- CreateEnum
CREATE TYPE "public"."MarketingRestriction" AS ENUM ('NONE', 'NO_CREDIT_SOLICITATION');

-- CreateEnum
CREATE TYPE "public"."NotificationPriority" AS ENUM ('P0', 'P1', 'P2');

-- CreateEnum
CREATE TYPE "public"."NotificationCategory" AS ENUM ('PAYMENT', 'USER', 'DEAL', 'DOC', 'AFFILIATE', 'SYSTEM', 'SECURITY', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "public"."TransactionType" AS ENUM ('PAYMENT', 'REFUND', 'CHARGEBACK', 'PAYOUT');

-- CreateEnum
CREATE TYPE "public"."TransactionStatus" AS ENUM ('SUCCEEDED', 'PENDING', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."BuyerCaseStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'SOURCING', 'OFFERS_AVAILABLE', 'OFFER_SELECTED', 'DEALER_INVITED', 'IN_PLATFORM_TRANSACTION', 'CLOSED_WON', 'CLOSED_LOST', 'CLOSED_CANCELLED');

-- CreateEnum
CREATE TYPE "public"."AdminSubStatus" AS ENUM ('NEW', 'NEED_DEALERS', 'OUTREACH_IN_PROGRESS', 'WAITING_ON_DEALER', 'OFFERS_READY', 'OFFERS_PRESENTED', 'PENDING_BUYER_RESPONSE', 'DEALER_INVITE_SENT', 'DEALER_ONBOARDING', 'STALE', 'ESCALATED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "public"."VehicleType" AS ENUM ('CAR', 'SUV', 'TRUCK', 'VAN');

-- CreateEnum
CREATE TYPE "public"."RequestCondition" AS ENUM ('NEW', 'USED', 'EITHER');

-- CreateEnum
CREATE TYPE "public"."BudgetType" AS ENUM ('MONTHLY', 'TOTAL', 'TOTAL_PRICE', 'MONTHLY_PAYMENT');

-- CreateEnum
CREATE TYPE "public"."DistancePreference" AS ENUM ('DELIVERY', 'PICKUP', 'EITHER');

-- CreateEnum
CREATE TYPE "public"."RequestTimeline" AS ENUM ('ZERO_7_DAYS', 'EIGHT_14_DAYS', 'FIFTEEN_30_DAYS', 'THIRTY_PLUS_DAYS');

-- CreateEnum
CREATE TYPE "public"."OfferSourceType" AS ENUM ('DEALER_SUBMITTED', 'ADMIN_ENTERED');

-- CreateEnum
CREATE TYPE "public"."SourcedOfferStatus" AS ENUM ('DRAFT', 'PENDING_PRESENT', 'PRESENTED', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."DealerInviteStatus" AS ENUM ('SENT', 'CLAIMED', 'COMPLETED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."CommissionStatus" AS ENUM ('PENDING', 'EARNED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."RefundStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."DepositRequestStatus" AS ENUM ('REQUESTED', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."ConciergeFeeRequestStatus" AS ENUM ('REQUESTED', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."LenderDisbursementStatus" AS ENUM ('PENDING', 'DISBURSED');

-- CreateEnum
CREATE TYPE "public"."DealerProspectStatus" AS ENUM ('DISCOVERED', 'CONTACTED', 'RESPONDED', 'ONBOARDING', 'CONVERTED', 'REJECTED', 'SUPPRESSED');

-- CreateEnum
CREATE TYPE "public"."DealerSourceType" AS ENUM ('WEBSITE', 'FEED', 'API', 'MANUAL');

-- CreateEnum
CREATE TYPE "public"."DealerSourceStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ERRORED', 'SUPPRESSED');

-- CreateEnum
CREATE TYPE "public"."SourceRunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."MarketVehicleStatus" AS ENUM ('ACTIVE', 'STALE', 'SUPPRESSED', 'PROMOTED');

-- CreateEnum
CREATE TYPE "public"."VerifiedVehicleStatus" AS ENUM ('AVAILABLE', 'HOLD', 'SOLD', 'REMOVED');

-- CreateEnum
CREATE TYPE "public"."InventoryMatchStatus" AS ENUM ('PENDING', 'MATCHED', 'INVITED', 'OFFER_RECEIVED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."CoverageGapStatus" AS ENUM ('OPEN', 'INVITE_SENT', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "public"."QuickOfferStatus" AS ENUM ('PENDING', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."IdentityState" AS ENUM ('ANONYMOUS', 'CONDITIONAL_HOLD', 'RELEASED');

-- CreateEnum
CREATE TYPE "public"."AlertSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "public"."AlertStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "public"."JobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'DEAD_LETTER');

-- CreateEnum
CREATE TYPE "public"."JobType" AS ENUM ('DISCOVER_DEALER', 'FETCH_SOURCE', 'PARSE_SOURCE', 'NORMALIZE_SOURCE', 'DEDUPE_INVENTORY', 'REFRESH_SOURCE', 'STALE_SWEEP', 'GENERATE_DEALER_INVITES', 'PROCESS_QUICK_OFFER', 'PROMOTE_VERIFIED_INVENTORY', 'SCAN_CIRCUMVENTION_SIGNALS');

-- CreateEnum
CREATE TYPE "public"."DocumentTrustStatusEnum" AS ENUM ('UPLOADED', 'SCANNED', 'VERIFIED', 'APPROVED', 'LOCKED', 'SUPERSEDED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."IdentityTrustStatusEnum" AS ENUM ('UNVERIFIED', 'PENDING_VERIFICATION', 'VERIFIED', 'FAILED', 'SUSPENDED', 'REVOKED');

-- CreateTable
CREATE TABLE "public"."Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mode" "public"."WorkspaceMode" NOT NULL DEFAULT 'LIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL,
    "is_email_verified" BOOLEAN NOT NULL DEFAULT false,
    "first_name" TEXT,
    "last_name" TEXT,
    "mfa_enrolled" BOOLEAN NOT NULL DEFAULT false,
    "mfa_factor_id" TEXT,
    "mfa_secret" TEXT,
    "mfa_recovery_codes_hash" TEXT,
    "force_password_reset" BOOLEAN NOT NULL DEFAULT false,
    "auth_user_id" TEXT,
    "session_version" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workspaceId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."password_reset_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BuyerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zip" TEXT NOT NULL,
    "employment" TEXT,
    "employer" TEXT,
    "annualIncome" DOUBLE PRECISION,
    "housingStatus" TEXT,
    "monthlyHousing" DOUBLE PRECISION,
    "dateOfBirth" DATE,
    "addressLine2" TEXT,
    "postalCode" TEXT,
    "country" TEXT DEFAULT 'US',
    "employmentStatus" TEXT,
    "employerName" TEXT,
    "monthlyIncomeCents" INTEGER,
    "monthlyHousingCents" INTEGER,
    "package_tier" TEXT,
    "package_selected_at" TIMESTAMP(3),
    "package_selection_source" TEXT,
    "package_upgraded_at" TIMESTAMP(3),
    "package_version" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuyerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Dealer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "businessName" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zip" TEXT NOT NULL,
    "integrityScore" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "legalName" TEXT,
    "email" TEXT,
    "addressLine2" TEXT,
    "postalCode" TEXT,
    "country" TEXT DEFAULT 'US',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "onboardingStatus" TEXT,
    "accessState" TEXT DEFAULT 'NO_ACCESS',
    "agreementSigned" BOOLEAN NOT NULL DEFAULT false,
    "agreementSignedAt" TIMESTAMP(3),
    "agreementDocumentId" TEXT,
    "complianceApproved" BOOLEAN NOT NULL DEFAULT false,
    "complianceReviewedAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "agreementRequired" BOOLEAN NOT NULL DEFAULT true,
    "agreementCompleted" BOOLEAN NOT NULL DEFAULT false,
    "agreementCompletedAt" TIMESTAMP(3),
    "docusignBlocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dealer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DealerUser" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "roleLabel" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "inviteStatus" TEXT NOT NULL DEFAULT 'accepted',
    "workspaceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealerUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."dealer_applications_v2" (
    "id" TEXT NOT NULL,
    "dealerId" TEXT,
    "workspaceId" TEXT,
    "legalBusinessName" TEXT NOT NULL,
    "dbaName" TEXT,
    "entityType" TEXT,
    "dealerLicenseNumber" TEXT NOT NULL,
    "licenseState" TEXT NOT NULL,
    "taxIdLast4" TEXT,
    "businessEmail" TEXT NOT NULL,
    "businessPhone" TEXT,
    "websiteUrl" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "principalName" TEXT NOT NULL,
    "principalEmail" TEXT NOT NULL,
    "principalPhone" TEXT,
    "applicantUserId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "accessState" TEXT NOT NULL DEFAULT 'NO_ACCESS',
    "agreementTemplateVersion" TEXT,
    "agreementEnvelopeId" TEXT,
    "agreementSentAt" TIMESTAMP(3),
    "agreementSignedAt" TIMESTAMP(3),
    "agreementStoragePath" TEXT,
    "agreementDocumentId" TEXT,
    "reviewNotes" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dealer_applications_v2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."dealer_agreements" (
    "id" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "agreementName" TEXT NOT NULL,
    "agreementType" TEXT NOT NULL DEFAULT 'DEALER_PARTICIPATION',
    "status" TEXT NOT NULL DEFAULT 'REQUIRED',
    "docusignAccountId" TEXT,
    "docusignTemplateId" TEXT,
    "docusignEnvelopeId" TEXT,
    "docusignRecipientId" TEXT,
    "docusignClientUserId" TEXT,
    "signerEmail" TEXT NOT NULL,
    "signerName" TEXT NOT NULL,
    "signerTitle" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    "lastWebhookAt" TIMESTAMP(3),
    "webhookStatus" TEXT,
    "webhookPayload" JSONB NOT NULL DEFAULT '{}',
    "signedDocumentStoragePath" TEXT,
    "certificateStoragePath" TEXT,
    "summaryPdfStoragePath" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dealer_agreements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."docusign_connect_events" (
    "id" TEXT NOT NULL,
    "eventHash" TEXT,
    "envelopeId" TEXT NOT NULL,
    "eventType" TEXT,
    "eventTime" TIMESTAMP(3),
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "processingError" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "docusign_connect_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AdminUser" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Affiliate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "referralCode" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "totalEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pendingEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Affiliate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PreQualification" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "status" TEXT,
    "creditScore" INTEGER,
    "creditTier" "public"."CreditTier" NOT NULL,
    "maxOtd" DOUBLE PRECISION NOT NULL,
    "estimatedMonthlyMin" DOUBLE PRECISION NOT NULL,
    "estimatedMonthlyMax" DOUBLE PRECISION NOT NULL,
    "maxOtdAmountCents" INTEGER,
    "minMonthlyPaymentCents" INTEGER,
    "maxMonthlyPaymentCents" INTEGER,
    "dti" DOUBLE PRECISION,
    "dtiRatio" DOUBLE PRECISION,
    "softPullCompleted" BOOLEAN NOT NULL DEFAULT false,
    "softPullDate" TIMESTAMP(3),
    "consentGiven" BOOLEAN NOT NULL DEFAULT false,
    "consentDate" TIMESTAMP(3),
    "source" "public"."PreQualSource" NOT NULL DEFAULT 'INTERNAL',
    "externalSubmissionId" TEXT,
    "providerName" TEXT,
    "providerReferenceId" TEXT,
    "rawResponseJson" JSONB,
    "consentArtifactId" TEXT,
    "consumerAuthorizationArtifactId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreQualification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ConsentVersion" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "retiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ConsentArtifact" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "consentVersionId" TEXT NOT NULL,
    "consentText" TEXT NOT NULL,
    "consentGiven" BOOLEAN NOT NULL DEFAULT true,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "preQualificationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PreQualProviderEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "preQualificationId" TEXT,
    "workspaceId" TEXT,
    "providerName" TEXT NOT NULL,
    "requestPayload" JSONB NOT NULL,
    "responsePayload" JSONB,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PreQualProviderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ForwardingAuthorization" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "preQualificationId" TEXT NOT NULL,
    "authorizedRecipientType" TEXT NOT NULL,
    "authorizedRecipientId" TEXT,
    "consentText" TEXT NOT NULL,
    "consentGiven" BOOLEAN NOT NULL DEFAULT true,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForwardingAuthorization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BuyerPreferences" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "makes" TEXT[],
    "bodyStyles" TEXT[],
    "minYear" INTEGER,
    "maxYear" INTEGER,
    "maxMileage" INTEGER,
    "maxDistance" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuyerPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Vehicle" (
    "id" TEXT NOT NULL,
    "vin" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "trim" TEXT,
    "bodyStyle" TEXT NOT NULL,
    "mileage" INTEGER NOT NULL,
    "exteriorColor" TEXT,
    "interiorColor" TEXT,
    "transmission" TEXT,
    "fuelType" TEXT,
    "drivetrain" TEXT,
    "engine" TEXT,
    "colorExterior" TEXT,
    "colorInterior" TEXT,
    "images" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InventoryItem" (
    "id" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Shortlist" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shortlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ShortlistItem" (
    "id" TEXT NOT NULL,
    "shortlistId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShortlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Auction" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "shortlistId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "status" "public"."AuctionStatus" NOT NULL DEFAULT 'PENDING_DEPOSIT',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Auction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuctionParticipant" (
    "id" TEXT NOT NULL,
    "auctionId" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewedAt" TIMESTAMP(3),

    CONSTRAINT "AuctionParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuctionOffer" (
    "id" TEXT NOT NULL,
    "auctionId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "cashOtd" DOUBLE PRECISION NOT NULL,
    "taxAmount" DOUBLE PRECISION NOT NULL,
    "feesBreakdown" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuctionOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuctionOfferFinancingOption" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "apr" DOUBLE PRECISION NOT NULL,
    "termMonths" INTEGER NOT NULL,
    "downPayment" DOUBLE PRECISION NOT NULL,
    "monthlyPayment" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuctionOfferFinancingOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BestPriceOption" (
    "id" TEXT NOT NULL,
    "auctionId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "type" "public"."BestPriceType" NOT NULL,
    "offerId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "cashOtd" DOUBLE PRECISION NOT NULL,
    "monthlyPayment" DOUBLE PRECISION,
    "score" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BestPriceOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SelectedDeal" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "auctionId" TEXT,
    "offerId" TEXT,
    "inventoryItemId" TEXT,
    "dealerId" TEXT NOT NULL,
    "sourcingCaseId" TEXT,
    "sourcedOfferId" TEXT,
    "workspaceId" TEXT NOT NULL,
    "status" "public"."DealStatus" NOT NULL DEFAULT 'SELECTED',
    "cashOtd" DOUBLE PRECISION NOT NULL,
    "taxAmount" DOUBLE PRECISION NOT NULL,
    "feesBreakdown" JSONB NOT NULL,
    "insurance_status" TEXT,
    "user_id" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SelectedDeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FinancingOffer" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "lenderName" TEXT NOT NULL,
    "apr" DOUBLE PRECISION NOT NULL,
    "termMonths" INTEGER NOT NULL,
    "downPayment" DOUBLE PRECISION NOT NULL,
    "monthlyPayment" DOUBLE PRECISION NOT NULL,
    "totalFinanced" DOUBLE PRECISION NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancingOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ExternalPreApproval" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "lenderName" TEXT NOT NULL,
    "approvedAmount" DOUBLE PRECISION NOT NULL,
    "apr" DOUBLE PRECISION,
    "termMonths" INTEGER,
    "documentUrl" TEXT,
    "documentFileName" TEXT,
    "documentFileSize" INTEGER,
    "documentMimeType" TEXT,
    "status" "public"."ExternalPreApprovalStatus" NOT NULL DEFAULT 'SUBMITTED',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "adminNotes" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalPreApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ExternalPreApprovalSubmission" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "lenderName" TEXT NOT NULL,
    "approvedAmount" DOUBLE PRECISION NOT NULL,
    "maxOtdAmountCents" INTEGER,
    "apr" DOUBLE PRECISION,
    "aprBps" INTEGER,
    "termMonths" INTEGER,
    "minMonthlyPaymentCents" INTEGER,
    "maxMonthlyPaymentCents" INTEGER,
    "dtiRatioBps" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "submissionNotes" TEXT,
    "storageBucket" TEXT,
    "documentStoragePath" TEXT,
    "originalFileName" TEXT,
    "fileSizeBytes" INTEGER,
    "mimeType" TEXT,
    "sha256" TEXT,
    "status" "public"."ExternalPreApprovalStatus" NOT NULL DEFAULT 'SUBMITTED',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "decisionAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "rejectionReason" TEXT,
    "rejectionReasonCode" TEXT,
    "supersededById" TEXT,
    "preQualificationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalPreApprovalSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InsuranceQuote" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "carrier" TEXT NOT NULL,
    "coverageType" TEXT NOT NULL,
    "monthlyPremium" DOUBLE PRECISION NOT NULL,
    "sixMonthPremium" DOUBLE PRECISION NOT NULL,
    "coverageLimits" JSONB NOT NULL,
    "deductibles" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "productName" TEXT,
    "coverageJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InsuranceQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InsurancePolicy" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "status" "public"."InsuranceStatus" NOT NULL DEFAULT 'QUOTE_REQUESTED',
    "carrier" TEXT,
    "policyNumber" TEXT,
    "coverageType" TEXT,
    "monthlyPremium" DOUBLE PRECISION,
    "effectiveDate" TIMESTAMP(3),
    "expirationDate" TIMESTAMP(3),
    "documentUrl" TEXT,
    "type" TEXT,
    "raw_policy_json" JSONB,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "vehicle_vin" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "InsurancePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ContractDocument" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "documentUrl" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ContractShieldScan" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "contractDocumentId" TEXT,
    "workspaceId" TEXT NOT NULL,
    "status" "public"."ContractStatus" NOT NULL DEFAULT 'SCANNING',
    "aprMatch" BOOLEAN,
    "paymentMatch" BOOLEAN,
    "otdMatch" BOOLEAN,
    "junkFeesDetected" BOOLEAN,
    "missingAddendums" TEXT[],
    "overallScore" DOUBLE PRECISION,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractShieldScan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FixListItem" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "expectedFix" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FixListItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ContractShieldOverride" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "buyerAcknowledged" BOOLEAN NOT NULL DEFAULT false,
    "buyerAckAt" TIMESTAMP(3),
    "buyerAckComment" TEXT,
    "previousStatus" TEXT NOT NULL,
    "newStatus" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractShieldOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ContractShieldRule" (
    "id" TEXT NOT NULL,
    "ruleKey" TEXT NOT NULL,
    "ruleName" TEXT NOT NULL,
    "ruleDescription" TEXT NOT NULL,
    "ruleType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "thresholdValue" DOUBLE PRECISION,
    "configJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractShieldRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ContractShieldNotification" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "notificationType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "failedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractShieldNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ContractShieldReconciliation" (
    "id" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "itemsProcessed" INTEGER NOT NULL DEFAULT 0,
    "itemsUpdated" INTEGER NOT NULL DEFAULT 0,
    "itemsFailed" INTEGER NOT NULL DEFAULT 0,
    "errorLog" TEXT,
    "resultSummary" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractShieldReconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ContractManualReview" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "dealId" TEXT NOT NULL,
    "contractDocumentId" TEXT,
    "overriddenScanId" TEXT,
    "status" "public"."ManualReviewStatus" NOT NULL DEFAULT 'OPEN',
    "rootCauseCategory" "public"."CmaRootCauseCategory",
    "rootCauseNotes" TEXT,
    "approvalMode" "public"."ManualApprovalMode",
    "verifiedFieldsJson" JSONB,
    "evidenceAttachmentIds" TEXT[],
    "vinMatch" BOOLEAN NOT NULL DEFAULT false,
    "buyerIdentityMatch" BOOLEAN NOT NULL DEFAULT false,
    "otdMathValidated" BOOLEAN NOT NULL DEFAULT false,
    "feesValidated" BOOLEAN NOT NULL DEFAULT false,
    "termsValidated" BOOLEAN NOT NULL DEFAULT false,
    "disclosuresPresent" BOOLEAN NOT NULL DEFAULT false,
    "attestationAccepted" BOOLEAN NOT NULL DEFAULT false,
    "attestationTextVersion" TEXT,
    "approvedByAdminId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedFromIp" TEXT,
    "approvedUserAgent" TEXT,
    "secondApproverAdminId" TEXT,
    "secondApprovedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "revokedByAdminId" TEXT,
    "assignedQueue" "public"."CmaInternalFixQueue",
    "documentHashAtApproval" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractManualReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ESignEnvelope" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "providerId" TEXT,
    "providerEnvelopeId" TEXT,
    "status" "public"."ESignStatus" NOT NULL DEFAULT 'CREATED',
    "documentsUrl" TEXT[],
    "signUrl" TEXT,
    "sentAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ESignEnvelope_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PickupAppointment" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "status" "public"."PickupStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "scheduledTime" TEXT NOT NULL,
    "qrCode" TEXT NOT NULL,
    "qrCodeExpiresAt" TIMESTAMP(3),
    "arrivedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PickupAppointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Referral" (
    "id" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "referredUserId" TEXT,
    "referredBuyerId" TEXT,
    "workspaceId" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "dealCompleted" BOOLEAN NOT NULL DEFAULT false,
    "dealId" TEXT,
    "commissionPaid" BOOLEAN NOT NULL DEFAULT false,
    "ref_code" TEXT,
    "source_url" TEXT,
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "utm_term" TEXT,
    "utm_content" TEXT,
    "attributed_at" TIMESTAMP(3),
    "status" TEXT DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Click" (
    "id" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "referer" TEXT,
    "clickedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Click_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Commission" (
    "id" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "serviceFeePaymentId" TEXT,
    "workspaceId" TEXT,
    "level" INTEGER NOT NULL,
    "dealId" TEXT,
    "baseAmount" DOUBLE PRECISION NOT NULL,
    "commissionRate" DOUBLE PRECISION NOT NULL,
    "commissionAmount" DOUBLE PRECISION NOT NULL,
    "status" "public"."CommissionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payoutId" TEXT,

    CONSTRAINT "Commission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Payout" (
    "id" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "public"."PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT,
    "paymentId" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AffiliateShareEvent" (
    "id" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "workspaceId" TEXT,
    "message" TEXT,
    "referralLink" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "providerMessageId" TEXT,
    "error" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffiliateShareEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AffiliateDocument" (
    "id" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'OTHER',
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "visibility" TEXT NOT NULL DEFAULT 'INTERNAL',
    "workspaceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffiliateDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DepositPayment" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "auctionId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "public"."PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "stripePaymentIntentId" TEXT,
    "checkoutSessionId" TEXT,
    "checkoutAttempt" INTEGER NOT NULL DEFAULT 0,
    "refunded" BOOLEAN NOT NULL DEFAULT false,
    "refundedAt" TIMESTAMP(3),
    "refundReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DepositPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ServiceFeePayment" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "baseFee" DOUBLE PRECISION NOT NULL,
    "depositCredit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "finalAmount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" "public"."FeePaymentMethod",
    "status" "public"."PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "stripePaymentIntentId" TEXT,
    "checkoutSessionId" TEXT,
    "checkoutAttempt" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceFeePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FeeFinancingDisclosure" (
    "id" TEXT NOT NULL,
    "feePaymentId" TEXT NOT NULL,
    "feeAmount" DOUBLE PRECISION NOT NULL,
    "apr" DOUBLE PRECISION NOT NULL,
    "termMonths" INTEGER NOT NULL,
    "monthlyIncrease" DOUBLE PRECISION NOT NULL,
    "totalExtraCost" DOUBLE PRECISION NOT NULL,
    "consentGiven" BOOLEAN NOT NULL DEFAULT false,
    "consentTimestamp" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeeFinancingDisclosure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LenderFeeDisbursement" (
    "id" TEXT NOT NULL,
    "feePaymentId" TEXT NOT NULL,
    "lenderName" TEXT NOT NULL,
    "disbursementAmount" DOUBLE PRECISION NOT NULL,
    "status" "public"."LenderDisbursementStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disbursedAt" TIMESTAMP(3),

    CONSTRAINT "LenderFeeDisbursement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DepositRequest" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "dealId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" "public"."DepositRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DepositRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ConciergeFeeRequest" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "status" "public"."ConciergeFeeRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConciergeFeeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Refund" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "depositPaymentId" TEXT,
    "serviceFeePaymentId" TEXT,
    "stripeRefundId" TEXT,
    "relatedPaymentId" TEXT,
    "relatedPaymentType" TEXT,
    "amountCents" INTEGER,
    "amount" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "status" "public"."RefundStatus" NOT NULL DEFAULT 'PENDING',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PaymentMethod" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "stripePaymentMethodId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "last4" TEXT,
    "brand" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TradeIn" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "shortlistId" TEXT,
    "auctionId" TEXT,
    "selectedDealId" TEXT,
    "workspaceId" TEXT,
    "hasTrade" BOOLEAN NOT NULL DEFAULT false,
    "vin" TEXT,
    "year" INTEGER,
    "make" TEXT,
    "model" TEXT,
    "trim" TEXT,
    "mileage" INTEGER,
    "condition" TEXT,
    "photoUrls" TEXT[],
    "hasLoan" BOOLEAN,
    "lenderName" TEXT,
    "estimatedPayoffCents" INTEGER,
    "estimatedValueCents" INTEGER,
    "kbbValueCents" INTEGER,
    "stepCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradeIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ComplianceEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "userId" TEXT,
    "buyerId" TEXT,
    "dealId" TEXT,
    "action" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AdminAuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AdminLoginAttempt" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 1,
    "firstAttempt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminLoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AdminSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "mfaVerified" BOOLEAN NOT NULL DEFAULT false,
    "mfaEnrolled" BOOLEAN NOT NULL DEFAULT false,
    "requiresPasswordReset" BOOLEAN NOT NULL DEFAULT false,
    "factorId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PaymentProviderEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "paymentIntentId" TEXT,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentProviderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AdminSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DealDocument" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "dealId" TEXT,
    "workspaceId" TEXT,
    "type" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "fileUrl" TEXT NOT NULL,
    "storagePath" TEXT,
    "status" "public"."DocumentStatus" NOT NULL DEFAULT 'UPLOADED',
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "requestId" TEXT,

    CONSTRAINT "DealDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DocumentRequest" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "requestedByUserId" TEXT NOT NULL,
    "requestedByRole" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" "public"."DocumentRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "decidedByUserId" TEXT,
    "decidedByRole" TEXT,
    "decisionNotes" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RefinanceLead" (
    "id" TEXT NOT NULL,
    "leadType" TEXT NOT NULL DEFAULT 'refinance',
    "partner" TEXT NOT NULL DEFAULT 'OpenRoad',
    "workspaceId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "tcpaConsent" BOOLEAN NOT NULL DEFAULT false,
    "vehicleYear" INTEGER NOT NULL,
    "vehicleMake" TEXT NOT NULL,
    "vehicleModel" TEXT NOT NULL,
    "mileage" INTEGER NOT NULL,
    "vehicleCondition" "public"."VehicleCondition" NOT NULL,
    "loanBalance" DOUBLE PRECISION NOT NULL,
    "currentMonthlyPayment" DOUBLE PRECISION NOT NULL,
    "monthlyIncome" DOUBLE PRECISION NOT NULL,
    "qualificationStatus" "public"."RefinanceQualificationStatus" NOT NULL DEFAULT 'PENDING',
    "qualificationReasons" JSONB NOT NULL DEFAULT '[]',
    "redirectedToPartnerAt" TIMESTAMP(3),
    "openroadFunded" BOOLEAN NOT NULL DEFAULT false,
    "fundedAt" TIMESTAMP(3),
    "fundedAmount" DOUBLE PRECISION,
    "commissionAmount" DOUBLE PRECISION,
    "marketingRestriction" "public"."MarketingRestriction" NOT NULL DEFAULT 'NONE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefinanceLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FundedLoan" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "partner" TEXT NOT NULL DEFAULT 'OpenRoad',
    "fundedAt" TIMESTAMP(3) NOT NULL,
    "fundedAmount" DOUBLE PRECISION NOT NULL,
    "commissionAmount" DOUBLE PRECISION NOT NULL,
    "rawPartnerReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FundedLoan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InsuranceDocRequest" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "requestedByRole" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "workspaceId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "dueDate" TIMESTAMP(3),
    "notes" TEXT,
    "documentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsuranceDocRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."insurance_events" (
    "id" TEXT NOT NULL,
    "selected_deal_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider_name" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insurance_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."contact_messages" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "status" TEXT DEFAULT 'new',
    "marketing_consent" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AdminNotification" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "priority" "public"."NotificationPriority" NOT NULL,
    "category" "public"."NotificationCategory" NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "ctaPath" TEXT,
    "metadata" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dedupeKey" TEXT,

    CONSTRAINT "AdminNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Transaction" (
    "id" TEXT NOT NULL,
    "stripePaymentIntentId" TEXT,
    "stripeChargeId" TEXT,
    "userId" TEXT,
    "userType" TEXT,
    "dealId" TEXT,
    "refinanceId" TEXT,
    "type" "public"."TransactionType" NOT NULL,
    "grossAmount" DOUBLE PRECISION NOT NULL,
    "stripeFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "platformFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netAmount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" "public"."TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workspaceId" TEXT,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Chargeback" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "stripeDisputeId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workspaceId" TEXT,

    CONSTRAINT "Chargeback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FinancialAuditLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workspaceId" TEXT,

    CONSTRAINT "FinancialAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AiConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "role" TEXT NOT NULL,
    "agent" TEXT NOT NULL,
    "intent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workspaceId" TEXT,

    CONSTRAINT "AiConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AiMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "toolUsed" TEXT,
    "riskLevel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AiAdminAction" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workspaceId" TEXT,

    CONSTRAINT "AiAdminAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AiToolCall" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "output" JSONB,
    "status" TEXT NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "error" TEXT,
    "userId" TEXT,
    "role" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workspaceId" TEXT,

    CONSTRAINT "AiToolCall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AiLead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "intent" TEXT,
    "source" TEXT DEFAULT 'chat',
    "conversationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workspaceId" TEXT,

    CONSTRAINT "AiLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AiSeoDraft" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "keywords" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "slug" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workspaceId" TEXT,

    CONSTRAINT "AiSeoDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AiContractExtraction" (
    "id" TEXT NOT NULL,
    "dealId" TEXT,
    "documentId" TEXT,
    "parties" JSONB NOT NULL,
    "vehicle" JSONB NOT NULL,
    "pricing" JSONB NOT NULL,
    "fees" JSONB NOT NULL,
    "terms" JSONB NOT NULL,
    "redFlags" JSONB NOT NULL,
    "rawText" TEXT,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "disclaimer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workspaceId" TEXT,

    CONSTRAINT "AiContractExtraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DealerCoverageGapSignal" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "buyerId" TEXT NOT NULL,
    "marketZip" TEXT NOT NULL,
    "radiusMiles" INTEGER NOT NULL DEFAULT 50,
    "reasonCode" TEXT NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealerCoverageGapSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VehicleRequestCase" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "buyerId" TEXT NOT NULL,
    "marketZip" TEXT NOT NULL,
    "radiusMiles" INTEGER NOT NULL DEFAULT 50,
    "buyerLocationJson" JSONB,
    "prequalSnapshotJson" JSONB,
    "status" "public"."BuyerCaseStatus" NOT NULL DEFAULT 'DRAFT',
    "adminSubStatus" "public"."AdminSubStatus" NOT NULL DEFAULT 'NEW',
    "assignedAdminUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "firstAdminActionAt" TIMESTAMP(3),
    "firstOfferAt" TIMESTAMP(3),
    "buyerResponseAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),

    CONSTRAINT "VehicleRequestCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VehicleRequestItem" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "vehicleType" "public"."VehicleType" NOT NULL,
    "condition" "public"."RequestCondition" NOT NULL,
    "yearMin" INTEGER NOT NULL,
    "yearMax" INTEGER NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT,
    "openToSimilar" BOOLEAN NOT NULL DEFAULT false,
    "trim" TEXT,
    "budgetType" "public"."BudgetType" NOT NULL,
    "budgetTargetCents" INTEGER NOT NULL,
    "maxTotalOtdBudgetCents" INTEGER,
    "maxMonthlyPaymentCents" INTEGER,
    "desiredDownPaymentCents" INTEGER,
    "mileageMax" INTEGER,
    "mustHaveFeaturesJson" JSONB,
    "colorsJson" JSONB,
    "distancePreference" "public"."DistancePreference" NOT NULL DEFAULT 'EITHER',
    "maxDistanceMiles" INTEGER,
    "timeline" "public"."RequestTimeline" NOT NULL DEFAULT 'FIFTEEN_30_DAYS',
    "vin" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleRequestItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SourcingOutreachLog" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "dealerName" TEXT NOT NULL,
    "contactMethod" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SourcingOutreachLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SourcedOffer" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "caseId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "dealerId" TEXT,
    "sourceDealerName" TEXT,
    "sourceDealerEmail" TEXT,
    "sourceDealerPhone" TEXT,
    "sourceType" "public"."OfferSourceType" NOT NULL DEFAULT 'ADMIN_ENTERED',
    "vin" TEXT,
    "year" INTEGER,
    "make" TEXT,
    "modelName" TEXT,
    "trim" TEXT,
    "mileage" INTEGER,
    "condition" "public"."RequestCondition",
    "pricingBreakdownJson" JSONB,
    "paymentTermsJson" JSONB,
    "expiresAt" TIMESTAMP(3),
    "status" "public"."SourcedOfferStatus" NOT NULL DEFAULT 'DRAFT',
    "presentedToBuyerAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SourcedOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DealerInvite" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "dealerEmail" TEXT,
    "dealerName" TEXT,
    "status" "public"."DealerInviteStatus" NOT NULL DEFAULT 'SENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealerInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CaseEventLog" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "beforeValue" TEXT,
    "afterValue" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseEventLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CaseNote" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "authorRole" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaseNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EmailSendLog" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "emailType" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "resendMessageId" TEXT,
    "userId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailSendLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PrequalConsentVersion" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "consentText" TEXT,
    "htmlHash" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "retiredAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrequalConsentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PrequalConsentArtifact" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "consentVersionId" TEXT NOT NULL,
    "consentText" TEXT NOT NULL,
    "renderedText" TEXT,
    "htmlHash" TEXT,
    "consentGiven" BOOLEAN NOT NULL,
    "consentDate" TIMESTAMP(3) NOT NULL,
    "captureMethod" "public"."ConsentCaptureMethod" DEFAULT 'WEB',
    "acceptedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "fingerprintHash" TEXT,
    "sessionId" TEXT,
    "reproducibleStorageUrl" TEXT,
    "retentionLocked" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrequalConsentArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ConsumerAuthorizationArtifact" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "authorizationType" TEXT NOT NULL,
    "authorized" BOOLEAN NOT NULL,
    "authorizationText" TEXT NOT NULL,
    "authorizedParties" TEXT[],
    "recipientDescription" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "authorizedAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "retentionLocked" BOOLEAN NOT NULL DEFAULT true,
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsumerAuthorizationArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PrequalSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'INITIATED',
    "sourceType" TEXT NOT NULL DEFAULT 'INTERNAL',
    "prequalificationId" TEXT,
    "consentArtifactId" TEXT,
    "forwardingAuthorizationId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "startedAt" TIMESTAMP(3),
    "providerRequestedAt" TIMESTAMP(3),
    "providerRespondedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrequalSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PrequalProviderEvent" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "prequalificationId" TEXT,
    "providerName" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "requestPayload" JSONB,
    "responsePayload" JSONB,
    "requestPayloadJson" JSONB,
    "responsePayloadJson" JSONB,
    "responseStatus" TEXT NOT NULL,
    "errorMessage" TEXT,
    "errorCode" TEXT,
    "latencyMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrequalProviderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PermissiblePurposeLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT,
    "prequalificationId" TEXT,
    "permissiblePurpose" TEXT NOT NULL,
    "purpose" TEXT,
    "purposeDescription" TEXT NOT NULL,
    "providerName" TEXT NOT NULL,
    "provider" TEXT,
    "inquiryType" TEXT NOT NULL,
    "requestReference" TEXT,
    "certifiedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PermissiblePurposeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PrequalOfferSnapshot" (
    "id" TEXT NOT NULL,
    "preQualificationId" TEXT NOT NULL,
    "offerJson" JSONB NOT NULL,
    "presentedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrequalOfferSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DealerProspect" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "businessName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "discoveredFrom" TEXT,
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "public"."DealerProspectStatus" NOT NULL DEFAULT 'DISCOVERED',
    "notes" TEXT,
    "convertedDealerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealerProspect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DealerSource" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "prospectId" TEXT,
    "dealerId" TEXT,
    "sourceType" "public"."DealerSourceType" NOT NULL,
    "sourceUrl" TEXT,
    "feedUrl" TEXT,
    "status" "public"."DealerSourceStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastFetchedAt" TIMESTAMP(3),
    "fetchIntervalMinutes" INTEGER NOT NULL DEFAULT 1440,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "lastErrorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealerSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DealerSourceRun" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "status" "public"."SourceRunStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "vehiclesFound" INTEGER NOT NULL DEFAULT 0,
    "vehiclesNew" INTEGER NOT NULL DEFAULT 0,
    "vehiclesUpdated" INTEGER NOT NULL DEFAULT 0,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "errorDetails" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealerSourceRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InventoryRawSnapshot" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "rawData" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "parsedAt" TIMESTAMP(3),
    "parseError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryRawSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InventoryVehicleSighting" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "vin" TEXT,
    "year" INTEGER,
    "make" TEXT,
    "model" TEXT,
    "trim" TEXT,
    "mileage" INTEGER,
    "priceCents" INTEGER,
    "exteriorColor" TEXT,
    "bodyStyle" TEXT,
    "stockNumber" TEXT,
    "rawJson" JSONB,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryVehicleSighting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InventoryMarketVehicle" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "dealerSourceId" TEXT,
    "prospectId" TEXT,
    "vin" TEXT,
    "year" INTEGER NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "trim" TEXT,
    "bodyStyle" TEXT,
    "mileage" INTEGER,
    "priceCents" INTEGER,
    "exteriorColor" TEXT,
    "interiorColor" TEXT,
    "transmission" TEXT,
    "fuelType" TEXT,
    "drivetrain" TEXT,
    "engine" TEXT,
    "images" TEXT[],
    "stockNumber" TEXT,
    "dealerName" TEXT,
    "dealerZip" TEXT,
    "dealerState" TEXT,
    "listingUrl" TEXT,
    "status" "public"."MarketVehicleStatus" NOT NULL DEFAULT 'ACTIVE',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "staleAfter" TIMESTAMP(3),
    "promotedToVerifiedId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryMarketVehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InventoryVerifiedVehicle" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "dealerId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "inventoryItemId" TEXT,
    "vin" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "trim" TEXT,
    "bodyStyle" TEXT,
    "mileage" INTEGER,
    "priceCents" INTEGER,
    "exteriorColor" TEXT,
    "interiorColor" TEXT,
    "transmission" TEXT,
    "fuelType" TEXT,
    "drivetrain" TEXT,
    "engine" TEXT,
    "images" TEXT[],
    "stockNumber" TEXT,
    "location" TEXT,
    "description" TEXT,
    "status" "public"."VerifiedVehicleStatus" NOT NULL DEFAULT 'AVAILABLE',
    "promotedFromMarketVehicleId" TEXT,
    "promotedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryVerifiedVehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InventoryPriceHistory" (
    "id" TEXT NOT NULL,
    "marketVehicleId" TEXT,
    "verifiedVehicleId" TEXT,
    "priceCents" INTEGER NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryPriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InventoryDuplicateGroup" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "vin" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryDuplicateGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InventoryDuplicateGroupMember" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "marketVehicleId" TEXT,
    "verifiedVehicleId" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryDuplicateGroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InventorySourceError" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "errorType" TEXT NOT NULL,
    "errorMessage" TEXT NOT NULL,
    "rawPayload" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventorySourceError_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BuyerRequestInventoryMatch" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "buyerRequestId" TEXT,
    "marketVehicleId" TEXT,
    "verifiedVehicleId" TEXT,
    "coverageType" TEXT,
    "matchScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "public"."InventoryMatchStatus" NOT NULL DEFAULT 'PENDING',
    "auctionInvitationId" TEXT,
    "dealerInviteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuyerRequestInventoryMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CoverageGapTask" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "buyerRequestId" TEXT,
    "marketZip" TEXT NOT NULL,
    "radiusMiles" INTEGER NOT NULL DEFAULT 50,
    "make" TEXT,
    "model" TEXT,
    "yearMin" INTEGER,
    "yearMax" INTEGER,
    "status" "public"."CoverageGapStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoverageGapTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DealerIntelligenceInvite" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "prospectId" TEXT,
    "dealerId" TEXT,
    "buyerRequestId" TEXT,
    "coverageGapTaskId" TEXT,
    "tokenHash" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "dealerEmail" TEXT,
    "dealerName" TEXT,
    "dealerPhone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewedAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealerIntelligenceInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DealerQuickOffer" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "inviteId" TEXT NOT NULL,
    "prospectId" TEXT,
    "vin" TEXT,
    "year" INTEGER,
    "make" TEXT,
    "model" TEXT,
    "trim" TEXT,
    "mileage" INTEGER,
    "priceCents" INTEGER,
    "conditionNotes" TEXT,
    "availableDate" TIMESTAMP(3),
    "notes" TEXT,
    "status" "public"."QuickOfferStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealerQuickOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DealerOnboardingConversion" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "prospectId" TEXT NOT NULL,
    "dealerId" TEXT,
    "quickOfferId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "businessDocsUploaded" BOOLEAN NOT NULL DEFAULT false,
    "agreementAccepted" BOOLEAN NOT NULL DEFAULT false,
    "operationalSetup" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealerOnboardingConversion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MaskedPartyProfile" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "dealId" TEXT,
    "buyerId" TEXT,
    "dealerId" TEXT,
    "prospectId" TEXT,
    "partyType" TEXT NOT NULL,
    "maskedId" TEXT NOT NULL,
    "displayName" TEXT,
    "readinessPayload" JSONB,
    "identityState" "public"."IdentityState" NOT NULL DEFAULT 'ANONYMOUS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaskedPartyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."IdentityReleaseEvent" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "dealId" TEXT NOT NULL,
    "buyerId" TEXT,
    "dealerId" TEXT,
    "previousState" "public"."IdentityState" NOT NULL,
    "newState" "public"."IdentityState" NOT NULL,
    "reason" TEXT,
    "triggeredBy" TEXT,
    "releasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdentityReleaseEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CircumventionAlert" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "dealId" TEXT,
    "buyerId" TEXT,
    "dealerId" TEXT,
    "messageId" TEXT,
    "alertType" TEXT NOT NULL,
    "severity" "public"."AlertSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "public"."AlertStatus" NOT NULL DEFAULT 'OPEN',
    "description" TEXT,
    "evidence" JSONB,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CircumventionAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DealProtectionEvent" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "dealId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealProtectionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MessageRedactionEvent" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "messageId" TEXT,
    "dealId" TEXT,
    "senderId" TEXT,
    "recipientId" TEXT,
    "originalContent" TEXT,
    "redactedContent" TEXT,
    "redactionType" TEXT NOT NULL,
    "patternsFound" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageRedactionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DealerLifecycleEvent" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "prospectId" TEXT,
    "dealerId" TEXT,
    "eventType" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "metadata" JSONB,
    "performedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealerLifecycleEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InventoryIntelligenceJob" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "jobType" "public"."JobType" NOT NULL,
    "status" "public"."JobStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB,
    "result" JSONB,
    "errorMessage" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "deadLetteredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryIntelligenceJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."platform_decisions" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "actorId" TEXT,
    "actorType" TEXT,
    "inputBasis" JSONB NOT NULL,
    "outputResult" JSONB NOT NULL,
    "reasonCodes" TEXT[],
    "resolvedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."platform_events" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventVersion" INTEGER NOT NULL DEFAULT 1,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "parentEntityId" TEXT,
    "workspaceId" TEXT,
    "actorId" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "sourceModule" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "processingStatus" TEXT NOT NULL DEFAULT 'RECORDED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."trusted_documents" (
    "id" TEXT NOT NULL,
    "ownerEntityId" TEXT NOT NULL,
    "ownerEntityType" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "storageSource" TEXT NOT NULL,
    "storageReference" TEXT NOT NULL,
    "uploadTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploaderId" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "status" "public"."DocumentTrustStatusEnum" NOT NULL DEFAULT 'UPLOADED',
    "verificationMetadata" JSONB,
    "verifierId" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "supersededById" TEXT,
    "revocationReason" TEXT,
    "revokedAt" TIMESTAMP(3),
    "revokedById" TEXT,
    "activeForDecision" BOOLEAN NOT NULL DEFAULT true,
    "accessScope" TEXT NOT NULL DEFAULT 'DEAL_PARTIES',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trusted_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."identity_trust_records" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "status" "public"."IdentityTrustStatusEnum" NOT NULL DEFAULT 'UNVERIFIED',
    "verificationSource" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verifierId" TEXT,
    "trustFlags" TEXT[],
    "riskFlags" TEXT[],
    "manualReviewRequired" BOOLEAN NOT NULL DEFAULT false,
    "kycStatus" TEXT,
    "kybStatus" TEXT,
    "lastAssessedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "identity_trust_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MessageThread" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "buyerId" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "requestId" TEXT,
    "dealId" TEXT,
    "approvalType" TEXT NOT NULL DEFAULT 'autolenis',
    "identityReleased" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Message" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderType" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "redactedBody" TEXT,
    "containsSensitiveData" BOOLEAN NOT NULL DEFAULT false,
    "circumventionScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuctionOfferDecision" (
    "id" TEXT NOT NULL,
    "auctionId" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuctionOfferDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InventoryImportJob" (
    "id" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "errorsJson" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Workspace_mode_idx" ON "public"."Workspace"("mode");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_auth_user_id_key" ON "public"."User"("auth_user_id");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_workspaceId_idx" ON "public"."User"("workspaceId");

-- CreateIndex
CREATE INDEX "User_auth_user_id_idx" ON "public"."User"("auth_user_id");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "public"."User"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "public"."password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_token_idx" ON "public"."password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "public"."password_reset_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "BuyerProfile_userId_key" ON "public"."BuyerProfile"("userId");

-- CreateIndex
CREATE INDEX "BuyerProfile_workspaceId_idx" ON "public"."BuyerProfile"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Dealer_userId_key" ON "public"."Dealer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Dealer_licenseNumber_key" ON "public"."Dealer"("licenseNumber");

-- CreateIndex
CREATE INDEX "Dealer_licenseNumber_idx" ON "public"."Dealer"("licenseNumber");

-- CreateIndex
CREATE INDEX "Dealer_workspaceId_idx" ON "public"."Dealer"("workspaceId");

-- CreateIndex
CREATE INDEX "Dealer_onboardingStatus_idx" ON "public"."Dealer"("onboardingStatus");

-- CreateIndex
CREATE INDEX "Dealer_accessState_idx" ON "public"."Dealer"("accessState");

-- CreateIndex
CREATE UNIQUE INDEX "DealerUser_userId_key" ON "public"."DealerUser"("userId");

-- CreateIndex
CREATE INDEX "DealerUser_userId_idx" ON "public"."DealerUser"("userId");

-- CreateIndex
CREATE INDEX "DealerUser_dealerId_idx" ON "public"."DealerUser"("dealerId");

-- CreateIndex
CREATE INDEX "DealerUser_workspaceId_idx" ON "public"."DealerUser"("workspaceId");

-- CreateIndex
CREATE INDEX "dealer_applications_v2_dealerId_idx" ON "public"."dealer_applications_v2"("dealerId");

-- CreateIndex
CREATE INDEX "dealer_applications_v2_workspaceId_idx" ON "public"."dealer_applications_v2"("workspaceId");

-- CreateIndex
CREATE INDEX "dealer_applications_v2_applicantUserId_idx" ON "public"."dealer_applications_v2"("applicantUserId");

-- CreateIndex
CREATE INDEX "dealer_applications_v2_status_idx" ON "public"."dealer_applications_v2"("status");

-- CreateIndex
CREATE INDEX "dealer_applications_v2_accessState_idx" ON "public"."dealer_applications_v2"("accessState");

-- CreateIndex
CREATE INDEX "dealer_applications_v2_agreementEnvelopeId_idx" ON "public"."dealer_applications_v2"("agreementEnvelopeId");

-- CreateIndex
CREATE INDEX "dealer_applications_v2_createdAt_idx" ON "public"."dealer_applications_v2"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "dealer_agreements_docusignEnvelopeId_key" ON "public"."dealer_agreements"("docusignEnvelopeId");

-- CreateIndex
CREATE INDEX "dealer_agreements_dealerId_idx" ON "public"."dealer_agreements"("dealerId");

-- CreateIndex
CREATE INDEX "dealer_agreements_status_idx" ON "public"."dealer_agreements"("status");

-- CreateIndex
CREATE INDEX "dealer_agreements_completedAt_idx" ON "public"."dealer_agreements"("completedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "docusign_connect_events_eventHash_key" ON "public"."docusign_connect_events"("eventHash");

-- CreateIndex
CREATE INDEX "docusign_connect_events_envelopeId_idx" ON "public"."docusign_connect_events"("envelopeId");

-- CreateIndex
CREATE INDEX "docusign_connect_events_processed_createdAt_idx" ON "public"."docusign_connect_events"("processed", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_userId_key" ON "public"."AdminUser"("userId");

-- CreateIndex
CREATE INDEX "AdminUser_workspaceId_idx" ON "public"."AdminUser"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Affiliate_userId_key" ON "public"."Affiliate"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Affiliate_referralCode_key" ON "public"."Affiliate"("referralCode");

-- CreateIndex
CREATE INDEX "Affiliate_referralCode_idx" ON "public"."Affiliate"("referralCode");

-- CreateIndex
CREATE INDEX "Affiliate_workspaceId_idx" ON "public"."Affiliate"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "PreQualification_buyerId_key" ON "public"."PreQualification"("buyerId");

-- CreateIndex
CREATE INDEX "PreQualification_buyerId_idx" ON "public"."PreQualification"("buyerId");

-- CreateIndex
CREATE INDEX "PreQualification_workspaceId_idx" ON "public"."PreQualification"("workspaceId");

-- CreateIndex
CREATE INDEX "PreQualification_externalSubmissionId_idx" ON "public"."PreQualification"("externalSubmissionId");

-- CreateIndex
CREATE INDEX "PreQualification_consentArtifactId_idx" ON "public"."PreQualification"("consentArtifactId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsentVersion_version_key" ON "public"."ConsentVersion"("version");

-- CreateIndex
CREATE INDEX "ConsentVersion_version_idx" ON "public"."ConsentVersion"("version");

-- CreateIndex
CREATE INDEX "ConsentVersion_effectiveAt_idx" ON "public"."ConsentVersion"("effectiveAt");

-- CreateIndex
CREATE INDEX "ConsentArtifact_userId_idx" ON "public"."ConsentArtifact"("userId");

-- CreateIndex
CREATE INDEX "ConsentArtifact_buyerId_idx" ON "public"."ConsentArtifact"("buyerId");

-- CreateIndex
CREATE INDEX "ConsentArtifact_consentVersionId_idx" ON "public"."ConsentArtifact"("consentVersionId");

-- CreateIndex
CREATE INDEX "ConsentArtifact_preQualificationId_idx" ON "public"."ConsentArtifact"("preQualificationId");

-- CreateIndex
CREATE INDEX "ConsentArtifact_workspaceId_idx" ON "public"."ConsentArtifact"("workspaceId");

-- CreateIndex
CREATE INDEX "PreQualProviderEvent_userId_idx" ON "public"."PreQualProviderEvent"("userId");

-- CreateIndex
CREATE INDEX "PreQualProviderEvent_preQualificationId_idx" ON "public"."PreQualProviderEvent"("preQualificationId");

-- CreateIndex
CREATE INDEX "PreQualProviderEvent_providerName_idx" ON "public"."PreQualProviderEvent"("providerName");

-- CreateIndex
CREATE INDEX "PreQualProviderEvent_createdAt_idx" ON "public"."PreQualProviderEvent"("createdAt");

-- CreateIndex
CREATE INDEX "PreQualProviderEvent_workspaceId_idx" ON "public"."PreQualProviderEvent"("workspaceId");

-- CreateIndex
CREATE INDEX "ForwardingAuthorization_userId_idx" ON "public"."ForwardingAuthorization"("userId");

-- CreateIndex
CREATE INDEX "ForwardingAuthorization_buyerId_idx" ON "public"."ForwardingAuthorization"("buyerId");

-- CreateIndex
CREATE INDEX "ForwardingAuthorization_preQualificationId_idx" ON "public"."ForwardingAuthorization"("preQualificationId");

-- CreateIndex
CREATE INDEX "ForwardingAuthorization_authorizedRecipientId_idx" ON "public"."ForwardingAuthorization"("authorizedRecipientId");

-- CreateIndex
CREATE INDEX "ForwardingAuthorization_workspaceId_idx" ON "public"."ForwardingAuthorization"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "BuyerPreferences_buyerId_key" ON "public"."BuyerPreferences"("buyerId");

-- CreateIndex
CREATE INDEX "BuyerPreferences_workspaceId_idx" ON "public"."BuyerPreferences"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_vin_key" ON "public"."Vehicle"("vin");

-- CreateIndex
CREATE INDEX "Vehicle_vin_idx" ON "public"."Vehicle"("vin");

-- CreateIndex
CREATE INDEX "Vehicle_make_model_idx" ON "public"."Vehicle"("make", "model");

-- CreateIndex
CREATE INDEX "InventoryItem_dealerId_idx" ON "public"."InventoryItem"("dealerId");

-- CreateIndex
CREATE INDEX "InventoryItem_vehicleId_idx" ON "public"."InventoryItem"("vehicleId");

-- CreateIndex
CREATE INDEX "InventoryItem_workspaceId_idx" ON "public"."InventoryItem"("workspaceId");

-- CreateIndex
CREATE INDEX "Shortlist_buyerId_idx" ON "public"."Shortlist"("buyerId");

-- CreateIndex
CREATE INDEX "Shortlist_workspaceId_idx" ON "public"."Shortlist"("workspaceId");

-- CreateIndex
CREATE INDEX "ShortlistItem_shortlistId_idx" ON "public"."ShortlistItem"("shortlistId");

-- CreateIndex
CREATE UNIQUE INDEX "ShortlistItem_shortlistId_inventoryItemId_key" ON "public"."ShortlistItem"("shortlistId", "inventoryItemId");

-- CreateIndex
CREATE INDEX "Auction_buyerId_idx" ON "public"."Auction"("buyerId");

-- CreateIndex
CREATE INDEX "Auction_status_idx" ON "public"."Auction"("status");

-- CreateIndex
CREATE INDEX "Auction_workspaceId_idx" ON "public"."Auction"("workspaceId");

-- CreateIndex
CREATE INDEX "AuctionParticipant_auctionId_idx" ON "public"."AuctionParticipant"("auctionId");

-- CreateIndex
CREATE INDEX "AuctionParticipant_dealerId_idx" ON "public"."AuctionParticipant"("dealerId");

-- CreateIndex
CREATE INDEX "AuctionParticipant_workspaceId_idx" ON "public"."AuctionParticipant"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "AuctionParticipant_auctionId_dealerId_key" ON "public"."AuctionParticipant"("auctionId", "dealerId");

-- CreateIndex
CREATE INDEX "AuctionOffer_auctionId_idx" ON "public"."AuctionOffer"("auctionId");

-- CreateIndex
CREATE INDEX "AuctionOffer_inventoryItemId_idx" ON "public"."AuctionOffer"("inventoryItemId");

-- CreateIndex
CREATE INDEX "AuctionOffer_workspaceId_idx" ON "public"."AuctionOffer"("workspaceId");

-- CreateIndex
CREATE INDEX "AuctionOfferFinancingOption_offerId_idx" ON "public"."AuctionOfferFinancingOption"("offerId");

-- CreateIndex
CREATE INDEX "BestPriceOption_auctionId_idx" ON "public"."BestPriceOption"("auctionId");

-- CreateIndex
CREATE INDEX "BestPriceOption_type_idx" ON "public"."BestPriceOption"("type");

-- CreateIndex
CREATE INDEX "BestPriceOption_workspaceId_idx" ON "public"."BestPriceOption"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "SelectedDeal_sourcedOfferId_key" ON "public"."SelectedDeal"("sourcedOfferId");

-- CreateIndex
CREATE INDEX "SelectedDeal_buyerId_idx" ON "public"."SelectedDeal"("buyerId");

-- CreateIndex
CREATE INDEX "SelectedDeal_status_idx" ON "public"."SelectedDeal"("status");

-- CreateIndex
CREATE INDEX "SelectedDeal_workspaceId_idx" ON "public"."SelectedDeal"("workspaceId");

-- CreateIndex
CREATE INDEX "SelectedDeal_sourcingCaseId_idx" ON "public"."SelectedDeal"("sourcingCaseId");

-- CreateIndex
CREATE INDEX "SelectedDeal_sourcedOfferId_idx" ON "public"."SelectedDeal"("sourcedOfferId");

-- CreateIndex
CREATE UNIQUE INDEX "FinancingOffer_dealId_key" ON "public"."FinancingOffer"("dealId");

-- CreateIndex
CREATE INDEX "FinancingOffer_workspaceId_idx" ON "public"."FinancingOffer"("workspaceId");

-- CreateIndex
CREATE INDEX "ExternalPreApproval_buyerId_idx" ON "public"."ExternalPreApproval"("buyerId");

-- CreateIndex
CREATE INDEX "ExternalPreApproval_workspaceId_idx" ON "public"."ExternalPreApproval"("workspaceId");

-- CreateIndex
CREATE INDEX "ExternalPreApproval_status_idx" ON "public"."ExternalPreApproval"("status");

-- CreateIndex
CREATE INDEX "ExternalPreApprovalSubmission_buyerId_idx" ON "public"."ExternalPreApprovalSubmission"("buyerId");

-- CreateIndex
CREATE INDEX "ExternalPreApprovalSubmission_workspaceId_idx" ON "public"."ExternalPreApprovalSubmission"("workspaceId");

-- CreateIndex
CREATE INDEX "ExternalPreApprovalSubmission_status_idx" ON "public"."ExternalPreApprovalSubmission"("status");

-- CreateIndex
CREATE INDEX "ExternalPreApprovalSubmission_preQualificationId_idx" ON "public"."ExternalPreApprovalSubmission"("preQualificationId");

-- CreateIndex
CREATE INDEX "InsuranceQuote_buyerId_idx" ON "public"."InsuranceQuote"("buyerId");

-- CreateIndex
CREATE INDEX "InsuranceQuote_workspaceId_idx" ON "public"."InsuranceQuote"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "InsurancePolicy_dealId_key" ON "public"."InsurancePolicy"("dealId");

-- CreateIndex
CREATE INDEX "InsurancePolicy_dealId_idx" ON "public"."InsurancePolicy"("dealId");

-- CreateIndex
CREATE INDEX "InsurancePolicy_workspaceId_idx" ON "public"."InsurancePolicy"("workspaceId");

-- CreateIndex
CREATE INDEX "ContractDocument_dealId_idx" ON "public"."ContractDocument"("dealId");

-- CreateIndex
CREATE INDEX "ContractDocument_dealerId_idx" ON "public"."ContractDocument"("dealerId");

-- CreateIndex
CREATE INDEX "ContractDocument_workspaceId_idx" ON "public"."ContractDocument"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "ContractShieldScan_dealId_key" ON "public"."ContractShieldScan"("dealId");

-- CreateIndex
CREATE UNIQUE INDEX "ContractShieldScan_contractDocumentId_key" ON "public"."ContractShieldScan"("contractDocumentId");

-- CreateIndex
CREATE INDEX "ContractShieldScan_dealId_idx" ON "public"."ContractShieldScan"("dealId");

-- CreateIndex
CREATE INDEX "ContractShieldScan_dealerId_idx" ON "public"."ContractShieldScan"("dealerId");

-- CreateIndex
CREATE INDEX "ContractShieldScan_status_idx" ON "public"."ContractShieldScan"("status");

-- CreateIndex
CREATE INDEX "ContractShieldScan_workspaceId_idx" ON "public"."ContractShieldScan"("workspaceId");

-- CreateIndex
CREATE INDEX "FixListItem_scanId_idx" ON "public"."FixListItem"("scanId");

-- CreateIndex
CREATE INDEX "ContractShieldOverride_scanId_idx" ON "public"."ContractShieldOverride"("scanId");

-- CreateIndex
CREATE INDEX "ContractShieldOverride_adminId_idx" ON "public"."ContractShieldOverride"("adminId");

-- CreateIndex
CREATE UNIQUE INDEX "ContractShieldRule_ruleKey_key" ON "public"."ContractShieldRule"("ruleKey");

-- CreateIndex
CREATE INDEX "ContractShieldRule_ruleKey_idx" ON "public"."ContractShieldRule"("ruleKey");

-- CreateIndex
CREATE INDEX "ContractShieldNotification_scanId_idx" ON "public"."ContractShieldNotification"("scanId");

-- CreateIndex
CREATE INDEX "ContractShieldNotification_recipientId_idx" ON "public"."ContractShieldNotification"("recipientId");

-- CreateIndex
CREATE INDEX "ContractShieldNotification_status_idx" ON "public"."ContractShieldNotification"("status");

-- CreateIndex
CREATE INDEX "ContractShieldReconciliation_jobType_idx" ON "public"."ContractShieldReconciliation"("jobType");

-- CreateIndex
CREATE INDEX "ContractShieldReconciliation_status_idx" ON "public"."ContractShieldReconciliation"("status");

-- CreateIndex
CREATE INDEX "ContractShieldReconciliation_createdAt_idx" ON "public"."ContractShieldReconciliation"("createdAt");

-- CreateIndex
CREATE INDEX "ContractManualReview_dealId_idx" ON "public"."ContractManualReview"("dealId");

-- CreateIndex
CREATE INDEX "ContractManualReview_contractDocumentId_idx" ON "public"."ContractManualReview"("contractDocumentId");

-- CreateIndex
CREATE INDEX "ContractManualReview_overriddenScanId_idx" ON "public"."ContractManualReview"("overriddenScanId");

-- CreateIndex
CREATE INDEX "ContractManualReview_status_idx" ON "public"."ContractManualReview"("status");

-- CreateIndex
CREATE INDEX "ContractManualReview_workspaceId_idx" ON "public"."ContractManualReview"("workspaceId");

-- CreateIndex
CREATE INDEX "ContractManualReview_createdAt_idx" ON "public"."ContractManualReview"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ESignEnvelope_dealId_key" ON "public"."ESignEnvelope"("dealId");

-- CreateIndex
CREATE INDEX "ESignEnvelope_dealId_idx" ON "public"."ESignEnvelope"("dealId");

-- CreateIndex
CREATE INDEX "ESignEnvelope_status_idx" ON "public"."ESignEnvelope"("status");

-- CreateIndex
CREATE INDEX "ESignEnvelope_workspaceId_idx" ON "public"."ESignEnvelope"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "PickupAppointment_dealId_key" ON "public"."PickupAppointment"("dealId");

-- CreateIndex
CREATE UNIQUE INDEX "PickupAppointment_qrCode_key" ON "public"."PickupAppointment"("qrCode");

-- CreateIndex
CREATE INDEX "PickupAppointment_dealId_idx" ON "public"."PickupAppointment"("dealId");

-- CreateIndex
CREATE INDEX "PickupAppointment_qrCode_idx" ON "public"."PickupAppointment"("qrCode");

-- CreateIndex
CREATE INDEX "PickupAppointment_scheduledDate_idx" ON "public"."PickupAppointment"("scheduledDate");

-- CreateIndex
CREATE INDEX "PickupAppointment_workspaceId_idx" ON "public"."PickupAppointment"("workspaceId");

-- CreateIndex
CREATE INDEX "Referral_affiliateId_idx" ON "public"."Referral"("affiliateId");

-- CreateIndex
CREATE INDEX "Referral_referredBuyerId_idx" ON "public"."Referral"("referredBuyerId");

-- CreateIndex
CREATE INDEX "Referral_workspaceId_idx" ON "public"."Referral"("workspaceId");

-- CreateIndex
CREATE INDEX "Click_affiliateId_idx" ON "public"."Click"("affiliateId");

-- CreateIndex
CREATE INDEX "Click_clickedAt_idx" ON "public"."Click"("clickedAt");

-- CreateIndex
CREATE INDEX "Click_workspaceId_idx" ON "public"."Click"("workspaceId");

-- CreateIndex
CREATE INDEX "Commission_affiliateId_idx" ON "public"."Commission"("affiliateId");

-- CreateIndex
CREATE INDEX "Commission_status_idx" ON "public"."Commission"("status");

-- CreateIndex
CREATE INDEX "Commission_workspaceId_idx" ON "public"."Commission"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Commission_serviceFeePaymentId_level_key" ON "public"."Commission"("serviceFeePaymentId", "level");

-- CreateIndex
CREATE INDEX "Payout_affiliateId_idx" ON "public"."Payout"("affiliateId");

-- CreateIndex
CREATE INDEX "Payout_status_idx" ON "public"."Payout"("status");

-- CreateIndex
CREATE INDEX "Payout_workspaceId_idx" ON "public"."Payout"("workspaceId");

-- CreateIndex
CREATE INDEX "AffiliateShareEvent_affiliateId_idx" ON "public"."AffiliateShareEvent"("affiliateId");

-- CreateIndex
CREATE INDEX "AffiliateShareEvent_sentAt_idx" ON "public"."AffiliateShareEvent"("sentAt");

-- CreateIndex
CREATE INDEX "AffiliateShareEvent_workspaceId_idx" ON "public"."AffiliateShareEvent"("workspaceId");

-- CreateIndex
CREATE INDEX "AffiliateDocument_affiliateId_idx" ON "public"."AffiliateDocument"("affiliateId");

-- CreateIndex
CREATE INDEX "AffiliateDocument_workspaceId_idx" ON "public"."AffiliateDocument"("workspaceId");

-- CreateIndex
CREATE INDEX "AffiliateDocument_type_idx" ON "public"."AffiliateDocument"("type");

-- CreateIndex
CREATE UNIQUE INDEX "DepositPayment_stripePaymentIntentId_key" ON "public"."DepositPayment"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "DepositPayment_buyerId_idx" ON "public"."DepositPayment"("buyerId");

-- CreateIndex
CREATE INDEX "DepositPayment_auctionId_idx" ON "public"."DepositPayment"("auctionId");

-- CreateIndex
CREATE INDEX "DepositPayment_status_idx" ON "public"."DepositPayment"("status");

-- CreateIndex
CREATE INDEX "DepositPayment_workspaceId_idx" ON "public"."DepositPayment"("workspaceId");

-- CreateIndex
CREATE INDEX "DepositPayment_checkoutSessionId_idx" ON "public"."DepositPayment"("checkoutSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceFeePayment_dealId_key" ON "public"."ServiceFeePayment"("dealId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceFeePayment_stripePaymentIntentId_key" ON "public"."ServiceFeePayment"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "ServiceFeePayment_dealId_idx" ON "public"."ServiceFeePayment"("dealId");

-- CreateIndex
CREATE INDEX "ServiceFeePayment_status_idx" ON "public"."ServiceFeePayment"("status");

-- CreateIndex
CREATE INDEX "ServiceFeePayment_workspaceId_idx" ON "public"."ServiceFeePayment"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "FeeFinancingDisclosure_feePaymentId_key" ON "public"."FeeFinancingDisclosure"("feePaymentId");

-- CreateIndex
CREATE INDEX "FeeFinancingDisclosure_feePaymentId_idx" ON "public"."FeeFinancingDisclosure"("feePaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "LenderFeeDisbursement_feePaymentId_key" ON "public"."LenderFeeDisbursement"("feePaymentId");

-- CreateIndex
CREATE INDEX "LenderFeeDisbursement_feePaymentId_idx" ON "public"."LenderFeeDisbursement"("feePaymentId");

-- CreateIndex
CREATE INDEX "LenderFeeDisbursement_status_idx" ON "public"."LenderFeeDisbursement"("status");

-- CreateIndex
CREATE INDEX "DepositRequest_buyerId_idx" ON "public"."DepositRequest"("buyerId");

-- CreateIndex
CREATE INDEX "DepositRequest_workspaceId_idx" ON "public"."DepositRequest"("workspaceId");

-- CreateIndex
CREATE INDEX "DepositRequest_status_idx" ON "public"."DepositRequest"("status");

-- CreateIndex
CREATE INDEX "ConciergeFeeRequest_buyerId_idx" ON "public"."ConciergeFeeRequest"("buyerId");

-- CreateIndex
CREATE INDEX "ConciergeFeeRequest_dealId_idx" ON "public"."ConciergeFeeRequest"("dealId");

-- CreateIndex
CREATE INDEX "ConciergeFeeRequest_workspaceId_idx" ON "public"."ConciergeFeeRequest"("workspaceId");

-- CreateIndex
CREATE INDEX "ConciergeFeeRequest_status_idx" ON "public"."ConciergeFeeRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_stripeRefundId_key" ON "public"."Refund"("stripeRefundId");

-- CreateIndex
CREATE INDEX "Refund_buyerId_idx" ON "public"."Refund"("buyerId");

-- CreateIndex
CREATE INDEX "Refund_workspaceId_idx" ON "public"."Refund"("workspaceId");

-- CreateIndex
CREATE INDEX "Refund_status_idx" ON "public"."Refund"("status");

-- CreateIndex
CREATE INDEX "Refund_relatedPaymentId_idx" ON "public"."Refund"("relatedPaymentId");

-- CreateIndex
CREATE INDEX "Refund_depositPaymentId_idx" ON "public"."Refund"("depositPaymentId");

-- CreateIndex
CREATE INDEX "Refund_serviceFeePaymentId_idx" ON "public"."Refund"("serviceFeePaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethod_stripePaymentMethodId_key" ON "public"."PaymentMethod"("stripePaymentMethodId");

-- CreateIndex
CREATE INDEX "PaymentMethod_userId_idx" ON "public"."PaymentMethod"("userId");

-- CreateIndex
CREATE INDEX "PaymentMethod_workspaceId_idx" ON "public"."PaymentMethod"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "TradeIn_selectedDealId_key" ON "public"."TradeIn"("selectedDealId");

-- CreateIndex
CREATE INDEX "TradeIn_buyerId_idx" ON "public"."TradeIn"("buyerId");

-- CreateIndex
CREATE INDEX "TradeIn_shortlistId_idx" ON "public"."TradeIn"("shortlistId");

-- CreateIndex
CREATE INDEX "TradeIn_auctionId_idx" ON "public"."TradeIn"("auctionId");

-- CreateIndex
CREATE INDEX "TradeIn_workspaceId_idx" ON "public"."TradeIn"("workspaceId");

-- CreateIndex
CREATE INDEX "ComplianceEvent_eventType_idx" ON "public"."ComplianceEvent"("eventType");

-- CreateIndex
CREATE INDEX "ComplianceEvent_userId_idx" ON "public"."ComplianceEvent"("userId");

-- CreateIndex
CREATE INDEX "ComplianceEvent_createdAt_idx" ON "public"."ComplianceEvent"("createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_userId_idx" ON "public"."AdminAuditLog"("userId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_action_idx" ON "public"."AdminAuditLog"("action");

-- CreateIndex
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "public"."AdminAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AdminLoginAttempt_identifier_idx" ON "public"."AdminLoginAttempt"("identifier");

-- CreateIndex
CREATE INDEX "AdminSession_userId_idx" ON "public"."AdminSession"("userId");

-- CreateIndex
CREATE INDEX "AdminSession_expiresAt_idx" ON "public"."AdminSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentProviderEvent_eventId_key" ON "public"."PaymentProviderEvent"("eventId");

-- CreateIndex
CREATE INDEX "PaymentProviderEvent_eventType_idx" ON "public"."PaymentProviderEvent"("eventType");

-- CreateIndex
CREATE INDEX "PaymentProviderEvent_paymentIntentId_idx" ON "public"."PaymentProviderEvent"("paymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminSetting_key_key" ON "public"."AdminSetting"("key");

-- CreateIndex
CREATE INDEX "AdminSetting_key_idx" ON "public"."AdminSetting"("key");

-- CreateIndex
CREATE UNIQUE INDEX "DealDocument_requestId_key" ON "public"."DealDocument"("requestId");

-- CreateIndex
CREATE INDEX "DealDocument_ownerUserId_idx" ON "public"."DealDocument"("ownerUserId");

-- CreateIndex
CREATE INDEX "DealDocument_dealId_idx" ON "public"."DealDocument"("dealId");

-- CreateIndex
CREATE INDEX "DealDocument_status_idx" ON "public"."DealDocument"("status");

-- CreateIndex
CREATE INDEX "DealDocument_workspaceId_idx" ON "public"."DealDocument"("workspaceId");

-- CreateIndex
CREATE INDEX "DocumentRequest_dealId_idx" ON "public"."DocumentRequest"("dealId");

-- CreateIndex
CREATE INDEX "DocumentRequest_buyerId_idx" ON "public"."DocumentRequest"("buyerId");

-- CreateIndex
CREATE INDEX "DocumentRequest_status_idx" ON "public"."DocumentRequest"("status");

-- CreateIndex
CREATE INDEX "DocumentRequest_workspaceId_idx" ON "public"."DocumentRequest"("workspaceId");

-- CreateIndex
CREATE INDEX "RefinanceLead_email_idx" ON "public"."RefinanceLead"("email");

-- CreateIndex
CREATE INDEX "RefinanceLead_qualificationStatus_idx" ON "public"."RefinanceLead"("qualificationStatus");

-- CreateIndex
CREATE INDEX "RefinanceLead_openroadFunded_idx" ON "public"."RefinanceLead"("openroadFunded");

-- CreateIndex
CREATE INDEX "RefinanceLead_createdAt_idx" ON "public"."RefinanceLead"("createdAt");

-- CreateIndex
CREATE INDEX "RefinanceLead_partner_idx" ON "public"."RefinanceLead"("partner");

-- CreateIndex
CREATE INDEX "RefinanceLead_state_idx" ON "public"."RefinanceLead"("state");

-- CreateIndex
CREATE INDEX "RefinanceLead_workspaceId_idx" ON "public"."RefinanceLead"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "FundedLoan_leadId_key" ON "public"."FundedLoan"("leadId");

-- CreateIndex
CREATE INDEX "FundedLoan_leadId_idx" ON "public"."FundedLoan"("leadId");

-- CreateIndex
CREATE INDEX "FundedLoan_fundedAt_idx" ON "public"."FundedLoan"("fundedAt");

-- CreateIndex
CREATE INDEX "FundedLoan_partner_idx" ON "public"."FundedLoan"("partner");

-- CreateIndex
CREATE INDEX "InsuranceDocRequest_dealId_idx" ON "public"."InsuranceDocRequest"("dealId");

-- CreateIndex
CREATE INDEX "InsuranceDocRequest_buyerId_idx" ON "public"."InsuranceDocRequest"("buyerId");

-- CreateIndex
CREATE INDEX "InsuranceDocRequest_status_idx" ON "public"."InsuranceDocRequest"("status");

-- CreateIndex
CREATE INDEX "InsuranceDocRequest_workspaceId_idx" ON "public"."InsuranceDocRequest"("workspaceId");

-- CreateIndex
CREATE INDEX "insurance_events_selected_deal_id_idx" ON "public"."insurance_events"("selected_deal_id");

-- CreateIndex
CREATE INDEX "insurance_events_type_idx" ON "public"."insurance_events"("type");

-- CreateIndex
CREATE INDEX "insurance_events_created_at_idx" ON "public"."insurance_events"("created_at");

-- CreateIndex
CREATE INDEX "contact_messages_created_at_idx" ON "public"."contact_messages"("created_at");

-- CreateIndex
CREATE INDEX "contact_messages_email_idx" ON "public"."contact_messages"("email");

-- CreateIndex
CREATE INDEX "AdminNotification_workspaceId_isRead_createdAt_idx" ON "public"."AdminNotification"("workspaceId", "isRead", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AdminNotification_workspaceId_priority_createdAt_idx" ON "public"."AdminNotification"("workspaceId", "priority", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AdminNotification_dedupeKey_idx" ON "public"."AdminNotification"("dedupeKey");

-- CreateIndex
CREATE INDEX "AdminNotification_workspaceId_isArchived_idx" ON "public"."AdminNotification"("workspaceId", "isArchived");

-- CreateIndex
CREATE INDEX "Transaction_workspaceId_idx" ON "public"."Transaction"("workspaceId");

-- CreateIndex
CREATE INDEX "Transaction_stripePaymentIntentId_idx" ON "public"."Transaction"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "Transaction_userId_idx" ON "public"."Transaction"("userId");

-- CreateIndex
CREATE INDEX "Transaction_type_idx" ON "public"."Transaction"("type");

-- CreateIndex
CREATE INDEX "Transaction_status_idx" ON "public"."Transaction"("status");

-- CreateIndex
CREATE INDEX "Transaction_createdAt_idx" ON "public"."Transaction"("createdAt");

-- CreateIndex
CREATE INDEX "Chargeback_transactionId_idx" ON "public"."Chargeback"("transactionId");

-- CreateIndex
CREATE INDEX "Chargeback_workspaceId_idx" ON "public"."Chargeback"("workspaceId");

-- CreateIndex
CREATE INDEX "Chargeback_stripeDisputeId_idx" ON "public"."Chargeback"("stripeDisputeId");

-- CreateIndex
CREATE INDEX "FinancialAuditLog_workspaceId_idx" ON "public"."FinancialAuditLog"("workspaceId");

-- CreateIndex
CREATE INDEX "FinancialAuditLog_adminId_idx" ON "public"."FinancialAuditLog"("adminId");

-- CreateIndex
CREATE INDEX "FinancialAuditLog_entityType_entityId_idx" ON "public"."FinancialAuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "FinancialAuditLog_createdAt_idx" ON "public"."FinancialAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AiConversation_userId_idx" ON "public"."AiConversation"("userId");

-- CreateIndex
CREATE INDEX "AiConversation_workspaceId_idx" ON "public"."AiConversation"("workspaceId");

-- CreateIndex
CREATE INDEX "AiConversation_createdAt_idx" ON "public"."AiConversation"("createdAt");

-- CreateIndex
CREATE INDEX "AiMessage_conversationId_idx" ON "public"."AiMessage"("conversationId");

-- CreateIndex
CREATE INDEX "AiMessage_createdAt_idx" ON "public"."AiMessage"("createdAt");

-- CreateIndex
CREATE INDEX "AiAdminAction_adminId_idx" ON "public"."AiAdminAction"("adminId");

-- CreateIndex
CREATE INDEX "AiAdminAction_workspaceId_idx" ON "public"."AiAdminAction"("workspaceId");

-- CreateIndex
CREATE INDEX "AiAdminAction_createdAt_idx" ON "public"."AiAdminAction"("createdAt");

-- CreateIndex
CREATE INDEX "AiToolCall_conversationId_idx" ON "public"."AiToolCall"("conversationId");

-- CreateIndex
CREATE INDEX "AiToolCall_toolName_idx" ON "public"."AiToolCall"("toolName");

-- CreateIndex
CREATE INDEX "AiToolCall_createdAt_idx" ON "public"."AiToolCall"("createdAt");

-- CreateIndex
CREATE INDEX "AiLead_email_idx" ON "public"."AiLead"("email");

-- CreateIndex
CREATE INDEX "AiLead_createdAt_idx" ON "public"."AiLead"("createdAt");

-- CreateIndex
CREATE INDEX "AiSeoDraft_status_idx" ON "public"."AiSeoDraft"("status");

-- CreateIndex
CREATE INDEX "AiSeoDraft_createdAt_idx" ON "public"."AiSeoDraft"("createdAt");

-- CreateIndex
CREATE INDEX "AiContractExtraction_dealId_idx" ON "public"."AiContractExtraction"("dealId");

-- CreateIndex
CREATE INDEX "AiContractExtraction_documentId_idx" ON "public"."AiContractExtraction"("documentId");

-- CreateIndex
CREATE INDEX "AiContractExtraction_createdAt_idx" ON "public"."AiContractExtraction"("createdAt");

-- CreateIndex
CREATE INDEX "DealerCoverageGapSignal_workspaceId_idx" ON "public"."DealerCoverageGapSignal"("workspaceId");

-- CreateIndex
CREATE INDEX "DealerCoverageGapSignal_buyerId_idx" ON "public"."DealerCoverageGapSignal"("buyerId");

-- CreateIndex
CREATE INDEX "DealerCoverageGapSignal_marketZip_idx" ON "public"."DealerCoverageGapSignal"("marketZip");

-- CreateIndex
CREATE INDEX "DealerCoverageGapSignal_createdAt_idx" ON "public"."DealerCoverageGapSignal"("createdAt");

-- CreateIndex
CREATE INDEX "VehicleRequestCase_workspaceId_idx" ON "public"."VehicleRequestCase"("workspaceId");

-- CreateIndex
CREATE INDEX "VehicleRequestCase_buyerId_idx" ON "public"."VehicleRequestCase"("buyerId");

-- CreateIndex
CREATE INDEX "VehicleRequestCase_status_idx" ON "public"."VehicleRequestCase"("status");

-- CreateIndex
CREATE INDEX "VehicleRequestCase_adminSubStatus_idx" ON "public"."VehicleRequestCase"("adminSubStatus");

-- CreateIndex
CREATE INDEX "VehicleRequestCase_createdAt_idx" ON "public"."VehicleRequestCase"("createdAt");

-- CreateIndex
CREATE INDEX "VehicleRequestItem_caseId_idx" ON "public"."VehicleRequestItem"("caseId");

-- CreateIndex
CREATE INDEX "SourcingOutreachLog_caseId_idx" ON "public"."SourcingOutreachLog"("caseId");

-- CreateIndex
CREATE INDEX "SourcingOutreachLog_adminUserId_idx" ON "public"."SourcingOutreachLog"("adminUserId");

-- CreateIndex
CREATE INDEX "SourcedOffer_workspaceId_idx" ON "public"."SourcedOffer"("workspaceId");

-- CreateIndex
CREATE INDEX "SourcedOffer_caseId_idx" ON "public"."SourcedOffer"("caseId");

-- CreateIndex
CREATE INDEX "SourcedOffer_buyerId_idx" ON "public"."SourcedOffer"("buyerId");

-- CreateIndex
CREATE INDEX "SourcedOffer_status_idx" ON "public"."SourcedOffer"("status");

-- CreateIndex
CREATE UNIQUE INDEX "DealerInvite_caseId_key" ON "public"."DealerInvite"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "DealerInvite_offerId_key" ON "public"."DealerInvite"("offerId");

-- CreateIndex
CREATE UNIQUE INDEX "DealerInvite_tokenHash_key" ON "public"."DealerInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "DealerInvite_tokenHash_idx" ON "public"."DealerInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "DealerInvite_status_idx" ON "public"."DealerInvite"("status");

-- CreateIndex
CREATE INDEX "CaseEventLog_caseId_idx" ON "public"."CaseEventLog"("caseId");

-- CreateIndex
CREATE INDEX "CaseEventLog_actorUserId_idx" ON "public"."CaseEventLog"("actorUserId");

-- CreateIndex
CREATE INDEX "CaseEventLog_createdAt_idx" ON "public"."CaseEventLog"("createdAt");

-- CreateIndex
CREATE INDEX "CaseNote_caseId_idx" ON "public"."CaseNote"("caseId");

-- CreateIndex
CREATE INDEX "CaseNote_authorUserId_idx" ON "public"."CaseNote"("authorUserId");

-- CreateIndex
CREATE INDEX "CaseNote_createdAt_idx" ON "public"."CaseNote"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailSendLog_idempotencyKey_key" ON "public"."EmailSendLog"("idempotencyKey");

-- CreateIndex
CREATE INDEX "EmailSendLog_idempotencyKey_idx" ON "public"."EmailSendLog"("idempotencyKey");

-- CreateIndex
CREATE INDEX "EmailSendLog_userId_idx" ON "public"."EmailSendLog"("userId");

-- CreateIndex
CREATE INDEX "EmailSendLog_emailType_idx" ON "public"."EmailSendLog"("emailType");

-- CreateIndex
CREATE UNIQUE INDEX "PrequalConsentVersion_version_key" ON "public"."PrequalConsentVersion"("version");

-- CreateIndex
CREATE INDEX "PrequalConsentVersion_version_idx" ON "public"."PrequalConsentVersion"("version");

-- CreateIndex
CREATE INDEX "PrequalConsentVersion_effectiveAt_idx" ON "public"."PrequalConsentVersion"("effectiveAt");

-- CreateIndex
CREATE INDEX "PrequalConsentArtifact_userId_idx" ON "public"."PrequalConsentArtifact"("userId");

-- CreateIndex
CREATE INDEX "PrequalConsentArtifact_consentVersionId_idx" ON "public"."PrequalConsentArtifact"("consentVersionId");

-- CreateIndex
CREATE INDEX "PrequalConsentArtifact_sessionId_idx" ON "public"."PrequalConsentArtifact"("sessionId");

-- CreateIndex
CREATE INDEX "ConsumerAuthorizationArtifact_userId_idx" ON "public"."ConsumerAuthorizationArtifact"("userId");

-- CreateIndex
CREATE INDEX "ConsumerAuthorizationArtifact_authorizationType_idx" ON "public"."ConsumerAuthorizationArtifact"("authorizationType");

-- CreateIndex
CREATE INDEX "ConsumerAuthorizationArtifact_sessionId_idx" ON "public"."ConsumerAuthorizationArtifact"("sessionId");

-- CreateIndex
CREATE INDEX "PrequalSession_userId_idx" ON "public"."PrequalSession"("userId");

-- CreateIndex
CREATE INDEX "PrequalSession_status_idx" ON "public"."PrequalSession"("status");

-- CreateIndex
CREATE INDEX "PrequalSession_workspaceId_idx" ON "public"."PrequalSession"("workspaceId");

-- CreateIndex
CREATE INDEX "PrequalSession_prequalificationId_idx" ON "public"."PrequalSession"("prequalificationId");

-- CreateIndex
CREATE INDEX "PrequalProviderEvent_sessionId_idx" ON "public"."PrequalProviderEvent"("sessionId");

-- CreateIndex
CREATE INDEX "PrequalProviderEvent_userId_idx" ON "public"."PrequalProviderEvent"("userId");

-- CreateIndex
CREATE INDEX "PrequalProviderEvent_providerName_idx" ON "public"."PrequalProviderEvent"("providerName");

-- CreateIndex
CREATE INDEX "PrequalProviderEvent_createdAt_idx" ON "public"."PrequalProviderEvent"("createdAt");

-- CreateIndex
CREATE INDEX "PrequalProviderEvent_prequalificationId_idx" ON "public"."PrequalProviderEvent"("prequalificationId");

-- CreateIndex
CREATE INDEX "PermissiblePurposeLog_userId_idx" ON "public"."PermissiblePurposeLog"("userId");

-- CreateIndex
CREATE INDEX "PermissiblePurposeLog_sessionId_idx" ON "public"."PermissiblePurposeLog"("sessionId");

-- CreateIndex
CREATE INDEX "PermissiblePurposeLog_permissiblePurpose_idx" ON "public"."PermissiblePurposeLog"("permissiblePurpose");

-- CreateIndex
CREATE INDEX "PrequalOfferSnapshot_preQualificationId_idx" ON "public"."PrequalOfferSnapshot"("preQualificationId");

-- CreateIndex
CREATE INDEX "DealerProspect_workspaceId_idx" ON "public"."DealerProspect"("workspaceId");

-- CreateIndex
CREATE INDEX "DealerProspect_status_idx" ON "public"."DealerProspect"("status");

-- CreateIndex
CREATE INDEX "DealerProspect_zip_idx" ON "public"."DealerProspect"("zip");

-- CreateIndex
CREATE INDEX "DealerProspect_businessName_idx" ON "public"."DealerProspect"("businessName");

-- CreateIndex
CREATE INDEX "DealerProspect_convertedDealerId_idx" ON "public"."DealerProspect"("convertedDealerId");

-- CreateIndex
CREATE INDEX "DealerSource_workspaceId_idx" ON "public"."DealerSource"("workspaceId");

-- CreateIndex
CREATE INDEX "DealerSource_prospectId_idx" ON "public"."DealerSource"("prospectId");

-- CreateIndex
CREATE INDEX "DealerSource_dealerId_idx" ON "public"."DealerSource"("dealerId");

-- CreateIndex
CREATE INDEX "DealerSource_status_idx" ON "public"."DealerSource"("status");

-- CreateIndex
CREATE INDEX "DealerSource_sourceType_idx" ON "public"."DealerSource"("sourceType");

-- CreateIndex
CREATE INDEX "DealerSourceRun_sourceId_idx" ON "public"."DealerSourceRun"("sourceId");

-- CreateIndex
CREATE INDEX "DealerSourceRun_status_idx" ON "public"."DealerSourceRun"("status");

-- CreateIndex
CREATE INDEX "DealerSourceRun_createdAt_idx" ON "public"."DealerSourceRun"("createdAt");

-- CreateIndex
CREATE INDEX "InventoryRawSnapshot_sourceId_idx" ON "public"."InventoryRawSnapshot"("sourceId");

-- CreateIndex
CREATE INDEX "InventoryRawSnapshot_fetchedAt_idx" ON "public"."InventoryRawSnapshot"("fetchedAt");

-- CreateIndex
CREATE INDEX "InventoryVehicleSighting_snapshotId_idx" ON "public"."InventoryVehicleSighting"("snapshotId");

-- CreateIndex
CREATE INDEX "InventoryVehicleSighting_vin_idx" ON "public"."InventoryVehicleSighting"("vin");

-- CreateIndex
CREATE INDEX "InventoryVehicleSighting_make_model_idx" ON "public"."InventoryVehicleSighting"("make", "model");

-- CreateIndex
CREATE INDEX "InventoryMarketVehicle_workspaceId_idx" ON "public"."InventoryMarketVehicle"("workspaceId");

-- CreateIndex
CREATE INDEX "InventoryMarketVehicle_status_idx" ON "public"."InventoryMarketVehicle"("status");

-- CreateIndex
CREATE INDEX "InventoryMarketVehicle_make_model_idx" ON "public"."InventoryMarketVehicle"("make", "model");

-- CreateIndex
CREATE INDEX "InventoryMarketVehicle_dealerZip_idx" ON "public"."InventoryMarketVehicle"("dealerZip");

-- CreateIndex
CREATE INDEX "InventoryMarketVehicle_vin_idx" ON "public"."InventoryMarketVehicle"("vin");

-- CreateIndex
CREATE INDEX "InventoryMarketVehicle_prospectId_idx" ON "public"."InventoryMarketVehicle"("prospectId");

-- CreateIndex
CREATE INDEX "InventoryMarketVehicle_promotedToVerifiedId_idx" ON "public"."InventoryMarketVehicle"("promotedToVerifiedId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryMarketVehicle_vin_prospectId_key" ON "public"."InventoryMarketVehicle"("vin", "prospectId");

-- CreateIndex
CREATE INDEX "InventoryVerifiedVehicle_workspaceId_idx" ON "public"."InventoryVerifiedVehicle"("workspaceId");

-- CreateIndex
CREATE INDEX "InventoryVerifiedVehicle_dealerId_idx" ON "public"."InventoryVerifiedVehicle"("dealerId");

-- CreateIndex
CREATE INDEX "InventoryVerifiedVehicle_status_idx" ON "public"."InventoryVerifiedVehicle"("status");

-- CreateIndex
CREATE INDEX "InventoryVerifiedVehicle_make_model_idx" ON "public"."InventoryVerifiedVehicle"("make", "model");

-- CreateIndex
CREATE INDEX "InventoryVerifiedVehicle_vin_idx" ON "public"."InventoryVerifiedVehicle"("vin");

-- CreateIndex
CREATE INDEX "InventoryVerifiedVehicle_promotedFromMarketVehicleId_idx" ON "public"."InventoryVerifiedVehicle"("promotedFromMarketVehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryVerifiedVehicle_vin_dealerId_key" ON "public"."InventoryVerifiedVehicle"("vin", "dealerId");

-- CreateIndex
CREATE INDEX "InventoryPriceHistory_marketVehicleId_idx" ON "public"."InventoryPriceHistory"("marketVehicleId");

-- CreateIndex
CREATE INDEX "InventoryPriceHistory_verifiedVehicleId_idx" ON "public"."InventoryPriceHistory"("verifiedVehicleId");

-- CreateIndex
CREATE INDEX "InventoryPriceHistory_recordedAt_idx" ON "public"."InventoryPriceHistory"("recordedAt");

-- CreateIndex
CREATE INDEX "InventoryDuplicateGroup_workspaceId_idx" ON "public"."InventoryDuplicateGroup"("workspaceId");

-- CreateIndex
CREATE INDEX "InventoryDuplicateGroup_vin_idx" ON "public"."InventoryDuplicateGroup"("vin");

-- CreateIndex
CREATE INDEX "InventoryDuplicateGroup_status_idx" ON "public"."InventoryDuplicateGroup"("status");

-- CreateIndex
CREATE INDEX "InventoryDuplicateGroupMember_groupId_idx" ON "public"."InventoryDuplicateGroupMember"("groupId");

-- CreateIndex
CREATE INDEX "InventoryDuplicateGroupMember_marketVehicleId_idx" ON "public"."InventoryDuplicateGroupMember"("marketVehicleId");

-- CreateIndex
CREATE INDEX "InventoryDuplicateGroupMember_verifiedVehicleId_idx" ON "public"."InventoryDuplicateGroupMember"("verifiedVehicleId");

-- CreateIndex
CREATE INDEX "InventorySourceError_sourceId_idx" ON "public"."InventorySourceError"("sourceId");

-- CreateIndex
CREATE INDEX "InventorySourceError_errorType_idx" ON "public"."InventorySourceError"("errorType");

-- CreateIndex
CREATE INDEX "InventorySourceError_occurredAt_idx" ON "public"."InventorySourceError"("occurredAt");

-- CreateIndex
CREATE INDEX "BuyerRequestInventoryMatch_workspaceId_idx" ON "public"."BuyerRequestInventoryMatch"("workspaceId");

-- CreateIndex
CREATE INDEX "BuyerRequestInventoryMatch_buyerRequestId_idx" ON "public"."BuyerRequestInventoryMatch"("buyerRequestId");

-- CreateIndex
CREATE INDEX "BuyerRequestInventoryMatch_marketVehicleId_idx" ON "public"."BuyerRequestInventoryMatch"("marketVehicleId");

-- CreateIndex
CREATE INDEX "BuyerRequestInventoryMatch_verifiedVehicleId_idx" ON "public"."BuyerRequestInventoryMatch"("verifiedVehicleId");

-- CreateIndex
CREATE INDEX "BuyerRequestInventoryMatch_status_idx" ON "public"."BuyerRequestInventoryMatch"("status");

-- CreateIndex
CREATE INDEX "CoverageGapTask_workspaceId_idx" ON "public"."CoverageGapTask"("workspaceId");

-- CreateIndex
CREATE INDEX "CoverageGapTask_status_idx" ON "public"."CoverageGapTask"("status");

-- CreateIndex
CREATE INDEX "CoverageGapTask_marketZip_idx" ON "public"."CoverageGapTask"("marketZip");

-- CreateIndex
CREATE INDEX "CoverageGapTask_buyerRequestId_idx" ON "public"."CoverageGapTask"("buyerRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "DealerIntelligenceInvite_tokenHash_key" ON "public"."DealerIntelligenceInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "DealerIntelligenceInvite_workspaceId_idx" ON "public"."DealerIntelligenceInvite"("workspaceId");

-- CreateIndex
CREATE INDEX "DealerIntelligenceInvite_prospectId_idx" ON "public"."DealerIntelligenceInvite"("prospectId");

-- CreateIndex
CREATE INDEX "DealerIntelligenceInvite_dealerId_idx" ON "public"."DealerIntelligenceInvite"("dealerId");

-- CreateIndex
CREATE INDEX "DealerIntelligenceInvite_tokenHash_idx" ON "public"."DealerIntelligenceInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "DealerIntelligenceInvite_status_idx" ON "public"."DealerIntelligenceInvite"("status");

-- CreateIndex
CREATE INDEX "DealerIntelligenceInvite_buyerRequestId_idx" ON "public"."DealerIntelligenceInvite"("buyerRequestId");

-- CreateIndex
CREATE INDEX "DealerQuickOffer_workspaceId_idx" ON "public"."DealerQuickOffer"("workspaceId");

-- CreateIndex
CREATE INDEX "DealerQuickOffer_inviteId_idx" ON "public"."DealerQuickOffer"("inviteId");

-- CreateIndex
CREATE INDEX "DealerQuickOffer_prospectId_idx" ON "public"."DealerQuickOffer"("prospectId");

-- CreateIndex
CREATE INDEX "DealerQuickOffer_status_idx" ON "public"."DealerQuickOffer"("status");

-- CreateIndex
CREATE INDEX "DealerOnboardingConversion_workspaceId_idx" ON "public"."DealerOnboardingConversion"("workspaceId");

-- CreateIndex
CREATE INDEX "DealerOnboardingConversion_prospectId_idx" ON "public"."DealerOnboardingConversion"("prospectId");

-- CreateIndex
CREATE INDEX "DealerOnboardingConversion_dealerId_idx" ON "public"."DealerOnboardingConversion"("dealerId");

-- CreateIndex
CREATE INDEX "DealerOnboardingConversion_status_idx" ON "public"."DealerOnboardingConversion"("status");

-- CreateIndex
CREATE UNIQUE INDEX "MaskedPartyProfile_maskedId_key" ON "public"."MaskedPartyProfile"("maskedId");

-- CreateIndex
CREATE INDEX "MaskedPartyProfile_workspaceId_idx" ON "public"."MaskedPartyProfile"("workspaceId");

-- CreateIndex
CREATE INDEX "MaskedPartyProfile_dealId_idx" ON "public"."MaskedPartyProfile"("dealId");

-- CreateIndex
CREATE INDEX "MaskedPartyProfile_buyerId_idx" ON "public"."MaskedPartyProfile"("buyerId");

-- CreateIndex
CREATE INDEX "MaskedPartyProfile_dealerId_idx" ON "public"."MaskedPartyProfile"("dealerId");

-- CreateIndex
CREATE INDEX "MaskedPartyProfile_maskedId_idx" ON "public"."MaskedPartyProfile"("maskedId");

-- CreateIndex
CREATE INDEX "MaskedPartyProfile_identityState_idx" ON "public"."MaskedPartyProfile"("identityState");

-- CreateIndex
CREATE INDEX "IdentityReleaseEvent_workspaceId_idx" ON "public"."IdentityReleaseEvent"("workspaceId");

-- CreateIndex
CREATE INDEX "IdentityReleaseEvent_dealId_idx" ON "public"."IdentityReleaseEvent"("dealId");

-- CreateIndex
CREATE INDEX "IdentityReleaseEvent_buyerId_idx" ON "public"."IdentityReleaseEvent"("buyerId");

-- CreateIndex
CREATE INDEX "IdentityReleaseEvent_dealerId_idx" ON "public"."IdentityReleaseEvent"("dealerId");

-- CreateIndex
CREATE INDEX "IdentityReleaseEvent_releasedAt_idx" ON "public"."IdentityReleaseEvent"("releasedAt");

-- CreateIndex
CREATE INDEX "CircumventionAlert_workspaceId_idx" ON "public"."CircumventionAlert"("workspaceId");

-- CreateIndex
CREATE INDEX "CircumventionAlert_dealId_idx" ON "public"."CircumventionAlert"("dealId");

-- CreateIndex
CREATE INDEX "CircumventionAlert_severity_idx" ON "public"."CircumventionAlert"("severity");

-- CreateIndex
CREATE INDEX "CircumventionAlert_status_idx" ON "public"."CircumventionAlert"("status");

-- CreateIndex
CREATE INDEX "CircumventionAlert_createdAt_idx" ON "public"."CircumventionAlert"("createdAt");

-- CreateIndex
CREATE INDEX "DealProtectionEvent_workspaceId_idx" ON "public"."DealProtectionEvent"("workspaceId");

-- CreateIndex
CREATE INDEX "DealProtectionEvent_dealId_idx" ON "public"."DealProtectionEvent"("dealId");

-- CreateIndex
CREATE INDEX "DealProtectionEvent_eventType_idx" ON "public"."DealProtectionEvent"("eventType");

-- CreateIndex
CREATE INDEX "DealProtectionEvent_createdAt_idx" ON "public"."DealProtectionEvent"("createdAt");

-- CreateIndex
CREATE INDEX "MessageRedactionEvent_workspaceId_idx" ON "public"."MessageRedactionEvent"("workspaceId");

-- CreateIndex
CREATE INDEX "MessageRedactionEvent_messageId_idx" ON "public"."MessageRedactionEvent"("messageId");

-- CreateIndex
CREATE INDEX "MessageRedactionEvent_dealId_idx" ON "public"."MessageRedactionEvent"("dealId");

-- CreateIndex
CREATE INDEX "MessageRedactionEvent_senderId_idx" ON "public"."MessageRedactionEvent"("senderId");

-- CreateIndex
CREATE INDEX "MessageRedactionEvent_createdAt_idx" ON "public"."MessageRedactionEvent"("createdAt");

-- CreateIndex
CREATE INDEX "DealerLifecycleEvent_workspaceId_idx" ON "public"."DealerLifecycleEvent"("workspaceId");

-- CreateIndex
CREATE INDEX "DealerLifecycleEvent_prospectId_idx" ON "public"."DealerLifecycleEvent"("prospectId");

-- CreateIndex
CREATE INDEX "DealerLifecycleEvent_dealerId_idx" ON "public"."DealerLifecycleEvent"("dealerId");

-- CreateIndex
CREATE INDEX "DealerLifecycleEvent_eventType_idx" ON "public"."DealerLifecycleEvent"("eventType");

-- CreateIndex
CREATE INDEX "DealerLifecycleEvent_createdAt_idx" ON "public"."DealerLifecycleEvent"("createdAt");

-- CreateIndex
CREATE INDEX "InventoryIntelligenceJob_workspaceId_idx" ON "public"."InventoryIntelligenceJob"("workspaceId");

-- CreateIndex
CREATE INDEX "InventoryIntelligenceJob_jobType_idx" ON "public"."InventoryIntelligenceJob"("jobType");

-- CreateIndex
CREATE INDEX "InventoryIntelligenceJob_status_idx" ON "public"."InventoryIntelligenceJob"("status");

-- CreateIndex
CREATE INDEX "InventoryIntelligenceJob_scheduledAt_idx" ON "public"."InventoryIntelligenceJob"("scheduledAt");

-- CreateIndex
CREATE INDEX "InventoryIntelligenceJob_createdAt_idx" ON "public"."InventoryIntelligenceJob"("createdAt");

-- CreateIndex
CREATE INDEX "platform_decisions_workspaceId_idx" ON "public"."platform_decisions"("workspaceId");

-- CreateIndex
CREATE INDEX "platform_decisions_entityType_entityId_idx" ON "public"."platform_decisions"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "platform_decisions_correlationId_idx" ON "public"."platform_decisions"("correlationId");

-- CreateIndex
CREATE INDEX "platform_decisions_actorId_idx" ON "public"."platform_decisions"("actorId");

-- CreateIndex
CREATE INDEX "platform_decisions_resolvedAt_idx" ON "public"."platform_decisions"("resolvedAt");

-- CreateIndex
CREATE INDEX "platform_decisions_createdAt_idx" ON "public"."platform_decisions"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "platform_events_idempotencyKey_key" ON "public"."platform_events"("idempotencyKey");

-- CreateIndex
CREATE INDEX "platform_events_eventType_idx" ON "public"."platform_events"("eventType");

-- CreateIndex
CREATE INDEX "platform_events_entityType_entityId_idx" ON "public"."platform_events"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "platform_events_parentEntityId_idx" ON "public"."platform_events"("parentEntityId");

-- CreateIndex
CREATE INDEX "platform_events_workspaceId_idx" ON "public"."platform_events"("workspaceId");

-- CreateIndex
CREATE INDEX "platform_events_actorId_idx" ON "public"."platform_events"("actorId");

-- CreateIndex
CREATE INDEX "platform_events_correlationId_idx" ON "public"."platform_events"("correlationId");

-- CreateIndex
CREATE INDEX "platform_events_processingStatus_idx" ON "public"."platform_events"("processingStatus");

-- CreateIndex
CREATE INDEX "platform_events_createdAt_idx" ON "public"."platform_events"("createdAt");

-- CreateIndex
CREATE INDEX "trusted_documents_ownerEntityId_ownerEntityType_idx" ON "public"."trusted_documents"("ownerEntityId", "ownerEntityType");

-- CreateIndex
CREATE INDEX "trusted_documents_documentType_idx" ON "public"."trusted_documents"("documentType");

-- CreateIndex
CREATE INDEX "trusted_documents_status_idx" ON "public"."trusted_documents"("status");

-- CreateIndex
CREATE INDEX "trusted_documents_activeForDecision_idx" ON "public"."trusted_documents"("activeForDecision");

-- CreateIndex
CREATE INDEX "trusted_documents_fileHash_idx" ON "public"."trusted_documents"("fileHash");

-- CreateIndex
CREATE INDEX "trusted_documents_uploaderId_idx" ON "public"."trusted_documents"("uploaderId");

-- CreateIndex
CREATE INDEX "trusted_documents_createdAt_idx" ON "public"."trusted_documents"("createdAt");

-- CreateIndex
CREATE INDEX "identity_trust_records_status_idx" ON "public"."identity_trust_records"("status");

-- CreateIndex
CREATE INDEX "identity_trust_records_entityType_idx" ON "public"."identity_trust_records"("entityType");

-- CreateIndex
CREATE INDEX "identity_trust_records_manualReviewRequired_idx" ON "public"."identity_trust_records"("manualReviewRequired");

-- CreateIndex
CREATE INDEX "identity_trust_records_lastAssessedAt_idx" ON "public"."identity_trust_records"("lastAssessedAt");

-- CreateIndex
CREATE INDEX "identity_trust_records_createdAt_idx" ON "public"."identity_trust_records"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "identity_trust_records_entityId_entityType_key" ON "public"."identity_trust_records"("entityId", "entityType");

-- CreateIndex
CREATE INDEX "MessageThread_workspaceId_idx" ON "public"."MessageThread"("workspaceId");

-- CreateIndex
CREATE INDEX "MessageThread_buyerId_idx" ON "public"."MessageThread"("buyerId");

-- CreateIndex
CREATE INDEX "MessageThread_dealerId_idx" ON "public"."MessageThread"("dealerId");

-- CreateIndex
CREATE INDEX "MessageThread_status_idx" ON "public"."MessageThread"("status");

-- CreateIndex
CREATE INDEX "MessageThread_createdAt_idx" ON "public"."MessageThread"("createdAt");

-- CreateIndex
CREATE INDEX "Message_threadId_idx" ON "public"."Message"("threadId");

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "public"."Message"("senderId");

-- CreateIndex
CREATE INDEX "Message_createdAt_idx" ON "public"."Message"("createdAt");

-- CreateIndex
CREATE INDEX "AuctionOfferDecision_auctionId_idx" ON "public"."AuctionOfferDecision"("auctionId");

-- CreateIndex
CREATE INDEX "AuctionOfferDecision_offerId_idx" ON "public"."AuctionOfferDecision"("offerId");

-- CreateIndex
CREATE INDEX "AuctionOfferDecision_buyerId_idx" ON "public"."AuctionOfferDecision"("buyerId");

-- CreateIndex
CREATE INDEX "AuctionOfferDecision_createdAt_idx" ON "public"."AuctionOfferDecision"("createdAt");

-- CreateIndex
CREATE INDEX "InventoryImportJob_dealerId_idx" ON "public"."InventoryImportJob"("dealerId");

-- CreateIndex
CREATE INDEX "InventoryImportJob_status_idx" ON "public"."InventoryImportJob"("status");

-- CreateIndex
CREATE INDEX "InventoryImportJob_createdAt_idx" ON "public"."InventoryImportJob"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BuyerProfile" ADD CONSTRAINT "BuyerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BuyerProfile" ADD CONSTRAINT "BuyerProfile_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Dealer" ADD CONSTRAINT "Dealer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Dealer" ADD CONSTRAINT "Dealer_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerUser" ADD CONSTRAINT "DealerUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerUser" ADD CONSTRAINT "DealerUser_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "public"."Dealer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerUser" ADD CONSTRAINT "DealerUser_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."dealer_agreements" ADD CONSTRAINT "dealer_agreements_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "public"."Dealer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AdminUser" ADD CONSTRAINT "AdminUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AdminUser" ADD CONSTRAINT "AdminUser_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Affiliate" ADD CONSTRAINT "Affiliate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Affiliate" ADD CONSTRAINT "Affiliate_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PreQualification" ADD CONSTRAINT "PreQualification_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "public"."BuyerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PreQualification" ADD CONSTRAINT "PreQualification_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PreQualification" ADD CONSTRAINT "PreQualification_consentArtifactId_fkey" FOREIGN KEY ("consentArtifactId") REFERENCES "public"."PrequalConsentArtifact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PreQualification" ADD CONSTRAINT "PreQualification_consumerAuthorizationArtifactId_fkey" FOREIGN KEY ("consumerAuthorizationArtifactId") REFERENCES "public"."ConsumerAuthorizationArtifact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConsentArtifact" ADD CONSTRAINT "ConsentArtifact_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConsentArtifact" ADD CONSTRAINT "ConsentArtifact_consentVersionId_fkey" FOREIGN KEY ("consentVersionId") REFERENCES "public"."ConsentVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PreQualProviderEvent" ADD CONSTRAINT "PreQualProviderEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ForwardingAuthorization" ADD CONSTRAINT "ForwardingAuthorization_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BuyerPreferences" ADD CONSTRAINT "BuyerPreferences_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "public"."BuyerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BuyerPreferences" ADD CONSTRAINT "BuyerPreferences_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryItem" ADD CONSTRAINT "InventoryItem_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "public"."Dealer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryItem" ADD CONSTRAINT "InventoryItem_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "public"."Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryItem" ADD CONSTRAINT "InventoryItem_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Shortlist" ADD CONSTRAINT "Shortlist_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "public"."BuyerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Shortlist" ADD CONSTRAINT "Shortlist_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShortlistItem" ADD CONSTRAINT "ShortlistItem_shortlistId_fkey" FOREIGN KEY ("shortlistId") REFERENCES "public"."Shortlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShortlistItem" ADD CONSTRAINT "ShortlistItem_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "public"."InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Auction" ADD CONSTRAINT "Auction_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "public"."BuyerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Auction" ADD CONSTRAINT "Auction_shortlistId_fkey" FOREIGN KEY ("shortlistId") REFERENCES "public"."Shortlist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Auction" ADD CONSTRAINT "Auction_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuctionParticipant" ADD CONSTRAINT "AuctionParticipant_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "public"."Auction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuctionParticipant" ADD CONSTRAINT "AuctionParticipant_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "public"."Dealer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuctionParticipant" ADD CONSTRAINT "AuctionParticipant_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuctionOffer" ADD CONSTRAINT "AuctionOffer_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "public"."Auction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuctionOffer" ADD CONSTRAINT "AuctionOffer_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuctionOffer" ADD CONSTRAINT "AuctionOffer_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "public"."InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuctionOfferFinancingOption" ADD CONSTRAINT "AuctionOfferFinancingOption_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "public"."AuctionOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BestPriceOption" ADD CONSTRAINT "BestPriceOption_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "public"."Auction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BestPriceOption" ADD CONSTRAINT "BestPriceOption_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SelectedDeal" ADD CONSTRAINT "SelectedDeal_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "public"."BuyerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SelectedDeal" ADD CONSTRAINT "SelectedDeal_sourcingCaseId_fkey" FOREIGN KEY ("sourcingCaseId") REFERENCES "public"."VehicleRequestCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SelectedDeal" ADD CONSTRAINT "SelectedDeal_sourcedOfferId_fkey" FOREIGN KEY ("sourcedOfferId") REFERENCES "public"."SourcedOffer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SelectedDeal" ADD CONSTRAINT "SelectedDeal_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SelectedDeal" ADD CONSTRAINT "SelectedDeal_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "public"."AuctionOffer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FinancingOffer" ADD CONSTRAINT "FinancingOffer_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "public"."SelectedDeal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FinancingOffer" ADD CONSTRAINT "FinancingOffer_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExternalPreApproval" ADD CONSTRAINT "ExternalPreApproval_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "public"."BuyerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExternalPreApproval" ADD CONSTRAINT "ExternalPreApproval_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExternalPreApprovalSubmission" ADD CONSTRAINT "ExternalPreApprovalSubmission_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InsuranceQuote" ADD CONSTRAINT "InsuranceQuote_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InsurancePolicy" ADD CONSTRAINT "InsurancePolicy_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "public"."SelectedDeal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InsurancePolicy" ADD CONSTRAINT "InsurancePolicy_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ContractDocument" ADD CONSTRAINT "ContractDocument_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "public"."SelectedDeal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ContractDocument" ADD CONSTRAINT "ContractDocument_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "public"."Dealer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ContractDocument" ADD CONSTRAINT "ContractDocument_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ContractShieldScan" ADD CONSTRAINT "ContractShieldScan_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "public"."SelectedDeal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ContractShieldScan" ADD CONSTRAINT "ContractShieldScan_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "public"."Dealer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ContractShieldScan" ADD CONSTRAINT "ContractShieldScan_contractDocumentId_fkey" FOREIGN KEY ("contractDocumentId") REFERENCES "public"."ContractDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ContractShieldScan" ADD CONSTRAINT "ContractShieldScan_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FixListItem" ADD CONSTRAINT "FixListItem_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "public"."ContractShieldScan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ContractShieldOverride" ADD CONSTRAINT "ContractShieldOverride_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "public"."ContractShieldScan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ContractShieldOverride" ADD CONSTRAINT "ContractShieldOverride_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ContractShieldNotification" ADD CONSTRAINT "ContractShieldNotification_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "public"."ContractShieldScan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ContractShieldNotification" ADD CONSTRAINT "ContractShieldNotification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ContractManualReview" ADD CONSTRAINT "ContractManualReview_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ContractManualReview" ADD CONSTRAINT "ContractManualReview_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "public"."SelectedDeal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ContractManualReview" ADD CONSTRAINT "ContractManualReview_contractDocumentId_fkey" FOREIGN KEY ("contractDocumentId") REFERENCES "public"."ContractDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ContractManualReview" ADD CONSTRAINT "ContractManualReview_overriddenScanId_fkey" FOREIGN KEY ("overriddenScanId") REFERENCES "public"."ContractShieldScan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ContractManualReview" ADD CONSTRAINT "ContractManualReview_approvedByAdminId_fkey" FOREIGN KEY ("approvedByAdminId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ContractManualReview" ADD CONSTRAINT "ContractManualReview_secondApproverAdminId_fkey" FOREIGN KEY ("secondApproverAdminId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ContractManualReview" ADD CONSTRAINT "ContractManualReview_revokedByAdminId_fkey" FOREIGN KEY ("revokedByAdminId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ESignEnvelope" ADD CONSTRAINT "ESignEnvelope_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "public"."SelectedDeal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ESignEnvelope" ADD CONSTRAINT "ESignEnvelope_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PickupAppointment" ADD CONSTRAINT "PickupAppointment_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "public"."SelectedDeal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PickupAppointment" ADD CONSTRAINT "PickupAppointment_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "public"."BuyerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PickupAppointment" ADD CONSTRAINT "PickupAppointment_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "public"."Dealer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PickupAppointment" ADD CONSTRAINT "PickupAppointment_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Referral" ADD CONSTRAINT "Referral_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "public"."Affiliate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Referral" ADD CONSTRAINT "Referral_referredBuyerId_fkey" FOREIGN KEY ("referredBuyerId") REFERENCES "public"."BuyerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Referral" ADD CONSTRAINT "Referral_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Click" ADD CONSTRAINT "Click_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "public"."Affiliate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Click" ADD CONSTRAINT "Click_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Commission" ADD CONSTRAINT "Commission_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "public"."Affiliate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Commission" ADD CONSTRAINT "Commission_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "public"."Referral"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Commission" ADD CONSTRAINT "Commission_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Commission" ADD CONSTRAINT "Commission_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "public"."Payout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payout" ADD CONSTRAINT "Payout_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "public"."Affiliate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payout" ADD CONSTRAINT "Payout_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AffiliateShareEvent" ADD CONSTRAINT "AffiliateShareEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AffiliateDocument" ADD CONSTRAINT "AffiliateDocument_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DepositPayment" ADD CONSTRAINT "DepositPayment_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "public"."Auction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DepositPayment" ADD CONSTRAINT "DepositPayment_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ServiceFeePayment" ADD CONSTRAINT "ServiceFeePayment_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "public"."SelectedDeal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ServiceFeePayment" ADD CONSTRAINT "ServiceFeePayment_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FeeFinancingDisclosure" ADD CONSTRAINT "FeeFinancingDisclosure_feePaymentId_fkey" FOREIGN KEY ("feePaymentId") REFERENCES "public"."ServiceFeePayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LenderFeeDisbursement" ADD CONSTRAINT "LenderFeeDisbursement_feePaymentId_fkey" FOREIGN KEY ("feePaymentId") REFERENCES "public"."ServiceFeePayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DepositRequest" ADD CONSTRAINT "DepositRequest_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConciergeFeeRequest" ADD CONSTRAINT "ConciergeFeeRequest_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Refund" ADD CONSTRAINT "Refund_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Refund" ADD CONSTRAINT "Refund_depositPaymentId_fkey" FOREIGN KEY ("depositPaymentId") REFERENCES "public"."DepositPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Refund" ADD CONSTRAINT "Refund_serviceFeePaymentId_fkey" FOREIGN KEY ("serviceFeePaymentId") REFERENCES "public"."ServiceFeePayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PaymentMethod" ADD CONSTRAINT "PaymentMethod_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TradeIn" ADD CONSTRAINT "TradeIn_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TradeIn" ADD CONSTRAINT "TradeIn_selectedDealId_fkey" FOREIGN KEY ("selectedDealId") REFERENCES "public"."SelectedDeal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealDocument" ADD CONSTRAINT "DealDocument_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealDocument" ADD CONSTRAINT "DealDocument_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "public"."DocumentRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DocumentRequest" ADD CONSTRAINT "DocumentRequest_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RefinanceLead" ADD CONSTRAINT "RefinanceLead_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FundedLoan" ADD CONSTRAINT "FundedLoan_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "public"."RefinanceLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InsuranceDocRequest" ADD CONSTRAINT "InsuranceDocRequest_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AdminNotification" ADD CONSTRAINT "AdminNotification_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Chargeback" ADD CONSTRAINT "Chargeback_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "public"."Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Chargeback" ADD CONSTRAINT "Chargeback_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FinancialAuditLog" ADD CONSTRAINT "FinancialAuditLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AiConversation" ADD CONSTRAINT "AiConversation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AiMessage" ADD CONSTRAINT "AiMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."AiConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AiAdminAction" ADD CONSTRAINT "AiAdminAction_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerCoverageGapSignal" ADD CONSTRAINT "DealerCoverageGapSignal_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VehicleRequestCase" ADD CONSTRAINT "VehicleRequestCase_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VehicleRequestCase" ADD CONSTRAINT "VehicleRequestCase_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "public"."BuyerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VehicleRequestItem" ADD CONSTRAINT "VehicleRequestItem_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "public"."VehicleRequestCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SourcingOutreachLog" ADD CONSTRAINT "SourcingOutreachLog_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "public"."VehicleRequestCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SourcedOffer" ADD CONSTRAINT "SourcedOffer_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SourcedOffer" ADD CONSTRAINT "SourcedOffer_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "public"."VehicleRequestCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerInvite" ADD CONSTRAINT "DealerInvite_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "public"."VehicleRequestCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerInvite" ADD CONSTRAINT "DealerInvite_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "public"."SourcedOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CaseEventLog" ADD CONSTRAINT "CaseEventLog_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "public"."VehicleRequestCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CaseNote" ADD CONSTRAINT "CaseNote_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "public"."VehicleRequestCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PrequalConsentArtifact" ADD CONSTRAINT "PrequalConsentArtifact_consentVersionId_fkey" FOREIGN KEY ("consentVersionId") REFERENCES "public"."PrequalConsentVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PrequalSession" ADD CONSTRAINT "PrequalSession_prequalificationId_fkey" FOREIGN KEY ("prequalificationId") REFERENCES "public"."PreQualification"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PrequalProviderEvent" ADD CONSTRAINT "PrequalProviderEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."PrequalSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PrequalProviderEvent" ADD CONSTRAINT "PrequalProviderEvent_prequalificationId_fkey" FOREIGN KEY ("prequalificationId") REFERENCES "public"."PreQualification"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PrequalOfferSnapshot" ADD CONSTRAINT "PrequalOfferSnapshot_preQualificationId_fkey" FOREIGN KEY ("preQualificationId") REFERENCES "public"."PreQualification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerSource" ADD CONSTRAINT "DealerSource_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "public"."DealerProspect"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerSourceRun" ADD CONSTRAINT "DealerSourceRun_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "public"."DealerSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryRawSnapshot" ADD CONSTRAINT "InventoryRawSnapshot_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "public"."DealerSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryVehicleSighting" ADD CONSTRAINT "InventoryVehicleSighting_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "public"."InventoryRawSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryPriceHistory" ADD CONSTRAINT "InventoryPriceHistory_marketVehicleId_fkey" FOREIGN KEY ("marketVehicleId") REFERENCES "public"."InventoryMarketVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryPriceHistory" ADD CONSTRAINT "InventoryPriceHistory_verifiedVehicleId_fkey" FOREIGN KEY ("verifiedVehicleId") REFERENCES "public"."InventoryVerifiedVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryDuplicateGroupMember" ADD CONSTRAINT "InventoryDuplicateGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."InventoryDuplicateGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryDuplicateGroupMember" ADD CONSTRAINT "InventoryDuplicateGroupMember_marketVehicleId_fkey" FOREIGN KEY ("marketVehicleId") REFERENCES "public"."InventoryMarketVehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryDuplicateGroupMember" ADD CONSTRAINT "InventoryDuplicateGroupMember_verifiedVehicleId_fkey" FOREIGN KEY ("verifiedVehicleId") REFERENCES "public"."InventoryVerifiedVehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventorySourceError" ADD CONSTRAINT "InventorySourceError_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "public"."DealerSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BuyerRequestInventoryMatch" ADD CONSTRAINT "BuyerRequestInventoryMatch_marketVehicleId_fkey" FOREIGN KEY ("marketVehicleId") REFERENCES "public"."InventoryMarketVehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BuyerRequestInventoryMatch" ADD CONSTRAINT "BuyerRequestInventoryMatch_verifiedVehicleId_fkey" FOREIGN KEY ("verifiedVehicleId") REFERENCES "public"."InventoryVerifiedVehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerIntelligenceInvite" ADD CONSTRAINT "DealerIntelligenceInvite_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "public"."DealerProspect"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerQuickOffer" ADD CONSTRAINT "DealerQuickOffer_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "public"."DealerIntelligenceInvite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerQuickOffer" ADD CONSTRAINT "DealerQuickOffer_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "public"."DealerProspect"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerOnboardingConversion" ADD CONSTRAINT "DealerOnboardingConversion_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "public"."DealerProspect"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerLifecycleEvent" ADD CONSTRAINT "DealerLifecycleEvent_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "public"."DealerProspect"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "public"."MessageThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

