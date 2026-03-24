// Common Zod validators for API requests
// Ensures type safety and validation across all routes

import { z } from "zod"

// Pagination
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

// Search
export const searchSchema = z.object({
  query: z.string().min(1).max(200),
})

// ID validation
export const uuidSchema = z.string().uuid("Invalid ID format")

// Date range
export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

// Status filter
export const statusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "PENDING", "COMPLETED", "CANCELLED"]).optional(),
})

// Sorting
export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
})

// Common query parameters
export const queryParamsSchema = paginationSchema
  .merge(searchSchema.partial())
  .merge(dateRangeSchema)
  .merge(statusSchema)
  .merge(sortSchema)

// ── Financing choice ──────────────────────────────────────────────────
const externalPreApprovalPayloadSchema = z.object({
  lender_name: z.string().min(1, "Lender name is required"),
  approved_amount_cents: z.number().int().positive("Approved amount must be a positive integer (cents)"),
  apr: z.number().min(0, "APR must be non-negative").max(100, "APR must not exceed 100"),
  term_months: z.number().int().min(1, "Term must be at least 1 month").max(360, "Term must not exceed 360 months"),
  document_url: z.string().url("Document URL must be a valid URL").optional(),
})

export const financingChoiceSchema = z.object({
  payment_type: z.enum(["CASH", "FINANCED", "EXTERNAL_PREAPPROVAL"], {
    errorMap: () => ({ message: "payment_type must be CASH, FINANCED, or EXTERNAL_PREAPPROVAL" }),
  }),
  primary_financing_offer_id: z.string().uuid("primary_financing_offer_id must be a valid UUID").optional(),
  external_preapproval: externalPreApprovalPayloadSchema.optional(),
})

export type FinancingChoiceInput = z.infer<typeof financingChoiceSchema>

// ── Deposit payment ───────────────────────────────────────────────────
export const depositPaymentSchema = z.object({
  auctionId: z.string().uuid("auctionId must be a valid UUID"),
})

export type DepositPaymentInput = z.infer<typeof depositPaymentSchema>
