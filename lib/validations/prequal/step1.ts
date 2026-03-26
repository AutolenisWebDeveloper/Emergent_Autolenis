import { z } from "zod"

export const step1Schema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z
    .string()
    .regex(/^\+?1?\d{10}$/, "Phone must be a valid 10-digit US number"),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date of birth must be YYYY-MM-DD")
    .refine((dob) => {
      const date = new Date(dob)
      if (isNaN(date.getTime())) return false
      const age = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
      return age >= 18 && age <= 100
    }, "Applicant must be between 18 and 100 years old"),
  ssn: z
    .string()
    .regex(/^\d{3}-?\d{2}-?\d{4}$/, "SSN must be 9 digits (with or without dashes)"),
})

export type Step1Data = z.infer<typeof step1Schema>
