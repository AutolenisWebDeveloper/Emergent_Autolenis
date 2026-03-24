import { z } from "zod"

export const buyerProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required").optional(),
  lastName: z.string().min(1, "Last name is required").optional(),
  phone: z
    .string()
    .regex(/^\d{10}$/, "Phone must be 10 digits")
    .optional(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
    .optional(),
  addressLine1: z.string().min(1, "Address is required").optional(),
  addressLine2: z.string().optional(),
  city: z.string().min(1, "City is required").optional(),
  state: z.string().min(2, "State is required").optional(),
  postalCode: z
    .string()
    .regex(/^\d{5}(-\d{4})?$/, "ZIP must be 5 or 9 digits")
    .optional(),
  country: z.string().default("US").optional(),
  employmentStatus: z.enum(["employed", "self-employed", "unemployed", "retired", "student"]).optional(),
  employerName: z.string().optional(),
  monthlyIncomeCents: z.number().int().nonnegative("Income must be non-negative").optional(),
  monthlyHousingCents: z.number().int().nonnegative("Housing cost must be non-negative").optional(),
  // Legacy field support
  address: z.string().optional(),
  zip: z.string().optional(),
  employment: z.string().optional(),
  employer: z.string().optional(),
  annualIncome: z.number().positive().optional(),
  housingStatus: z.enum(["OWN", "RENT", "OTHER"]).optional(),
  monthlyHousing: z.number().nonnegative().optional(),
})

export const preQualStartSchema = z.object({
  consentGiven: z.literal(true, {
    errorMap: () => ({ message: "You must consent to a soft credit pull" }),
  }),
  consentText: z.string().optional(),
  ssnLast4: z
    .string()
    .regex(/^\d{4}$/, "SSN last 4 must be 4 digits")
    .optional(),
})

// Legacy schemas for backward compatibility
export const softPullConsentSchema = z.object({
  ssn: z
    .string()
    .regex(/^\d{9}$/, "SSN must be 9 digits")
    .optional(),
  ssnLast4: z
    .string()
    .regex(/^\d{4}$/, "SSN last 4 must be 4 digits")
    .optional(),
  dob: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
    .optional(),
  consentGiven: z.literal(true, {
    errorMap: () => ({ message: "You must give consent for credit check" }),
  }),
})

export type BuyerProfileInput = z.infer<typeof buyerProfileSchema>
export type PreQualStartInput = z.infer<typeof preQualStartSchema>
export type SoftPullConsentInput = z.infer<typeof softPullConsentSchema>
