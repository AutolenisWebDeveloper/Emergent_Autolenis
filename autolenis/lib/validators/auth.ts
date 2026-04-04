import { z } from "zod"

export const signUpSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["BUYER", "DEALER", "AFFILIATE"]),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().nullish(),
  refCode: z.string().nullish(),
  referralCode: z.string().nullish(),
  businessName: z.string().nullish(),
  marketingSmsConsent: z.boolean().nullish(),
  marketingEmailConsent: z.boolean().nullish(),
  contactConsent: z.boolean().nullish(),
  consentTextVersion: z.string().nullish(),
  consentTimestamp: z.string().nullish(),
  formSource: z.string().nullish(),
  // Buyer package tier – required when role is BUYER
  packageTier: z.enum(["STANDARD", "PREMIUM"]).nullish(),
}).refine(
  (data) => data.role !== "BUYER" || (data.packageTier === "STANDARD" || data.packageTier === "PREMIUM"),
  { message: "Package tier is required for buyer registration", path: ["packageTier"] },
)

export const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

export type SignUpInput = z.infer<typeof signUpSchema>
export type SignInInput = z.infer<typeof signInSchema>
