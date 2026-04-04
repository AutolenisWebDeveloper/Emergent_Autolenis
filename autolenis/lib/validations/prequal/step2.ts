import { z } from "zod"

export const step2Schema = z.object({
  addressLine1: z.string().min(1).max(200),
  addressLine2: z.string().max(200).optional(),
  city: z.string().min(1).max(100),
  state: z
    .string()
    .length(2, "State must be a 2-letter abbreviation")
    .toUpperCase(),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, "ZIP code must be 5 or 9 digits"),
  residenceType: z.enum(["OWN", "RENT", "LIVE_WITH_FAMILY", "OTHER"]),
  monthsAtAddress: z.number().int().min(0).max(600),
})

export type Step2Data = z.infer<typeof step2Schema>
