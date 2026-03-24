import { Resend } from "resend"

// Lazy-initialized Resend singleton to avoid throwing at module-import time
// when RESEND_API_KEY is not set (e.g. during `next build`).
let _resendInstance: Resend | null = null

function ensureResend(): Resend {
  if (!_resendInstance) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey && process.env.NODE_ENV === "production") {
      throw new Error(
        "[Resend] RESEND_API_KEY is required in production. Set this environment variable to enable email sending."
      )
    }
    if (!apiKey) {
      console.warn(
        "[Resend] RESEND_API_KEY not configured. Email sending will fail. Set this environment variable to enable Resend."
      )
    }
    _resendInstance = new Resend(apiKey || "re_not_configured")
  }
  return _resendInstance
}

// Export a proxy that lazily initialises the Resend client on first use.
// Once initialised the proxy forwards directly to the cached singleton.
export const resend: Resend = new Proxy({} as Resend, {
  get(_target, prop) {
    const instance = ensureResend()
    const value = (instance as any)[prop]
    return typeof value === "function" ? value.bind(instance) : value
  },
})

// Export function accessor for code that uses getResend() pattern
export function getResend(): Resend {
  return ensureResend()
}

// Email configuration constants
export const EMAIL_CONFIG = {
  from: process.env.FROM_EMAIL || process.env.RESEND_FROM_EMAIL || "noreply@autolenis.com",
  replyTo: process.env.RESEND_REPLY_TO || "support@autolenis.com",
  adminEmail: process.env.ADMIN_NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL || "admin@autolenis.com",
} as const
