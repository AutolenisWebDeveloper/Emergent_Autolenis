import { z } from "zod"

export const step4Schema = z.object({
  downPayment: z.number().int().min(0).max(100_000_000),
  targetMonthlyPayment: z.number().int().min(0).max(1_000_000),
  consentGiven: z.literal(true, {
    errorMap: () => ({ message: "You must provide consent to continue" }),
  }),
  consentVersionId: z.string().min(1),
})

export type Step4Data = z.infer<typeof step4Schema>
