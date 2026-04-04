-- ============================================================
-- AutoLenis — Baseline Migration
-- 
-- This migration represents the complete database state and can
-- fully recreate the database from scratch. It is the canonical
-- source of truth for the AutoLenis database schema.
--
-- Generated from: Prisma schema + custom SQL scripts
-- Date: 2026-03-13
-- ============================================================


-- ============================================================
-- Section 1: Extensions
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create Supabase built-in roles if they don't already exist (provided by Supabase in production)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  END IF;
END $$;


-- ============================================================
-- Section 2: Enums
-- ============================================================

CREATE TYPE public."AdminSubStatus" AS ENUM (
    'NEW',
    'NEED_DEALERS',
    'OUTREACH_IN_PROGRESS',
    'WAITING_ON_DEALER',
    'OFFERS_READY',
    'OFFERS_PRESENTED',
    'PENDING_BUYER_RESPONSE',
    'DEALER_INVITE_SENT',
    'DEALER_ONBOARDING',
    'STALE',
    'ESCALATED',
    'RESOLVED'
);

CREATE TYPE public."AlertSeverity" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
);

CREATE TYPE public."AlertStatus" AS ENUM (
    'OPEN',
    'INVESTIGATING',
    'RESOLVED',
    'DISMISSED'
);

CREATE TYPE public."AuctionStatus" AS ENUM (
    'PENDING_DEPOSIT',
    'ACTIVE',
    'CLOSED',
    'COMPLETED',
    'CANCELLED'
);

CREATE TYPE public."BestPriceType" AS ENUM (
    'BEST_CASH',
    'BEST_MONTHLY',
    'BALANCED'
);

CREATE TYPE public."BudgetType" AS ENUM (
    'MONTHLY',
    'TOTAL',
    'TOTAL_PRICE',
    'MONTHLY_PAYMENT'
);

CREATE TYPE public."BuyerCaseStatus" AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'SOURCING',
    'OFFERS_AVAILABLE',
    'OFFER_SELECTED',
    'DEALER_INVITED',
    'IN_PLATFORM_TRANSACTION',
    'CLOSED_WON',
    'CLOSED_LOST',
    'CLOSED_CANCELLED'
);

CREATE TYPE public."CmaInternalFixQueue" AS ENUM (
    'OPS',
    'ENGINEERING',
    'POLICY'
);

CREATE TYPE public."CmaRootCauseCategory" AS ENUM (
    'FALSE_POSITIVE_SCAN',
    'INTERNAL_DATA_MISMATCH',
    'DEPENDENCY_FAILURE',
    'POLICY_RULES_DISCREPANCY',
    'MISSING_INTERNAL_ATTESTATION',
    'OTHER'
);

CREATE TYPE public."CommissionStatus" AS ENUM (
    'PENDING',
    'EARNED',
    'PAID',
    'CANCELLED'
);

CREATE TYPE public."ConciergeFeeRequestStatus" AS ENUM (
    'REQUESTED',
    'PAID',
    'FAILED',
    'REFUNDED',
    'CANCELLED'
);

CREATE TYPE public."ConsentCaptureMethod" AS ENUM (
    'WEB',
    'PHONE',
    'WRITTEN'
);

CREATE TYPE public."ContractStatus" AS ENUM (
    'UPLOADED',
    'SCANNING',
    'ISSUES_FOUND',
    'PASSED',
    'FAILED'
);

CREATE TYPE public."CoverageGapStatus" AS ENUM (
    'OPEN',
    'INVITE_SENT',
    'RESOLVED',
    'DISMISSED'
);

CREATE TYPE public."CreditTier" AS ENUM (
    'EXCELLENT',
    'GOOD',
    'FAIR',
    'POOR',
    'DECLINED'
);

CREATE TYPE public."DealStatus" AS ENUM (
    'SELECTED',
    'FINANCING_PENDING',
    'FINANCING_APPROVED',
    'FEE_PENDING',
    'FEE_PAID',
    'INSURANCE_PENDING',
    'INSURANCE_COMPLETE',
    'CONTRACT_PENDING',
    'CONTRACT_REVIEW',
    'CONTRACT_MANUAL_REVIEW_REQUIRED',
    'CONTRACT_INTERNAL_FIX_IN_PROGRESS',
    'CONTRACT_ADMIN_OVERRIDE_APPROVED',
    'CONTRACT_APPROVED',
    'SIGNING_PENDING',
    'SIGNED',
    'PICKUP_SCHEDULED',
    'COMPLETED',
    'CANCELLED'
);

CREATE TYPE public."DealerInviteStatus" AS ENUM (
    'SENT',
    'CLAIMED',
    'COMPLETED',
    'EXPIRED'
);

CREATE TYPE public."DealerProspectStatus" AS ENUM (
    'DISCOVERED',
    'CONTACTED',
    'RESPONDED',
    'ONBOARDING',
    'CONVERTED',
    'REJECTED',
    'SUPPRESSED'
);

CREATE TYPE public."DealerSourceStatus" AS ENUM (
    'ACTIVE',
    'PAUSED',
    'ERRORED',
    'SUPPRESSED'
);

CREATE TYPE public."DealerSourceType" AS ENUM (
    'WEBSITE',
    'FEED',
    'API',
    'MANUAL'
);

CREATE TYPE public."DepositRequestStatus" AS ENUM (
    'REQUESTED',
    'PAID',
    'FAILED',
    'REFUNDED',
    'CANCELLED'
);

CREATE TYPE public."DistancePreference" AS ENUM (
    'DELIVERY',
    'PICKUP',
    'EITHER'
);

CREATE TYPE public."DocumentRequestStatus" AS ENUM (
    'REQUESTED',
    'UPLOADED',
    'APPROVED',
    'REJECTED'
);

CREATE TYPE public."DocumentStatus" AS ENUM (
    'UPLOADED',
    'PENDING_REVIEW',
    'APPROVED',
    'REJECTED'
);

CREATE TYPE public."DocumentTrustStatusEnum" AS ENUM (
    'UPLOADED',
    'SCANNED',
    'VERIFIED',
    'APPROVED',
    'LOCKED',
    'SUPERSEDED',
    'REVOKED',
    'EXPIRED'
);

CREATE TYPE public."ESignStatus" AS ENUM (
    'CREATED',
    'SENT',
    'VIEWED',
    'SIGNED',
    'COMPLETED',
    'DECLINED',
    'EXPIRED'
);

CREATE TYPE public."ExternalPreApprovalStatus" AS ENUM (
    'SUBMITTED',
    'IN_REVIEW',
    'APPROVED',
    'REJECTED',
    'EXPIRED',
    'SUPERSEDED'
);

CREATE TYPE public."FeePaymentMethod" AS ENUM (
    'CARD',
    'LOAN_INCLUSION'
);

CREATE TYPE public."IdentityState" AS ENUM (
    'ANONYMOUS',
    'CONDITIONAL_HOLD',
    'RELEASED'
);

CREATE TYPE public."IdentityTrustStatusEnum" AS ENUM (
    'UNVERIFIED',
    'PENDING_VERIFICATION',
    'VERIFIED',
    'FAILED',
    'SUSPENDED',
    'REVOKED'
);

CREATE TYPE public."InsuranceStatus" AS ENUM (
    'QUOTE_REQUESTED',
    'QUOTE_RECEIVED',
    'POLICY_SELECTED',
    'POLICY_BOUND',
    'EXTERNAL_UPLOADED'
);

CREATE TYPE public."InventoryMatchStatus" AS ENUM (
    'PENDING',
    'MATCHED',
    'INVITED',
    'OFFER_RECEIVED',
    'EXPIRED'
);

CREATE TYPE public."JobStatus" AS ENUM (
    'PENDING',
    'RUNNING',
    'COMPLETED',
    'FAILED',
    'DEAD_LETTER'
);

CREATE TYPE public."JobType" AS ENUM (
    'DISCOVER_DEALER',
    'FETCH_SOURCE',
    'PARSE_SOURCE',
    'NORMALIZE_SOURCE',
    'DEDUPE_INVENTORY',
    'REFRESH_SOURCE',
    'STALE_SWEEP',
    'GENERATE_DEALER_INVITES',
    'PROCESS_QUICK_OFFER',
    'PROMOTE_VERIFIED_INVENTORY',
    'SCAN_CIRCUMVENTION_SIGNALS'
);

CREATE TYPE public."LenderDisbursementStatus" AS ENUM (
    'PENDING',
    'DISBURSED'
);

CREATE TYPE public."ManualApprovalMode" AS ENUM (
    'MANUAL_VALIDATED',
    'EXCEPTION_OVERRIDE',
    'RETURN_TO_INTERNAL_FIX'
);

CREATE TYPE public."ManualReviewStatus" AS ENUM (
    'OPEN',
    'PENDING_SECOND_APPROVAL',
    'APPROVED',
    'RETURNED_INTERNAL_FIX',
    'REVOKED'
);

CREATE TYPE public."MarketVehicleStatus" AS ENUM (
    'ACTIVE',
    'STALE',
    'SUPPRESSED',
    'PROMOTED'
);

CREATE TYPE public."MarketingRestriction" AS ENUM (
    'NONE',
    'NO_CREDIT_SOLICITATION'
);

CREATE TYPE public."NotificationCategory" AS ENUM (
    'PAYMENT',
    'USER',
    'DEAL',
    'DOC',
    'AFFILIATE',
    'SYSTEM',
    'SECURITY',
    'WEBHOOK'
);

CREATE TYPE public."NotificationPriority" AS ENUM (
    'P0',
    'P1',
    'P2'
);

CREATE TYPE public."OfferSourceType" AS ENUM (
    'DEALER_SUBMITTED',
    'ADMIN_ENTERED'
);

CREATE TYPE public."PaymentStatus" AS ENUM (
    'PENDING',
    'PROCESSING',
    'SUCCEEDED',
    'FAILED',
    'REFUNDED'
);

CREATE TYPE public."PayoutStatus" AS ENUM (
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'FAILED'
);

CREATE TYPE public."PickupStatus" AS ENUM (
    'SCHEDULED',
    'CONFIRMED',
    'BUYER_ARRIVED',
    'COMPLETED',
    'CANCELLED'
);

CREATE TYPE public."PreQualSource" AS ENUM (
    'INTERNAL',
    'EXTERNAL_MANUAL',
    'MICROBILT',
    'IPREDICT',
    'PROVIDER_BACKED'
);

CREATE TYPE public."QuickOfferStatus" AS ENUM (
    'PENDING',
    'SUBMITTED',
    'ACCEPTED',
    'REJECTED',
    'EXPIRED'
);

CREATE TYPE public."RefinanceQualificationStatus" AS ENUM (
    'PENDING',
    'QUALIFIED',
    'DISQUALIFIED'
);

CREATE TYPE public."RefundStatus" AS ENUM (
    'PENDING',
    'COMPLETED',
    'FAILED',
    'CANCELLED'
);

CREATE TYPE public."RequestCondition" AS ENUM (
    'NEW',
    'USED',
    'EITHER'
);

CREATE TYPE public."RequestTimeline" AS ENUM (
    'ZERO_7_DAYS',
    'EIGHT_14_DAYS',
    'FIFTEEN_30_DAYS',
    'THIRTY_PLUS_DAYS'
);

CREATE TYPE public."SourceRunStatus" AS ENUM (
    'PENDING',
    'RUNNING',
    'COMPLETED',
    'FAILED'
);

CREATE TYPE public."SourcedOfferStatus" AS ENUM (
    'DRAFT',
    'PENDING_PRESENT',
    'PRESENTED',
    'ACCEPTED',
    'DECLINED',
    'EXPIRED'
);

CREATE TYPE public."TransactionStatus" AS ENUM (
    'SUCCEEDED',
    'PENDING',
    'FAILED'
);

CREATE TYPE public."TransactionType" AS ENUM (
    'PAYMENT',
    'REFUND',
    'CHARGEBACK',
    'PAYOUT'
);

CREATE TYPE public."UserRole" AS ENUM (
    'BUYER',
    'DEALER',
    'DEALER_USER',
    'ADMIN',
    'SUPER_ADMIN',
    'COMPLIANCE_ADMIN',
    'AFFILIATE',
    'AFFILIATE_ONLY',
    'SYSTEM_AGENT'
);

CREATE TYPE public."VehicleCondition" AS ENUM (
    'EXCELLENT',
    'GOOD',
    'FAIR',
    'POOR'
);

CREATE TYPE public."VehicleType" AS ENUM (
    'CAR',
    'SUV',
    'TRUCK',
    'VAN'
);

CREATE TYPE public."VerifiedVehicleStatus" AS ENUM (
    'AVAILABLE',
    'HOLD',
    'SOLD',
    'REMOVED'
);

CREATE TYPE public."WorkspaceMode" AS ENUM (
    'LIVE',
    'TEST'
);


-- ============================================================
-- Section 3: Tables (Prisma-managed + SQL-only)
-- ============================================================

