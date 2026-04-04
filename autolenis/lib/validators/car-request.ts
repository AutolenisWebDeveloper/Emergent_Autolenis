import { z } from "zod"

// ---------------------------------------------------------------------------
// Zod schemas for the Vehicle Request (car request) API
// ---------------------------------------------------------------------------

const requestItemSchema = z.object({
  vehicleType: z.enum(["CAR", "SUV", "TRUCK", "VAN"]),
  condition: z.enum(["NEW", "USED", "EITHER"]),
  yearMin: z.number().int().min(1900).max(2040).optional(),
  yearMax: z.number().int().min(1900).max(2040).optional(),
  make: z.string().min(1).max(100).trim(),
  model: z.string().max(100).trim().optional(),
  openToSimilar: z.boolean().optional().default(false),
  trim: z.string().max(100).trim().optional(),
  budgetType: z.enum(["TOTAL_PRICE", "MONTHLY_PAYMENT"]),
  maxTotalOtdBudgetCents: z.number().int().min(0).optional(),
  maxMonthlyPaymentCents: z.number().int().min(0).optional(),
  desiredDownPaymentCents: z.number().int().min(0).optional(),
  mileageMax: z.number().int().min(0).optional(),
  mustHaveFeatures: z
    .array(z.string().max(100))
    .max(20)
    .optional()
    .default([]),
  colors: z.array(z.string().max(50)).max(10).optional().default([]),
  distancePreference: z
    .enum(["DELIVERY", "PICKUP", "EITHER"])
    .optional()
    .default("EITHER"),
  maxDistanceMiles: z.number().int().min(0).max(500).optional(),
  timeline: z
    .enum(["ZERO_7_DAYS", "EIGHT_14_DAYS", "FIFTEEN_30_DAYS", "THIRTY_PLUS_DAYS"])
    .optional()
    .default("FIFTEEN_30_DAYS"),
  vin: z.string().max(17).optional(),
  notes: z.string().max(1000).optional(),
})

export const createCarRequestSchema = z
  .object({
    marketZip: z.string().regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP code"),
    radiusMiles: z.number().int().min(10).max(500).optional().default(50),
    items: z.array(requestItemSchema).min(1).max(3),
    location: z
      .object({
        state: z.string().max(2).optional(),
        zip: z
          .string()
          .regex(/^\d{5}(-\d{4})?$/)
          .optional(),
        city: z.string().max(100).optional(),
      })
      .optional(),
    prequalSnapshot: z.record(z.unknown()).optional(),
  })
  .refine(
    (data) => {
      // Ensure each item's yearMin <= yearMax when both are provided
      return data.items.every((item) => {
        if (item.yearMin != null && item.yearMax != null) {
          return item.yearMin <= item.yearMax
        }
        return true
      })
    },
    { message: "yearMin must not exceed yearMax" },
  )
  .superRefine((data, ctx) => {
    // Validate budget fields based on budget type
    data.items.forEach((item, idx) => {
      const bt = item.budgetType

      if (bt === "TOTAL_PRICE") {
        if (item.maxTotalOtdBudgetCents == null || item.maxTotalOtdBudgetCents <= 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Total Out-the-Door Budget is required when budget type is Total Price.",
            path: ["items", idx, "maxTotalOtdBudgetCents"],
          })
        }
        if (item.desiredDownPaymentCents == null || item.desiredDownPaymentCents < 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Desired Down Payment is required.",
            path: ["items", idx, "desiredDownPaymentCents"],
          })
        }
      } else if (bt === "MONTHLY_PAYMENT") {
        if (item.maxMonthlyPaymentCents == null || item.maxMonthlyPaymentCents <= 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Maximum Monthly Payment is required when budget type is Monthly Payment.",
            path: ["items", idx, "maxMonthlyPaymentCents"],
          })
        }
        if (item.desiredDownPaymentCents == null || item.desiredDownPaymentCents < 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Desired Down Payment is required.",
            path: ["items", idx, "desiredDownPaymentCents"],
          })
        }
      }
    })
  })

export type CreateCarRequestInput = z.infer<typeof createCarRequestSchema>
