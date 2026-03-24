import { z } from "zod"

const envSchema = z.object({
  // Supabase (Required)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY must be non-empty if set").optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: z.string().min(1).optional(),

  // Authentication (Required)
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),

  // Stripe (Required)
  STRIPE_SECRET_KEY: z.string().startsWith("sk_", "STRIPE_SECRET_KEY must start with sk_"),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z
    .string()
    .startsWith("pk_", "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must start with pk_"),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, "STRIPE_WEBHOOK_SECRET is required for Stripe webhook verification").optional(),

  // Cron (Required if cron jobs exist)
  CRON_SECRET: z.string().min(1, "CRON_SECRET is required for cron job security"),

  // Database URLs (Optional — Prisma is optional, Supabase is primary)
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL").optional(),
  POSTGRES_PRISMA_URL: z.string().url("POSTGRES_PRISMA_URL must be a valid URL").optional(),

  // Email (Required — all emails are sent LIVE via Resend)
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required — all emails must send LIVE via Resend"),
  // At least one from-email should be set; EMAIL_CONFIG.from in resend.ts falls back to noreply@autolenis.com
  FROM_EMAIL: z.string().email("FROM_EMAIL must be a valid email address (verified Resend sender)").optional(),
  RESEND_FROM_EMAIL: z.string().email("RESEND_FROM_EMAIL must be a valid email address").optional(),

  // Supabase (Optional)
  SUPABASE_URL: z.string().url("SUPABASE_URL must be a valid URL").optional(),
  SUPABASE_JWT_SECRET: z.string().min(1, "SUPABASE_JWT_SECRET must not be empty").optional(),

  // Database URLs (Optional — used by Prisma directUrl and migration scripts)
  POSTGRES_URL: z.string().url("POSTGRES_URL must be a valid URL").optional(),
  POSTGRES_URL_NON_POOLING: z.string().url("POSTGRES_URL_NON_POOLING must be a valid URL").optional(),

  // E-sign webhooks (Optional)
  ESIGN_WEBHOOK_SECRET: z.string().min(1, "ESIGN_WEBHOOK_SECRET must not be empty").optional(),

  // DocuSign (Optional — required for dealer agreement signing)
  DOCUSIGN_ACCOUNT_ID: z.string().min(1).optional(),
  DOCUSIGN_INTEGRATION_KEY: z.string().min(1).optional(),
  DOCUSIGN_SECRET_KEY: z.string().min(1).optional(),
  DOCUSIGN_USER_ID: z.string().min(1).optional(),
  DOCUSIGN_AUTH_SERVER: z.string().min(1).optional(),
  DOCUSIGN_PRIVATE_KEY_BASE64: z.string().min(1).optional(),
  DOCUSIGN_BASE_URL: z.string().url().optional(),
  DOCUSIGN_BASE_PATH: z.string().min(1).optional(),
  DOCUSIGN_OAUTH_BASE_URL: z.string().url().optional(),
  DOCUSIGN_DEALER_TEMPLATE_ID: z.string().min(1).optional(),
  DOCUSIGN_WEBHOOK_SECRET: z.string().min(1).optional(),
  DOCUSIGN_CONNECT_SECRET: z.string().min(1).optional(),
  DOCUSIGN_RETURN_URL: z.string().url().optional(),
  DOCUSIGN_BRAND_ID: z.string().min(1).optional(),
  DOCUSIGN_ENV: z.enum(["sandbox", "production"]).optional(),

  // AI / Gemini (Optional)
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY must not be empty").optional(),

  // Optional but recommended
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  ADMIN_NOTIFICATION_EMAIL: z.string().email().optional(),
  INTERNAL_API_KEY: z.string().optional(),
  DEV_EMAIL_TO: z.string().email("DEV_EMAIL_TO must be a valid email when set").optional(),
}).refine(
  (data) => data.NEXT_PUBLIC_SUPABASE_ANON_KEY || data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
  {
    message: "Either NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY must be set",
    path: ["NEXT_PUBLIC_SUPABASE_ANON_KEY"],
  },
)

// Validate environment variables
const parseEnv = () => {
  try {
    return envSchema.parse(process.env)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map((e) => `  - ${e.path.join(".")}: ${e.message}`).join("\n")
      throw new Error(
        `\n\n❌ Invalid environment variables:\n\n${missingVars}\n\nPlease check your .env file and ensure all required variables are set.\n`,
      )
    }
    throw error
  }
}

// Export validated env
export const env = parseEnv()

// Export type for TypeScript autocomplete
export type Env = z.infer<typeof envSchema>
