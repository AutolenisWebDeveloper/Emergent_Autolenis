import { z } from "zod"

/** Allowed MIME types for pre-approval document uploads (OWASP: allowlist, don't trust Content-Type) */
export const ALLOWED_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
] as const

/** Max file size: 10 MB */
export const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024

export const externalPreApprovalSubmitSchema = z.object({
  lenderName: z.string().min(1, "Lender name is required").max(200),
  approvedAmount: z.number().positive("Approved amount must be positive"),
  apr: z.number().min(0).max(100).optional(),
  termMonths: z.number().int().min(1).max(120).optional(),
  expiresAt: z.string().datetime().optional(),
  submissionNotes: z.string().max(1000).optional(),
})

export const externalPreApprovalReviewSchema = z.object({
  action: z.enum(["APPROVED", "REJECTED"]),
  reviewNotes: z.string().max(1000).optional(),
  rejectionReason: z.string().max(500).optional(),
  rejectionReasonCode: z.string().max(100).optional(),
  // Admin can override values on approval
  approvedAmount: z.number().positive().optional(),
  creditTier: z.enum(["EXCELLENT", "GOOD", "FAIR", "POOR"]).optional(),
  maxMonthlyPaymentCents: z.number().int().positive().optional(),
})

export type ExternalPreApprovalSubmitInput = z.infer<typeof externalPreApprovalSubmitSchema>
export type ExternalPreApprovalReviewInput = z.infer<typeof externalPreApprovalReviewSchema>
