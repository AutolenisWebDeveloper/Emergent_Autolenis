/**
 * Insurance Readiness State Machine
 *
 * Canonical insurance states for the buyer insurance workflow.
 * Insurance is a flexible proof-of-insurance / insurance-readiness system.
 * It MUST NOT block account creation, prequalification, shopping activation,
 * vehicle browsing, shortlist creation, auction initiation, Best Price Report
 * review, or deal selection.
 *
 * Insurance SHOULD ONLY block:
 *   - final delivery release
 *   - pickup handoff
 *   - any final release checkpoint explicitly requiring proof of insurance
 */
export const InsuranceReadinessStatus = {
  /** Buyer has not started insurance yet */
  NOT_STARTED: "NOT_STARTED",
  /** Buyer uploaded current insurance proof */
  CURRENT_INSURANCE_UPLOADED: "CURRENT_INSURANCE_UPLOADED",
  /** Buyer acknowledged insurance is pending and will be provided before delivery */
  INSURANCE_PENDING: "INSURANCE_PENDING",
  /** Buyer requested help with insurance */
  HELP_REQUESTED: "HELP_REQUESTED",
  /** Uploaded proof is under admin review */
  UNDER_REVIEW: "UNDER_REVIEW",
  /** Insurance proof has been verified by admin */
  VERIFIED: "VERIFIED",
  /** Insurance is required before delivery can proceed */
  REQUIRED_BEFORE_DELIVERY: "REQUIRED_BEFORE_DELIVERY",
} as const

export type InsuranceReadinessStatus =
  (typeof InsuranceReadinessStatus)[keyof typeof InsuranceReadinessStatus]

/**
 * Valid insurance state transitions.
 * Ensures the insurance workflow follows the correct progression.
 */
export const INSURANCE_VALID_TRANSITIONS: Record<InsuranceReadinessStatus, InsuranceReadinessStatus[]> = {
  NOT_STARTED: [
    "CURRENT_INSURANCE_UPLOADED",
    "INSURANCE_PENDING",
    "HELP_REQUESTED",
  ],
  CURRENT_INSURANCE_UPLOADED: [
    "UNDER_REVIEW",
    "VERIFIED",
    "REQUIRED_BEFORE_DELIVERY",
  ],
  INSURANCE_PENDING: [
    "CURRENT_INSURANCE_UPLOADED",
    "HELP_REQUESTED",
    "REQUIRED_BEFORE_DELIVERY",
  ],
  HELP_REQUESTED: [
    "CURRENT_INSURANCE_UPLOADED",
    "INSURANCE_PENDING",
    "UNDER_REVIEW",
  ],
  UNDER_REVIEW: [
    "VERIFIED",
    "REQUIRED_BEFORE_DELIVERY",
    "CURRENT_INSURANCE_UPLOADED",
  ],
  VERIFIED: [],
  REQUIRED_BEFORE_DELIVERY: [
    "CURRENT_INSURANCE_UPLOADED",
    "HELP_REQUESTED",
    "VERIFIED",
  ],
}

/** Insurance document tags for uploaded proof */
export const InsuranceDocumentTag = {
  INSURANCE_CARD: "insurance_card",
  INSURANCE_DECLARATIONS: "insurance_declarations",
  INSURANCE_BINDER: "insurance_binder",
  INSURANCE_OTHER: "insurance_other",
} as const

export type InsuranceDocumentTag =
  (typeof InsuranceDocumentTag)[keyof typeof InsuranceDocumentTag]

/** Accepted file types for insurance document uploads */
export const INSURANCE_ACCEPTED_FILE_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/heic",
] as const

/** Insurance statuses that satisfy the delivery release requirement */
export const INSURANCE_DELIVERY_RELEASE_STATUSES: InsuranceReadinessStatus[] = [
  "VERIFIED",
]

/**
 * Check if insurance status allows delivery/pickup release.
 */
export function isInsuranceVerifiedForDelivery(
  status: InsuranceReadinessStatus | string | null | undefined
): boolean {
  return status === InsuranceReadinessStatus.VERIFIED
}

/**
 * Dashboard display configuration per insurance status.
 */
export const INSURANCE_DASHBOARD_CONFIG: Record<
  InsuranceReadinessStatus,
  { label: string; ctaLabel: string; ctaHref: string; variant: "default" | "warning" | "success" | "info" }
> = {
  NOT_STARTED: {
    label: "Not Started",
    ctaLabel: "Upload Current Insurance",
    ctaHref: "/buyer/insurance",
    variant: "default",
  },
  CURRENT_INSURANCE_UPLOADED: {
    label: "Submitted for Review",
    ctaLabel: "View Upload",
    ctaHref: "/buyer/insurance",
    variant: "info",
  },
  INSURANCE_PENDING: {
    label: "Proof Required Before Delivery",
    ctaLabel: "Upload Insurance",
    ctaHref: "/buyer/insurance",
    variant: "warning",
  },
  HELP_REQUESTED: {
    label: "Assistance Requested",
    ctaLabel: "We'll Contact You",
    ctaHref: "/buyer/insurance",
    variant: "info",
  },
  UNDER_REVIEW: {
    label: "Under Review",
    ctaLabel: "View Status",
    ctaHref: "/buyer/insurance",
    variant: "info",
  },
  VERIFIED: {
    label: "Verified",
    ctaLabel: "View Details",
    ctaHref: "/buyer/insurance",
    variant: "success",
  },
  REQUIRED_BEFORE_DELIVERY: {
    label: "Required Before Delivery",
    ctaLabel: "Upload Insurance",
    ctaHref: "/buyer/insurance",
    variant: "warning",
  },
}