CREATE TABLE public."AdminAuditLog" (
    id text NOT NULL,
    "userId" text,
    action text NOT NULL,
    details jsonb,
    "ipAddress" text,
    "userAgent" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."AdminLoginAttempt" (
    id text NOT NULL,
    identifier text NOT NULL,
    "attemptCount" integer DEFAULT 1 NOT NULL,
    "firstAttempt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lockedUntil" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."AdminNotification" (
    id text NOT NULL,
    "workspaceId" text NOT NULL,
    priority public."NotificationPriority" NOT NULL,
    category public."NotificationCategory" NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    "entityType" text,
    "entityId" text,
    "ctaPath" text,
    metadata jsonb,
    "isRead" boolean DEFAULT false NOT NULL,
    "readAt" timestamp(3) without time zone,
    "isArchived" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "dedupeKey" text
);

CREATE TABLE public."AdminSession" (
    id text NOT NULL,
    "userId" text NOT NULL,
    email text NOT NULL,
    role text NOT NULL,
    "mfaVerified" boolean DEFAULT false NOT NULL,
    "mfaEnrolled" boolean DEFAULT false NOT NULL,
    "requiresPasswordReset" boolean DEFAULT false NOT NULL,
    "factorId" text,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."AdminSetting" (
    id text NOT NULL,
    key text NOT NULL,
    value jsonb NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."AdminUser" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "workspaceId" text,
    "firstName" text NOT NULL,
    "lastName" text NOT NULL,
    role text DEFAULT 'ADMIN'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."Affiliate" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "workspaceId" text,
    "referralCode" text NOT NULL,
    "firstName" text,
    "lastName" text,
    "totalEarnings" double precision DEFAULT 0 NOT NULL,
    "pendingEarnings" double precision DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."AffiliateDocument" (
    id text NOT NULL,
    "affiliateId" text NOT NULL,
    type text DEFAULT 'OTHER'::text NOT NULL,
    "fileName" text NOT NULL,
    "filePath" text NOT NULL,
    "fileSize" integer,
    "mimeType" text,
    status text DEFAULT 'PENDING'::text NOT NULL,
    visibility text DEFAULT 'INTERNAL'::text NOT NULL,
    "workspaceId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."AffiliateShareEvent" (
    id text NOT NULL,
    "affiliateId" text NOT NULL,
    "recipientEmail" text NOT NULL,
    "workspaceId" text,
    message text,
    "referralLink" text NOT NULL,
    status text DEFAULT 'sent'::text NOT NULL,
    "providerMessageId" text,
    error text,
    "sentAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."AiAdminAction" (
    id text NOT NULL,
    "adminId" text NOT NULL,
    "actionType" text NOT NULL,
    payload jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "workspaceId" text
);

CREATE TABLE public."AiContractExtraction" (
    id text NOT NULL,
    "dealId" text,
    "documentId" text,
    parties jsonb NOT NULL,
    vehicle jsonb NOT NULL,
    pricing jsonb NOT NULL,
    fees jsonb NOT NULL,
    terms jsonb NOT NULL,
    "redFlags" jsonb NOT NULL,
    "rawText" text,
    status text DEFAULT 'completed'::text NOT NULL,
    disclaimer text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "workspaceId" text
);

CREATE TABLE public."AiConversation" (
    id text NOT NULL,
    "userId" text,
    role text NOT NULL,
    agent text NOT NULL,
    intent text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "workspaceId" text
);

CREATE TABLE public."AiLead" (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    intent text,
    source text DEFAULT 'chat'::text,
    "conversationId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "workspaceId" text
);

CREATE TABLE public."AiMessage" (
    id text NOT NULL,
    "conversationId" text NOT NULL,
    sender text NOT NULL,
    content text NOT NULL,
    "toolUsed" text,
    "riskLevel" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."AiSeoDraft" (
    id text NOT NULL,
    title text NOT NULL,
    keywords text NOT NULL,
    content text NOT NULL,
    "metaTitle" text,
    "metaDescription" text,
    slug text,
    status text DEFAULT 'draft'::text NOT NULL,
    "createdBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "workspaceId" text
);

CREATE TABLE public."AiToolCall" (
    id text NOT NULL,
    "conversationId" text NOT NULL,
    "toolName" text NOT NULL,
    input jsonb NOT NULL,
    output jsonb,
    status text NOT NULL,
    "latencyMs" integer NOT NULL,
    error text,
    "userId" text,
    role text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "workspaceId" text
);

CREATE TABLE public."Auction" (
    id text NOT NULL,
    "buyerId" text NOT NULL,
    "shortlistId" text NOT NULL,
    "workspaceId" text,
    status public."AuctionStatus" DEFAULT 'PENDING_DEPOSIT'::public."AuctionStatus" NOT NULL,
    "startsAt" timestamp(3) without time zone,
    "endsAt" timestamp(3) without time zone,
    "closedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."AuctionOffer" (
    id text NOT NULL,
    "auctionId" text NOT NULL,
    "participantId" text NOT NULL,
    "inventoryItemId" text NOT NULL,
    "workspaceId" text,
    "cashOtd" double precision NOT NULL,
    "taxAmount" double precision NOT NULL,
    "feesBreakdown" jsonb NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."AuctionOfferFinancingOption" (
    id text NOT NULL,
    "offerId" text NOT NULL,
    apr double precision NOT NULL,
    "termMonths" integer NOT NULL,
    "downPayment" double precision NOT NULL,
    "monthlyPayment" double precision NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."AuctionParticipant" (
    id text NOT NULL,
    "auctionId" text NOT NULL,
    "dealerId" text NOT NULL,
    "workspaceId" text,
    "invitedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "viewedAt" timestamp(3) without time zone
);

CREATE TABLE public."BestPriceOption" (
    id text NOT NULL,
    "auctionId" text NOT NULL,
    "workspaceId" text,
    type public."BestPriceType" NOT NULL,
    "offerId" text NOT NULL,
    "inventoryItemId" text NOT NULL,
    "dealerId" text NOT NULL,
    "cashOtd" double precision NOT NULL,
    "monthlyPayment" double precision,
    score double precision NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."BuyerPreferences" (
    id text NOT NULL,
    "buyerId" text NOT NULL,
    "workspaceId" text,
    makes text[],
    "bodyStyles" text[],
    "minYear" integer,
    "maxYear" integer,
    "maxMileage" integer,
    "maxDistance" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."BuyerProfile" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "workspaceId" text,
    "firstName" text NOT NULL,
    "lastName" text NOT NULL,
    phone text,
    address text NOT NULL,
    city text NOT NULL,
    state text NOT NULL,
    zip text NOT NULL,
    employment text,
    employer text,
    "annualIncome" double precision,
    "housingStatus" text,
    "monthlyHousing" double precision,
    "dateOfBirth" date,
    "addressLine2" text,
    "postalCode" text,
    country text DEFAULT 'US'::text,
    "employmentStatus" text,
    "employerName" text,
    "monthlyIncomeCents" integer,
    "monthlyHousingCents" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."BuyerRequestInventoryMatch" (
    id text NOT NULL,
    "workspaceId" text,
    "buyerRequestId" text,
    "marketVehicleId" text,
    "verifiedVehicleId" text,
    "coverageType" text,
    "matchScore" double precision DEFAULT 0 NOT NULL,
    status public."InventoryMatchStatus" DEFAULT 'PENDING'::public."InventoryMatchStatus" NOT NULL,
    "auctionInvitationId" text,
    "dealerInviteId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."CaseEventLog" (
    id text NOT NULL,
    "caseId" text NOT NULL,
    "actorUserId" text NOT NULL,
    "actorRole" text NOT NULL,
    action text NOT NULL,
    "beforeValue" text,
    "afterValue" text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."CaseNote" (
    id text NOT NULL,
    "caseId" text NOT NULL,
    "authorUserId" text NOT NULL,
    "authorRole" text NOT NULL,
    content text NOT NULL,
    "isInternal" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."Chargeback" (
    id text NOT NULL,
    "transactionId" text NOT NULL,
    "stripeDisputeId" text,
    amount double precision NOT NULL,
    status text DEFAULT 'OPEN'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "workspaceId" text
);

CREATE TABLE public."CircumventionAlert" (
    id text NOT NULL,
    "workspaceId" text,
    "dealId" text,
    "buyerId" text,
    "dealerId" text,
    "messageId" text,
    "alertType" text NOT NULL,
    severity public."AlertSeverity" DEFAULT 'MEDIUM'::public."AlertSeverity" NOT NULL,
    status public."AlertStatus" DEFAULT 'OPEN'::public."AlertStatus" NOT NULL,
    description text,
    evidence jsonb,
    "resolvedBy" text,
    "resolvedAt" timestamp(3) without time zone,
    resolution text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."Click" (
    id text NOT NULL,
    "affiliateId" text NOT NULL,
    "workspaceId" text,
    "ipAddress" text,
    "userAgent" text,
    referer text,
    "clickedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."Commission" (
    id text NOT NULL,
    "affiliateId" text NOT NULL,
    "referralId" text NOT NULL,
    "serviceFeePaymentId" text,
    "workspaceId" text,
    level integer NOT NULL,
    "dealId" text,
    "baseAmount" double precision NOT NULL,
    "commissionRate" double precision NOT NULL,
    "commissionAmount" double precision NOT NULL,
    status public."CommissionStatus" DEFAULT 'PENDING'::public."CommissionStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "payoutId" text
);

CREATE TABLE public."ComplianceEvent" (
    id text NOT NULL,
    "eventType" text NOT NULL,
    "userId" text,
    "buyerId" text,
    "dealId" text,
    action text NOT NULL,
    details jsonb NOT NULL,
    "ipAddress" text,
    "userAgent" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."ConciergeFeeRequest" (
    id text NOT NULL,
    "buyerId" text NOT NULL,
    "dealId" text NOT NULL,
    "workspaceId" text,
    amount double precision NOT NULL,
    notes text,
    status public."ConciergeFeeRequestStatus" DEFAULT 'REQUESTED'::public."ConciergeFeeRequestStatus" NOT NULL,
    "createdBy" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."ConsentArtifact" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "buyerId" text NOT NULL,
    "workspaceId" text,
    "consentVersionId" text NOT NULL,
    "consentText" text NOT NULL,
    "consentGiven" boolean DEFAULT true NOT NULL,
    "capturedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "ipAddress" text,
    "userAgent" text,
    "preQualificationId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."ConsentVersion" (
    id text NOT NULL,
    version text NOT NULL,
    label text NOT NULL,
    "bodyText" text NOT NULL,
    "effectiveAt" timestamp(3) without time zone NOT NULL,
    "retiredAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."ConsumerAuthorizationArtifact" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "authorizationType" text NOT NULL,
    authorized boolean NOT NULL,
    "authorizationText" text NOT NULL,
    "authorizedParties" text[],
    "recipientDescription" text,
    "ipAddress" text,
    "userAgent" text,
    "authorizedAt" timestamp(3) without time zone NOT NULL,
    "acceptedAt" timestamp(3) without time zone,
    "retentionLocked" boolean DEFAULT true NOT NULL,
    "sessionId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."ContractDocument" (
    id text NOT NULL,
    "dealId" text NOT NULL,
    "dealerId" text NOT NULL,
    "workspaceId" text,
    "documentUrl" text NOT NULL,
    "documentType" text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    "uploadedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."ContractManualReview" (
    id text NOT NULL,
    "workspaceId" text,
    "dealId" text NOT NULL,
    "contractDocumentId" text,
    "overriddenScanId" text,
    status public."ManualReviewStatus" DEFAULT 'OPEN'::public."ManualReviewStatus" NOT NULL,
    "rootCauseCategory" public."CmaRootCauseCategory",
    "rootCauseNotes" text,
    "approvalMode" public."ManualApprovalMode",
    "verifiedFieldsJson" jsonb,
    "evidenceAttachmentIds" text[],
    "vinMatch" boolean DEFAULT false NOT NULL,
    "buyerIdentityMatch" boolean DEFAULT false NOT NULL,
    "otdMathValidated" boolean DEFAULT false NOT NULL,
    "feesValidated" boolean DEFAULT false NOT NULL,
    "termsValidated" boolean DEFAULT false NOT NULL,
    "disclosuresPresent" boolean DEFAULT false NOT NULL,
    "attestationAccepted" boolean DEFAULT false NOT NULL,
    "attestationTextVersion" text,
    "approvedByAdminId" text,
    "approvedAt" timestamp(3) without time zone,
    "approvedFromIp" text,
    "approvedUserAgent" text,
    "secondApproverAdminId" text,
    "secondApprovedAt" timestamp(3) without time zone,
    "revokedAt" timestamp(3) without time zone,
    "revokedReason" text,
    "revokedByAdminId" text,
    "assignedQueue" public."CmaInternalFixQueue",
    "documentHashAtApproval" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."ContractShieldNotification" (
    id text NOT NULL,
    "scanId" text NOT NULL,
    "recipientId" text NOT NULL,
    "notificationType" text NOT NULL,
    status text NOT NULL,
    subject text NOT NULL,
    message text NOT NULL,
    "sentAt" timestamp(3) without time zone,
    "failedReason" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."ContractShieldOverride" (
    id text NOT NULL,
    "scanId" text NOT NULL,
    "adminId" text NOT NULL,
    action text NOT NULL,
    reason text NOT NULL,
    "buyerAcknowledged" boolean DEFAULT false NOT NULL,
    "buyerAckAt" timestamp(3) without time zone,
    "buyerAckComment" text,
    "previousStatus" text NOT NULL,
    "newStatus" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."ContractShieldReconciliation" (
    id text NOT NULL,
    "jobType" text NOT NULL,
    status text NOT NULL,
    "itemsProcessed" integer DEFAULT 0 NOT NULL,
    "itemsUpdated" integer DEFAULT 0 NOT NULL,
    "itemsFailed" integer DEFAULT 0 NOT NULL,
    "errorLog" text,
    "resultSummary" jsonb,
    "startedAt" timestamp(3) without time zone,
    "completedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."ContractShieldRule" (
    id text NOT NULL,
    "ruleKey" text NOT NULL,
    "ruleName" text NOT NULL,
    "ruleDescription" text NOT NULL,
    "ruleType" text NOT NULL,
    severity text NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    "thresholdValue" double precision,
    "configJson" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."ContractShieldScan" (
    id text NOT NULL,
    "dealId" text NOT NULL,
    "dealerId" text NOT NULL,
    "contractDocumentId" text,
    "workspaceId" text,
    status public."ContractStatus" DEFAULT 'SCANNING'::public."ContractStatus" NOT NULL,
    "aprMatch" boolean,
    "paymentMatch" boolean,
    "otdMatch" boolean,
    "junkFeesDetected" boolean,
    "missingAddendums" text[],
    "overallScore" double precision,
    "scannedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."CoverageGapTask" (
    id text NOT NULL,
    "workspaceId" text,
    "buyerRequestId" text,
    "marketZip" text NOT NULL,
    "radiusMiles" integer DEFAULT 50 NOT NULL,
    make text,
    model text,
    "yearMin" integer,
    "yearMax" integer,
    status public."CoverageGapStatus" DEFAULT 'OPEN'::public."CoverageGapStatus" NOT NULL,
    "resolvedAt" timestamp(3) without time zone,
    "resolvedBy" text,
    resolution text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."DealDocument" (
    id text NOT NULL,
    "ownerUserId" text NOT NULL,
    "dealId" text,
    "workspaceId" text,
    type text NOT NULL,
    "fileName" text NOT NULL,
    "mimeType" text,
    "fileSize" integer,
    "fileUrl" text NOT NULL,
    "storagePath" text,
    status public."DocumentStatus" DEFAULT 'UPLOADED'::public."DocumentStatus" NOT NULL,
    "rejectionReason" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "requestId" text
);

CREATE TABLE public."DealProtectionEvent" (
    id text NOT NULL,
    "workspaceId" text,
    "dealId" text NOT NULL,
    "eventType" text NOT NULL,
    description text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."Dealer" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "workspaceId" text,
    "businessName" text NOT NULL,
    "licenseNumber" text NOT NULL,
    phone text NOT NULL,
    address text NOT NULL,
    city text NOT NULL,
    state text NOT NULL,
    zip text NOT NULL,
    "integrityScore" double precision DEFAULT 100 NOT NULL,
    verified boolean DEFAULT false NOT NULL,
    "legalName" text,
    email text,
    "addressLine2" text,
    "postalCode" text,
    country text DEFAULT 'US'::text,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."DealerCoverageGapSignal" (
    id text NOT NULL,
    "workspaceId" text,
    "buyerId" text NOT NULL,
    "marketZip" text NOT NULL,
    "radiusMiles" integer DEFAULT 50 NOT NULL,
    "reasonCode" text NOT NULL,
    "resolvedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."DealerIntelligenceInvite" (
    id text NOT NULL,
    "workspaceId" text,
    "prospectId" text,
    "dealerId" text,
    "buyerRequestId" text,
    "coverageGapTaskId" text,
    "tokenHash" text NOT NULL,
    "tokenExpiresAt" timestamp(3) without time zone NOT NULL,
    "dealerEmail" text,
    "dealerName" text,
    "dealerPhone" text,
    status text DEFAULT 'sent'::text NOT NULL,
    "sentAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "viewedAt" timestamp(3) without time zone,
    "respondedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."DealerInvite" (
    id text NOT NULL,
    "caseId" text NOT NULL,
    "offerId" text NOT NULL,
    "tokenHash" text NOT NULL,
    "tokenExpiresAt" timestamp(3) without time zone NOT NULL,
    "dealerEmail" text,
    "dealerName" text,
    status public."DealerInviteStatus" DEFAULT 'SENT'::public."DealerInviteStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."DealerLifecycleEvent" (
    id text NOT NULL,
    "workspaceId" text,
    "prospectId" text,
    "dealerId" text,
    "eventType" text NOT NULL,
    "fromStatus" text,
    "toStatus" text,
    metadata jsonb,
    "performedBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."DealerOnboardingConversion" (
    id text NOT NULL,
    "workspaceId" text,
    "prospectId" text NOT NULL,
    "dealerId" text,
    "quickOfferId" text,
    status text DEFAULT 'pending'::text NOT NULL,
    "startedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "completedAt" timestamp(3) without time zone,
    "businessDocsUploaded" boolean DEFAULT false NOT NULL,
    "agreementAccepted" boolean DEFAULT false NOT NULL,
    "operationalSetup" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."DealerProspect" (
    id text NOT NULL,
    "workspaceId" text,
    "businessName" text NOT NULL,
    phone text,
    email text,
    website text,
    address text,
    city text,
    state text,
    zip text,
    "discoveredFrom" text,
    "discoveredAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status public."DealerProspectStatus" DEFAULT 'DISCOVERED'::public."DealerProspectStatus" NOT NULL,
    notes text,
    "convertedDealerId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."DealerQuickOffer" (
    id text NOT NULL,
    "workspaceId" text,
    "inviteId" text NOT NULL,
    "prospectId" text,
    vin text,
    year integer,
    make text,
    model text,
    "trim" text,
    mileage integer,
    "priceCents" integer,
    "conditionNotes" text,
    "availableDate" timestamp(3) without time zone,
    notes text,
    status public."QuickOfferStatus" DEFAULT 'PENDING'::public."QuickOfferStatus" NOT NULL,
    "reviewedBy" text,
    "reviewedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."DealerSource" (
    id text NOT NULL,
    "workspaceId" text,
    "prospectId" text,
    "dealerId" text,
    "sourceType" public."DealerSourceType" NOT NULL,
    "sourceUrl" text,
    "feedUrl" text,
    status public."DealerSourceStatus" DEFAULT 'ACTIVE'::public."DealerSourceStatus" NOT NULL,
    "lastFetchedAt" timestamp(3) without time zone,
    "fetchIntervalMinutes" integer DEFAULT 1440 NOT NULL,
    "errorCount" integer DEFAULT 0 NOT NULL,
    "lastErrorMessage" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."DealerSourceRun" (
    id text NOT NULL,
    "sourceId" text NOT NULL,
    status public."SourceRunStatus" DEFAULT 'PENDING'::public."SourceRunStatus" NOT NULL,
    "startedAt" timestamp(3) without time zone,
    "completedAt" timestamp(3) without time zone,
    "vehiclesFound" integer DEFAULT 0 NOT NULL,
    "vehiclesNew" integer DEFAULT 0 NOT NULL,
    "vehiclesUpdated" integer DEFAULT 0 NOT NULL,
    errors integer DEFAULT 0 NOT NULL,
    "errorDetails" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."DealerUser" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "dealerId" text NOT NULL,
    "roleLabel" text,
    "workspaceId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."DepositPayment" (
    id text NOT NULL,
    "buyerId" text NOT NULL,
    "auctionId" text NOT NULL,
    "workspaceId" text,
    amount double precision NOT NULL,
    status public."PaymentStatus" DEFAULT 'PENDING'::public."PaymentStatus" NOT NULL,
    "stripePaymentIntentId" text,
    "checkoutSessionId" text,
    "checkoutAttempt" integer DEFAULT 0 NOT NULL,
    refunded boolean DEFAULT false NOT NULL,
    "refundedAt" timestamp(3) without time zone,
    "refundReason" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."DepositRequest" (
    id text NOT NULL,
    "buyerId" text NOT NULL,
    "workspaceId" text,
    "dealId" text,
    amount double precision NOT NULL,
    notes text,
    "dueDate" timestamp(3) without time zone,
    status public."DepositRequestStatus" DEFAULT 'REQUESTED'::public."DepositRequestStatus" NOT NULL,
    "createdBy" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."DocumentRequest" (
    id text NOT NULL,
    "dealId" text NOT NULL,
    "buyerId" text NOT NULL,
    "workspaceId" text,
    "requestedByUserId" text NOT NULL,
    "requestedByRole" text NOT NULL,
    type text NOT NULL,
    required boolean DEFAULT true NOT NULL,
    notes text,
    "dueDate" timestamp(3) without time zone,
    status public."DocumentRequestStatus" DEFAULT 'REQUESTED'::public."DocumentRequestStatus" NOT NULL,
    "decidedByUserId" text,
    "decidedByRole" text,
    "decisionNotes" text,
    "decidedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."ESignEnvelope" (
    id text NOT NULL,
    "dealId" text NOT NULL,
    "workspaceId" text,
    "providerId" text,
    "providerEnvelopeId" text,
    status public."ESignStatus" DEFAULT 'CREATED'::public."ESignStatus" NOT NULL,
    "documentsUrl" text[],
    "signUrl" text,
    "sentAt" timestamp(3) without time zone,
    "viewedAt" timestamp(3) without time zone,
    "signedAt" timestamp(3) without time zone,
    "completedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."EmailSendLog" (
    id text NOT NULL,
    "idempotencyKey" text NOT NULL,
    "emailType" text NOT NULL,
    recipient text NOT NULL,
    subject text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    "resendMessageId" text,
    "userId" text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

-- email_log: SQL-only email tracking table (used by scripts/100-sync-schema-all-pending.sql)
CREATE TABLE public.email_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resend_id character varying(255),
    user_id text,
    email_type character varying(100) NOT NULL,
    recipient_email character varying(255) NOT NULL,
    recipient_name character varying(255),
    subject text NOT NULL,
    status character varying(50) DEFAULT 'sent'::character varying NOT NULL,
    error_message text,
    metadata jsonb,
    sent_at timestamp with time zone DEFAULT now() NOT NULL,
    delivered_at timestamp with time zone,
    opened_at timestamp with time zone,
    clicked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_email_log_user_id ON public.email_log(user_id);
CREATE INDEX IF NOT EXISTS idx_email_log_recipient_email ON public.email_log(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_log_email_type ON public.email_log(email_type);
CREATE INDEX IF NOT EXISTS idx_email_log_status ON public.email_log(status);
CREATE INDEX IF NOT EXISTS idx_email_log_resend_id ON public.email_log(resend_id);
CREATE INDEX IF NOT EXISTS idx_email_log_sent_at ON public.email_log(sent_at DESC);

ALTER TABLE ONLY public.email_log
    ADD CONSTRAINT email_log_pkey PRIMARY KEY (id);

CREATE TABLE public."ExternalPreApproval" (
    id text NOT NULL,
    "buyerId" text NOT NULL,
    "workspaceId" text,
    "lenderName" text NOT NULL,
    "approvedAmount" double precision NOT NULL,
    apr double precision,
    "termMonths" integer,
    "documentUrl" text,
    "documentFileName" text,
    "documentFileSize" integer,
    "documentMimeType" text,
    status public."ExternalPreApprovalStatus" DEFAULT 'SUBMITTED'::public."ExternalPreApprovalStatus" NOT NULL,
    "reviewedBy" text,
    "reviewedAt" timestamp(3) without time zone,
    "rejectionReason" text,
    "adminNotes" text,
    "expiresAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."ExternalPreApprovalSubmission" (
    id text NOT NULL,
    "buyerId" text NOT NULL,
    "workspaceId" text,
    "lenderName" text NOT NULL,
    "approvedAmount" double precision NOT NULL,
    "maxOtdAmountCents" integer,
    apr double precision,
    "aprBps" integer,
    "termMonths" integer,
    "minMonthlyPaymentCents" integer,
    "maxMonthlyPaymentCents" integer,
    "dtiRatioBps" integer,
    "expiresAt" timestamp(3) without time zone,
    "submissionNotes" text,
    "storageBucket" text,
    "documentStoragePath" text,
    "originalFileName" text,
    "fileSizeBytes" integer,
    "mimeType" text,
    sha256 text,
    status public."ExternalPreApprovalStatus" DEFAULT 'SUBMITTED'::public."ExternalPreApprovalStatus" NOT NULL,
    "reviewedBy" text,
    "reviewedAt" timestamp(3) without time zone,
    "decisionAt" timestamp(3) without time zone,
    "reviewNotes" text,
    "rejectionReason" text,
    "rejectionReasonCode" text,
    "supersededById" text,
    "preQualificationId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."FeeFinancingDisclosure" (
    id text NOT NULL,
    "feePaymentId" text NOT NULL,
    "feeAmount" double precision NOT NULL,
    apr double precision NOT NULL,
    "termMonths" integer NOT NULL,
    "monthlyIncrease" double precision NOT NULL,
    "totalExtraCost" double precision NOT NULL,
    "consentGiven" boolean DEFAULT false NOT NULL,
    "consentTimestamp" timestamp(3) without time zone,
    "ipAddress" text,
    "userAgent" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."FinancialAuditLog" (
    id text NOT NULL,
    "adminId" text NOT NULL,
    action text NOT NULL,
    "entityType" text NOT NULL,
    "entityId" text NOT NULL,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "workspaceId" text
);

CREATE TABLE public."FinancingOffer" (
    id text NOT NULL,
    "dealId" text NOT NULL,
    "workspaceId" text,
    "lenderName" text NOT NULL,
    apr double precision NOT NULL,
    "termMonths" integer NOT NULL,
    "downPayment" double precision NOT NULL,
    "monthlyPayment" double precision NOT NULL,
    "totalFinanced" double precision NOT NULL,
    approved boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."FixListItem" (
    id text NOT NULL,
    "scanId" text NOT NULL,
    category text NOT NULL,
    description text NOT NULL,
    severity text NOT NULL,
    "expectedFix" text NOT NULL,
    resolved boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."ForwardingAuthorization" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "buyerId" text NOT NULL,
    "workspaceId" text,
    "preQualificationId" text NOT NULL,
    "authorizedRecipientType" text NOT NULL,
    "authorizedRecipientId" text,
    "consentText" text NOT NULL,
    "consentGiven" boolean DEFAULT true NOT NULL,
    "capturedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "ipAddress" text,
    "userAgent" text,
    "revokedAt" timestamp(3) without time zone,
    "revokedReason" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."FundedLoan" (
    id text NOT NULL,
    "leadId" text NOT NULL,
    partner text DEFAULT 'OpenRoad'::text NOT NULL,
    "fundedAt" timestamp(3) without time zone NOT NULL,
    "fundedAmount" double precision NOT NULL,
    "commissionAmount" double precision NOT NULL,
    "rawPartnerReference" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."IdentityReleaseEvent" (
    id text NOT NULL,
    "workspaceId" text,
    "dealId" text NOT NULL,
    "buyerId" text,
    "dealerId" text,
    "previousState" public."IdentityState" NOT NULL,
    "newState" public."IdentityState" NOT NULL,
    reason text,
    "triggeredBy" text,
    "releasedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."InsuranceDocRequest" (
    id text NOT NULL,
    "dealId" text NOT NULL,
    "buyerId" text NOT NULL,
    "requestedByRole" text NOT NULL,
    "requestedByUserId" text NOT NULL,
    type text NOT NULL,
    "workspaceId" text,
    status text DEFAULT 'REQUESTED'::text NOT NULL,
    "dueDate" timestamp(3) without time zone,
    notes text,
    "documentUrl" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."InsurancePolicy" (
    id text NOT NULL,
    "dealId" text NOT NULL,
    "workspaceId" text,
    status public."InsuranceStatus" DEFAULT 'QUOTE_REQUESTED'::public."InsuranceStatus" NOT NULL,
    carrier text,
    "policyNumber" text,
    "coverageType" text,
    "monthlyPremium" double precision,
    "effectiveDate" timestamp(3) without time zone,
    "expirationDate" timestamp(3) without time zone,
    "documentUrl" text,
    type text,
    raw_policy_json jsonb,
    is_verified boolean DEFAULT false NOT NULL,
    vehicle_vin text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone
);

CREATE TABLE public."InsuranceQuote" (
    id text NOT NULL,
    "buyerId" text NOT NULL,
    "vehicleId" text NOT NULL,
    "workspaceId" text,
    carrier text NOT NULL,
    "coverageType" text NOT NULL,
    "monthlyPremium" double precision NOT NULL,
    "sixMonthPremium" double precision NOT NULL,
    "coverageLimits" jsonb NOT NULL,
    deductibles jsonb NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "productName" text,
    "coverageJson" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."InventoryDuplicateGroup" (
    id text NOT NULL,
    "workspaceId" text,
    vin text,
    status text DEFAULT 'pending'::text NOT NULL,
    "resolvedAt" timestamp(3) without time zone,
    "resolvedBy" text,
    resolution text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."InventoryDuplicateGroupMember" (
    id text NOT NULL,
    "groupId" text NOT NULL,
    "marketVehicleId" text,
    "verifiedVehicleId" text,
    "isPrimary" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."InventoryIntelligenceJob" (
    id text NOT NULL,
    "workspaceId" text,
    "jobType" public."JobType" NOT NULL,
    status public."JobStatus" DEFAULT 'PENDING'::public."JobStatus" NOT NULL,
    payload jsonb,
    result jsonb,
    "errorMessage" text,
    attempts integer DEFAULT 0 NOT NULL,
    "maxAttempts" integer DEFAULT 3 NOT NULL,
    "scheduledAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "startedAt" timestamp(3) without time zone,
    "completedAt" timestamp(3) without time zone,
    "deadLetteredAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."InventoryItem" (
    id text NOT NULL,
    "dealerId" text NOT NULL,
    "vehicleId" text NOT NULL,
    "workspaceId" text,
    price double precision NOT NULL,
    status text DEFAULT 'AVAILABLE'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."InventoryMarketVehicle" (
    id text NOT NULL,
    "workspaceId" text,
    "dealerSourceId" text,
    "prospectId" text,
    vin text,
    year integer NOT NULL,
    make text NOT NULL,
    model text NOT NULL,
    "trim" text,
    "bodyStyle" text,
    mileage integer,
    "priceCents" integer,
    "exteriorColor" text,
    "interiorColor" text,
    transmission text,
    "fuelType" text,
    drivetrain text,
    engine text,
    images text[],
    "stockNumber" text,
    "dealerName" text,
    "dealerZip" text,
    "dealerState" text,
    "listingUrl" text,
    status public."MarketVehicleStatus" DEFAULT 'ACTIVE'::public."MarketVehicleStatus" NOT NULL,
    confidence double precision DEFAULT 0.5 NOT NULL,
    "firstSeenAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastSeenAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "staleAfter" timestamp(3) without time zone,
    "promotedToVerifiedId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."InventoryPriceHistory" (
    id text NOT NULL,
    "marketVehicleId" text,
    "verifiedVehicleId" text,
    "priceCents" integer NOT NULL,
    "recordedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."InventoryRawSnapshot" (
    id text NOT NULL,
    "sourceId" text NOT NULL,
    "rawData" jsonb NOT NULL,
    "fetchedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "parsedAt" timestamp(3) without time zone,
    "parseError" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."InventorySourceError" (
    id text NOT NULL,
    "sourceId" text NOT NULL,
    "errorType" text NOT NULL,
    "errorMessage" text NOT NULL,
    "rawPayload" jsonb,
    "occurredAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."InventoryVehicleSighting" (
    id text NOT NULL,
    "snapshotId" text NOT NULL,
    vin text,
    year integer,
    make text,
    model text,
    "trim" text,
    mileage integer,
    "priceCents" integer,
    "exteriorColor" text,
    "bodyStyle" text,
    "stockNumber" text,
    "rawJson" jsonb,
    "firstSeenAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastSeenAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."InventoryVerifiedVehicle" (
    id text NOT NULL,
    "workspaceId" text,
    "dealerId" text NOT NULL,
    "vehicleId" text,
    "inventoryItemId" text,
    vin text NOT NULL,
    year integer NOT NULL,
    make text NOT NULL,
    model text NOT NULL,
    "trim" text,
    "bodyStyle" text,
    mileage integer,
    "priceCents" integer,
    "exteriorColor" text,
    "interiorColor" text,
    transmission text,
    "fuelType" text,
    drivetrain text,
    engine text,
    images text[],
    "stockNumber" text,
    location text,
    description text,
    status public."VerifiedVehicleStatus" DEFAULT 'AVAILABLE'::public."VerifiedVehicleStatus" NOT NULL,
    "promotedFromMarketVehicleId" text,
    "promotedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."LenderFeeDisbursement" (
    id text NOT NULL,
    "feePaymentId" text NOT NULL,
    "lenderName" text NOT NULL,
    "disbursementAmount" double precision NOT NULL,
    status public."LenderDisbursementStatus" DEFAULT 'PENDING'::public."LenderDisbursementStatus" NOT NULL,
    "requestedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "disbursedAt" timestamp(3) without time zone
);

CREATE TABLE public."MaskedPartyProfile" (
    id text NOT NULL,
    "workspaceId" text,
    "dealId" text,
    "buyerId" text,
    "dealerId" text,
    "prospectId" text,
    "partyType" text NOT NULL,
    "maskedId" text NOT NULL,
    "displayName" text,
    "readinessPayload" jsonb,
    "identityState" public."IdentityState" DEFAULT 'ANONYMOUS'::public."IdentityState" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."MessageRedactionEvent" (
    id text NOT NULL,
    "workspaceId" text,
    "messageId" text,
    "dealId" text,
    "senderId" text,
    "recipientId" text,
    "originalContent" text,
    "redactedContent" text,
    "redactionType" text NOT NULL,
    "patternsFound" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."PaymentMethod" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "workspaceId" text,
    "stripePaymentMethodId" text NOT NULL,
    type text NOT NULL,
    last4 text,
    brand text,
    "isDefault" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."PaymentProviderEvent" (
    id text NOT NULL,
    provider text NOT NULL,
    "eventType" text NOT NULL,
    "eventId" text NOT NULL,
    "paymentIntentId" text,
    payload jsonb NOT NULL,
    processed boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."Payout" (
    id text NOT NULL,
    "affiliateId" text NOT NULL,
    "workspaceId" text,
    amount double precision NOT NULL,
    status public."PayoutStatus" DEFAULT 'PENDING'::public."PayoutStatus" NOT NULL,
    "paymentMethod" text,
    "paymentId" text,
    "paidAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."PermissiblePurposeLog" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "sessionId" text,
    "prequalificationId" text,
    "permissiblePurpose" text NOT NULL,
    purpose text,
    "purposeDescription" text NOT NULL,
    "providerName" text NOT NULL,
    provider text,
    "inquiryType" text NOT NULL,
    "requestReference" text,
    "certifiedBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."PickupAppointment" (
    id text NOT NULL,
    "dealId" text NOT NULL,
    "buyerId" text NOT NULL,
    "dealerId" text NOT NULL,
    "workspaceId" text,
    status public."PickupStatus" DEFAULT 'SCHEDULED'::public."PickupStatus" NOT NULL,
    "scheduledDate" timestamp(3) without time zone NOT NULL,
    "scheduledTime" text NOT NULL,
    "qrCode" text NOT NULL,
    "arrivedAt" timestamp(3) without time zone,
    "completedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."PreQualProviderEvent" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "preQualificationId" text,
    "workspaceId" text,
    "providerName" text NOT NULL,
    "requestPayload" jsonb NOT NULL,
    "responsePayload" jsonb,
    status text NOT NULL,
    "errorMessage" text,
    "durationMs" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."PreQualification" (
    id text NOT NULL,
    "buyerId" text NOT NULL,
    "workspaceId" text,
    status text,
    "creditScore" integer,
    "creditTier" public."CreditTier" NOT NULL,
    "maxOtd" double precision NOT NULL,
    "estimatedMonthlyMin" double precision NOT NULL,
    "estimatedMonthlyMax" double precision NOT NULL,
    "maxOtdAmountCents" integer,
    "minMonthlyPaymentCents" integer,
    "maxMonthlyPaymentCents" integer,
    dti double precision,
    "dtiRatio" double precision,
    "softPullCompleted" boolean DEFAULT false NOT NULL,
    "softPullDate" timestamp(3) without time zone,
    "consentGiven" boolean DEFAULT false NOT NULL,
    "consentDate" timestamp(3) without time zone,
    source public."PreQualSource" DEFAULT 'INTERNAL'::public."PreQualSource" NOT NULL,
    "externalSubmissionId" text,
    "providerName" text,
    "providerReferenceId" text,
    "rawResponseJson" jsonb,
    "consentArtifactId" text,
    "consumerAuthorizationArtifactId" text,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."PrequalConsentArtifact" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "consentVersionId" text NOT NULL,
    "consentText" text NOT NULL,
    "renderedText" text,
    "htmlHash" text,
    "consentGiven" boolean NOT NULL,
    "consentDate" timestamp(3) without time zone NOT NULL,
    "captureMethod" public."ConsentCaptureMethod" DEFAULT 'WEB'::public."ConsentCaptureMethod",
    "acceptedAt" timestamp(3) without time zone,
    "ipAddress" text,
    "userAgent" text,
    "fingerprintHash" text,
    "sessionId" text,
    "reproducibleStorageUrl" text,
    "retentionLocked" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."PrequalConsentVersion" (
    id text NOT NULL,
    version text NOT NULL,
    "bodyText" text NOT NULL,
    "consentText" text,
    "htmlHash" text,
    active boolean DEFAULT false NOT NULL,
    "effectiveAt" timestamp(3) without time zone NOT NULL,
    "retiredAt" timestamp(3) without time zone,
    "createdBy" text,
    "approvedAt" timestamp(3) without time zone,
    "approvedBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."PrequalOfferSnapshot" (
    id text NOT NULL,
    "preQualificationId" text NOT NULL,
    "offerJson" jsonb NOT NULL,
    "presentedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."PrequalProviderEvent" (
    id text NOT NULL,
    "sessionId" text NOT NULL,
    "userId" text NOT NULL,
    "prequalificationId" text,
    "providerName" text NOT NULL,
    "eventType" text NOT NULL,
    "requestPayload" jsonb,
    "responsePayload" jsonb,
    "requestPayloadJson" jsonb,
    "responsePayloadJson" jsonb,
    "responseStatus" text NOT NULL,
    "errorMessage" text,
    "errorCode" text,
    "latencyMs" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."PrequalSession" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "workspaceId" text,
    status text DEFAULT 'INITIATED'::text NOT NULL,
    "sourceType" text DEFAULT 'INTERNAL'::text NOT NULL,
    "prequalificationId" text,
    "consentArtifactId" text,
    "forwardingAuthorizationId" text,
    "ipAddress" text,
    "userAgent" text,
    "startedAt" timestamp(3) without time zone,
    "providerRequestedAt" timestamp(3) without time zone,
    "providerRespondedAt" timestamp(3) without time zone,
    "expiresAt" timestamp(3) without time zone,
    "completedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."Referral" (
    id text NOT NULL,
    "affiliateId" text NOT NULL,
    "referredUserId" text,
    "referredBuyerId" text,
    "workspaceId" text,
    level integer DEFAULT 1 NOT NULL,
    "dealCompleted" boolean DEFAULT false NOT NULL,
    "dealId" text,
    "commissionPaid" boolean DEFAULT false NOT NULL,
    ref_code text,
    source_url text,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    utm_term text,
    utm_content text,
    attributed_at timestamp(3) without time zone,
    status text DEFAULT 'pending'::text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."RefinanceLead" (
    id text NOT NULL,
    "leadType" text DEFAULT 'refinance'::text NOT NULL,
    partner text DEFAULT 'OpenRoad'::text NOT NULL,
    "workspaceId" text,
    "firstName" text NOT NULL,
    "lastName" text NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    state text NOT NULL,
    "tcpaConsent" boolean DEFAULT false NOT NULL,
    "vehicleYear" integer NOT NULL,
    "vehicleMake" text NOT NULL,
    "vehicleModel" text NOT NULL,
    mileage integer NOT NULL,
    "vehicleCondition" public."VehicleCondition" NOT NULL,
    "loanBalance" double precision NOT NULL,
    "currentMonthlyPayment" double precision NOT NULL,
    "monthlyIncome" double precision NOT NULL,
    "qualificationStatus" public."RefinanceQualificationStatus" DEFAULT 'PENDING'::public."RefinanceQualificationStatus" NOT NULL,
    "qualificationReasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "redirectedToPartnerAt" timestamp(3) without time zone,
    "openroadFunded" boolean DEFAULT false NOT NULL,
    "fundedAt" timestamp(3) without time zone,
    "fundedAmount" double precision,
    "commissionAmount" double precision,
    "marketingRestriction" public."MarketingRestriction" DEFAULT 'NONE'::public."MarketingRestriction" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."Refund" (
    id text NOT NULL,
    "buyerId" text NOT NULL,
    "workspaceId" text,
    "relatedPaymentId" text,
    "relatedPaymentType" text,
    amount double precision NOT NULL,
    reason text,
    status public."RefundStatus" DEFAULT 'PENDING'::public."RefundStatus" NOT NULL,
    "createdBy" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."SelectedDeal" (
    id text NOT NULL,
    "buyerId" text NOT NULL,
    "auctionId" text,
    "offerId" text,
    "inventoryItemId" text,
    "dealerId" text NOT NULL,
    "sourcingCaseId" text,
    "sourcedOfferId" text,
    "workspaceId" text,
    status public."DealStatus" DEFAULT 'SELECTED'::public."DealStatus" NOT NULL,
    "cashOtd" double precision NOT NULL,
    "taxAmount" double precision NOT NULL,
    "feesBreakdown" jsonb NOT NULL,
    insurance_status text,
    user_id text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."ServiceFeePayment" (
    id text NOT NULL,
    "dealId" text NOT NULL,
    "workspaceId" text,
    "baseFee" double precision NOT NULL,
    "depositCredit" double precision DEFAULT 0 NOT NULL,
    "finalAmount" double precision NOT NULL,
    "paymentMethod" public."FeePaymentMethod",
    status public."PaymentStatus" DEFAULT 'PENDING'::public."PaymentStatus" NOT NULL,
    "stripePaymentIntentId" text,
    "checkoutSessionId" text,
    "checkoutAttempt" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."Shortlist" (
    id text NOT NULL,
    "buyerId" text NOT NULL,
    "workspaceId" text,
    name text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."ShortlistItem" (
    id text NOT NULL,
    "shortlistId" text NOT NULL,
    "inventoryItemId" text NOT NULL,
    "addedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."SourcedOffer" (
    id text NOT NULL,
    "workspaceId" text,
    "caseId" text NOT NULL,
    "buyerId" text NOT NULL,
    "dealerId" text,
    "sourceDealerName" text,
    "sourceDealerEmail" text,
    "sourceDealerPhone" text,
    "sourceType" public."OfferSourceType" DEFAULT 'ADMIN_ENTERED'::public."OfferSourceType" NOT NULL,
    vin text,
    year integer,
    make text,
    "modelName" text,
    "trim" text,
    mileage integer,
    condition public."RequestCondition",
    "pricingBreakdownJson" jsonb,
    "paymentTermsJson" jsonb,
    "expiresAt" timestamp(3) without time zone,
    status public."SourcedOfferStatus" DEFAULT 'DRAFT'::public."SourcedOfferStatus" NOT NULL,
    "presentedToBuyerAt" timestamp(3) without time zone,
    "acceptedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."SourcingOutreachLog" (
    id text NOT NULL,
    "caseId" text NOT NULL,
    "adminUserId" text NOT NULL,
    "dealerName" text NOT NULL,
    "contactMethod" text NOT NULL,
    outcome text NOT NULL,
    "occurredAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."TradeIn" (
    id text NOT NULL,
    "buyerId" text NOT NULL,
    "shortlistId" text,
    "auctionId" text,
    "selectedDealId" text,
    "workspaceId" text,
    "hasTrade" boolean DEFAULT false NOT NULL,
    vin text,
    year integer,
    make text,
    model text,
    "trim" text,
    mileage integer,
    condition text,
    "photoUrls" text[],
    "hasLoan" boolean,
    "lenderName" text,
    "estimatedPayoffCents" integer,
    "estimatedValueCents" integer,
    "kbbValueCents" integer,
    "stepCompleted" boolean DEFAULT false NOT NULL,
    "completedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."Transaction" (
    id text NOT NULL,
    "stripePaymentIntentId" text,
    "stripeChargeId" text,
    "userId" text,
    "userType" text,
    "dealId" text,
    "refinanceId" text,
    type public."TransactionType" NOT NULL,
    "grossAmount" double precision NOT NULL,
    "stripeFee" double precision DEFAULT 0 NOT NULL,
    "platformFee" double precision DEFAULT 0 NOT NULL,
    "netAmount" double precision NOT NULL,
    currency text DEFAULT 'usd'::text NOT NULL,
    status public."TransactionStatus" DEFAULT 'PENDING'::public."TransactionStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "workspaceId" text
);

CREATE TABLE public."User" (
    id text NOT NULL,
    email text NOT NULL,
    "passwordHash" text NOT NULL,
    role public."UserRole" NOT NULL,
    is_email_verified boolean DEFAULT false NOT NULL,
    first_name text,
    last_name text,
    mfa_enrolled boolean DEFAULT false NOT NULL,
    mfa_factor_id text,
    mfa_secret text,
    mfa_recovery_codes_hash text,
    force_password_reset boolean DEFAULT false NOT NULL,
    auth_user_id text,
    session_version integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "workspaceId" text
);

CREATE TABLE public."Vehicle" (
    id text NOT NULL,
    vin text NOT NULL,
    year integer NOT NULL,
    make text NOT NULL,
    model text NOT NULL,
    "trim" text,
    "bodyStyle" text NOT NULL,
    mileage integer NOT NULL,
    "exteriorColor" text,
    "interiorColor" text,
    transmission text,
    "fuelType" text,
    drivetrain text,
    engine text,
    "colorExterior" text,
    "colorInterior" text,
    images text[],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."VehicleRequestCase" (
    id text NOT NULL,
    "workspaceId" text,
    "buyerId" text NOT NULL,
    "marketZip" text NOT NULL,
    "radiusMiles" integer DEFAULT 50 NOT NULL,
    "buyerLocationJson" jsonb,
    "prequalSnapshotJson" jsonb,
    status public."BuyerCaseStatus" DEFAULT 'DRAFT'::public."BuyerCaseStatus" NOT NULL,
    "adminSubStatus" public."AdminSubStatus" DEFAULT 'NEW'::public."AdminSubStatus" NOT NULL,
    "assignedAdminUserId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "submittedAt" timestamp(3) without time zone,
    "firstAdminActionAt" timestamp(3) without time zone,
    "firstOfferAt" timestamp(3) without time zone,
    "buyerResponseAt" timestamp(3) without time zone,
    "closedAt" timestamp(3) without time zone,
    "lockedAt" timestamp(3) without time zone
);

CREATE TABLE public."VehicleRequestItem" (
    id text NOT NULL,
    "caseId" text NOT NULL,
    "vehicleType" public."VehicleType" NOT NULL,
    condition public."RequestCondition" NOT NULL,
    "yearMin" integer NOT NULL,
    "yearMax" integer NOT NULL,
    make text NOT NULL,
    model text,
    "openToSimilar" boolean DEFAULT false NOT NULL,
    "trim" text,
    "budgetType" public."BudgetType" NOT NULL,
    "budgetTargetCents" integer NOT NULL,
    "maxTotalOtdBudgetCents" integer,
    "maxMonthlyPaymentCents" integer,
    "desiredDownPaymentCents" integer,
    "mileageMax" integer,
    "mustHaveFeaturesJson" jsonb,
    "colorsJson" jsonb,
    "distancePreference" public."DistancePreference" DEFAULT 'EITHER'::public."DistancePreference" NOT NULL,
    "maxDistanceMiles" integer,
    timeline public."RequestTimeline" DEFAULT 'FIFTEEN_30_DAYS'::public."RequestTimeline" NOT NULL,
    vin text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."Workspace" (
    id text NOT NULL,
    name text NOT NULL,
    mode public."WorkspaceMode" DEFAULT 'LIVE'::public."WorkspaceMode" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdBy" text
);

CREATE TABLE public.admin_settings (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    key text NOT NULL,
    value jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.ai_contract_extractions (
    id text NOT NULL,
    contract_id text NOT NULL,
    extraction_type text NOT NULL,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    disclaimer text DEFAULT 'This analysis is for informational purposes only and does not constitute legal advice.'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.ai_leads (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    source text DEFAULT 'chat_widget'::text NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.ai_seo_drafts (
    id text NOT NULL,
    draft_type text NOT NULL,
    route text NOT NULL,
    content text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.contact_messages (
    id text NOT NULL,
    name text,
    first_name text,
    last_name text,
    email text NOT NULL,
    phone text,
    subject text,
    message text NOT NULL,
    status text DEFAULT 'new'::text,
    marketing_consent boolean DEFAULT false,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);

CREATE TABLE public.identity_trust_records (
    id text NOT NULL,
    "entityId" text NOT NULL,
    "entityType" text NOT NULL,
    status public."IdentityTrustStatusEnum" DEFAULT 'UNVERIFIED'::public."IdentityTrustStatusEnum" NOT NULL,
    "verificationSource" text,
    "verifiedAt" timestamp(3) without time zone,
    "verifierId" text,
    "trustFlags" text[],
    "riskFlags" text[],
    "manualReviewRequired" boolean DEFAULT false NOT NULL,
    "kycStatus" text,
    "kybStatus" text,
    "lastAssessedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public.insurance_events (
    id text NOT NULL,
    selected_deal_id text NOT NULL,
    user_id text NOT NULL,
    type text NOT NULL,
    provider_name text NOT NULL,
    details jsonb NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public.password_reset_tokens (
    id text NOT NULL,
    user_id text NOT NULL,
    token text NOT NULL,
    expires_at timestamp(3) without time zone NOT NULL,
    used_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public.platform_decisions (
    id text NOT NULL,
    "workspaceId" text,
    "entityType" text NOT NULL,
    "entityId" text NOT NULL,
    "correlationId" text NOT NULL,
    "actorId" text,
    "actorType" text,
    "inputBasis" jsonb NOT NULL,
    "outputResult" jsonb NOT NULL,
    "reasonCodes" text[],
    "resolvedAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public.platform_events (
    id text NOT NULL,
    "eventType" text NOT NULL,
    "eventVersion" integer DEFAULT 1 NOT NULL,
    "entityType" text NOT NULL,
    "entityId" text NOT NULL,
    "parentEntityId" text,
    "workspaceId" text,
    "actorId" text NOT NULL,
    "actorType" text NOT NULL,
    "sourceModule" text NOT NULL,
    "correlationId" text NOT NULL,
    "idempotencyKey" text,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    "processingStatus" text DEFAULT 'RECORDED'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public.schema_migrations (
    id integer NOT NULL,
    version character varying(255) NOT NULL,
    applied_at timestamp with time zone DEFAULT now() NOT NULL,
    description text
);

CREATE SEQUENCE public.schema_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.schema_migrations_id_seq OWNED BY public.schema_migrations.id;

CREATE TABLE public.seo_health (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    page_key text NOT NULL,
    score integer DEFAULT 0,
    issues_json jsonb DEFAULT '[]'::jsonb,
    last_scan_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now()
);

CREATE TABLE public.seo_keywords (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    page_key text NOT NULL,
    primary_keyword text,
    secondary_keywords jsonb DEFAULT '[]'::jsonb,
    target_density numeric DEFAULT 2.5,
    actual_density numeric DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

CREATE TABLE public.seo_pages (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    page_key text NOT NULL,
    title text,
    description text,
    keywords text,
    canonical_url text,
    og_title text,
    og_description text,
    og_image_url text,
    robots_rule text DEFAULT 'index, follow'::text,
    indexable boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

CREATE TABLE public.seo_schema (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    page_key text NOT NULL,
    schema_type text NOT NULL,
    schema_json jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

CREATE TABLE public.trusted_documents (
    id text NOT NULL,
    "ownerEntityId" text NOT NULL,
    "ownerEntityType" text NOT NULL,
    "documentType" text NOT NULL,
    "storageSource" text NOT NULL,
    "storageReference" text NOT NULL,
    "uploadTimestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "uploaderId" text NOT NULL,
    "fileHash" text NOT NULL,
    "versionNumber" integer DEFAULT 1 NOT NULL,
    status public."DocumentTrustStatusEnum" DEFAULT 'UPLOADED'::public."DocumentTrustStatusEnum" NOT NULL,
    "verificationMetadata" jsonb,
    "verifierId" text,
    "verifiedAt" timestamp(3) without time zone,
    "supersededById" text,
    "revocationReason" text,
    "revokedAt" timestamp(3) without time zone,
    "revokedById" text,
    "activeForDecision" boolean DEFAULT true NOT NULL,
    "accessScope" text DEFAULT 'DEAL_PARTIES'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

ALTER TABLE ONLY public.schema_migrations ALTER COLUMN id SET DEFAULT nextval('public.schema_migrations_id_seq'::regclass);


-- ============================================================
-- Section 4: Indexes
-- ============================================================

CREATE INDEX "AdminAuditLog_action_idx" ON public."AdminAuditLog" USING btree (action);

CREATE INDEX "AdminAuditLog_createdAt_idx" ON public."AdminAuditLog" USING btree ("createdAt");

CREATE INDEX "AdminAuditLog_userId_idx" ON public."AdminAuditLog" USING btree ("userId");

CREATE INDEX "AdminLoginAttempt_identifier_idx" ON public."AdminLoginAttempt" USING btree (identifier);

CREATE INDEX "AdminNotification_dedupeKey_idx" ON public."AdminNotification" USING btree ("dedupeKey");

CREATE INDEX "AdminNotification_workspaceId_isArchived_idx" ON public."AdminNotification" USING btree ("workspaceId", "isArchived");

CREATE INDEX "AdminNotification_workspaceId_isRead_createdAt_idx" ON public."AdminNotification" USING btree ("workspaceId", "isRead", "createdAt" DESC);

CREATE INDEX "AdminNotification_workspaceId_priority_createdAt_idx" ON public."AdminNotification" USING btree ("workspaceId", priority, "createdAt" DESC);

CREATE INDEX "AdminSession_expiresAt_idx" ON public."AdminSession" USING btree ("expiresAt");

CREATE INDEX "AdminSession_userId_idx" ON public."AdminSession" USING btree ("userId");

CREATE INDEX "AdminSetting_key_idx" ON public."AdminSetting" USING btree (key);

CREATE UNIQUE INDEX "AdminSetting_key_key" ON public."AdminSetting" USING btree (key);

CREATE UNIQUE INDEX "AdminUser_userId_key" ON public."AdminUser" USING btree ("userId");

CREATE INDEX "AdminUser_workspaceId_idx" ON public."AdminUser" USING btree ("workspaceId");

CREATE INDEX "AffiliateDocument_affiliateId_idx" ON public."AffiliateDocument" USING btree ("affiliateId");

CREATE INDEX "AffiliateDocument_type_idx" ON public."AffiliateDocument" USING btree (type);

CREATE INDEX "AffiliateDocument_workspaceId_idx" ON public."AffiliateDocument" USING btree ("workspaceId");

CREATE INDEX "AffiliateShareEvent_affiliateId_idx" ON public."AffiliateShareEvent" USING btree ("affiliateId");

CREATE INDEX "AffiliateShareEvent_sentAt_idx" ON public."AffiliateShareEvent" USING btree ("sentAt");

CREATE INDEX "AffiliateShareEvent_workspaceId_idx" ON public."AffiliateShareEvent" USING btree ("workspaceId");

CREATE INDEX "Affiliate_referralCode_idx" ON public."Affiliate" USING btree ("referralCode");

CREATE UNIQUE INDEX "Affiliate_referralCode_key" ON public."Affiliate" USING btree ("referralCode");

CREATE UNIQUE INDEX "Affiliate_userId_key" ON public."Affiliate" USING btree ("userId");

CREATE INDEX "Affiliate_workspaceId_idx" ON public."Affiliate" USING btree ("workspaceId");

CREATE INDEX "AiAdminAction_adminId_idx" ON public."AiAdminAction" USING btree ("adminId");

CREATE INDEX "AiAdminAction_createdAt_idx" ON public."AiAdminAction" USING btree ("createdAt");

CREATE INDEX "AiAdminAction_workspaceId_idx" ON public."AiAdminAction" USING btree ("workspaceId");

CREATE INDEX "AiContractExtraction_createdAt_idx" ON public."AiContractExtraction" USING btree ("createdAt");

CREATE INDEX "AiContractExtraction_dealId_idx" ON public."AiContractExtraction" USING btree ("dealId");

CREATE INDEX "AiContractExtraction_documentId_idx" ON public."AiContractExtraction" USING btree ("documentId");

CREATE INDEX "AiConversation_createdAt_idx" ON public."AiConversation" USING btree ("createdAt");

CREATE INDEX "AiConversation_userId_idx" ON public."AiConversation" USING btree ("userId");

CREATE INDEX "AiConversation_workspaceId_idx" ON public."AiConversation" USING btree ("workspaceId");

CREATE INDEX "AiLead_createdAt_idx" ON public."AiLead" USING btree ("createdAt");

CREATE INDEX "AiLead_email_idx" ON public."AiLead" USING btree (email);

CREATE INDEX "AiMessage_conversationId_idx" ON public."AiMessage" USING btree ("conversationId");

CREATE INDEX "AiMessage_createdAt_idx" ON public."AiMessage" USING btree ("createdAt");

CREATE INDEX "AiSeoDraft_createdAt_idx" ON public."AiSeoDraft" USING btree ("createdAt");

CREATE INDEX "AiSeoDraft_status_idx" ON public."AiSeoDraft" USING btree (status);

CREATE INDEX "AiToolCall_conversationId_idx" ON public."AiToolCall" USING btree ("conversationId");

CREATE INDEX "AiToolCall_createdAt_idx" ON public."AiToolCall" USING btree ("createdAt");

CREATE INDEX "AiToolCall_toolName_idx" ON public."AiToolCall" USING btree ("toolName");

CREATE INDEX "AuctionOfferFinancingOption_offerId_idx" ON public."AuctionOfferFinancingOption" USING btree ("offerId");

CREATE INDEX "AuctionOffer_auctionId_idx" ON public."AuctionOffer" USING btree ("auctionId");

CREATE INDEX "AuctionOffer_inventoryItemId_idx" ON public."AuctionOffer" USING btree ("inventoryItemId");

CREATE INDEX "AuctionOffer_workspaceId_idx" ON public."AuctionOffer" USING btree ("workspaceId");

CREATE UNIQUE INDEX "AuctionParticipant_auctionId_dealerId_key" ON public."AuctionParticipant" USING btree ("auctionId", "dealerId");

CREATE INDEX "AuctionParticipant_auctionId_idx" ON public."AuctionParticipant" USING btree ("auctionId");

CREATE INDEX "AuctionParticipant_dealerId_idx" ON public."AuctionParticipant" USING btree ("dealerId");

CREATE INDEX "AuctionParticipant_workspaceId_idx" ON public."AuctionParticipant" USING btree ("workspaceId");

CREATE INDEX "Auction_buyerId_idx" ON public."Auction" USING btree ("buyerId");

CREATE INDEX "Auction_status_idx" ON public."Auction" USING btree (status);

CREATE INDEX "Auction_workspaceId_idx" ON public."Auction" USING btree ("workspaceId");

CREATE INDEX "BestPriceOption_auctionId_idx" ON public."BestPriceOption" USING btree ("auctionId");

CREATE INDEX "BestPriceOption_type_idx" ON public."BestPriceOption" USING btree (type);

CREATE INDEX "BestPriceOption_workspaceId_idx" ON public."BestPriceOption" USING btree ("workspaceId");

CREATE UNIQUE INDEX "BuyerPreferences_buyerId_key" ON public."BuyerPreferences" USING btree ("buyerId");

CREATE INDEX "BuyerPreferences_workspaceId_idx" ON public."BuyerPreferences" USING btree ("workspaceId");

CREATE UNIQUE INDEX "BuyerProfile_userId_key" ON public."BuyerProfile" USING btree ("userId");

CREATE INDEX "BuyerProfile_workspaceId_idx" ON public."BuyerProfile" USING btree ("workspaceId");

CREATE INDEX "BuyerRequestInventoryMatch_buyerRequestId_idx" ON public."BuyerRequestInventoryMatch" USING btree ("buyerRequestId");

CREATE INDEX "BuyerRequestInventoryMatch_marketVehicleId_idx" ON public."BuyerRequestInventoryMatch" USING btree ("marketVehicleId");

CREATE INDEX "BuyerRequestInventoryMatch_status_idx" ON public."BuyerRequestInventoryMatch" USING btree (status);

CREATE INDEX "BuyerRequestInventoryMatch_verifiedVehicleId_idx" ON public."BuyerRequestInventoryMatch" USING btree ("verifiedVehicleId");

CREATE INDEX "BuyerRequestInventoryMatch_workspaceId_idx" ON public."BuyerRequestInventoryMatch" USING btree ("workspaceId");

CREATE INDEX "CaseEventLog_actorUserId_idx" ON public."CaseEventLog" USING btree ("actorUserId");

CREATE INDEX "CaseEventLog_caseId_idx" ON public."CaseEventLog" USING btree ("caseId");

CREATE INDEX "CaseEventLog_createdAt_idx" ON public."CaseEventLog" USING btree ("createdAt");

CREATE INDEX "CaseNote_authorUserId_idx" ON public."CaseNote" USING btree ("authorUserId");

CREATE INDEX "CaseNote_caseId_idx" ON public."CaseNote" USING btree ("caseId");

CREATE INDEX "CaseNote_createdAt_idx" ON public."CaseNote" USING btree ("createdAt");

CREATE INDEX "Chargeback_stripeDisputeId_idx" ON public."Chargeback" USING btree ("stripeDisputeId");

CREATE INDEX "Chargeback_transactionId_idx" ON public."Chargeback" USING btree ("transactionId");

CREATE INDEX "Chargeback_workspaceId_idx" ON public."Chargeback" USING btree ("workspaceId");

CREATE INDEX "CircumventionAlert_createdAt_idx" ON public."CircumventionAlert" USING btree ("createdAt");

CREATE INDEX "CircumventionAlert_dealId_idx" ON public."CircumventionAlert" USING btree ("dealId");

CREATE INDEX "CircumventionAlert_severity_idx" ON public."CircumventionAlert" USING btree (severity);

CREATE INDEX "CircumventionAlert_status_idx" ON public."CircumventionAlert" USING btree (status);

CREATE INDEX "CircumventionAlert_workspaceId_idx" ON public."CircumventionAlert" USING btree ("workspaceId");

CREATE INDEX "Click_affiliateId_idx" ON public."Click" USING btree ("affiliateId");

CREATE INDEX "Click_clickedAt_idx" ON public."Click" USING btree ("clickedAt");

CREATE INDEX "Click_workspaceId_idx" ON public."Click" USING btree ("workspaceId");

CREATE INDEX "Commission_affiliateId_idx" ON public."Commission" USING btree ("affiliateId");

CREATE UNIQUE INDEX "Commission_serviceFeePaymentId_level_key" ON public."Commission" USING btree ("serviceFeePaymentId", level);

CREATE INDEX "Commission_status_idx" ON public."Commission" USING btree (status);

CREATE INDEX "Commission_workspaceId_idx" ON public."Commission" USING btree ("workspaceId");

CREATE INDEX "ComplianceEvent_createdAt_idx" ON public."ComplianceEvent" USING btree ("createdAt");

CREATE INDEX "ComplianceEvent_eventType_idx" ON public."ComplianceEvent" USING btree ("eventType");

CREATE INDEX "ComplianceEvent_userId_idx" ON public."ComplianceEvent" USING btree ("userId");

CREATE INDEX "ConciergeFeeRequest_buyerId_idx" ON public."ConciergeFeeRequest" USING btree ("buyerId");

CREATE INDEX "ConciergeFeeRequest_dealId_idx" ON public."ConciergeFeeRequest" USING btree ("dealId");

CREATE INDEX "ConciergeFeeRequest_status_idx" ON public."ConciergeFeeRequest" USING btree (status);

CREATE INDEX "ConciergeFeeRequest_workspaceId_idx" ON public."ConciergeFeeRequest" USING btree ("workspaceId");

CREATE INDEX "ConsentArtifact_buyerId_idx" ON public."ConsentArtifact" USING btree ("buyerId");

CREATE INDEX "ConsentArtifact_consentVersionId_idx" ON public."ConsentArtifact" USING btree ("consentVersionId");

CREATE INDEX "ConsentArtifact_preQualificationId_idx" ON public."ConsentArtifact" USING btree ("preQualificationId");

CREATE INDEX "ConsentArtifact_userId_idx" ON public."ConsentArtifact" USING btree ("userId");

CREATE INDEX "ConsentArtifact_workspaceId_idx" ON public."ConsentArtifact" USING btree ("workspaceId");

CREATE INDEX "ConsentVersion_effectiveAt_idx" ON public."ConsentVersion" USING btree ("effectiveAt");

CREATE INDEX "ConsentVersion_version_idx" ON public."ConsentVersion" USING btree (version);

CREATE UNIQUE INDEX "ConsentVersion_version_key" ON public."ConsentVersion" USING btree (version);

CREATE INDEX "ConsumerAuthorizationArtifact_authorizationType_idx" ON public."ConsumerAuthorizationArtifact" USING btree ("authorizationType");

CREATE INDEX "ConsumerAuthorizationArtifact_sessionId_idx" ON public."ConsumerAuthorizationArtifact" USING btree ("sessionId");

CREATE INDEX "ConsumerAuthorizationArtifact_userId_idx" ON public."ConsumerAuthorizationArtifact" USING btree ("userId");

CREATE INDEX "ContractDocument_dealId_idx" ON public."ContractDocument" USING btree ("dealId");

CREATE INDEX "ContractDocument_dealerId_idx" ON public."ContractDocument" USING btree ("dealerId");

CREATE INDEX "ContractDocument_workspaceId_idx" ON public."ContractDocument" USING btree ("workspaceId");

CREATE INDEX "ContractManualReview_contractDocumentId_idx" ON public."ContractManualReview" USING btree ("contractDocumentId");

CREATE INDEX "ContractManualReview_createdAt_idx" ON public."ContractManualReview" USING btree ("createdAt");

CREATE INDEX "ContractManualReview_dealId_idx" ON public."ContractManualReview" USING btree ("dealId");

CREATE INDEX "ContractManualReview_overriddenScanId_idx" ON public."ContractManualReview" USING btree ("overriddenScanId");

CREATE INDEX "ContractManualReview_status_idx" ON public."ContractManualReview" USING btree (status);

CREATE INDEX "ContractManualReview_workspaceId_idx" ON public."ContractManualReview" USING btree ("workspaceId");

CREATE INDEX "ContractShieldNotification_recipientId_idx" ON public."ContractShieldNotification" USING btree ("recipientId");

CREATE INDEX "ContractShieldNotification_scanId_idx" ON public."ContractShieldNotification" USING btree ("scanId");

CREATE INDEX "ContractShieldNotification_status_idx" ON public."ContractShieldNotification" USING btree (status);

CREATE INDEX "ContractShieldOverride_adminId_idx" ON public."ContractShieldOverride" USING btree ("adminId");

CREATE INDEX "ContractShieldOverride_scanId_idx" ON public."ContractShieldOverride" USING btree ("scanId");

CREATE INDEX "ContractShieldReconciliation_createdAt_idx" ON public."ContractShieldReconciliation" USING btree ("createdAt");

CREATE INDEX "ContractShieldReconciliation_jobType_idx" ON public."ContractShieldReconciliation" USING btree ("jobType");

CREATE INDEX "ContractShieldReconciliation_status_idx" ON public."ContractShieldReconciliation" USING btree (status);

CREATE INDEX "ContractShieldRule_ruleKey_idx" ON public."ContractShieldRule" USING btree ("ruleKey");

CREATE UNIQUE INDEX "ContractShieldRule_ruleKey_key" ON public."ContractShieldRule" USING btree ("ruleKey");

CREATE UNIQUE INDEX "ContractShieldScan_contractDocumentId_key" ON public."ContractShieldScan" USING btree ("contractDocumentId");

CREATE INDEX "ContractShieldScan_dealId_idx" ON public."ContractShieldScan" USING btree ("dealId");

CREATE UNIQUE INDEX "ContractShieldScan_dealId_key" ON public."ContractShieldScan" USING btree ("dealId");

CREATE INDEX "ContractShieldScan_dealerId_idx" ON public."ContractShieldScan" USING btree ("dealerId");

CREATE INDEX "ContractShieldScan_status_idx" ON public."ContractShieldScan" USING btree (status);

CREATE INDEX "ContractShieldScan_workspaceId_idx" ON public."ContractShieldScan" USING btree ("workspaceId");

CREATE INDEX "CoverageGapTask_buyerRequestId_idx" ON public."CoverageGapTask" USING btree ("buyerRequestId");

CREATE INDEX "CoverageGapTask_marketZip_idx" ON public."CoverageGapTask" USING btree ("marketZip");

CREATE INDEX "CoverageGapTask_status_idx" ON public."CoverageGapTask" USING btree (status);

CREATE INDEX "CoverageGapTask_workspaceId_idx" ON public."CoverageGapTask" USING btree ("workspaceId");

CREATE INDEX "DealDocument_dealId_idx" ON public."DealDocument" USING btree ("dealId");

CREATE INDEX "DealDocument_ownerUserId_idx" ON public."DealDocument" USING btree ("ownerUserId");

CREATE UNIQUE INDEX "DealDocument_requestId_key" ON public."DealDocument" USING btree ("requestId");

CREATE INDEX "DealDocument_status_idx" ON public."DealDocument" USING btree (status);

CREATE INDEX "DealDocument_workspaceId_idx" ON public."DealDocument" USING btree ("workspaceId");

CREATE INDEX "DealProtectionEvent_createdAt_idx" ON public."DealProtectionEvent" USING btree ("createdAt");

CREATE INDEX "DealProtectionEvent_dealId_idx" ON public."DealProtectionEvent" USING btree ("dealId");

CREATE INDEX "DealProtectionEvent_eventType_idx" ON public."DealProtectionEvent" USING btree ("eventType");

CREATE INDEX "DealProtectionEvent_workspaceId_idx" ON public."DealProtectionEvent" USING btree ("workspaceId");

CREATE INDEX "DealerCoverageGapSignal_buyerId_idx" ON public."DealerCoverageGapSignal" USING btree ("buyerId");

CREATE INDEX "DealerCoverageGapSignal_createdAt_idx" ON public."DealerCoverageGapSignal" USING btree ("createdAt");

CREATE INDEX "DealerCoverageGapSignal_marketZip_idx" ON public."DealerCoverageGapSignal" USING btree ("marketZip");

CREATE INDEX "DealerCoverageGapSignal_workspaceId_idx" ON public."DealerCoverageGapSignal" USING btree ("workspaceId");

CREATE INDEX "DealerIntelligenceInvite_buyerRequestId_idx" ON public."DealerIntelligenceInvite" USING btree ("buyerRequestId");

CREATE INDEX "DealerIntelligenceInvite_dealerId_idx" ON public."DealerIntelligenceInvite" USING btree ("dealerId");

CREATE INDEX "DealerIntelligenceInvite_prospectId_idx" ON public."DealerIntelligenceInvite" USING btree ("prospectId");

CREATE INDEX "DealerIntelligenceInvite_status_idx" ON public."DealerIntelligenceInvite" USING btree (status);

CREATE INDEX "DealerIntelligenceInvite_tokenHash_idx" ON public."DealerIntelligenceInvite" USING btree ("tokenHash");

CREATE UNIQUE INDEX "DealerIntelligenceInvite_tokenHash_key" ON public."DealerIntelligenceInvite" USING btree ("tokenHash");

CREATE INDEX "DealerIntelligenceInvite_workspaceId_idx" ON public."DealerIntelligenceInvite" USING btree ("workspaceId");

CREATE UNIQUE INDEX "DealerInvite_caseId_key" ON public."DealerInvite" USING btree ("caseId");

CREATE UNIQUE INDEX "DealerInvite_offerId_key" ON public."DealerInvite" USING btree ("offerId");

CREATE INDEX "DealerInvite_status_idx" ON public."DealerInvite" USING btree (status);

CREATE INDEX "DealerInvite_tokenHash_idx" ON public."DealerInvite" USING btree ("tokenHash");

CREATE UNIQUE INDEX "DealerInvite_tokenHash_key" ON public."DealerInvite" USING btree ("tokenHash");

CREATE INDEX "DealerLifecycleEvent_createdAt_idx" ON public."DealerLifecycleEvent" USING btree ("createdAt");

CREATE INDEX "DealerLifecycleEvent_dealerId_idx" ON public."DealerLifecycleEvent" USING btree ("dealerId");

CREATE INDEX "DealerLifecycleEvent_eventType_idx" ON public."DealerLifecycleEvent" USING btree ("eventType");

CREATE INDEX "DealerLifecycleEvent_prospectId_idx" ON public."DealerLifecycleEvent" USING btree ("prospectId");

CREATE INDEX "DealerLifecycleEvent_workspaceId_idx" ON public."DealerLifecycleEvent" USING btree ("workspaceId");

CREATE INDEX "DealerOnboardingConversion_dealerId_idx" ON public."DealerOnboardingConversion" USING btree ("dealerId");

CREATE INDEX "DealerOnboardingConversion_prospectId_idx" ON public."DealerOnboardingConversion" USING btree ("prospectId");

CREATE INDEX "DealerOnboardingConversion_status_idx" ON public."DealerOnboardingConversion" USING btree (status);

CREATE INDEX "DealerOnboardingConversion_workspaceId_idx" ON public."DealerOnboardingConversion" USING btree ("workspaceId");

CREATE INDEX "DealerProspect_businessName_idx" ON public."DealerProspect" USING btree ("businessName");

CREATE INDEX "DealerProspect_convertedDealerId_idx" ON public."DealerProspect" USING btree ("convertedDealerId");

CREATE INDEX "DealerProspect_status_idx" ON public."DealerProspect" USING btree (status);

CREATE INDEX "DealerProspect_workspaceId_idx" ON public."DealerProspect" USING btree ("workspaceId");

CREATE INDEX "DealerProspect_zip_idx" ON public."DealerProspect" USING btree (zip);

CREATE INDEX "DealerQuickOffer_inviteId_idx" ON public."DealerQuickOffer" USING btree ("inviteId");

CREATE INDEX "DealerQuickOffer_prospectId_idx" ON public."DealerQuickOffer" USING btree ("prospectId");

CREATE INDEX "DealerQuickOffer_status_idx" ON public."DealerQuickOffer" USING btree (status);

CREATE INDEX "DealerQuickOffer_workspaceId_idx" ON public."DealerQuickOffer" USING btree ("workspaceId");

CREATE INDEX "DealerSourceRun_createdAt_idx" ON public."DealerSourceRun" USING btree ("createdAt");

CREATE INDEX "DealerSourceRun_sourceId_idx" ON public."DealerSourceRun" USING btree ("sourceId");

CREATE INDEX "DealerSourceRun_status_idx" ON public."DealerSourceRun" USING btree (status);

CREATE INDEX "DealerSource_dealerId_idx" ON public."DealerSource" USING btree ("dealerId");

CREATE INDEX "DealerSource_prospectId_idx" ON public."DealerSource" USING btree ("prospectId");

CREATE INDEX "DealerSource_sourceType_idx" ON public."DealerSource" USING btree ("sourceType");

CREATE INDEX "DealerSource_status_idx" ON public."DealerSource" USING btree (status);

CREATE INDEX "DealerSource_workspaceId_idx" ON public."DealerSource" USING btree ("workspaceId");

CREATE INDEX "DealerUser_dealerId_idx" ON public."DealerUser" USING btree ("dealerId");

CREATE INDEX "DealerUser_userId_idx" ON public."DealerUser" USING btree ("userId");

CREATE UNIQUE INDEX "DealerUser_userId_key" ON public."DealerUser" USING btree ("userId");

CREATE INDEX "DealerUser_workspaceId_idx" ON public."DealerUser" USING btree ("workspaceId");

CREATE INDEX "Dealer_licenseNumber_idx" ON public."Dealer" USING btree ("licenseNumber");

CREATE UNIQUE INDEX "Dealer_licenseNumber_key" ON public."Dealer" USING btree ("licenseNumber");

CREATE UNIQUE INDEX "Dealer_userId_key" ON public."Dealer" USING btree ("userId");

CREATE INDEX "Dealer_workspaceId_idx" ON public."Dealer" USING btree ("workspaceId");

CREATE INDEX "DepositPayment_auctionId_idx" ON public."DepositPayment" USING btree ("auctionId");

CREATE INDEX "DepositPayment_buyerId_idx" ON public."DepositPayment" USING btree ("buyerId");

CREATE INDEX "DepositPayment_status_idx" ON public."DepositPayment" USING btree (status);

CREATE UNIQUE INDEX "DepositPayment_stripePaymentIntentId_key" ON public."DepositPayment" USING btree ("stripePaymentIntentId");

CREATE INDEX "DepositPayment_workspaceId_idx" ON public."DepositPayment" USING btree ("workspaceId");

CREATE INDEX "DepositRequest_buyerId_idx" ON public."DepositRequest" USING btree ("buyerId");

CREATE INDEX "DepositRequest_status_idx" ON public."DepositRequest" USING btree (status);

CREATE INDEX "DepositRequest_workspaceId_idx" ON public."DepositRequest" USING btree ("workspaceId");

CREATE INDEX "DocumentRequest_buyerId_idx" ON public."DocumentRequest" USING btree ("buyerId");

CREATE INDEX "DocumentRequest_dealId_idx" ON public."DocumentRequest" USING btree ("dealId");

CREATE INDEX "DocumentRequest_status_idx" ON public."DocumentRequest" USING btree (status);

CREATE INDEX "DocumentRequest_workspaceId_idx" ON public."DocumentRequest" USING btree ("workspaceId");

CREATE INDEX "ESignEnvelope_dealId_idx" ON public."ESignEnvelope" USING btree ("dealId");

CREATE UNIQUE INDEX "ESignEnvelope_dealId_key" ON public."ESignEnvelope" USING btree ("dealId");

CREATE INDEX "ESignEnvelope_status_idx" ON public."ESignEnvelope" USING btree (status);

CREATE INDEX "ESignEnvelope_workspaceId_idx" ON public."ESignEnvelope" USING btree ("workspaceId");

CREATE INDEX "EmailSendLog_emailType_idx" ON public."EmailSendLog" USING btree ("emailType");

CREATE INDEX "EmailSendLog_idempotencyKey_idx" ON public."EmailSendLog" USING btree ("idempotencyKey");

CREATE UNIQUE INDEX "EmailSendLog_idempotencyKey_key" ON public."EmailSendLog" USING btree ("idempotencyKey");

CREATE INDEX "EmailSendLog_userId_idx" ON public."EmailSendLog" USING btree ("userId");

CREATE INDEX "ExternalPreApprovalSubmission_buyerId_idx" ON public."ExternalPreApprovalSubmission" USING btree ("buyerId");

CREATE INDEX "ExternalPreApprovalSubmission_preQualificationId_idx" ON public."ExternalPreApprovalSubmission" USING btree ("preQualificationId");

CREATE INDEX "ExternalPreApprovalSubmission_status_idx" ON public."ExternalPreApprovalSubmission" USING btree (status);

CREATE INDEX "ExternalPreApprovalSubmission_workspaceId_idx" ON public."ExternalPreApprovalSubmission" USING btree ("workspaceId");

CREATE INDEX "ExternalPreApproval_buyerId_idx" ON public."ExternalPreApproval" USING btree ("buyerId");

CREATE INDEX "ExternalPreApproval_status_idx" ON public."ExternalPreApproval" USING btree (status);

CREATE INDEX "ExternalPreApproval_workspaceId_idx" ON public."ExternalPreApproval" USING btree ("workspaceId");

CREATE INDEX "FeeFinancingDisclosure_feePaymentId_idx" ON public."FeeFinancingDisclosure" USING btree ("feePaymentId");

CREATE UNIQUE INDEX "FeeFinancingDisclosure_feePaymentId_key" ON public."FeeFinancingDisclosure" USING btree ("feePaymentId");

CREATE INDEX "FinancialAuditLog_adminId_idx" ON public."FinancialAuditLog" USING btree ("adminId");

CREATE INDEX "FinancialAuditLog_createdAt_idx" ON public."FinancialAuditLog" USING btree ("createdAt");

CREATE INDEX "FinancialAuditLog_entityType_entityId_idx" ON public."FinancialAuditLog" USING btree ("entityType", "entityId");

CREATE INDEX "FinancialAuditLog_workspaceId_idx" ON public."FinancialAuditLog" USING btree ("workspaceId");

CREATE UNIQUE INDEX "FinancingOffer_dealId_key" ON public."FinancingOffer" USING btree ("dealId");

CREATE INDEX "FinancingOffer_workspaceId_idx" ON public."FinancingOffer" USING btree ("workspaceId");

CREATE INDEX "FixListItem_scanId_idx" ON public."FixListItem" USING btree ("scanId");

CREATE INDEX "ForwardingAuthorization_authorizedRecipientId_idx" ON public."ForwardingAuthorization" USING btree ("authorizedRecipientId");

CREATE INDEX "ForwardingAuthorization_buyerId_idx" ON public."ForwardingAuthorization" USING btree ("buyerId");

CREATE INDEX "ForwardingAuthorization_preQualificationId_idx" ON public."ForwardingAuthorization" USING btree ("preQualificationId");

CREATE INDEX "ForwardingAuthorization_userId_idx" ON public."ForwardingAuthorization" USING btree ("userId");

CREATE INDEX "ForwardingAuthorization_workspaceId_idx" ON public."ForwardingAuthorization" USING btree ("workspaceId");

CREATE INDEX "FundedLoan_fundedAt_idx" ON public."FundedLoan" USING btree ("fundedAt");

CREATE INDEX "FundedLoan_leadId_idx" ON public."FundedLoan" USING btree ("leadId");

CREATE UNIQUE INDEX "FundedLoan_leadId_key" ON public."FundedLoan" USING btree ("leadId");

CREATE INDEX "FundedLoan_partner_idx" ON public."FundedLoan" USING btree (partner);

CREATE INDEX "IdentityReleaseEvent_buyerId_idx" ON public."IdentityReleaseEvent" USING btree ("buyerId");

CREATE INDEX "IdentityReleaseEvent_dealId_idx" ON public."IdentityReleaseEvent" USING btree ("dealId");

CREATE INDEX "IdentityReleaseEvent_dealerId_idx" ON public."IdentityReleaseEvent" USING btree ("dealerId");

CREATE INDEX "IdentityReleaseEvent_releasedAt_idx" ON public."IdentityReleaseEvent" USING btree ("releasedAt");

CREATE INDEX "IdentityReleaseEvent_workspaceId_idx" ON public."IdentityReleaseEvent" USING btree ("workspaceId");

CREATE INDEX "InsuranceDocRequest_buyerId_idx" ON public."InsuranceDocRequest" USING btree ("buyerId");

CREATE INDEX "InsuranceDocRequest_dealId_idx" ON public."InsuranceDocRequest" USING btree ("dealId");

CREATE INDEX "InsuranceDocRequest_status_idx" ON public."InsuranceDocRequest" USING btree (status);

CREATE INDEX "InsuranceDocRequest_workspaceId_idx" ON public."InsuranceDocRequest" USING btree ("workspaceId");

CREATE INDEX "InsurancePolicy_dealId_idx" ON public."InsurancePolicy" USING btree ("dealId");

CREATE UNIQUE INDEX "InsurancePolicy_dealId_key" ON public."InsurancePolicy" USING btree ("dealId");

CREATE INDEX "InsurancePolicy_workspaceId_idx" ON public."InsurancePolicy" USING btree ("workspaceId");

CREATE INDEX "InsuranceQuote_buyerId_idx" ON public."InsuranceQuote" USING btree ("buyerId");

CREATE INDEX "InsuranceQuote_workspaceId_idx" ON public."InsuranceQuote" USING btree ("workspaceId");

CREATE INDEX "InventoryDuplicateGroupMember_groupId_idx" ON public."InventoryDuplicateGroupMember" USING btree ("groupId");

CREATE INDEX "InventoryDuplicateGroupMember_marketVehicleId_idx" ON public."InventoryDuplicateGroupMember" USING btree ("marketVehicleId");

CREATE INDEX "InventoryDuplicateGroupMember_verifiedVehicleId_idx" ON public."InventoryDuplicateGroupMember" USING btree ("verifiedVehicleId");

CREATE INDEX "InventoryDuplicateGroup_status_idx" ON public."InventoryDuplicateGroup" USING btree (status);

CREATE INDEX "InventoryDuplicateGroup_vin_idx" ON public."InventoryDuplicateGroup" USING btree (vin);

CREATE INDEX "InventoryDuplicateGroup_workspaceId_idx" ON public."InventoryDuplicateGroup" USING btree ("workspaceId");

CREATE INDEX "InventoryIntelligenceJob_createdAt_idx" ON public."InventoryIntelligenceJob" USING btree ("createdAt");

CREATE INDEX "InventoryIntelligenceJob_jobType_idx" ON public."InventoryIntelligenceJob" USING btree ("jobType");

CREATE INDEX "InventoryIntelligenceJob_scheduledAt_idx" ON public."InventoryIntelligenceJob" USING btree ("scheduledAt");

CREATE INDEX "InventoryIntelligenceJob_status_idx" ON public."InventoryIntelligenceJob" USING btree (status);

CREATE INDEX "InventoryIntelligenceJob_workspaceId_idx" ON public."InventoryIntelligenceJob" USING btree ("workspaceId");

CREATE INDEX "InventoryItem_dealerId_idx" ON public."InventoryItem" USING btree ("dealerId");

CREATE INDEX "InventoryItem_vehicleId_idx" ON public."InventoryItem" USING btree ("vehicleId");

CREATE INDEX "InventoryItem_workspaceId_idx" ON public."InventoryItem" USING btree ("workspaceId");

CREATE INDEX "InventoryMarketVehicle_dealerZip_idx" ON public."InventoryMarketVehicle" USING btree ("dealerZip");

CREATE INDEX "InventoryMarketVehicle_make_model_idx" ON public."InventoryMarketVehicle" USING btree (make, model);

CREATE INDEX "InventoryMarketVehicle_promotedToVerifiedId_idx" ON public."InventoryMarketVehicle" USING btree ("promotedToVerifiedId");

CREATE INDEX "InventoryMarketVehicle_prospectId_idx" ON public."InventoryMarketVehicle" USING btree ("prospectId");

CREATE INDEX "InventoryMarketVehicle_status_idx" ON public."InventoryMarketVehicle" USING btree (status);

CREATE INDEX "InventoryMarketVehicle_vin_idx" ON public."InventoryMarketVehicle" USING btree (vin);

CREATE UNIQUE INDEX "InventoryMarketVehicle_vin_prospectId_key" ON public."InventoryMarketVehicle" USING btree (vin, "prospectId");

CREATE INDEX "InventoryMarketVehicle_workspaceId_idx" ON public."InventoryMarketVehicle" USING btree ("workspaceId");

CREATE INDEX "InventoryPriceHistory_marketVehicleId_idx" ON public."InventoryPriceHistory" USING btree ("marketVehicleId");

CREATE INDEX "InventoryPriceHistory_recordedAt_idx" ON public."InventoryPriceHistory" USING btree ("recordedAt");

CREATE INDEX "InventoryPriceHistory_verifiedVehicleId_idx" ON public."InventoryPriceHistory" USING btree ("verifiedVehicleId");

CREATE INDEX "InventoryRawSnapshot_fetchedAt_idx" ON public."InventoryRawSnapshot" USING btree ("fetchedAt");

CREATE INDEX "InventoryRawSnapshot_sourceId_idx" ON public."InventoryRawSnapshot" USING btree ("sourceId");

CREATE INDEX "InventorySourceError_errorType_idx" ON public."InventorySourceError" USING btree ("errorType");

CREATE INDEX "InventorySourceError_occurredAt_idx" ON public."InventorySourceError" USING btree ("occurredAt");

CREATE INDEX "InventorySourceError_sourceId_idx" ON public."InventorySourceError" USING btree ("sourceId");

CREATE INDEX "InventoryVehicleSighting_make_model_idx" ON public."InventoryVehicleSighting" USING btree (make, model);

CREATE INDEX "InventoryVehicleSighting_snapshotId_idx" ON public."InventoryVehicleSighting" USING btree ("snapshotId");

CREATE INDEX "InventoryVehicleSighting_vin_idx" ON public."InventoryVehicleSighting" USING btree (vin);

CREATE INDEX "InventoryVerifiedVehicle_dealerId_idx" ON public."InventoryVerifiedVehicle" USING btree ("dealerId");

CREATE INDEX "InventoryVerifiedVehicle_make_model_idx" ON public."InventoryVerifiedVehicle" USING btree (make, model);

CREATE INDEX "InventoryVerifiedVehicle_promotedFromMarketVehicleId_idx" ON public."InventoryVerifiedVehicle" USING btree ("promotedFromMarketVehicleId");

CREATE INDEX "InventoryVerifiedVehicle_status_idx" ON public."InventoryVerifiedVehicle" USING btree (status);

CREATE UNIQUE INDEX "InventoryVerifiedVehicle_vin_dealerId_key" ON public."InventoryVerifiedVehicle" USING btree (vin, "dealerId");

CREATE INDEX "InventoryVerifiedVehicle_vin_idx" ON public."InventoryVerifiedVehicle" USING btree (vin);

CREATE INDEX "InventoryVerifiedVehicle_workspaceId_idx" ON public."InventoryVerifiedVehicle" USING btree ("workspaceId");

CREATE INDEX "LenderFeeDisbursement_feePaymentId_idx" ON public."LenderFeeDisbursement" USING btree ("feePaymentId");

CREATE UNIQUE INDEX "LenderFeeDisbursement_feePaymentId_key" ON public."LenderFeeDisbursement" USING btree ("feePaymentId");

CREATE INDEX "LenderFeeDisbursement_status_idx" ON public."LenderFeeDisbursement" USING btree (status);

CREATE INDEX "MaskedPartyProfile_buyerId_idx" ON public."MaskedPartyProfile" USING btree ("buyerId");

CREATE INDEX "MaskedPartyProfile_dealId_idx" ON public."MaskedPartyProfile" USING btree ("dealId");

CREATE INDEX "MaskedPartyProfile_dealerId_idx" ON public."MaskedPartyProfile" USING btree ("dealerId");

CREATE INDEX "MaskedPartyProfile_identityState_idx" ON public."MaskedPartyProfile" USING btree ("identityState");

CREATE INDEX "MaskedPartyProfile_maskedId_idx" ON public."MaskedPartyProfile" USING btree ("maskedId");

CREATE UNIQUE INDEX "MaskedPartyProfile_maskedId_key" ON public."MaskedPartyProfile" USING btree ("maskedId");

CREATE INDEX "MaskedPartyProfile_workspaceId_idx" ON public."MaskedPartyProfile" USING btree ("workspaceId");

CREATE INDEX "MessageRedactionEvent_createdAt_idx" ON public."MessageRedactionEvent" USING btree ("createdAt");

CREATE INDEX "MessageRedactionEvent_dealId_idx" ON public."MessageRedactionEvent" USING btree ("dealId");

CREATE INDEX "MessageRedactionEvent_messageId_idx" ON public."MessageRedactionEvent" USING btree ("messageId");

CREATE INDEX "MessageRedactionEvent_senderId_idx" ON public."MessageRedactionEvent" USING btree ("senderId");

CREATE INDEX "MessageRedactionEvent_workspaceId_idx" ON public."MessageRedactionEvent" USING btree ("workspaceId");

CREATE UNIQUE INDEX "PaymentMethod_stripePaymentMethodId_key" ON public."PaymentMethod" USING btree ("stripePaymentMethodId");

CREATE INDEX "PaymentMethod_userId_idx" ON public."PaymentMethod" USING btree ("userId");

CREATE INDEX "PaymentMethod_workspaceId_idx" ON public."PaymentMethod" USING btree ("workspaceId");

CREATE UNIQUE INDEX "PaymentProviderEvent_eventId_key" ON public."PaymentProviderEvent" USING btree ("eventId");

CREATE INDEX "PaymentProviderEvent_eventType_idx" ON public."PaymentProviderEvent" USING btree ("eventType");

CREATE INDEX "PaymentProviderEvent_paymentIntentId_idx" ON public."PaymentProviderEvent" USING btree ("paymentIntentId");

CREATE INDEX "Payout_affiliateId_idx" ON public."Payout" USING btree ("affiliateId");

CREATE INDEX "Payout_status_idx" ON public."Payout" USING btree (status);

CREATE INDEX "Payout_workspaceId_idx" ON public."Payout" USING btree ("workspaceId");

CREATE INDEX "PermissiblePurposeLog_permissiblePurpose_idx" ON public."PermissiblePurposeLog" USING btree ("permissiblePurpose");

CREATE INDEX "PermissiblePurposeLog_sessionId_idx" ON public."PermissiblePurposeLog" USING btree ("sessionId");

CREATE INDEX "PermissiblePurposeLog_userId_idx" ON public."PermissiblePurposeLog" USING btree ("userId");

CREATE INDEX "PickupAppointment_dealId_idx" ON public."PickupAppointment" USING btree ("dealId");

CREATE UNIQUE INDEX "PickupAppointment_dealId_key" ON public."PickupAppointment" USING btree ("dealId");

CREATE INDEX "PickupAppointment_qrCode_idx" ON public."PickupAppointment" USING btree ("qrCode");

CREATE UNIQUE INDEX "PickupAppointment_qrCode_key" ON public."PickupAppointment" USING btree ("qrCode");

CREATE INDEX "PickupAppointment_scheduledDate_idx" ON public."PickupAppointment" USING btree ("scheduledDate");

CREATE INDEX "PickupAppointment_workspaceId_idx" ON public."PickupAppointment" USING btree ("workspaceId");

CREATE INDEX "PreQualProviderEvent_createdAt_idx" ON public."PreQualProviderEvent" USING btree ("createdAt");

CREATE INDEX "PreQualProviderEvent_preQualificationId_idx" ON public."PreQualProviderEvent" USING btree ("preQualificationId");

CREATE INDEX "PreQualProviderEvent_providerName_idx" ON public."PreQualProviderEvent" USING btree ("providerName");

CREATE INDEX "PreQualProviderEvent_userId_idx" ON public."PreQualProviderEvent" USING btree ("userId");

CREATE INDEX "PreQualProviderEvent_workspaceId_idx" ON public."PreQualProviderEvent" USING btree ("workspaceId");

CREATE INDEX "PreQualification_buyerId_idx" ON public."PreQualification" USING btree ("buyerId");

CREATE UNIQUE INDEX "PreQualification_buyerId_key" ON public."PreQualification" USING btree ("buyerId");

CREATE INDEX "PreQualification_consentArtifactId_idx" ON public."PreQualification" USING btree ("consentArtifactId");

CREATE INDEX "PreQualification_externalSubmissionId_idx" ON public."PreQualification" USING btree ("externalSubmissionId");

CREATE INDEX "PreQualification_workspaceId_idx" ON public."PreQualification" USING btree ("workspaceId");

CREATE INDEX "PrequalConsentArtifact_consentVersionId_idx" ON public."PrequalConsentArtifact" USING btree ("consentVersionId");

CREATE INDEX "PrequalConsentArtifact_sessionId_idx" ON public."PrequalConsentArtifact" USING btree ("sessionId");

CREATE INDEX "PrequalConsentArtifact_userId_idx" ON public."PrequalConsentArtifact" USING btree ("userId");

CREATE INDEX "PrequalConsentVersion_effectiveAt_idx" ON public."PrequalConsentVersion" USING btree ("effectiveAt");

CREATE INDEX "PrequalConsentVersion_version_idx" ON public."PrequalConsentVersion" USING btree (version);

CREATE UNIQUE INDEX "PrequalConsentVersion_version_key" ON public."PrequalConsentVersion" USING btree (version);

CREATE INDEX "PrequalOfferSnapshot_preQualificationId_idx" ON public."PrequalOfferSnapshot" USING btree ("preQualificationId");

CREATE INDEX "PrequalProviderEvent_createdAt_idx" ON public."PrequalProviderEvent" USING btree ("createdAt");

CREATE INDEX "PrequalProviderEvent_prequalificationId_idx" ON public."PrequalProviderEvent" USING btree ("prequalificationId");

CREATE INDEX "PrequalProviderEvent_providerName_idx" ON public."PrequalProviderEvent" USING btree ("providerName");

CREATE INDEX "PrequalProviderEvent_sessionId_idx" ON public."PrequalProviderEvent" USING btree ("sessionId");

CREATE INDEX "PrequalProviderEvent_userId_idx" ON public."PrequalProviderEvent" USING btree ("userId");

CREATE INDEX "PrequalSession_prequalificationId_idx" ON public."PrequalSession" USING btree ("prequalificationId");

CREATE INDEX "PrequalSession_status_idx" ON public."PrequalSession" USING btree (status);

CREATE INDEX "PrequalSession_userId_idx" ON public."PrequalSession" USING btree ("userId");

CREATE INDEX "PrequalSession_workspaceId_idx" ON public."PrequalSession" USING btree ("workspaceId");

CREATE INDEX "Referral_affiliateId_idx" ON public."Referral" USING btree ("affiliateId");

CREATE INDEX "Referral_referredBuyerId_idx" ON public."Referral" USING btree ("referredBuyerId");

CREATE INDEX "Referral_workspaceId_idx" ON public."Referral" USING btree ("workspaceId");

CREATE INDEX "RefinanceLead_createdAt_idx" ON public."RefinanceLead" USING btree ("createdAt");

CREATE INDEX "RefinanceLead_email_idx" ON public."RefinanceLead" USING btree (email);

CREATE INDEX "RefinanceLead_openroadFunded_idx" ON public."RefinanceLead" USING btree ("openroadFunded");

CREATE INDEX "RefinanceLead_partner_idx" ON public."RefinanceLead" USING btree (partner);

CREATE INDEX "RefinanceLead_qualificationStatus_idx" ON public."RefinanceLead" USING btree ("qualificationStatus");

CREATE INDEX "RefinanceLead_state_idx" ON public."RefinanceLead" USING btree (state);

CREATE INDEX "RefinanceLead_workspaceId_idx" ON public."RefinanceLead" USING btree ("workspaceId");

CREATE INDEX "Refund_buyerId_idx" ON public."Refund" USING btree ("buyerId");

CREATE INDEX "Refund_relatedPaymentId_idx" ON public."Refund" USING btree ("relatedPaymentId");

CREATE INDEX "Refund_status_idx" ON public."Refund" USING btree (status);

CREATE INDEX "Refund_workspaceId_idx" ON public."Refund" USING btree ("workspaceId");

CREATE INDEX "SelectedDeal_buyerId_idx" ON public."SelectedDeal" USING btree ("buyerId");

CREATE INDEX "SelectedDeal_sourcedOfferId_idx" ON public."SelectedDeal" USING btree ("sourcedOfferId");

CREATE UNIQUE INDEX "SelectedDeal_sourcedOfferId_key" ON public."SelectedDeal" USING btree ("sourcedOfferId");

CREATE INDEX "SelectedDeal_sourcingCaseId_idx" ON public."SelectedDeal" USING btree ("sourcingCaseId");

CREATE INDEX "SelectedDeal_status_idx" ON public."SelectedDeal" USING btree (status);

CREATE INDEX "SelectedDeal_workspaceId_idx" ON public."SelectedDeal" USING btree ("workspaceId");

CREATE INDEX "ServiceFeePayment_dealId_idx" ON public."ServiceFeePayment" USING btree ("dealId");

CREATE UNIQUE INDEX "ServiceFeePayment_dealId_key" ON public."ServiceFeePayment" USING btree ("dealId");

CREATE INDEX "ServiceFeePayment_status_idx" ON public."ServiceFeePayment" USING btree (status);

CREATE UNIQUE INDEX "ServiceFeePayment_stripePaymentIntentId_key" ON public."ServiceFeePayment" USING btree ("stripePaymentIntentId");

CREATE INDEX "ServiceFeePayment_workspaceId_idx" ON public."ServiceFeePayment" USING btree ("workspaceId");

CREATE INDEX "ShortlistItem_shortlistId_idx" ON public."ShortlistItem" USING btree ("shortlistId");

CREATE UNIQUE INDEX "ShortlistItem_shortlistId_inventoryItemId_key" ON public."ShortlistItem" USING btree ("shortlistId", "inventoryItemId");

CREATE INDEX "Shortlist_buyerId_idx" ON public."Shortlist" USING btree ("buyerId");

CREATE INDEX "Shortlist_workspaceId_idx" ON public."Shortlist" USING btree ("workspaceId");

CREATE INDEX "SourcedOffer_buyerId_idx" ON public."SourcedOffer" USING btree ("buyerId");

CREATE INDEX "SourcedOffer_caseId_idx" ON public."SourcedOffer" USING btree ("caseId");

CREATE INDEX "SourcedOffer_status_idx" ON public."SourcedOffer" USING btree (status);

CREATE INDEX "SourcedOffer_workspaceId_idx" ON public."SourcedOffer" USING btree ("workspaceId");

CREATE INDEX "SourcingOutreachLog_adminUserId_idx" ON public."SourcingOutreachLog" USING btree ("adminUserId");

CREATE INDEX "SourcingOutreachLog_caseId_idx" ON public."SourcingOutreachLog" USING btree ("caseId");

CREATE INDEX "TradeIn_auctionId_idx" ON public."TradeIn" USING btree ("auctionId");

CREATE INDEX "TradeIn_buyerId_idx" ON public."TradeIn" USING btree ("buyerId");

CREATE UNIQUE INDEX "TradeIn_selectedDealId_key" ON public."TradeIn" USING btree ("selectedDealId");

CREATE INDEX "TradeIn_shortlistId_idx" ON public."TradeIn" USING btree ("shortlistId");

CREATE INDEX "TradeIn_workspaceId_idx" ON public."TradeIn" USING btree ("workspaceId");

CREATE INDEX "Transaction_createdAt_idx" ON public."Transaction" USING btree ("createdAt");

CREATE INDEX "Transaction_status_idx" ON public."Transaction" USING btree (status);

CREATE INDEX "Transaction_stripePaymentIntentId_idx" ON public."Transaction" USING btree ("stripePaymentIntentId");

CREATE INDEX "Transaction_type_idx" ON public."Transaction" USING btree (type);

CREATE INDEX "Transaction_userId_idx" ON public."Transaction" USING btree ("userId");

CREATE INDEX "Transaction_workspaceId_idx" ON public."Transaction" USING btree ("workspaceId");

CREATE INDEX "User_auth_user_id_idx" ON public."User" USING btree (auth_user_id);

CREATE UNIQUE INDEX "User_auth_user_id_key" ON public."User" USING btree (auth_user_id);

CREATE INDEX "User_email_idx" ON public."User" USING btree (email);

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);

CREATE INDEX "User_workspaceId_idx" ON public."User" USING btree ("workspaceId");

CREATE INDEX "VehicleRequestCase_adminSubStatus_idx" ON public."VehicleRequestCase" USING btree ("adminSubStatus");

CREATE INDEX "VehicleRequestCase_buyerId_idx" ON public."VehicleRequestCase" USING btree ("buyerId");

CREATE INDEX "VehicleRequestCase_createdAt_idx" ON public."VehicleRequestCase" USING btree ("createdAt");

CREATE INDEX "VehicleRequestCase_status_idx" ON public."VehicleRequestCase" USING btree (status);

CREATE INDEX "VehicleRequestCase_workspaceId_idx" ON public."VehicleRequestCase" USING btree ("workspaceId");

CREATE INDEX "VehicleRequestItem_caseId_idx" ON public."VehicleRequestItem" USING btree ("caseId");

CREATE INDEX "Vehicle_make_model_idx" ON public."Vehicle" USING btree (make, model);

CREATE INDEX "Vehicle_vin_idx" ON public."Vehicle" USING btree (vin);

CREATE UNIQUE INDEX "Vehicle_vin_key" ON public."Vehicle" USING btree (vin);

CREATE INDEX "Workspace_mode_idx" ON public."Workspace" USING btree (mode);

CREATE INDEX contact_messages_created_at_idx ON public.contact_messages USING btree (created_at);

CREATE INDEX contact_messages_email_idx ON public.contact_messages USING btree (email);

CREATE INDEX "identity_trust_records_createdAt_idx" ON public.identity_trust_records USING btree ("createdAt");

CREATE UNIQUE INDEX "identity_trust_records_entityId_entityType_key" ON public.identity_trust_records USING btree ("entityId", "entityType");

CREATE INDEX "identity_trust_records_entityType_idx" ON public.identity_trust_records USING btree ("entityType");

CREATE INDEX "identity_trust_records_lastAssessedAt_idx" ON public.identity_trust_records USING btree ("lastAssessedAt");

CREATE INDEX "identity_trust_records_manualReviewRequired_idx" ON public.identity_trust_records USING btree ("manualReviewRequired");

CREATE INDEX identity_trust_records_status_idx ON public.identity_trust_records USING btree (status);

CREATE INDEX idx_ai_contract_extractions_contract_id ON public.ai_contract_extractions USING btree (contract_id);

CREATE INDEX idx_ai_contract_extractions_created_at ON public.ai_contract_extractions USING btree (created_at);

CREATE INDEX idx_ai_leads_created_at ON public.ai_leads USING btree (created_at);

CREATE INDEX idx_ai_leads_email ON public.ai_leads USING btree (email);

CREATE INDEX idx_ai_seo_drafts_created_at ON public.ai_seo_drafts USING btree (created_at);

CREATE INDEX idx_ai_seo_drafts_draft_type ON public.ai_seo_drafts USING btree (draft_type);

CREATE INDEX idx_ai_seo_drafts_status ON public.ai_seo_drafts USING btree (status);

CREATE INDEX insurance_events_created_at_idx ON public.insurance_events USING btree (created_at);

CREATE INDEX insurance_events_selected_deal_id_idx ON public.insurance_events USING btree (selected_deal_id);

CREATE INDEX insurance_events_type_idx ON public.insurance_events USING btree (type);

CREATE INDEX password_reset_tokens_token_idx ON public.password_reset_tokens USING btree (token);

CREATE UNIQUE INDEX password_reset_tokens_token_key ON public.password_reset_tokens USING btree (token);

CREATE INDEX password_reset_tokens_user_id_idx ON public.password_reset_tokens USING btree (user_id);

CREATE INDEX "platform_decisions_actorId_idx" ON public.platform_decisions USING btree ("actorId");

CREATE INDEX "platform_decisions_correlationId_idx" ON public.platform_decisions USING btree ("correlationId");

CREATE INDEX "platform_decisions_createdAt_idx" ON public.platform_decisions USING btree ("createdAt");

CREATE INDEX "platform_decisions_entityType_entityId_idx" ON public.platform_decisions USING btree ("entityType", "entityId");

CREATE INDEX "platform_decisions_resolvedAt_idx" ON public.platform_decisions USING btree ("resolvedAt");

CREATE INDEX "platform_decisions_workspaceId_idx" ON public.platform_decisions USING btree ("workspaceId");

CREATE INDEX "platform_events_actorId_idx" ON public.platform_events USING btree ("actorId");

CREATE INDEX "platform_events_correlationId_idx" ON public.platform_events USING btree ("correlationId");

CREATE INDEX "platform_events_createdAt_idx" ON public.platform_events USING btree ("createdAt");

CREATE INDEX "platform_events_entityType_entityId_idx" ON public.platform_events USING btree ("entityType", "entityId");

CREATE INDEX "platform_events_eventType_idx" ON public.platform_events USING btree ("eventType");

CREATE UNIQUE INDEX "platform_events_idempotencyKey_key" ON public.platform_events USING btree ("idempotencyKey");

CREATE INDEX "platform_events_parentEntityId_idx" ON public.platform_events USING btree ("parentEntityId");

CREATE INDEX "platform_events_processingStatus_idx" ON public.platform_events USING btree ("processingStatus");

CREATE INDEX "platform_events_workspaceId_idx" ON public.platform_events USING btree ("workspaceId");

CREATE INDEX "trusted_documents_activeForDecision_idx" ON public.trusted_documents USING btree ("activeForDecision");

CREATE INDEX "trusted_documents_createdAt_idx" ON public.trusted_documents USING btree ("createdAt");

CREATE INDEX "trusted_documents_documentType_idx" ON public.trusted_documents USING btree ("documentType");

CREATE INDEX "trusted_documents_fileHash_idx" ON public.trusted_documents USING btree ("fileHash");

CREATE INDEX "trusted_documents_ownerEntityId_ownerEntityType_idx" ON public.trusted_documents USING btree ("ownerEntityId", "ownerEntityType");

CREATE INDEX trusted_documents_status_idx ON public.trusted_documents USING btree (status);

CREATE INDEX "trusted_documents_uploaderId_idx" ON public.trusted_documents USING btree ("uploaderId");


-- ============================================================
-- Section 5: Foreign Key Constraints
-- ============================================================

ALTER TABLE ONLY public."AdminAuditLog"
    ADD CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."AdminLoginAttempt"
    ADD CONSTRAINT "AdminLoginAttempt_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."AdminNotification"
    ADD CONSTRAINT "AdminNotification_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."AdminSession"
    ADD CONSTRAINT "AdminSession_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."AdminSetting"
    ADD CONSTRAINT "AdminSetting_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."AdminUser"
    ADD CONSTRAINT "AdminUser_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."AffiliateDocument"
    ADD CONSTRAINT "AffiliateDocument_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."AffiliateShareEvent"
    ADD CONSTRAINT "AffiliateShareEvent_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."Affiliate"
    ADD CONSTRAINT "Affiliate_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."AiAdminAction"
    ADD CONSTRAINT "AiAdminAction_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."AiContractExtraction"
    ADD CONSTRAINT "AiContractExtraction_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."AiConversation"
    ADD CONSTRAINT "AiConversation_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."AiLead"
    ADD CONSTRAINT "AiLead_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."AiMessage"
    ADD CONSTRAINT "AiMessage_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."AiSeoDraft"
    ADD CONSTRAINT "AiSeoDraft_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."AiToolCall"
    ADD CONSTRAINT "AiToolCall_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."AuctionOfferFinancingOption"
    ADD CONSTRAINT "AuctionOfferFinancingOption_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."AuctionOffer"
    ADD CONSTRAINT "AuctionOffer_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."AuctionParticipant"
    ADD CONSTRAINT "AuctionParticipant_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."Auction"
    ADD CONSTRAINT "Auction_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."BestPriceOption"
    ADD CONSTRAINT "BestPriceOption_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."BuyerPreferences"
    ADD CONSTRAINT "BuyerPreferences_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."BuyerProfile"
    ADD CONSTRAINT "BuyerProfile_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."BuyerRequestInventoryMatch"
    ADD CONSTRAINT "BuyerRequestInventoryMatch_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."CaseEventLog"
    ADD CONSTRAINT "CaseEventLog_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."CaseNote"
    ADD CONSTRAINT "CaseNote_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."Chargeback"
    ADD CONSTRAINT "Chargeback_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."CircumventionAlert"
    ADD CONSTRAINT "CircumventionAlert_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."Click"
    ADD CONSTRAINT "Click_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."Commission"
    ADD CONSTRAINT "Commission_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."ComplianceEvent"
    ADD CONSTRAINT "ComplianceEvent_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."ConciergeFeeRequest"
    ADD CONSTRAINT "ConciergeFeeRequest_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."ConsentArtifact"
    ADD CONSTRAINT "ConsentArtifact_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."ConsentVersion"
    ADD CONSTRAINT "ConsentVersion_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."ConsumerAuthorizationArtifact"
    ADD CONSTRAINT "ConsumerAuthorizationArtifact_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."ContractDocument"
    ADD CONSTRAINT "ContractDocument_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."ContractManualReview"
    ADD CONSTRAINT "ContractManualReview_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."ContractShieldNotification"
    ADD CONSTRAINT "ContractShieldNotification_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."ContractShieldOverride"
    ADD CONSTRAINT "ContractShieldOverride_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."ContractShieldReconciliation"
    ADD CONSTRAINT "ContractShieldReconciliation_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."ContractShieldRule"
    ADD CONSTRAINT "ContractShieldRule_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."ContractShieldScan"
    ADD CONSTRAINT "ContractShieldScan_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."CoverageGapTask"
    ADD CONSTRAINT "CoverageGapTask_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."DealDocument"
    ADD CONSTRAINT "DealDocument_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."DealProtectionEvent"
    ADD CONSTRAINT "DealProtectionEvent_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."DealerCoverageGapSignal"
    ADD CONSTRAINT "DealerCoverageGapSignal_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."DealerIntelligenceInvite"
    ADD CONSTRAINT "DealerIntelligenceInvite_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."DealerInvite"
    ADD CONSTRAINT "DealerInvite_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."DealerLifecycleEvent"
    ADD CONSTRAINT "DealerLifecycleEvent_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."DealerOnboardingConversion"
    ADD CONSTRAINT "DealerOnboardingConversion_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."DealerProspect"
    ADD CONSTRAINT "DealerProspect_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."DealerQuickOffer"
    ADD CONSTRAINT "DealerQuickOffer_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."DealerSourceRun"
    ADD CONSTRAINT "DealerSourceRun_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."DealerSource"
    ADD CONSTRAINT "DealerSource_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."DealerUser"
    ADD CONSTRAINT "DealerUser_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."Dealer"
    ADD CONSTRAINT "Dealer_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."DepositPayment"
    ADD CONSTRAINT "DepositPayment_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."DepositRequest"
    ADD CONSTRAINT "DepositRequest_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."DocumentRequest"
    ADD CONSTRAINT "DocumentRequest_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."ESignEnvelope"
    ADD CONSTRAINT "ESignEnvelope_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."EmailSendLog"
    ADD CONSTRAINT "EmailSendLog_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."ExternalPreApprovalSubmission"
    ADD CONSTRAINT "ExternalPreApprovalSubmission_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."ExternalPreApproval"
    ADD CONSTRAINT "ExternalPreApproval_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."FeeFinancingDisclosure"
    ADD CONSTRAINT "FeeFinancingDisclosure_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."FinancialAuditLog"
    ADD CONSTRAINT "FinancialAuditLog_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."FinancingOffer"
    ADD CONSTRAINT "FinancingOffer_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."FixListItem"
    ADD CONSTRAINT "FixListItem_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."ForwardingAuthorization"
    ADD CONSTRAINT "ForwardingAuthorization_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."FundedLoan"
    ADD CONSTRAINT "FundedLoan_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."IdentityReleaseEvent"
    ADD CONSTRAINT "IdentityReleaseEvent_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."InsuranceDocRequest"
    ADD CONSTRAINT "InsuranceDocRequest_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."InsurancePolicy"
    ADD CONSTRAINT "InsurancePolicy_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."InsuranceQuote"
    ADD CONSTRAINT "InsuranceQuote_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."InventoryDuplicateGroupMember"
    ADD CONSTRAINT "InventoryDuplicateGroupMember_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."InventoryDuplicateGroup"
    ADD CONSTRAINT "InventoryDuplicateGroup_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."InventoryIntelligenceJob"
    ADD CONSTRAINT "InventoryIntelligenceJob_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."InventoryItem"
    ADD CONSTRAINT "InventoryItem_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."InventoryMarketVehicle"
    ADD CONSTRAINT "InventoryMarketVehicle_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."InventoryPriceHistory"
    ADD CONSTRAINT "InventoryPriceHistory_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."InventoryRawSnapshot"
    ADD CONSTRAINT "InventoryRawSnapshot_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."InventorySourceError"
    ADD CONSTRAINT "InventorySourceError_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."InventoryVehicleSighting"
    ADD CONSTRAINT "InventoryVehicleSighting_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."InventoryVerifiedVehicle"
    ADD CONSTRAINT "InventoryVerifiedVehicle_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."LenderFeeDisbursement"
    ADD CONSTRAINT "LenderFeeDisbursement_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."MaskedPartyProfile"
    ADD CONSTRAINT "MaskedPartyProfile_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."MessageRedactionEvent"
    ADD CONSTRAINT "MessageRedactionEvent_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."PaymentMethod"
    ADD CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."PaymentProviderEvent"
    ADD CONSTRAINT "PaymentProviderEvent_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."Payout"
    ADD CONSTRAINT "Payout_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."PermissiblePurposeLog"
    ADD CONSTRAINT "PermissiblePurposeLog_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."PickupAppointment"
    ADD CONSTRAINT "PickupAppointment_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."PreQualProviderEvent"
    ADD CONSTRAINT "PreQualProviderEvent_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."PreQualification"
    ADD CONSTRAINT "PreQualification_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."PrequalConsentArtifact"
    ADD CONSTRAINT "PrequalConsentArtifact_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."PrequalConsentVersion"
    ADD CONSTRAINT "PrequalConsentVersion_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."PrequalOfferSnapshot"
    ADD CONSTRAINT "PrequalOfferSnapshot_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."PrequalProviderEvent"
    ADD CONSTRAINT "PrequalProviderEvent_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."PrequalSession"
    ADD CONSTRAINT "PrequalSession_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."Referral"
    ADD CONSTRAINT "Referral_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."RefinanceLead"
    ADD CONSTRAINT "RefinanceLead_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."Refund"
    ADD CONSTRAINT "Refund_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."SelectedDeal"
    ADD CONSTRAINT "SelectedDeal_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."ServiceFeePayment"
    ADD CONSTRAINT "ServiceFeePayment_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."ShortlistItem"
    ADD CONSTRAINT "ShortlistItem_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."Shortlist"
    ADD CONSTRAINT "Shortlist_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."SourcedOffer"
    ADD CONSTRAINT "SourcedOffer_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."SourcingOutreachLog"
    ADD CONSTRAINT "SourcingOutreachLog_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."TradeIn"
    ADD CONSTRAINT "TradeIn_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."Transaction"
    ADD CONSTRAINT "Transaction_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."VehicleRequestCase"
    ADD CONSTRAINT "VehicleRequestCase_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."VehicleRequestItem"
    ADD CONSTRAINT "VehicleRequestItem_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."Vehicle"
    ADD CONSTRAINT "Vehicle_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."Workspace"
    ADD CONSTRAINT "Workspace_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public.admin_settings
    ADD CONSTRAINT admin_settings_key_key UNIQUE (key);

ALTER TABLE ONLY public.admin_settings
    ADD CONSTRAINT admin_settings_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.ai_contract_extractions
    ADD CONSTRAINT ai_contract_extractions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.ai_leads
    ADD CONSTRAINT ai_leads_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.ai_seo_drafts
    ADD CONSTRAINT ai_seo_drafts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.contact_messages
    ADD CONSTRAINT contact_messages_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.identity_trust_records
    ADD CONSTRAINT identity_trust_records_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.insurance_events
    ADD CONSTRAINT insurance_events_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.platform_decisions
    ADD CONSTRAINT platform_decisions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.platform_events
    ADD CONSTRAINT platform_events_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_version_key UNIQUE (version);

ALTER TABLE ONLY public.seo_health
    ADD CONSTRAINT seo_health_page_key_key UNIQUE (page_key);

ALTER TABLE ONLY public.seo_health
    ADD CONSTRAINT seo_health_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.seo_keywords
    ADD CONSTRAINT seo_keywords_page_key_key UNIQUE (page_key);

ALTER TABLE ONLY public.seo_keywords
    ADD CONSTRAINT seo_keywords_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.seo_pages
    ADD CONSTRAINT seo_pages_page_key_key UNIQUE (page_key);

ALTER TABLE ONLY public.seo_pages
    ADD CONSTRAINT seo_pages_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.seo_schema
    ADD CONSTRAINT seo_schema_page_key_schema_type_key UNIQUE (page_key, schema_type);

ALTER TABLE ONLY public.seo_schema
    ADD CONSTRAINT seo_schema_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.trusted_documents
    ADD CONSTRAINT trusted_documents_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public."AdminNotification"
    ADD CONSTRAINT "AdminNotification_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Workspace"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."AdminUser"
    ADD CONSTRAINT "AdminUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."AdminUser"
    ADD CONSTRAINT "AdminUser_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Workspace"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."AffiliateDocument"
    ADD CONSTRAINT "AffiliateDocument_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Workspace"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."AffiliateShareEvent"
    ADD CONSTRAINT "AffiliateShareEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Workspace"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."Affiliate"
    ADD CONSTRAINT "Affiliate_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."Affiliate"
    ADD CONSTRAINT "Affiliate_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Workspace"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."AiAdminAction"
    ADD CONSTRAINT "AiAdminAction_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Workspace"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."AiConversation"
    ADD CONSTRAINT "AiConversation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Workspace"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."AiMessage"
    ADD CONSTRAINT "AiMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES public."AiConversation"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."AuctionOfferFinancingOption"
    ADD CONSTRAINT "AuctionOfferFinancingOption_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES public."AuctionOffer"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."AuctionOffer"
    ADD CONSTRAINT "AuctionOffer_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES public."Auction"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."AuctionOffer"
    ADD CONSTRAINT "AuctionOffer_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES public."InventoryItem"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."AuctionOffer"
    ADD CONSTRAINT "AuctionOffer_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Workspace"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."AuctionParticipant"
    ADD CONSTRAINT "AuctionParticipant_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES public."Auction"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."AuctionParticipant"
    ADD CONSTRAINT "AuctionParticipant_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES public."Dealer"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."AuctionParticipant"
    ADD CONSTRAINT "AuctionParticipant_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Workspace"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."Auction"
    ADD CONSTRAINT "Auction_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES public."BuyerProfile"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."Auction"
    ADD CONSTRAINT "Auction_shortlistId_fkey" FOREIGN KEY ("shortlistId") REFERENCES public."Shortlist"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."Auction"
    ADD CONSTRAINT "Auction_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Workspace"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."BestPriceOption"
    ADD CONSTRAINT "BestPriceOption_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES public."Auction"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."BestPriceOption"
    ADD CONSTRAINT "BestPriceOption_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Workspace"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."BuyerPreferences"
    ADD CONSTRAINT "BuyerPreferences_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES public."BuyerProfile"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."BuyerPreferences"
    ADD CONSTRAINT "BuyerPreferences_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Workspace"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."BuyerProfile"
    ADD CONSTRAINT "BuyerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."BuyerProfile"
    ADD CONSTRAINT "BuyerProfile_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Workspace"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."BuyerRequestInventoryMatch"
    ADD CONSTRAINT "BuyerRequestInventoryMatch_marketVehicleId_fkey" FOREIGN KEY ("marketVehicleId") REFERENCES public."InventoryMarketVehicle"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."BuyerRequestInventoryMatch"
    ADD CONSTRAINT "BuyerRequestInventoryMatch_verifiedVehicleId_fkey" FOREIGN KEY ("verifiedVehicleId") REFERENCES public."InventoryVerifiedVehicle"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."CaseEventLog"
    ADD CONSTRAINT "CaseEventLog_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES public."VehicleRequestCase"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."CaseNote"
    ADD CONSTRAINT "CaseNote_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES public."VehicleRequestCase"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."Chargeback"
    ADD CONSTRAINT "Chargeback_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES public."Transaction"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."Chargeback"
    ADD CONSTRAINT "Chargeback_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Workspace"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."Click"
    ADD CONSTRAINT "Click_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES public."Affiliate"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."Click"
    ADD CONSTRAINT "Click_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Workspace"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."Commission"
    ADD CONSTRAINT "Commission_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES public."Affiliate"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."Commission"
    ADD CONSTRAINT "Commission_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES public."Payout"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."Commission"
    ADD CONSTRAINT "Commission_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES public."Referral"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."Commission"
    ADD CONSTRAINT "Commission_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Workspace"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."ConciergeFeeRequest"
    ADD CONSTRAINT "ConciergeFeeRequest_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Workspace"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."ConsentArtifact"
    ADD CONSTRAINT "ConsentArtifact_consentVersionId_fkey" FOREIGN KEY ("consentVersionId") REFERENCES public."ConsentVersion"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."ConsentArtifact"
    ADD CONSTRAINT "ConsentArtifact_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Workspace"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."ContractDocument"
    ADD CONSTRAINT "ContractDocument_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES public."SelectedDeal"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."ContractDocument"
    ADD CONSTRAINT "ContractDocument_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES public."Dealer"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."ContractDocument"
    ADD CONSTRAINT "ContractDocument_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Workspace"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."ContractManualReview"
    ADD CONSTRAINT "ContractManualReview_approvedByAdminId_fkey" FOREIGN KEY ("approvedByAdminId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."ContractManualReview"
    ADD CONSTRAINT "ContractManualReview_contractDocumentId_fkey" FOREIGN KEY ("contractDocumentId") REFERENCES public."ContractDocument"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."ContractManualReview"
    ADD CONSTRAINT "ContractManualReview_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES public."SelectedDeal"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."ContractManualReview"
    ADD CONSTRAINT "ContractManualReview_overriddenScanId_fkey" FOREIGN KEY ("overriddenScanId") REFERENCES public."ContractShieldScan"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."ContractManualReview"
    ADD CONSTRAINT "ContractManualReview_revokedByAdminId_fkey" FOREIGN KEY ("revokedByAdminId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."ContractManualReview"
    ADD CONSTRAINT "ContractManualReview_secondApproverAdminId_fkey" FOREIGN KEY ("secondApproverAdminId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."ContractManualReview"
    ADD CONSTRAINT "ContractManualReview_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Workspace"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."ContractShieldNotification"
    ADD CONSTRAINT "ContractShieldNotification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."ContractShieldNotification"
    ADD CONSTRAINT "ContractShieldNotification_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES public."ContractShieldScan"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."ContractShieldOverride"
    ADD CONSTRAINT "ContractShieldOverride_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."ContractShieldOverride"
    ADD CONSTRAINT "ContractShieldOverride_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES public."ContractShieldScan"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."ContractShieldScan"
    ADD CONSTRAINT "ContractShieldScan_contractDocumentId_fkey" FOREIGN KEY ("contractDocumentId") REFERENCES public."ContractDocument"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."ContractShieldScan"
    ADD CONSTRAINT "ContractShieldScan_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES public."SelectedDeal"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."ContractShieldScan"
    ADD CONSTRAINT "ContractShieldScan_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES public."Dealer"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."ContractShieldScan"
    ADD CONSTRAINT "ContractShieldScan_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Workspace"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."DealDocument"
    ADD CONSTRAINT "DealDocument_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES public."DocumentRequest"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."DealDocument"
    ADD CONSTRAINT "DealDocument_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Workspace"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."DealerCoverageGapSignal"
    ADD CONSTRAINT "DealerCoverageGapSignal_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Workspace"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."DealerIntelligenceInvite"
    ADD CONSTRAINT "DealerIntelligenceInvite_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES public."DealerProspect"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."DealerInvite"
    ADD CONSTRAINT "DealerInvite_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES public."VehicleRequestCase"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."DealerInvite"
    ADD CONSTRAINT "DealerInvite_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES public."SourcedOffer"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."DealerLifecycleEvent"
    ADD CONSTRAINT "DealerLifecycleEvent_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES public."DealerProspect"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."DealerOnboardingConversion"
    ADD CONSTRAINT "DealerOnboardingConversion_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES public."DealerProspect"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."DealerQuickOffer"
    ADD CONSTRAINT "DealerQuickOffer_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES public."DealerIntelligenceInvite"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."DealerQuickOffer"
    ADD CONSTRAINT "DealerQuickOffer_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES public."DealerProspect"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."DealerSourceRun"
    ADD CONSTRAINT "DealerSourceRun_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES public."DealerSource"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."DealerSource"
    ADD CONSTRAINT "DealerSource_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES public."DealerProspect"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."DealerUser"
    ADD CONSTRAINT "DealerUser_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES public."Dealer"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."DealerUser"
    ADD CONSTRAINT "DealerUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."DealerUser"
    ADD CONSTRAINT "DealerUser_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Workspace"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."Dealer"
    ADD CONSTRAINT "Dealer_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."Dealer"
    ADD CONSTRAINT "Dealer_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Workspace"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."DepositPayment"
    ADD CONSTRAINT "DepositPayment_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Workspace"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."DepositRequest"
    ADD CONSTRAINT "DepositRequest_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Workspace"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."DocumentRequest"
    ADD CONSTRAINT "DocumentRequest_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Workspace"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."ESignEnvelope"
    ADD CONSTRAINT "ESignEnvelope_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES public."SelectedDeal"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."ESignEnvelope"
    ADD CONSTRAINT "ESignEnvelope_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Workspace"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."ExternalPreApprovalSubmission"
    ADD CONSTRAINT "ExternalPreApprovalSubmission_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Workspace"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."ExternalPreApproval"
    ADD CONSTRAINT "ExternalPreApproval_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES public."BuyerProfile"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."ExternalPreApproval"
    ADD CONSTRAINT "ExternalPreApproval_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Workspace"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."FeeFinancingDisclosure"
    ADD CONSTRAINT "FeeFinancingDisclosure_feePaymentId_fkey" FOREIGN KEY ("feePaymentId") REFERENCES public."ServiceFeePayment"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."FinancialAuditLog"
    ADD CONSTRAINT "FinancialAuditLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Workspace"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."FinancingOffer"
    ADD CONSTRAINT "FinancingOffer_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES public."SelectedDeal"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."FinancingOffer"
    ADD CONSTRAINT "FinancingOffer_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Workspace"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."FixListItem"
    ADD CONSTRAINT "FixListItem_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES public."ContractShieldScan"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."ForwardingAuthorization"
    ADD CONSTRAINT "ForwardingAuthorization_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Workspace"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."FundedLoan"
    ADD CONSTRAINT "FundedLoan_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES public."RefinanceLead"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."InsuranceDocRequest"
    ADD CONSTRAINT "InsuranceDocRequest_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Workspace"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."InsurancePolicy"
    ADD CONSTRAINT "InsurancePolicy_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES public."SelectedDeal"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."InsurancePolicy"
    ADD CONSTRAINT "InsurancePolicy_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Workspace"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."InsuranceQuote"
    ADD CONSTRAINT "InsuranceQuote_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Workspace"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."InventoryDuplicateGroupMember"
    ADD CONSTRAINT "InventoryDuplicateGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public."InventoryDuplicateGroup"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."InventoryDuplicateGroupMember"
    ADD CONSTRAINT "InventoryDuplicateGroupMember_marketVehicleId_fkey" FOREIGN KEY ("marketVehicleId") REFERENCES public."InventoryMarketVehicle"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."InventoryDuplicateGroupMember"
    ADD CONSTRAINT "InventoryDuplicateGroupMember_verifiedVehicleId_fkey" FOREIGN KEY ("verifiedVehicleId") REFERENCES public."InventoryVerifiedVehicle"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."InventoryItem"
    ADD CONSTRAINT "InventoryItem_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES public."Dealer"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."InventoryItem"
    ADD CONSTRAINT "InventoryItem_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES public."Vehicle"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."InventoryItem"
    ADD CONSTRAINT "InventoryItem_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Workspace"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."InventoryPriceHistory"
    ADD CONSTRAINT "InventoryPriceHistory_marketVehicleId_fkey" FOREIGN KEY ("marketVehicleId") REFERENCES public."InventoryMarketVehicle"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."InventoryPriceHistory"
    ADD CONSTRAINT "InventoryPriceHistory_verifiedVehicleId_fkey" FOREIGN KEY ("verifiedVehicleId") REFERENCES public."InventoryVerifiedVehicle"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."InventoryRawSnapshot"
    ADD CONSTRAINT "InventoryRawSnapshot_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES public."DealerSource"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."InventorySourceError"
    ADD CONSTRAINT "InventorySourceError_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES public."DealerSource"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."InventoryVehicleSighting"
    ADD CONSTRAINT "InventoryVehicleSighting_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES public."InventoryRawSnapshot"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."LenderFeeDisbursement"
    ADD CONSTRAINT "LenderFeeDisbursement_feePaymentId_fkey" FOREIGN KEY ("feePaymentId") REFERENCES public."ServiceFeePayment"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."PaymentMethod"
    ADD CONSTRAINT "PaymentMethod_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Workspace"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."Payout"
    ADD CONSTRAINT "Payout_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES public."Affiliate"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."Payout"
    ADD CONSTRAINT "Payout_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Workspace"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."PickupAppointment"
    ADD CONSTRAINT "PickupAppointment_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES public."BuyerProfile"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."PickupAppointment"
    ADD CONSTRAINT "PickupAppointment_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES public."SelectedDeal"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."PickupAppointment"
    ADD CONSTRAINT "PickupAppointment_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES public."Dealer"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."PickupAppointment"
    ADD CONSTRAINT "PickupAppointment_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Workspace"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."PreQualProviderEvent"
    ADD CONSTRAINT "PreQualProviderEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Workspace"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."PreQualification"
    ADD CONSTRAINT "PreQualification_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES public."BuyerProfile"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."PreQualification"
    ADD CONSTRAINT "PreQualification_consentArtifactId_fkey" FOREIGN KEY ("consentArtifactId") REFERENCES public."PrequalConsentArtifact"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."PreQualification"
    ADD CONSTRAINT "PreQualification_consumerAuthorizationArtifactId_fkey" FOREIGN KEY ("consumerAuthorizationArtifactId") REFERENCES public."ConsumerAuthorizationArtifact"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."PreQualification"
    ADD CONSTRAINT "PreQualification_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Workspace"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."PrequalConsentArtifact"
    ADD CONSTRAINT "PrequalConsentArtifact_consentVersionId_fkey" FOREIGN KEY ("consentVersionId") REFERENCES public."PrequalConsentVersion"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."PrequalOfferSnapshot"
    ADD CONSTRAINT "PrequalOfferSnapshot_preQualificationId_fkey" FOREIGN KEY ("preQualificationId") REFERENCES public."PreQualification"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."PrequalProviderEvent"
    ADD CONSTRAINT "PrequalProviderEvent_prequalificationId_fkey" FOREIGN KEY ("prequalificationId") REFERENCES public."PreQualification"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."PrequalProviderEvent"
    ADD CONSTRAINT "PrequalProviderEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES public."PrequalSession"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."PrequalSession"
    ADD CONSTRAINT "PrequalSession_prequalificationId_fkey" FOREIGN KEY ("prequalificationId") REFERENCES public."PreQualification"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."Referral"
    ADD CONSTRAINT "Referral_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES public."Affiliate"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."Referral"
    ADD CONSTRAINT "Referral_referredBuyerId_fkey" FOREIGN KEY ("referredBuyerId") REFERENCES public."BuyerProfile"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."Referral"
    ADD CONSTRAINT "Referral_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Workspace"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."RefinanceLead"
    ADD CONSTRAINT "RefinanceLead_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Workspace"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."Refund"
    ADD CONSTRAINT "Refund_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Workspace"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."SelectedDeal"
    ADD CONSTRAINT "SelectedDeal_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES public."BuyerProfile"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."SelectedDeal"
    ADD CONSTRAINT "SelectedDeal_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES public."AuctionOffer"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."SelectedDeal"
    ADD CONSTRAINT "SelectedDeal_sourcedOfferId_fkey" FOREIGN KEY ("sourcedOfferId") REFERENCES public."SourcedOffer"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."SelectedDeal"
    ADD CONSTRAINT "SelectedDeal_sourcingCaseId_fkey" FOREIGN KEY ("sourcingCaseId") REFERENCES public."VehicleRequestCase"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."SelectedDeal"
    ADD CONSTRAINT "SelectedDeal_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Workspace"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."ServiceFeePayment"
    ADD CONSTRAINT "ServiceFeePayment_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES public."SelectedDeal"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."ServiceFeePayment"
    ADD CONSTRAINT "ServiceFeePayment_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Workspace"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."ShortlistItem"
    ADD CONSTRAINT "ShortlistItem_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES public."InventoryItem"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."ShortlistItem"
    ADD CONSTRAINT "ShortlistItem_shortlistId_fkey" FOREIGN KEY ("shortlistId") REFERENCES public."Shortlist"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."Shortlist"
    ADD CONSTRAINT "Shortlist_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES public."BuyerProfile"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."Shortlist"
    ADD CONSTRAINT "Shortlist_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Workspace"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."SourcedOffer"
    ADD CONSTRAINT "SourcedOffer_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES public."VehicleRequestCase"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."SourcedOffer"
    ADD CONSTRAINT "SourcedOffer_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Workspace"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."SourcingOutreachLog"
    ADD CONSTRAINT "SourcingOutreachLog_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES public."VehicleRequestCase"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."TradeIn"
    ADD CONSTRAINT "TradeIn_selectedDealId_fkey" FOREIGN KEY ("selectedDealId") REFERENCES public."SelectedDeal"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."TradeIn"
    ADD CONSTRAINT "TradeIn_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Workspace"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."Transaction"
    ADD CONSTRAINT "Transaction_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Workspace"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Workspace"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."VehicleRequestCase"
    ADD CONSTRAINT "VehicleRequestCase_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES public."BuyerProfile"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."VehicleRequestCase"
    ADD CONSTRAINT "VehicleRequestCase_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Workspace"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."VehicleRequestItem"
    ADD CONSTRAINT "VehicleRequestItem_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES public."VehicleRequestCase"(id) ON UPDATE CASCADE ON DELETE CASCADE;


-- ============================================================
-- Section 6: Views (sourcing canonical views)
-- ============================================================

-- sourcing_cases → VehicleRequestCase
CREATE OR REPLACE VIEW public.sourcing_cases AS
SELECT
  id,
  "buyerId"             AS buyer_id,
  "workspaceId"         AS workspace_id,
  status,
  "adminSubStatus"      AS admin_sub_status,
  "assignedAdminUserId" AS assigned_admin_id,
  "marketZip"           AS market_zip,
  "radiusMiles"         AS radius_miles,
  "prequalSnapshotJson" AS prequal_snapshot,
  "submittedAt"         AS submitted_at,
  "firstOfferAt"        AS first_offer_at,
  "buyerResponseAt"     AS buyer_response_at,
  "lockedAt"            AS locked_at,
  "createdAt"           AS created_at,
  "updatedAt"           AS updated_at
FROM "VehicleRequestCase";

-- sourcing_dealer_outreach → SourcingOutreachLog
CREATE OR REPLACE VIEW public.sourcing_dealer_outreach AS
SELECT
  id,
  "caseId"         AS case_id,
  "adminUserId"    AS admin_user_id,
  "dealerName"     AS dealer_name,
  "contactMethod"  AS contact_method,
  outcome,
  "occurredAt"     AS occurred_at,
  notes,
  "createdAt"      AS created_at
FROM "SourcingOutreachLog";

-- sourced_offers → SourcedOffer
CREATE OR REPLACE VIEW public.sourced_offers AS
SELECT
  id,
  "caseId"               AS case_id,
  "buyerId"              AS buyer_id,
  "workspaceId"          AS workspace_id,
  "sourceType"           AS source_type,
  "dealerId"             AS dealer_id,
  "sourceDealerName"     AS source_dealer_name,
  "sourceDealerEmail"    AS source_dealer_email,
  "sourceDealerPhone"    AS source_dealer_phone,
  vin,
  year,
  make,
  "modelName"            AS model_name,
  trim,
  mileage,
  condition,
  "pricingBreakdownJson" AS pricing_breakdown,
  "paymentTermsJson"     AS payment_terms,
  "expiresAt"            AS expires_at,
  status,
  "presentedToBuyerAt"   AS presented_to_buyer_at,
  "acceptedAt"           AS accepted_at,
  "createdAt"            AS created_at,
  "updatedAt"            AS updated_at
FROM "SourcedOffer";

-- sourced_dealer_invitations → DealerInvite (claimedAt/completedAt removed - not in table)
CREATE OR REPLACE VIEW public.sourced_dealer_invitations AS
SELECT
  id,
  "caseId"          AS case_id,
  "offerId"         AS offer_id,
  "tokenHash"       AS token_hash,
  "tokenExpiresAt"  AS token_expires_at,
  "dealerEmail"     AS dealer_email,
  "dealerName"      AS dealer_name,
  status,
  "createdAt"       AS created_at,
  "updatedAt"       AS updated_at
FROM "DealerInvite";

-- network_coverage_events → DealerCoverageGapSignal
CREATE OR REPLACE VIEW public.network_coverage_events AS
SELECT
  id,
  "buyerId"      AS buyer_id,
  "workspaceId"  AS workspace_id,
  "marketZip"    AS market_zip,
  "radiusMiles"  AS radius_miles,
  "reasonCode"   AS reason_code,
  "createdAt"    AS created_at
FROM "DealerCoverageGapSignal";

-- sourcing_audit_log → CaseEventLog
CREATE OR REPLACE VIEW public.sourcing_audit_log AS
SELECT
  id,
  "caseId"       AS case_id,
  "actorUserId"  AS actor_user_id,
  "actorRole"    AS actor_role,
  action,
  "beforeValue"  AS before_value,
  "afterValue"   AS after_value,
  notes,
  "createdAt"    AS created_at
FROM "CaseEventLog";


-- ============================================================
-- Section 7: Functions (RLS helpers)
-- ============================================================

-- Create auth schema for Supabase RLS helper functions
-- NOTE: In a Supabase environment, auth.uid() and auth.role() are provided
-- by the platform. The stubs below ensure the migration is syntactically
-- valid when applied outside Supabase (e.g., local dev, CI).
CREATE SCHEMA IF NOT EXISTS auth;

-- Auth schema stub functions for local dev / CI.
-- On a real Supabase instance the platform owns the auth schema and already
-- provides these functions; the DO block below silently skips creation when
-- the caller lacks permission (SQLSTATE 42501 / insufficient_privilege).
-- A different dollar-quote delimiter ($auth_stubs$) is used for the outer
-- block so the inner $$ delimiters are parsed correctly.
DO $auth_stubs$
BEGIN

-- Stub: auth.uid() — provided by Supabase in production
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claim.sub', true),
    ''
  )::uuid;
$$ LANGUAGE SQL STABLE;

-- Stub: auth.role() — provided by Supabase in production
CREATE OR REPLACE FUNCTION auth.role() RETURNS text AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claim.role', true),
    'anon'
  );
$$ LANGUAGE SQL STABLE;

-- auth.user_id() — extract user ID from JWT (from scripts/02-add-rls-policies.sql)
CREATE OR REPLACE FUNCTION auth.user_id() RETURNS uuid AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'sub',
    (current_setting('request.jwt.claims', true)::json->>'user_id')
  )::uuid;
$$ LANGUAGE SQL STABLE;

-- auth.is_admin() — check if JWT role is admin (from scripts/02-add-rls-policies.sql)
CREATE OR REPLACE FUNCTION auth.is_admin() RETURNS boolean AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::json->>'role') IN ('ADMIN', 'SUPER_ADMIN'),
    false
  );
$$ LANGUAGE SQL STABLE;

-- auth.is_super_admin() — SUPER_ADMIN only (from scripts/102-platform-rls-hardening.sql)
CREATE OR REPLACE FUNCTION auth.is_super_admin() RETURNS boolean AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::json->>'role') = 'SUPER_ADMIN',
    false
  );
$$ LANGUAGE SQL STABLE;

-- auth.is_compliance_admin() — COMPLIANCE_ADMIN or SUPER_ADMIN (from scripts/102-platform-rls-hardening.sql)
CREATE OR REPLACE FUNCTION auth.is_compliance_admin() RETURNS boolean AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::json->>'role') IN ('COMPLIANCE_ADMIN', 'SUPER_ADMIN'),
    false
  );
$$ LANGUAGE SQL STABLE;

EXCEPTION WHEN insufficient_privilege THEN
  -- auth schema is managed by Supabase in production; stubs are not needed.
  RAISE NOTICE 'auth schema is managed by Supabase — skipping stub function creation';
END $auth_stubs$;

-- public.current_user_id_uuid() — safe UUID extraction (from scripts/99-admin-rls-audit-fixes.sql)
CREATE OR REPLACE FUNCTION public.current_user_id_uuid()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
DECLARE
  claim_sub text;
  claim_user text;
  uid uuid;
BEGIN
  uid := auth.uid();
  IF uid IS NOT NULL THEN
    RETURN uid;
  END IF;

  claim_sub := NULLIF((current_setting('request.jwt.claims', true)::jsonb ->> 'sub'), '');
  claim_user := NULLIF((current_setting('request.jwt.claims', true)::jsonb ->> 'user_id'), '');

  BEGIN
    IF claim_sub IS NOT NULL THEN
      RETURN claim_sub::uuid;
    END IF;
  EXCEPTION WHEN invalid_text_representation THEN
    -- ignore invalid UUIDs
  END;

  BEGIN
    IF claim_user IS NOT NULL THEN
      RETURN claim_user::uuid;
    END IF;
  EXCEPTION WHEN invalid_text_representation THEN
    -- ignore invalid UUIDs
  END;

  RETURN NULL;
END;
$$;

-- public.current_user_id_text() — user id as text (from scripts/99-admin-rls-audit-fixes.sql)
CREATE OR REPLACE FUNCTION public.current_user_id_text()
RETURNS text
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT COALESCE(
    auth.uid()::text,
    NULLIF((current_setting('request.jwt.claims', true)::jsonb ->> 'sub'), ''),
    NULLIF((current_setting('request.jwt.claims', true)::jsonb ->> 'user_id'), '')
  );
$$;

-- public.is_admin(uuid) — admin check via AdminUser table (from scripts/99-admin-rls-audit-fixes.sql)
CREATE OR REPLACE FUNCTION public.is_admin(p_user uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
DECLARE
  admin_table regclass;
  match_found boolean;
BEGIN
  admin_table := to_regclass('public."AdminUser"');
  IF admin_table IS NULL THEN
    admin_table := to_regclass('public.admin_user');
  END IF;
  IF admin_table IS NULL THEN
    RETURN false;
  END IF;

  BEGIN
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM %s WHERE "userId"::text = $1)', admin_table)
      USING p_user::text
      INTO match_found;
    RETURN COALESCE(match_found, false);
  EXCEPTION WHEN undefined_column THEN
    BEGIN
      EXECUTE format('SELECT EXISTS (SELECT 1 FROM %s WHERE "user_id"::text = $1)', admin_table)
        USING p_user::text
        INTO match_found;
      RETURN COALESCE(match_found, false);
    EXCEPTION WHEN undefined_column THEN
      RETURN false;
    END;
  END;
END;
$$;

-- public.current_dealer_ids() — dealer IDs for current user (from scripts/99-admin-rls-audit-fixes.sql)
CREATE OR REPLACE FUNCTION public.current_dealer_ids()
RETURNS SETOF text
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
  IF to_regclass('public."Dealer"') IS NOT NULL THEN
    RETURN QUERY EXECUTE
      'SELECT d.id::text FROM public."Dealer" d WHERE d."userId"::text = public.current_user_id_text()';
  END IF;

  IF to_regclass('public."DealerUser"') IS NOT NULL THEN
    RETURN QUERY EXECUTE
      'SELECT du."dealerId"::text FROM public."DealerUser" du WHERE du."userId"::text = public.current_user_id_text()';
  END IF;

  RETURN;
END;
$$;

-- public.current_affiliate_ids() — affiliate IDs for current user (from scripts/99-admin-rls-audit-fixes.sql)
CREATE OR REPLACE FUNCTION public.current_affiliate_ids()
RETURNS SETOF text
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
  IF to_regclass('public."Affiliate"') IS NOT NULL THEN
    RETURN QUERY EXECUTE
      'SELECT a.id::text FROM public."Affiliate" a WHERE a."userId"::text = public.current_user_id_text()';
  END IF;

  RETURN;
END;
$$;

-- public.current_user_id() — map auth.uid() to internal User.id (from migrations/101-rls-functions-and-policies.sql)
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM "User" WHERE auth_user_id = auth.uid()::text LIMIT 1;
$$;

-- public.current_workspace_id() — map auth.uid() to workspaceId (from migrations/101-rls-functions-and-policies.sql)
CREATE OR REPLACE FUNCTION public.current_workspace_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT "workspaceId" FROM "User" WHERE auth_user_id = auth.uid()::text LIMIT 1;
$$;

-- public.is_admin() — check admin via User table (from migrations/101-rls-functions-and-policies.sql)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM "User"
    WHERE auth_user_id = auth.uid()::text
      AND role IN ('ADMIN', 'SUPER_ADMIN')
  );
$$;

-- public.in_current_workspace() — workspace membership check (from migrations/101-rls-functions-and-policies.sql)
CREATE OR REPLACE FUNCTION public.in_current_workspace(ws_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ws_id = public.current_workspace_id();
$$;

-- _create_ws_select_policy() — helper for workspace-scoped RLS (from migrations/101-rls-functions-and-policies.sql)
CREATE OR REPLACE FUNCTION _create_ws_select_policy(tbl TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE format(
    'DROP POLICY IF EXISTS ws_select ON %I; CREATE POLICY ws_select ON %I FOR SELECT USING ("workspaceId" = public.current_workspace_id() OR public.is_admin());',
    tbl, tbl
  );
EXCEPTION WHEN undefined_table THEN
  NULL;
END;
$$;


-- ============================================================
-- Section 8: Triggers
-- ============================================================

-- Auto-update DealDocument.updatedAt (from scripts/migrate-documents.sql)
CREATE OR REPLACE FUNCTION update_deal_document_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "DealDocument_updated_at" ON "DealDocument";
CREATE TRIGGER "DealDocument_updated_at"
  BEFORE UPDATE ON "DealDocument"
  FOR EACH ROW EXECUTE FUNCTION update_deal_document_updated_at();

-- Auto-update email_log.updated_at (from scripts/100-sync-schema-all-pending.sql)
CREATE OR REPLACE FUNCTION update_email_log_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_email_log_updated_at_trigger ON email_log;
CREATE TRIGGER update_email_log_updated_at_trigger
  BEFORE UPDATE ON email_log
  FOR EACH ROW
  EXECUTE FUNCTION update_email_log_updated_at();


-- ============================================================
-- Section 9: RLS Enable + Policies
-- ============================================================

-- 9a. Enable RLS on tables

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BuyerProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Dealer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Affiliate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Auction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuctionOffer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SelectedDeal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InventoryItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FinancingOffer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InsuranceQuote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InsurancePolicy" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PickupAppointment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Referral" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Commission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payout" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TradeIn" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN ALTER TABLE "Offer" ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Contract" ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN undefined_table THEN NULL; END $$;

ALTER TABLE "DealerUser" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AdminUser" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN ALTER TABLE "Deal" ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "PreQualification" ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "FinancingOffer" ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "InsuranceQuote" ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ContractShieldScan" ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN undefined_table THEN NULL; END $$;

ALTER TABLE "platform_decisions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "platform_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "trusted_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "identity_trust_records" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "ContractManualReview" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "DealDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DocumentRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AffiliateDocument" ENABLE ROW LEVEL SECURITY;

ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_seo_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_contract_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_leads ENABLE ROW LEVEL SECURITY;

-- 9b. Policies
--
-- NOTE: All policies below use public.current_user_id() and public.is_admin()
-- instead of auth.user_id() / auth.is_admin(). The auth-schema stubs above may
-- be skipped on Supabase (insufficient_privilege), so policies must only
-- reference the public-schema helpers that are guaranteed to exist.

-- ── Policies from scripts/02-add-rls-policies.sql ──

-- User Table Policies
CREATE POLICY "Users can view their own data"
  ON "User" FOR SELECT
  USING (id = public.current_user_id() OR public.is_admin());

CREATE POLICY "Users can update their own data"
  ON "User" FOR UPDATE
  USING (id = public.current_user_id())
  WITH CHECK (id = public.current_user_id());

CREATE POLICY "Admins have full access to users"
  ON "User" FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- BuyerProfile Policies
CREATE POLICY "Buyers can view their own profile"
  ON "BuyerProfile" FOR SELECT
  USING ("userId" = public.current_user_id() OR public.is_admin());

CREATE POLICY "Buyers can update their own profile"
  ON "BuyerProfile" FOR UPDATE
  USING ("userId" = public.current_user_id())
  WITH CHECK ("userId" = public.current_user_id());

CREATE POLICY "Admins have full access to buyer profiles"
  ON "BuyerProfile" FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Dealer Policies
CREATE POLICY "Dealers can view their own dealer data"
  ON "Dealer" FOR SELECT
  USING ("userId" = public.current_user_id() OR public.is_admin());

CREATE POLICY "Dealers can update their own dealer data"
  ON "Dealer" FOR UPDATE
  USING ("userId" = public.current_user_id())
  WITH CHECK ("userId" = public.current_user_id());

CREATE POLICY "Admins have full access to dealers"
  ON "Dealer" FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Affiliate Policies
CREATE POLICY "Affiliates can view their own data"
  ON "Affiliate" FOR SELECT
  USING ("userId" = public.current_user_id() OR public.is_admin());

CREATE POLICY "Affiliates can update their own data"
  ON "Affiliate" FOR UPDATE
  USING ("userId" = public.current_user_id())
  WITH CHECK ("userId" = public.current_user_id());

CREATE POLICY "Admins have full access to affiliates"
  ON "Affiliate" FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Auction Policies
CREATE POLICY "Everyone can view active auctions"
  ON "Auction" FOR SELECT
  USING (status = 'ACTIVE' OR public.is_admin());

CREATE POLICY "Dealers can view auctions they participated in"
  ON "Auction" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "AuctionParticipant" ap
      WHERE ap."auctionId" = "Auction".id
      AND ap."dealerId" IN (SELECT id FROM "Dealer" WHERE "userId" = public.current_user_id())
    )
  );

CREATE POLICY "Admins have full access to auctions"
  ON "Auction" FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- AuctionOffer Policies
CREATE POLICY "Dealers can view their own offers"
  ON "AuctionOffer" FOR SELECT
  USING (
    "participantId" IN (
      SELECT ap.id FROM "AuctionParticipant" ap
      WHERE ap."dealerId" IN (SELECT id FROM "Dealer" WHERE "userId" = public.current_user_id())
    )
    OR public.is_admin()
  );

CREATE POLICY "Dealers can create offers"
  ON "AuctionOffer" FOR INSERT
  WITH CHECK (
    "participantId" IN (
      SELECT ap.id FROM "AuctionParticipant" ap
      WHERE ap."dealerId" IN (SELECT id FROM "Dealer" WHERE "userId" = public.current_user_id())
    )
  );

CREATE POLICY "Admins have full access to auction offers"
  ON "AuctionOffer" FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- SelectedDeal Policies
CREATE POLICY "Buyers can view their own deals"
  ON "SelectedDeal" FOR SELECT
  USING ("buyerId" = public.current_user_id() OR public.is_admin());

CREATE POLICY "Dealers can view deals for their inventory"
  ON "SelectedDeal" FOR SELECT
  USING (
    "inventoryItemId" IN (
      SELECT id FROM "InventoryItem"
      WHERE "dealerId" IN (SELECT id FROM "Dealer" WHERE "userId" = public.current_user_id())
    )
    OR public.is_admin()
  );

CREATE POLICY "Admins have full access to deals"
  ON "SelectedDeal" FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- InventoryItem Policies
CREATE POLICY "Everyone can view active inventory"
  ON "InventoryItem" FOR SELECT
  USING (status = 'AVAILABLE' OR public.is_admin());

CREATE POLICY "Dealers can manage their own inventory"
  ON "InventoryItem" FOR ALL
  USING (
    "dealerId" IN (SELECT id FROM "Dealer" WHERE "userId" = public.current_user_id())
    OR public.is_admin()
  )
  WITH CHECK (
    "dealerId" IN (SELECT id FROM "Dealer" WHERE "userId" = public.current_user_id())
    OR public.is_admin()
  );

-- Offer Policies (table may not exist - wrapped)
DO $$ BEGIN
  CREATE POLICY "Buyers can view their contracts"
    ON "Contract" FOR SELECT
    USING (
      "dealId" IN (SELECT id FROM "SelectedDeal" WHERE "buyerId" = public.current_user_id())
      OR public.is_admin()
    );
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Dealers can view contracts for their deals"
    ON "Contract" FOR SELECT
    USING (
      "dealId" IN (
        SELECT sd.id FROM "SelectedDeal" sd
        JOIN "InventoryItem" ii ON sd."inventoryItemId" = ii.id
        WHERE ii."dealerId" IN (SELECT id FROM "Dealer" WHERE "userId" = public.current_user_id())
      )
      OR public.is_admin()
    );
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins have full access to contracts"
    ON "Contract" FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- FinancingOffer Policies
CREATE POLICY "Buyers can view their financing offers"
  ON "FinancingOffer" FOR SELECT
  USING (
    "dealId" IN (SELECT id FROM "SelectedDeal" WHERE "buyerId" = public.current_user_id())
    OR public.is_admin()
  );

CREATE POLICY "Admins have full access to financing offers"
  ON "FinancingOffer" FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- InsuranceQuote Policies
CREATE POLICY "Buyers can view their insurance quotes"
  ON "InsuranceQuote" FOR SELECT
  USING (
    "buyerId" = public.current_user_id()
    OR public.is_admin()
  );

CREATE POLICY "Admins have full access to insurance quotes"
  ON "InsuranceQuote" FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- InsurancePolicy Policies
CREATE POLICY "Buyers can view their insurance policies"
  ON "InsurancePolicy" FOR SELECT
  USING (
    "dealId" IN (
      SELECT id FROM "SelectedDeal"
      WHERE "buyerId" = public.current_user_id()
    )
    OR public.is_admin()
  );

CREATE POLICY "Admins have full access to insurance policies"
  ON "InsurancePolicy" FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- PickupAppointment Policies
CREATE POLICY "Buyers can view their pickup appointments"
  ON "PickupAppointment" FOR SELECT
  USING (
    "dealId" IN (SELECT id FROM "SelectedDeal" WHERE "buyerId" = public.current_user_id())
    OR public.is_admin()
  );

CREATE POLICY "Dealers can view pickup appointments for their deals"
  ON "PickupAppointment" FOR SELECT
  USING (
    "dealId" IN (
      SELECT sd.id FROM "SelectedDeal" sd
      JOIN "InventoryItem" ii ON sd."inventoryItemId" = ii.id
      WHERE ii."dealerId" IN (SELECT id FROM "Dealer" WHERE "userId" = public.current_user_id())
    )
    OR public.is_admin()
  );

CREATE POLICY "Admins have full access to pickup appointments"
  ON "PickupAppointment" FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Referral Policies
CREATE POLICY "Affiliates can view their referrals"
  ON "Referral" FOR SELECT
  USING (
    "affiliateId" IN (SELECT id FROM "Affiliate" WHERE "userId" = public.current_user_id())
    OR public.is_admin()
  );

CREATE POLICY "Admins have full access to referrals"
  ON "Referral" FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Commission Policies
CREATE POLICY "Affiliates can view their commissions"
  ON "Commission" FOR SELECT
  USING (
    "affiliateId" IN (SELECT id FROM "Affiliate" WHERE "userId" = public.current_user_id())
    OR public.is_admin()
  );

CREATE POLICY "Admins have full access to commissions"
  ON "Commission" FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Payout Policies
CREATE POLICY "Affiliates can view their payouts"
  ON "Payout" FOR SELECT
  USING (
    "affiliateId" IN (SELECT id FROM "Affiliate" WHERE "userId" = public.current_user_id())
    OR public.is_admin()
  );

CREATE POLICY "Admins have full access to payouts"
  ON "Payout" FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- TradeIn Policies
DO $$ BEGIN
  CREATE POLICY "Buyers can view their trade-ins"
    ON "TradeIn" FOR SELECT
    USING ("buyerId" = public.current_user_id() OR public.is_admin());
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Buyers can create trade-ins"
    ON "TradeIn" FOR INSERT
    WITH CHECK ("buyerId" = public.current_user_id());
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Buyers can update their trade-ins"
    ON "TradeIn" FOR UPDATE
    USING ("buyerId" = public.current_user_id())
    WITH CHECK ("buyerId" = public.current_user_id());
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins have full access to trade-ins"
    ON "TradeIn" FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ── Policies from scripts/99-admin-rls-audit-fixes.sql ──

-- Connection canary RLS
DO $$
BEGIN
  IF to_regclass('public._connection_canary') IS NOT NULL THEN
    ALTER TABLE public._connection_canary ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = '_connection_canary'
        AND policyname = 'connection_canary_read'
    ) THEN
      CREATE POLICY "connection_canary_read" ON public._connection_canary
        FOR SELECT
        TO anon, authenticated
        USING (true);
    END IF;
  END IF;
END $$;

-- admin_settings (snake_case)
DO $$
BEGIN
  IF to_regclass('public.admin_settings') IS NOT NULL THEN
    ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'admin_settings'
        AND policyname = 'admin_settings_admin_select'
    ) THEN
      CREATE POLICY "admin_settings_admin_select" ON public.admin_settings
        FOR SELECT TO authenticated
        USING (public.is_admin(public.current_user_id_uuid()));
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'admin_settings'
        AND policyname = 'admin_settings_admin_insert'
    ) THEN
      CREATE POLICY "admin_settings_admin_insert" ON public.admin_settings
        FOR INSERT TO authenticated
        WITH CHECK (public.is_admin(public.current_user_id_uuid()));
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'admin_settings'
        AND policyname = 'admin_settings_admin_update'
    ) THEN
      CREATE POLICY "admin_settings_admin_update" ON public.admin_settings
        FOR UPDATE TO authenticated
        USING (public.is_admin(public.current_user_id_uuid()))
        WITH CHECK (public.is_admin(public.current_user_id_uuid()));
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'admin_settings'
        AND policyname = 'admin_settings_admin_delete'
    ) THEN
      CREATE POLICY "admin_settings_admin_delete" ON public.admin_settings
        FOR DELETE TO authenticated
        USING (public.is_admin(public.current_user_id_uuid()));
    END IF;

    CREATE INDEX IF NOT EXISTS admin_settings_key_idx ON public.admin_settings("key");
  END IF;
END $$;

-- AdminSettings (camelCase)
DO $$
BEGIN
  IF to_regclass('public."AdminSettings"') IS NOT NULL THEN
    ALTER TABLE public."AdminSettings" ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'AdminSettings'
        AND policyname = 'AdminSettings_admin_select'
    ) THEN
      CREATE POLICY "AdminSettings_admin_select" ON public."AdminSettings"
        FOR SELECT TO authenticated
        USING (public.is_admin(public.current_user_id_uuid()));
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'AdminSettings'
        AND policyname = 'AdminSettings_admin_insert'
    ) THEN
      CREATE POLICY "AdminSettings_admin_insert" ON public."AdminSettings"
        FOR INSERT TO authenticated
        WITH CHECK (public.is_admin(public.current_user_id_uuid()));
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'AdminSettings'
        AND policyname = 'AdminSettings_admin_update'
    ) THEN
      CREATE POLICY "AdminSettings_admin_update" ON public."AdminSettings"
        FOR UPDATE TO authenticated
        USING (public.is_admin(public.current_user_id_uuid()))
        WITH CHECK (public.is_admin(public.current_user_id_uuid()));
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'AdminSettings'
        AND policyname = 'AdminSettings_admin_delete'
    ) THEN
      CREATE POLICY "AdminSettings_admin_delete" ON public."AdminSettings"
        FOR DELETE TO authenticated
        USING (public.is_admin(public.current_user_id_uuid()));
    END IF;

    CREATE INDEX IF NOT EXISTS "AdminSettings_key_idx" ON public."AdminSettings"("key");
  END IF;
END $$;

-- AdminUser table access (admin-only)
DO $$
BEGIN
  IF to_regclass('public."AdminUser"') IS NOT NULL THEN
    ALTER TABLE public."AdminUser" ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'AdminUser'
        AND policyname = 'AdminUser_admin_select'
    ) THEN
      CREATE POLICY "AdminUser_admin_select" ON public."AdminUser"
        FOR SELECT TO authenticated
        USING (public.is_admin(public.current_user_id_uuid()));
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'AdminUser'
        AND policyname = 'AdminUser_admin_insert'
    ) THEN
      CREATE POLICY "AdminUser_admin_insert" ON public."AdminUser"
        FOR INSERT TO authenticated
        WITH CHECK (public.is_admin(public.current_user_id_uuid()));
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'AdminUser'
        AND policyname = 'AdminUser_admin_update'
    ) THEN
      CREATE POLICY "AdminUser_admin_update" ON public."AdminUser"
        FOR UPDATE TO authenticated
        USING (public.is_admin(public.current_user_id_uuid()))
        WITH CHECK (public.is_admin(public.current_user_id_uuid()));
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'AdminUser'
        AND policyname = 'AdminUser_admin_delete'
    ) THEN
      CREATE POLICY "AdminUser_admin_delete" ON public."AdminUser"
        FOR DELETE TO authenticated
        USING (public.is_admin(public.current_user_id_uuid()));
    END IF;

    CREATE INDEX IF NOT EXISTS "AdminUser_userId_idx" ON public."AdminUser"("userId");
  END IF;
END $$;

-- SEO tables (snake_case)
DO $$
BEGIN
  IF to_regclass('public.seo_pages') IS NOT NULL THEN
    ALTER TABLE public.seo_pages ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'seo_pages'
        AND policyname = 'seo_pages_admin_select'
    ) THEN
      CREATE POLICY "seo_pages_admin_select" ON public.seo_pages
        FOR SELECT TO authenticated
        USING (public.is_admin(public.current_user_id_uuid()));
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'seo_pages'
        AND policyname = 'seo_pages_admin_write'
    ) THEN
      CREATE POLICY "seo_pages_admin_write" ON public.seo_pages
        FOR ALL TO authenticated
        USING (public.is_admin(public.current_user_id_uuid()))
        WITH CHECK (public.is_admin(public.current_user_id_uuid()));
    END IF;

    CREATE INDEX IF NOT EXISTS seo_pages_page_key_idx ON public.seo_pages(page_key);
  END IF;

  IF to_regclass('public.seo_schema') IS NOT NULL THEN
    ALTER TABLE public.seo_schema ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'seo_schema'
        AND policyname = 'seo_schema_admin_select'
    ) THEN
      CREATE POLICY "seo_schema_admin_select" ON public.seo_schema
        FOR SELECT TO authenticated
        USING (public.is_admin(public.current_user_id_uuid()));
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'seo_schema'
        AND policyname = 'seo_schema_admin_write'
    ) THEN
      CREATE POLICY "seo_schema_admin_write" ON public.seo_schema
        FOR ALL TO authenticated
        USING (public.is_admin(public.current_user_id_uuid()))
        WITH CHECK (public.is_admin(public.current_user_id_uuid()));
    END IF;

    CREATE INDEX IF NOT EXISTS seo_schema_page_key_idx ON public.seo_schema(page_key);
  END IF;

  IF to_regclass('public.seo_health') IS NOT NULL THEN
    ALTER TABLE public.seo_health ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'seo_health'
        AND policyname = 'seo_health_admin_select'
    ) THEN
      CREATE POLICY "seo_health_admin_select" ON public.seo_health
        FOR SELECT TO authenticated
        USING (public.is_admin(public.current_user_id_uuid()));
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'seo_health'
        AND policyname = 'seo_health_admin_write'
    ) THEN
      CREATE POLICY "seo_health_admin_write" ON public.seo_health
        FOR ALL TO authenticated
        USING (public.is_admin(public.current_user_id_uuid()))
        WITH CHECK (public.is_admin(public.current_user_id_uuid()));
    END IF;

    CREATE INDEX IF NOT EXISTS seo_health_page_key_idx ON public.seo_health(page_key);
  END IF;

  IF to_regclass('public.seo_keywords') IS NOT NULL THEN
    ALTER TABLE public.seo_keywords ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'seo_keywords'
        AND policyname = 'seo_keywords_admin_select'
    ) THEN
      CREATE POLICY "seo_keywords_admin_select" ON public.seo_keywords
        FOR SELECT TO authenticated
        USING (public.is_admin(public.current_user_id_uuid()));
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'seo_keywords'
        AND policyname = 'seo_keywords_admin_write'
    ) THEN
      CREATE POLICY "seo_keywords_admin_write" ON public.seo_keywords
        FOR ALL TO authenticated
        USING (public.is_admin(public.current_user_id_uuid()))
        WITH CHECK (public.is_admin(public.current_user_id_uuid()));
    END IF;

    CREATE INDEX IF NOT EXISTS seo_keywords_page_key_idx ON public.seo_keywords(page_key);
  END IF;
END $$;

-- SEO tables (camelCase)
DO $$
BEGIN
  IF to_regclass('public."SeoPages"') IS NOT NULL THEN
    ALTER TABLE public."SeoPages" ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'SeoPages'
        AND policyname = 'SeoPages_admin_select'
    ) THEN
      CREATE POLICY "SeoPages_admin_select" ON public."SeoPages"
        FOR SELECT TO authenticated
        USING (public.is_admin(public.current_user_id_uuid()));
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'SeoPages'
        AND policyname = 'SeoPages_admin_write'
    ) THEN
      CREATE POLICY "SeoPages_admin_write" ON public."SeoPages"
        FOR ALL TO authenticated
        USING (public.is_admin(public.current_user_id_uuid()))
        WITH CHECK (public.is_admin(public.current_user_id_uuid()));
    END IF;

    CREATE INDEX IF NOT EXISTS "SeoPages_page_key_idx" ON public."SeoPages"("pageKey");
  END IF;

  IF to_regclass('public."SeoSchema"') IS NOT NULL THEN
    ALTER TABLE public."SeoSchema" ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'SeoSchema'
        AND policyname = 'SeoSchema_admin_select'
    ) THEN
      CREATE POLICY "SeoSchema_admin_select" ON public."SeoSchema"
        FOR SELECT TO authenticated
        USING (public.is_admin(public.current_user_id_uuid()));
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'SeoSchema'
        AND policyname = 'SeoSchema_admin_write'
    ) THEN
      CREATE POLICY "SeoSchema_admin_write" ON public."SeoSchema"
        FOR ALL TO authenticated
        USING (public.is_admin(public.current_user_id_uuid()))
        WITH CHECK (public.is_admin(public.current_user_id_uuid()));
    END IF;

    CREATE INDEX IF NOT EXISTS "SeoSchema_page_key_idx" ON public."SeoSchema"("pageKey");
  END IF;

  IF to_regclass('public."SeoHealth"') IS NOT NULL THEN
    ALTER TABLE public."SeoHealth" ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'SeoHealth'
        AND policyname = 'SeoHealth_admin_select'
    ) THEN
      CREATE POLICY "SeoHealth_admin_select" ON public."SeoHealth"
        FOR SELECT TO authenticated
        USING (public.is_admin(public.current_user_id_uuid()));
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'SeoHealth'
        AND policyname = 'SeoHealth_admin_write'
    ) THEN
      CREATE POLICY "SeoHealth_admin_write" ON public."SeoHealth"
        FOR ALL TO authenticated
        USING (public.is_admin(public.current_user_id_uuid()))
        WITH CHECK (public.is_admin(public.current_user_id_uuid()));
    END IF;

    CREATE INDEX IF NOT EXISTS "SeoHealth_page_key_idx" ON public."SeoHealth"("pageKey");
  END IF;

  IF to_regclass('public."SeoKeywords"') IS NOT NULL THEN
    ALTER TABLE public."SeoKeywords" ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'SeoKeywords'
        AND policyname = 'SeoKeywords_admin_select'
    ) THEN
      CREATE POLICY "SeoKeywords_admin_select" ON public."SeoKeywords"
        FOR SELECT TO authenticated
        USING (public.is_admin(public.current_user_id_uuid()));
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'SeoKeywords'
        AND policyname = 'SeoKeywords_admin_write'
    ) THEN
      CREATE POLICY "SeoKeywords_admin_write" ON public."SeoKeywords"
        FOR ALL TO authenticated
        USING (public.is_admin(public.current_user_id_uuid()))
        WITH CHECK (public.is_admin(public.current_user_id_uuid()));
    END IF;

    CREATE INDEX IF NOT EXISTS "SeoKeywords_page_key_idx" ON public."SeoKeywords"("pageKey");
  END IF;
END $$;

-- Admin audit tables
DO $$
BEGIN
  IF to_regclass('public."AdminAuditLog"') IS NOT NULL THEN
    ALTER TABLE public."AdminAuditLog" ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'AdminAuditLog'
        AND policyname = 'AdminAuditLog_admin_read'
    ) THEN
      CREATE POLICY "AdminAuditLog_admin_read" ON public."AdminAuditLog"
        FOR SELECT TO authenticated
        USING (public.is_admin(public.current_user_id_uuid()));
    END IF;
  END IF;

  IF to_regclass('public."AdminLoginAttempt"') IS NOT NULL THEN
    ALTER TABLE public."AdminLoginAttempt" ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'AdminLoginAttempt'
        AND policyname = 'AdminLoginAttempt_admin_read'
    ) THEN
      CREATE POLICY "AdminLoginAttempt_admin_read" ON public."AdminLoginAttempt"
        FOR SELECT TO authenticated
        USING (public.is_admin(public.current_user_id_uuid()));
    END IF;
  END IF;
END $$;

-- ── Platform table policies from scripts/100-core-platform-systems.sql ──

CREATE POLICY "platform_decisions_service_only"
  ON "platform_decisions"
  FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE POLICY "platform_events_service_only"
  ON "platform_events"
  FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE POLICY "trusted_documents_service_only"
  ON "trusted_documents"
  FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE POLICY "identity_trust_service_only"
  ON "identity_trust_records"
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Drop redundant legacy policy (from scripts/102-platform-rls-hardening.sql)
DROP POLICY IF EXISTS "platform_events_admin_read" ON "platform_events";

-- ── CMA policies from scripts/101-cma-manual-review.sql ──

-- Allow admin read
CREATE POLICY "admin_cma_read" ON "ContractManualReview"
  FOR SELECT
  USING (true);

-- Allow admin write
CREATE POLICY "admin_cma_write" ON "ContractManualReview"
  FOR ALL
  USING (true);

-- ── Document RLS policies from scripts/migrate-documents.sql ──

-- DealDocument policies
DROP POLICY IF EXISTS "DealDocument: owners can select own docs" ON "DealDocument";
DROP POLICY IF EXISTS "DealDocument: owners can insert"          ON "DealDocument";
DROP POLICY IF EXISTS "DealDocument: owners can update own"      ON "DealDocument";
DROP POLICY IF EXISTS "DealDocument: owners can delete own"      ON "DealDocument";
DROP POLICY IF EXISTS "DealDocument: service role bypass"        ON "DealDocument";

CREATE POLICY "DealDocument: service role bypass"
  ON "DealDocument" FOR ALL
  USING     (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- DocumentRequest policies
DROP POLICY IF EXISTS "DocumentRequest: service role bypass" ON "DocumentRequest";
CREATE POLICY "DocumentRequest: service role bypass"
  ON "DocumentRequest" FOR ALL
  USING     (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- AffiliateDocument policies
DROP POLICY IF EXISTS "AffiliateDocument: service role bypass" ON "AffiliateDocument";
CREATE POLICY "AffiliateDocument: service role bypass"
  ON "AffiliateDocument" FOR ALL
  USING     (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── Policies from scripts/100-sync-schema-all-pending.sql ──

-- email_log policies
DROP POLICY IF EXISTS email_log_admin_all      ON email_log;
DROP POLICY IF EXISTS email_log_user_select    ON email_log;
DROP POLICY IF EXISTS email_log_system_insert  ON email_log;

CREATE POLICY email_log_admin_all ON email_log
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "User"
      WHERE "User".id = auth.uid()::text
      AND "User".role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

CREATE POLICY email_log_user_select ON email_log
  FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY email_log_system_insert ON email_log
  FOR INSERT
  WITH CHECK (true);

-- AI tables policies (admin only)
DROP POLICY IF EXISTS ai_seo_drafts_admin           ON ai_seo_drafts;
DROP POLICY IF EXISTS ai_contract_extractions_admin ON ai_contract_extractions;
DROP POLICY IF EXISTS ai_leads_admin                ON ai_leads;
DROP POLICY IF EXISTS ai_leads_insert               ON ai_leads;

CREATE POLICY ai_seo_drafts_admin ON ai_seo_drafts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM "User" WHERE "User".id = auth.uid()::text AND "User".role IN ('ADMIN','SUPER_ADMIN'))
  );

CREATE POLICY ai_contract_extractions_admin ON ai_contract_extractions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM "User" WHERE "User".id = auth.uid()::text AND "User".role IN ('ADMIN','SUPER_ADMIN'))
  );

CREATE POLICY ai_leads_admin ON ai_leads
  FOR ALL USING (
    EXISTS (SELECT 1 FROM "User" WHERE "User".id = auth.uid()::text AND "User".role IN ('ADMIN','SUPER_ADMIN'))
  );

CREATE POLICY ai_leads_insert ON ai_leads
  FOR INSERT WITH CHECK (true);

-- ── Policies from migrations/101-rls-functions-and-policies.sql ──

-- User table policies (workspace-aware)
DROP POLICY IF EXISTS user_select_own ON "User";
CREATE POLICY user_select_own ON "User"
  FOR SELECT USING (
    id = public.current_user_id() OR public.is_admin()
  );

DROP POLICY IF EXISTS user_update_own ON "User";
CREATE POLICY user_update_own ON "User"
  FOR UPDATE USING (
    id = public.current_user_id() OR public.is_admin()
  ) WITH CHECK (
    id = public.current_user_id() OR public.is_admin()
  );

-- BuyerProfile policies (workspace-aware)
DROP POLICY IF EXISTS buyer_profile_select ON "BuyerProfile";
CREATE POLICY buyer_profile_select ON "BuyerProfile"
  FOR SELECT USING (
    "userId" = public.current_user_id() OR public.is_admin()
  );

DROP POLICY IF EXISTS buyer_profile_update ON "BuyerProfile";
CREATE POLICY buyer_profile_update ON "BuyerProfile"
  FOR UPDATE USING (
    "userId" = public.current_user_id() OR public.is_admin()
  ) WITH CHECK (
    "userId" = public.current_user_id() OR public.is_admin()
  );

-- Dealer policies (workspace-aware)
DROP POLICY IF EXISTS dealer_select ON "Dealer";
CREATE POLICY dealer_select ON "Dealer"
  FOR SELECT USING (
    "userId" = public.current_user_id()
    OR EXISTS (
      SELECT 1 FROM "DealerUser"
      WHERE "DealerUser"."dealerId" = "Dealer".id
        AND "DealerUser"."userId" = public.current_user_id()
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS dealer_update ON "Dealer";
CREATE POLICY dealer_update ON "Dealer"
  FOR UPDATE USING (
    "userId" = public.current_user_id() OR public.is_admin()
  ) WITH CHECK (
    "userId" = public.current_user_id() OR public.is_admin()
  );

-- DealerUser policies
DROP POLICY IF EXISTS dealer_user_select ON "DealerUser";
CREATE POLICY dealer_user_select ON "DealerUser"
  FOR SELECT USING (
    "userId" = public.current_user_id() OR public.is_admin()
  );

DROP POLICY IF EXISTS dealer_user_insert ON "DealerUser";
CREATE POLICY dealer_user_insert ON "DealerUser"
  FOR INSERT WITH CHECK (
    public.is_admin()
  );

DROP POLICY IF EXISTS dealer_user_update ON "DealerUser";
CREATE POLICY dealer_user_update ON "DealerUser"
  FOR UPDATE USING (
    public.is_admin()
  ) WITH CHECK (
    public.is_admin()
  );

-- Affiliate policies (workspace-aware)
DROP POLICY IF EXISTS affiliate_select ON "Affiliate";
CREATE POLICY affiliate_select ON "Affiliate"
  FOR SELECT USING (
    "userId" = public.current_user_id() OR public.is_admin()
  );

DROP POLICY IF EXISTS affiliate_update ON "Affiliate";
CREATE POLICY affiliate_update ON "Affiliate"
  FOR UPDATE USING (
    "userId" = public.current_user_id() OR public.is_admin()
  ) WITH CHECK (
    "userId" = public.current_user_id() OR public.is_admin()
  );

-- AdminUser policies (workspace-aware)
DROP POLICY IF EXISTS admin_user_select ON "AdminUser";
CREATE POLICY admin_user_select ON "AdminUser"
  FOR SELECT USING (
    "userId" = public.current_user_id() OR public.is_admin()
  );

-- Workspace-scoped table policies
SELECT _create_ws_select_policy('Deal');
SELECT _create_ws_select_policy('PreQualification');
SELECT _create_ws_select_policy('Auction');
SELECT _create_ws_select_policy('FinancingOffer');
SELECT _create_ws_select_policy('InsuranceQuote');
SELECT _create_ws_select_policy('ContractShieldScan');
SELECT _create_ws_select_policy('Document');
SELECT _create_ws_select_policy('Payment');

-- Cleanup helper
DROP FUNCTION IF EXISTS _create_ws_select_policy(TEXT);


-- ============================================================
-- Section 10: Storage Buckets + Policies
-- NOTE: The storage schema is provided by Supabase. These statements
-- will only execute when the storage schema exists (i.e., in Supabase).
-- ============================================================

DO $storage$
BEGIN
  -- Only run storage setup if the storage schema exists (Supabase environment)
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
    -- buyer-documents bucket
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'buyer-documents', 'buyer-documents', FALSE, 26214400,
      ARRAY['application/pdf','image/jpeg','image/jpg','image/png','image/webp']
    ) ON CONFLICT (id) DO UPDATE SET
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

    -- affiliate-documents bucket
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'affiliate-documents', 'affiliate-documents', FALSE, 10485760,
      ARRAY['application/pdf','image/jpeg','image/jpg','image/png']
    ) ON CONFLICT (id) DO UPDATE SET
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

    -- buyer-docs bucket (used by external-preapproval service)
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'buyer-docs', 'buyer-docs', FALSE, 26214400,
      ARRAY['application/pdf','image/jpeg','image/jpg','image/png','image/webp']
    ) ON CONFLICT (id) DO UPDATE SET
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

    -- Storage RLS — buyer-documents bucket
    DROP POLICY IF EXISTS "buyer-documents: service role all" ON storage.objects;
    CREATE POLICY "buyer-documents: service role all"
      ON storage.objects FOR ALL
      USING     (bucket_id = 'buyer-documents' AND auth.role() = 'service_role')
      WITH CHECK (bucket_id = 'buyer-documents' AND auth.role() = 'service_role');

    -- Storage RLS — affiliate-documents bucket
    DROP POLICY IF EXISTS "affiliate-documents: service role all" ON storage.objects;
    CREATE POLICY "affiliate-documents: service role all"
      ON storage.objects FOR ALL
      USING     (bucket_id = 'affiliate-documents' AND auth.role() = 'service_role')
      WITH CHECK (bucket_id = 'affiliate-documents' AND auth.role() = 'service_role');

    -- Storage RLS — buyer-docs bucket
    DROP POLICY IF EXISTS "buyer-docs: service role all" ON storage.objects;
    CREATE POLICY "buyer-docs: service role all"
      ON storage.objects FOR ALL
      USING     (bucket_id = 'buyer-docs' AND auth.role() = 'service_role')
      WITH CHECK (bucket_id = 'buyer-docs' AND auth.role() = 'service_role');
  END IF;
END $storage$;


-- ============================================================
-- Section 11: Seed Data (SEO defaults)
-- ============================================================

INSERT INTO seo_pages (page_key, title, description, keywords, og_title, og_description, og_image_url) VALUES
('home', 'AutoLenis — Car Buying. Reengineered.', 'Get pre-qualified instantly, let dealers compete for your business, and drive away with the best deal. Save thousands with AutoLenis transparent car buying process.', 'car buying, pre-qualification, dealer auction, best car prices, transparent car shopping', 'AutoLenis — Car Buying. Reengineered.', 'Join thousands who saved with our transparent car buying platform. Pre-qualification in 5 minutes, dealers compete, you save.', '/og-home.jpg'),
('how-it-works', 'How AutoLenis Works | Step-by-Step Car Buying Process', 'Discover our simple 4-step car buying process: Get pre-qualified, browse inventory, let dealers compete, and drive away with confidence.', 'how to buy a car, car buying process, dealer auction, auto financing', 'How the AutoLenis Car Buying Process Works', 'Simple, transparent, and designed to save you money. See how our process works.', '/og-how-it-works.jpg'),
('pricing', 'AutoLenis Pricing & Fees | Transparent Concierge Service', 'Simple, transparent pricing. Only $499 for vehicles under $35k, $750 for vehicles over. No hidden fees, no surprises.', 'car buying fees, concierge service pricing, transparent fees', 'Transparent Pricing - AutoLenis', 'Simple concierge fees. No hidden charges. Save thousands on your car purchase.', '/og-pricing.jpg'),
('about', 'About AutoLenis | Our Mission to Transform Car Buying', 'Learn about AutoLenis mission to bring transparency and fairness to car buying. Meet our team and discover why we built this platform.', 'about autolenis, car buying revolution, transparent car shopping', 'About AutoLenis - Revolutionizing Car Buying', 'We are changing the way people buy cars for the better.', '/og-about.jpg'),
('contact', 'Contact AutoLenis | Get Help & Support', 'Have questions? Our team is here to help. Reach out via email, phone, or chat for assistance with your car buying journey.', 'contact autolenis, customer support, car buying help', 'Contact Us - AutoLenis Support', 'Get in touch with our support team for any questions about your car purchase.', '/og-contact.jpg'),
('faq', 'FAQ - Frequently Asked Questions | AutoLenis', 'Find answers to common questions about pre-qualification, auctions, fees, financing, insurance, and more.', 'autolenis faq, car buying questions, auction faq', 'Frequently Asked Questions - AutoLenis', 'Get answers to your questions about our car buying platform.', '/og-faq.jpg')
ON CONFLICT (page_key) DO NOTHING;

-- Migration tracking seed data
INSERT INTO schema_migrations (version, description) VALUES
  ('001', 'initialize-database'),
  ('002', 'rls-policies'),
  ('006', 'inventory-fields'),
  ('007', 'auction-fields'),
  ('008', 'deal-fields'),
  ('009', 'payment-fields'),
  ('010', 'prequal-fields'),
  ('011', 'preference-fields'),
  ('012', 'insurance-fields'),
  ('013', 'contract-fields'),
  ('014', 'esign-fields'),
  ('015', 'pickup-fields'),
  ('016', 'affiliate-fields'),
  ('017', 'commission-fields'),
  ('018', 'payment-method'),
  ('019', 'fee-disclosure-fields'),
  ('020', 'dealer-users-table'),
  ('021', 'compliance-fields'),
  ('022', 'prequal-status-enum'),
  ('023', 'admin-settings'),
  ('024', 'dealer-addresses'),
  ('025', 'prequal-cents'),
  ('026', 'buyer-preferences'),
  ('027', 'vehicle-fields'),
  ('028', 'inventory-items'),
  ('029', 'auction-status'),
  ('030', 'auction-offers-cents'),
  ('031', 'financing-options-cents'),
  ('032', 'selected-deals-cents'),
  ('033', 'financing-offers-cents'),
  ('034', 'external-preapprovals-cents'),
  ('035', 'insurance-quotes-cents'),
  ('036', 'insurance-policies'),
  ('037', 'contract-documents'),
  ('038', 'esign-envelopes'),
  ('039', 'pickup-appointments'),
  ('040', 'affiliates'),
  ('041', 'referrals-multilevel'),
  ('042', 'clicks'),
  ('043', 'commissions-cents'),
  ('044', 'payouts-cents'),
  ('045', 'payment-methods'),
  ('046', 'deposit-payments-cents'),
  ('047', 'service-fee-payments-cents'),
  ('048', 'fee-financing-disclosures'),
  ('049', 'lender-disbursements'),
  ('050', 'compliance-events'),
  ('051', 'payment-provider-events'),
  ('052', 'admin-settings-table'),
  ('060', 'auction-offer-decisions'),
  ('070', 'seo-tables'),
  ('071', 'email-verification-table'),
  ('072', 'prequal-engine'),
  ('073', 'inventory-normalization'),
  ('074', 'shortlist-enhancements'),
  ('075', 'dealer-offer-management'),
  ('076', 'best-price-algorithm'),
  ('077', 'deal-builder-engine'),
  ('078', 'insurance-integration'),
  ('079', 'esign-pickup'),
  ('080', 'auth-completion'),
  ('081', 'affiliate-system-hardening'),
  ('090', 'trade-in-table'),
  ('091', 'contact-messages-table'),
  ('092', 'contact-messages-table-v2'),
  ('093', 'email-log-table'),
  ('094', 'admin-mfa-fields'),
  ('095', 'connection-canary-table'),
  ('096', 'schema-alignment-fixes'),
  ('097', 'affiliate-referral-attribution'),
  ('098', 'ai-orchestration-tables'),
  ('099', 'ai-extended-tables'),
  ('099b', 'ai-gemini-max-v2'),
  ('099c', 'admin-rls-audit-fixes'),
  ('100', 'sync-schema-all-pending')
ON CONFLICT (version) DO NOTHING;
