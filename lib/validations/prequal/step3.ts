import { z } from "zod"

export const step3Schema = z.object({
  employmentType: z.enum(["EMPLOYED", "SELF_EMPLOYED", "RETIRED", "OTHER"]),
  employerName: z.string().max(200).optional(),
  grossMonthlyIncome: z
    .number()
    .int()
    .min(0, "Monthly income cannot be negative")
    .max(10_000_000, "Monthly income is unrealistically large"),
  monthlyHousingPayment: z
    .number()
    .int()
    .min(0, "Housing payment cannot be negative")
    .max(5_000_000, "Monthly housing payment is unrealistically large"),
})

export type Step3Data = z.infer<typeof step3Schema>
