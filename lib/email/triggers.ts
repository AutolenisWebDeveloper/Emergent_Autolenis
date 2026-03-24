/**
 * Email Triggers - Centralized email sending with automatic logging
 * All email sends go through these functions to ensure Resend integration + EmailSendLog tracking
 */

import { resend } from "@/lib/resend"
import { supabase } from "@/lib/db"

type EmailLogType =
  | "verification"
  | "password_reset"
  | "welcome"
  | "contact"
  | "deal_complete"
  | "document_request"
  | "affiliate_payout"
  | "refinance_eligible"
  | "share_link"
  | "password_changed"
  | "2fa_status"
  | "admin_notification"
  | "system"
  | "migration_notice"
  | "set_password"
  | "mfa_enabled"
  | "mfa_disabled"
  | "admin_new_device"
  | "role_changed"
  | "break_glass"
  | "upgrade_confirmation"

interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  type: EmailLogType
  userId?: string
  metadata?: Record<string, any>
  idempotencyKey?: string
}

/**
 * Core email send function - uses Resend SDK and logs to EmailSendLog
 */
export async function sendEmail({
  to,
  subject,
  html,
  type,
  userId,
  metadata = {},
  idempotencyKey,
}: SendEmailOptions) {
  const recipients = Array.isArray(to) ? to : [to]
  const fromEmail = process.env.FROM_EMAIL || process.env.RESEND_FROM_EMAIL || "noreply@autolenis.com"

  // Idempotency check: if key provided, skip if already sent
  if (idempotencyKey) {
    try {
      const { data: existing } = await supabase
        .from("EmailSendLog")
        .select("id")
        .eq("idempotencyKey", idempotencyKey)
        .limit(1)
      if (existing && existing.length > 0) {
        return { success: true, messageId: undefined, deduplicated: true }
      }
    } catch {
      // best-effort — continue with send if check fails
    }
  }

  try {
    // Idempotency check: skip if already sent with same key
    if (idempotencyKey) {
      const { data: existing } = await supabase
        .from("EmailSendLog")
        .select("id")
        .eq("idempotencyKey", idempotencyKey)
        .limit(1)

      if (existing && existing.length > 0) {
        return { success: true, deduplicated: true }
      }
    }

    // Send via Resend SDK
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: recipients,
      subject,
      html,
    })

    if (error) {
      // Log failure
      await logEmail({
        type,
        recipient: recipients[0],
        subject,
        status: "failed",
        userId,
        metadata: { ...metadata, error: error.message },
        idempotencyKey,
      })

      throw new Error(`Failed to send email: ${error.message}`)
    }

    // Log success
    await logEmail({
      type,
      recipient: recipients[0],
      subject,
      status: "sent",
      userId,
      metadata: { ...metadata, resendId: data?.id },
      idempotencyKey,
    })

    return { success: true, messageId: data?.id }
  } catch (error: any) {
    await logEmail({
      type,
      recipient: recipients[0],
      subject,
      status: "failed",
      userId,
      metadata: { ...metadata, error: error.message },
      idempotencyKey,
    })

    throw error
  }
}

/**
 * Log email to EmailSendLog table
 */
async function logEmail({
  type,
  recipient,
  subject,
  status,
  userId,
  metadata,
  idempotencyKey,
}: {
  type: EmailLogType
  recipient: string
  subject: string
  status: "sent" | "failed"
  userId?: string
  metadata?: Record<string, any>
  idempotencyKey?: string
}) {
  try {
    const { error } = await supabase.from("EmailSendLog").insert({
      idempotencyKey: idempotencyKey || crypto.randomUUID(),
      emailType: type,
      recipient,
      subject,
      status,
      userId: userId || null,
      metadata: metadata || {},
    })

    if (error) {
      // best-effort — never fail the send
    }
  } catch {
    // best-effort — never fail the send
  }
}

/**
 * Send verification email
 */
export async function sendVerificationEmail(
  email: string,
  token: string,
  userId?: string
) {
  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://autolenis.com"}/api/auth/verify-email?token=${token}`

  const html = `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 40px;">
        <h1 style="color: oklch(0.38 0.14 278); margin: 0; font-size: 28px; font-weight: 700;">AutoLenis</h1>
      </div>
      
      <div style="background: white; border-radius: 12px; padding: 32px; border: 1px solid oklch(0.915 0.008 260); box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
        <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: oklch(0.13 0.02 260);">Verify Your Email</h2>
        
        <p style="margin: 0 0 24px 0; color: oklch(0.42 0.02 260); line-height: 1.6; font-size: 16px;">
          Welcome to AutoLenis! Please verify your email address to activate your account and start your car-buying journey.
        </p>
        
        <a href="${verificationUrl}" 
           style="display: inline-block; background: oklch(0.38 0.14 278); color: white; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px;">
          Verify Email Address
        </a>
        
        <p style="margin: 24px 0 0 0; color: oklch(0.55 0.02 260); font-size: 14px; line-height: 1.6;">
          If the button doesn't work, copy and paste this link:<br/>
          <span style="color: oklch(0.38 0.14 278); word-break: break-all;">${verificationUrl}</span>
        </p>
        
        <hr style="margin: 24px 0; border: none; border-top: 1px solid oklch(0.915 0.008 260);" />
        
        <p style="margin: 0; color: oklch(0.55 0.02 260); font-size: 13px; line-height: 1.5;">
          This link expires in 24 hours. If you didn't create an account, please ignore this email.
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 32px;">
        <p style="margin: 0; color: oklch(0.55 0.02 260); font-size: 13px;">
          &copy; ${new Date().getFullYear()} <span style="color: oklch(0.65 0.18 278);">AutoLenis</span>. All rights reserved.<br/>
          Questions? Email <a href="mailto:support@autolenis.com" style="color: oklch(0.38 0.14 278);">support@autolenis.com</a>
        </p>
      </div>
    </div>
  `

  return sendEmail({
    to: email,
    subject: "Verify Your AutoLenis Account",
    html,
    type: "verification",
    userId,
    metadata: { token },
  })
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  firstName: string,
  token: string,
  userId?: string
) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://autolenis.com"}/auth/reset-password?token=${token}`

  const html = `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 40px;">
        <h1 style="color: oklch(0.38 0.14 278); margin: 0; font-size: 28px; font-weight: 700;">AutoLenis</h1>
      </div>
      
      <div style="background: white; border-radius: 12px; padding: 32px; border: 1px solid oklch(0.915 0.008 260); box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
        <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: oklch(0.13 0.02 260);">Reset Your Password</h2>
        
        <p style="margin: 0 0 16px 0; color: oklch(0.42 0.02 260); line-height: 1.6; font-size: 16px;">
          Hi ${firstName}, we received a request to reset your AutoLenis password. Click the button below to choose a new password.
        </p>
        
        <a href="${resetUrl}" 
           style="display: inline-block; background: oklch(0.38 0.14 278); color: white; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px;">
          Reset Password
        </a>
        
        <p style="margin: 24px 0 0 0; color: oklch(0.55 0.02 260); font-size: 14px; line-height: 1.6;">
          If the button doesn't work, copy and paste this link:<br/>
          <span style="color: oklch(0.38 0.14 278); word-break: break-all;">${resetUrl}</span>
        </p>
        
        <hr style="margin: 24px 0; border: none; border-top: 1px solid oklch(0.915 0.008 260);" />
        
        <p style="margin: 0; color: oklch(0.55 0.02 260); font-size: 13px; line-height: 1.5;">
          This link expires in 1 hour. If you didn't request a password reset, please ignore this email.
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 32px;">
        <p style="margin: 0; color: oklch(0.55 0.02 260); font-size: 13px;">
          &copy; ${new Date().getFullYear()} <span style="color: oklch(0.65 0.18 278);">AutoLenis</span>. All rights reserved.<br/>
          Questions? Email <a href="mailto:support@autolenis.com" style="color: oklch(0.38 0.14 278);">support@autolenis.com</a>
        </p>
      </div>
    </div>
  `

  return sendEmail({
    to: email,
    subject: "Reset Your AutoLenis Password",
    html,
    type: "password_reset",
    userId,
    metadata: { token },
  })
}

/**
 * Send welcome email
 */
export async function sendWelcomeEmail(
  email: string,
  firstName: string,
  role?: string,
  userId?: string,
  packageTier?: string,
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://autolenis.com"
  const dashboardUrl = `${appUrl}/buyer/dashboard`

  // Build package-specific copy for buyer emails
  let packageBlock = ""
  if (role === "BUYER" && packageTier === "PREMIUM") {
    packageBlock = `
      <div style="background: oklch(0.96 0.02 278); border: 1px solid oklch(0.90 0.06 278); border-radius: 10px; padding: 20px; margin: 20px 0;">
        <h3 style="margin: 0 0 8px; font-size: 16px; font-weight: 700; color: oklch(0.38 0.14 278);">🎉 Premium Concierge Plan</h3>
        <ul style="margin: 0; padding: 0 0 0 18px; color: oklch(0.42 0.02 260); line-height: 1.8; font-size: 14px;">
          <li>$99 deposit credited toward your $499 concierge fee</li>
          <li>$400 remaining after deposit is applied</li>
          <li>Dedicated buying specialist assigned to your case</li>
          <li>Financing assistance, contract review &amp; closing coordination</li>
          <li>Free home delivery</li>
          <li>Priority support throughout your purchase</li>
        </ul>
        <p style="margin: 12px 0 0; color: oklch(0.42 0.02 260); font-size: 14px;"><strong>Next step:</strong> Pay your $99 deposit so we can assign your concierge specialist.</p>
      </div>
    `
  } else if (role === "BUYER") {
    packageBlock = `
      <div style="background: oklch(0.97 0.006 260); border: 1px solid oklch(0.90 0.008 260); border-radius: 10px; padding: 20px; margin: 20px 0;">
        <h3 style="margin: 0 0 8px; font-size: 16px; font-weight: 700; color: oklch(0.13 0.02 260);">Standard / Free Plan</h3>
        <ul style="margin: 0; padding: 0 0 0 18px; color: oklch(0.42 0.02 260); line-height: 1.8; font-size: 14px;">
          <li>$99 serious-buyer deposit required to start your auction</li>
          <li>Deposit credited toward your vehicle purchase at closing</li>
          <li>Self-serve platform experience</li>
          <li>Standard support</li>
        </ul>
        <p style="margin: 12px 0 0; color: oklch(0.42 0.02 260); font-size: 14px;"><strong>Next step:</strong> Complete pre-qualification, then pay your $99 deposit to start your auction.</p>
        <p style="margin: 8px 0 0; color: oklch(0.55 0.02 260); font-size: 13px;">Want a dedicated specialist? You can upgrade to Premium at any time.</p>
      </div>
    `
  }

  const html = `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 40px;">
        <h1 style="color: oklch(0.38 0.14 278); margin: 0; font-size: 28px; font-weight: 700;">AutoLenis</h1>
      </div>
      
      <div style="background: white; border-radius: 12px; padding: 32px; border: 1px solid oklch(0.915 0.008 260); box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
        <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: oklch(0.13 0.02 260);">Welcome to AutoLenis, ${firstName}!</h2>
        
        <p style="margin: 0 0 16px 0; color: oklch(0.42 0.02 260); line-height: 1.6; font-size: 16px;">
          Your account has been successfully created${role ? ` as a ${role.toLowerCase()}` : ""}. You're now ready to experience car buying the way it should be.
        </p>

        ${packageBlock}
        
        <p style="margin: 0 0 24px 0; color: oklch(0.42 0.02 260); line-height: 1.6; font-size: 16px;">
          Get started by visiting your dashboard to begin your car-buying journey with AutoLenis.
        </p>
        
        <a href="${dashboardUrl}" 
           style="display: inline-block; background: oklch(0.38 0.14 278); color: white; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px;">
          Go to Dashboard
        </a>
      </div>
      
      <div style="text-align: center; margin-top: 32px;">
        <p style="margin: 0; color: oklch(0.55 0.02 260); font-size: 13px;">
          &copy; ${new Date().getFullYear()} <span style="color: oklch(0.65 0.18 278);">AutoLenis</span>. All rights reserved.<br/>
          Questions? Email <a href="mailto:support@autolenis.com" style="color: oklch(0.38 0.14 278);">support@autolenis.com</a>
        </p>
      </div>
    </div>
  `

  return sendEmail({
    to: email,
    subject: `Welcome to AutoLenis, ${firstName}!`,
    html,
    type: "welcome",
    userId,
  })
}

/**
 * Send contact form submission notification
 */
export async function sendContactNotification(
  name: string,
  email: string,
  subject: string,
  message: string
) {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL || "admin@autolenis.com"

  const html = `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <h2 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 700; color: oklch(0.13 0.02 260);">New Contact Form Submission</h2>
      
      <div style="background: oklch(0.96 0.006 260); border-radius: 8px; padding: 20px; margin-bottom: 16px;">
        <p style="margin: 0 0 8px 0; color: oklch(0.42 0.02 260);"><strong>Name:</strong> ${name}</p>
        <p style="margin: 0 0 8px 0; color: oklch(0.42 0.02 260);"><strong>Email:</strong> ${email}</p>
        <p style="margin: 0; color: oklch(0.42 0.02 260);"><strong>Subject:</strong> ${subject}</p>
      </div>
      
      <div style="background: white; border: 1px solid oklch(0.915 0.008 260); border-radius: 8px; padding: 20px;">
        <p style="margin: 0 0 8px 0; font-weight: 600; color: oklch(0.13 0.02 260);">Message:</p>
        <p style="margin: 0; color: oklch(0.42 0.02 260); line-height: 1.6; white-space: pre-wrap;">${message}</p>
      </div>
    </div>
  `

  return sendEmail({
    to: adminEmail,
    subject: `New Contact: ${subject}`,
    html,
    type: "contact",
    metadata: { senderName: name, senderEmail: email },
  })
}

/**
 * Triggered when a new user is created - sends welcome email + notifies admin
 */
export async function onUserCreated({
  userId,
  email,
  firstName,
  role,
  referral,
  packageTier,
}: {
  userId: string
  email: string
  firstName: string
  role: string
  referral?: { code: string } | null
  packageTier?: string
}) {
  // Send welcome email to the user (package-aware for buyers)
  await sendWelcomeEmail(email, firstName, role, userId, packageTier)

  // Notify admin of new user (optional, can be disabled for high-volume)
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL
  if (adminEmail) {
    const html = `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 700; color: oklch(0.13 0.02 260);">New User Registration</h2>
        
        <div style="background: oklch(0.96 0.006 260); border-radius: 8px; padding: 20px; margin-bottom: 16px;">
          <p style="margin: 0 0 8px 0; color: oklch(0.42 0.02 260);"><strong>Name:</strong> ${firstName}</p>
          <p style="margin: 0 0 8px 0; color: oklch(0.42 0.02 260);"><strong>Email:</strong> ${email}</p>
          <p style="margin: 0 0 8px 0; color: oklch(0.42 0.02 260);"><strong>Role:</strong> ${role}</p>
          <p style="margin: 0; color: oklch(0.42 0.02 260);"><strong>User ID:</strong> ${userId}</p>
        </div>
        
        ${referral ? `
          <div style="background: oklch(0.72 0.19 162)/10; border: 1px solid oklch(0.72 0.19 162)/20; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
            <p style="margin: 0; color: oklch(0.42 0.02 260);"><strong>Referral Code:</strong> ${referral.code}</p>
          </div>
        ` : ''}
        
        <p style="margin: 0; color: oklch(0.42 0.02 260); font-size: 14px;">User registered at ${new Date().toLocaleString()}</p>
      </div>
    `

    await sendEmail({
      to: adminEmail,
      subject: `New ${role} Registration: ${firstName}`,
      html,
      type: "admin_notification",
      userId,
      metadata: { role, referralCode: referral?.code, packageTier },
    })
  }
}

/**
 * Send upgrade confirmation email when buyer upgrades to PREMIUM
 */
export async function sendUpgradeConfirmationEmail(
  email: string,
  firstName: string,
  userId?: string,
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://autolenis.com"
  const dashboardUrl = `${appUrl}/buyer/dashboard`

  const html = `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 40px;">
        <h1 style="color: oklch(0.38 0.14 278); margin: 0; font-size: 28px; font-weight: 700;">AutoLenis</h1>
      </div>
      
      <div style="background: white; border-radius: 12px; padding: 32px; border: 1px solid oklch(0.915 0.008 260); box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
        <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: oklch(0.13 0.02 260);">You're now on Premium, ${firstName}! 🎉</h2>
        
        <p style="margin: 0 0 16px 0; color: oklch(0.42 0.02 260); line-height: 1.6; font-size: 16px;">
          Your account has been upgraded to the Premium / $499 Concierge Plan. Here's what changes:
        </p>
        
        <div style="background: oklch(0.96 0.02 278); border: 1px solid oklch(0.90 0.06 278); border-radius: 10px; padding: 20px; margin: 20px 0;">
          <ul style="margin: 0; padding: 0 0 0 18px; color: oklch(0.42 0.02 260); line-height: 1.8; font-size: 14px;">
            <li>Your $99 deposit will now be credited toward the concierge fee</li>
            <li>$400 remaining after deposit is applied</li>
            <li>A dedicated buying specialist will be assigned to your case</li>
            <li>Financing assistance, contract review &amp; closing coordination included</li>
            <li>Free home delivery</li>
            <li>Priority support throughout your purchase</li>
          </ul>
        </div>
        
        <a href="${dashboardUrl}" 
           style="display: inline-block; background: oklch(0.38 0.14 278); color: white; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px;">
          Go to Dashboard
        </a>
      </div>
      
      <div style="text-align: center; margin-top: 32px;">
        <p style="margin: 0; color: oklch(0.55 0.02 260); font-size: 13px;">
          &copy; ${new Date().getFullYear()} <span style="color: oklch(0.65 0.18 278);">AutoLenis</span>. All rights reserved.
        </p>
      </div>
    </div>
  `

  return sendEmail({
    to: email,
    subject: `You've upgraded to Premium, ${firstName}!`,
    html,
    type: "upgrade_confirmation",
    userId,
  })
}

/**
 * Notify admin/concierge team when a buyer selects or upgrades to PREMIUM
 */
export async function sendPremiumSpecialistNotification(
  buyerName: string,
  buyerEmail: string,
  buyerId: string,
  source: "REGISTRATION" | "DASHBOARD_UPGRADE",
) {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL || "concierge@autolenis.com"
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://autolenis.com"

  const html = `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <h2 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 700; color: oklch(0.13 0.02 260);">New Premium Buyer — Specialist Assignment Needed</h2>
      
      <div style="background: oklch(0.96 0.02 278); border: 1px solid oklch(0.90 0.06 278); border-radius: 8px; padding: 20px; margin-bottom: 16px;">
        <p style="margin: 0 0 8px 0; color: oklch(0.42 0.02 260);"><strong>Buyer:</strong> ${buyerName}</p>
        <p style="margin: 0 0 8px 0; color: oklch(0.42 0.02 260);"><strong>Email:</strong> ${buyerEmail}</p>
        <p style="margin: 0 0 8px 0; color: oklch(0.42 0.02 260);"><strong>Source:</strong> ${source === "REGISTRATION" ? "Selected at registration" : "Upgraded from Standard"}</p>
        <p style="margin: 0; color: oklch(0.42 0.02 260);"><strong>Buyer ID:</strong> ${buyerId}</p>
      </div>

      <a href="${appUrl}/admin/buyers/${buyerId}" 
         style="display: inline-block; background: oklch(0.38 0.14 278); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
        View Buyer in Admin
      </a>
      
      <p style="margin: 16px 0 0; color: oklch(0.42 0.02 260); font-size: 14px;">
        Please assign a concierge specialist and begin the premium onboarding workflow.
      </p>
    </div>
  `

  return sendEmail({
    to: adminEmail,
    subject: `[Premium] New specialist assignment: ${buyerName}`,
    html,
    type: "admin_notification",
    metadata: { buyerId, source },
  })
}

// ============================================================
// SHARED EMAIL LAYOUT HELPERS
// ============================================================

const BRAND_COLOR = "#4338ca"
const BRAND_COLOR_LIGHT = "#6366f1"
const TEXT_PRIMARY = "#111827"
const TEXT_SECONDARY = "#4b5563"
const TEXT_MUTED = "#6b7280"
const BORDER_COLOR = "#e5e7eb"
const BG_LIGHT = "#f9fafb"

function emailWrapper(content: string, preheader = ""): string {
  return `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <style>
    :root { color-scheme: light dark; }
    @media (prefers-color-scheme: dark) {
      .email-body { background-color: #1f2937 !important; }
      .email-card { background-color: #111827 !important; border-color: #374151 !important; }
      .text-primary { color: #f9fafb !important; }
      .text-secondary { color: #d1d5db !important; }
      .text-muted { color: #9ca3af !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${BG_LIGHT}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  ${preheader ? `<div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</div>` : ""}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${BG_LIGHT};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: ${BRAND_COLOR};">AutoLenis</h1>
            </td>
          </tr>
          <!-- Content Card -->
          <tr>
            <td class="email-card" style="background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid ${BORDER_COLOR}; box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 32px;">
              <p style="margin: 0 0 8px 0; color: ${TEXT_MUTED}; font-size: 13px;">
                &copy; ${new Date().getFullYear()} AutoLenis, Inc. All rights reserved.
              </p>
              <p style="margin: 0 0 8px 0; color: ${TEXT_MUTED}; font-size: 12px;">
                AutoLenis &middot; <a href="mailto:support@autolenis.com" style="color: ${BRAND_COLOR_LIGHT}; text-decoration: none;">support@autolenis.com</a>
              </p>
              <p style="margin: 0; color: ${TEXT_MUTED}; font-size: 11px;">
                This is an automated message. Please do not reply directly to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function ctaButton(text: string, url: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
      <tr>
        <td style="background: ${BRAND_COLOR}; border-radius: 8px; padding: 14px 32px;">
          <a href="${url}" style="color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">${text}</a>
        </td>
      </tr>
    </table>
    <p style="margin: 0; color: ${TEXT_MUTED}; font-size: 13px;">
      Or copy and paste this link: <a href="${url}" style="color: ${BRAND_COLOR_LIGHT}; word-break: break-all;">${url}</a>
    </p>`
}

function securityAlertBanner(): string {
  return `<div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px;">
    <p style="margin: 0; color: #991b1b; font-size: 14px; font-weight: 600;">🔒 Security Alert</p>
  </div>`
}

function disclaimer(text: string): string {
  return `<hr style="margin: 24px 0; border: none; border-top: 1px solid ${BORDER_COLOR};" />
    <p style="margin: 0; color: ${TEXT_MUTED}; font-size: 12px; line-height: 1.5;">${text}</p>`
}

// ============================================================
// ADDITIONAL EMAIL EVENT TRIGGERS
// ============================================================

/**
 * E) Password Changed — security alert
 */
export async function sendPasswordChangedEmail(email: string, firstName: string, userId: string) {
  const signinUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://autolenis.com"}/auth/signin`
  const html = emailWrapper(
    `${securityAlertBanner()}
    <h2 class="text-primary" style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: ${TEXT_PRIMARY};">Your Password Was Changed</h2>
    <p class="text-secondary" style="margin: 0 0 16px 0; color: ${TEXT_SECONDARY}; line-height: 1.6; font-size: 16px;">
      Hi ${firstName}, your AutoLenis account password was successfully changed. If you made this change, no further action is needed.
    </p>
    <p class="text-secondary" style="margin: 0 0 16px 0; color: ${TEXT_SECONDARY}; line-height: 1.6; font-size: 16px;">
      <strong>If you did not make this change</strong>, please reset your password immediately and contact our support team.
    </p>
    ${ctaButton("Sign In to Your Account", signinUrl)}
    ${disclaimer("This is an automated security notification. If you did not request this change, contact support@autolenis.com immediately.")}`,
    "Your AutoLenis password was recently changed."
  )

  return sendEmail({
    to: email,
    subject: "Your AutoLenis Password Was Changed",
    html,
    type: "password_changed",
    userId,
    idempotencyKey: `password_changed_${userId}_${Date.now()}`,
  })
}

/**
 * F) MFA Enabled — security alert
 */
export async function sendMfaEnabledEmail(email: string, firstName: string, userId: string) {
  const html = emailWrapper(
    `${securityAlertBanner()}
    <h2 class="text-primary" style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: ${TEXT_PRIMARY};">Two-Factor Authentication Enabled</h2>
    <p class="text-secondary" style="margin: 0 0 16px 0; color: ${TEXT_SECONDARY}; line-height: 1.6; font-size: 16px;">
      Hi ${firstName}, two-factor authentication (2FA) has been successfully enabled on your AutoLenis account. Your account is now more secure.
    </p>
    <p class="text-secondary" style="margin: 0 0 16px 0; color: ${TEXT_SECONDARY}; line-height: 1.6; font-size: 16px;">
      Make sure to store your recovery codes in a safe place. You'll need them if you lose access to your authenticator app.
    </p>
    ${disclaimer("If you did not enable 2FA, contact support@autolenis.com immediately.")}`,
    "Two-factor authentication has been enabled on your account."
  )

  return sendEmail({
    to: email,
    subject: "Two-Factor Authentication Enabled — AutoLenis",
    html,
    type: "mfa_enabled",
    userId,
    idempotencyKey: `mfa_enabled_${userId}_${Date.now()}`,
  })
}

/**
 * F) MFA Disabled — security alert
 */
export async function sendMfaDisabledEmail(email: string, firstName: string, userId: string) {
  const html = emailWrapper(
    `${securityAlertBanner()}
    <h2 class="text-primary" style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: ${TEXT_PRIMARY};">Two-Factor Authentication Disabled</h2>
    <p class="text-secondary" style="margin: 0 0 16px 0; color: ${TEXT_SECONDARY}; line-height: 1.6; font-size: 16px;">
      Hi ${firstName}, two-factor authentication (2FA) has been removed from your AutoLenis account. Your account is now less secure.
    </p>
    <p class="text-secondary" style="margin: 0 0 16px 0; color: ${TEXT_SECONDARY}; line-height: 1.6; font-size: 16px;">
      <strong>If you did not disable 2FA</strong>, your account may be compromised. Please change your password and re-enable 2FA immediately.
    </p>
    ${disclaimer("If you did not make this change, contact support@autolenis.com immediately.")}`,
    "Two-factor authentication has been disabled on your account."
  )

  return sendEmail({
    to: email,
    subject: "Two-Factor Authentication Disabled — AutoLenis",
    html,
    type: "mfa_disabled",
    userId,
    idempotencyKey: `mfa_disabled_${userId}_${Date.now()}`,
  })
}

/**
 * G) Admin New Device Login — security alert (admin only)
 */
export async function sendAdminNewDeviceEmail(email: string, firstName: string, userId: string, metadata: { ip?: string; userAgent?: string } = {}) {
  const html = emailWrapper(
    `${securityAlertBanner()}
    <h2 class="text-primary" style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: ${TEXT_PRIMARY};">New Admin Login Detected</h2>
    <p class="text-secondary" style="margin: 0 0 16px 0; color: ${TEXT_SECONDARY}; line-height: 1.6; font-size: 16px;">
      Hi ${firstName}, a new sign-in to your AutoLenis admin account was detected.
    </p>
    <div style="background: ${BG_LIGHT}; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
      <p style="margin: 0 0 4px 0; color: ${TEXT_SECONDARY}; font-size: 14px;"><strong>Time:</strong> ${new Date().toUTCString()}</p>
      ${metadata.ip ? `<p style="margin: 0 0 4px 0; color: ${TEXT_SECONDARY}; font-size: 14px;"><strong>IP Address:</strong> ${metadata.ip}</p>` : ""}
      ${metadata.userAgent ? `<p style="margin: 0; color: ${TEXT_SECONDARY}; font-size: 14px;"><strong>Device:</strong> ${metadata.userAgent.substring(0, 100)}</p>` : ""}
    </div>
    <p class="text-secondary" style="margin: 0 0 16px 0; color: ${TEXT_SECONDARY}; line-height: 1.6; font-size: 16px;">
      If this was you, no action is needed. If you don't recognize this activity, please change your password and contact the security team.
    </p>
    ${disclaimer("This notification is sent for every new admin login for security compliance.")}`,
    "New admin sign-in detected on your AutoLenis account."
  )

  return sendEmail({
    to: email,
    subject: "New Admin Login Detected — AutoLenis",
    html,
    type: "admin_new_device",
    userId,
    idempotencyKey: `admin_new_device_${userId}_${Date.now()}`,
  })
}

/**
 * H) Role Changed — security alert (admin)
 */
export async function sendRoleChangedEmail(email: string, firstName: string, userId: string, oldRole: string, newRole: string) {
  const html = emailWrapper(
    `${securityAlertBanner()}
    <h2 class="text-primary" style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: ${TEXT_PRIMARY};">Your Account Role Was Changed</h2>
    <p class="text-secondary" style="margin: 0 0 16px 0; color: ${TEXT_SECONDARY}; line-height: 1.6; font-size: 16px;">
      Hi ${firstName}, your AutoLenis account role has been updated by an administrator.
    </p>
    <div style="background: ${BG_LIGHT}; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
      <p style="margin: 0 0 4px 0; color: ${TEXT_SECONDARY}; font-size: 14px;"><strong>Previous Role:</strong> ${oldRole}</p>
      <p style="margin: 0; color: ${TEXT_SECONDARY}; font-size: 14px;"><strong>New Role:</strong> ${newRole}</p>
    </div>
    <p class="text-secondary" style="margin: 0 0 16px 0; color: ${TEXT_SECONDARY}; line-height: 1.6; font-size: 16px;">
      This change affects your access and permissions on the platform. If you believe this was done in error, contact your administrator.
    </p>
    ${disclaimer("This is an automated security notification from AutoLenis.")}`,
    "Your account role has been updated."
  )

  return sendEmail({
    to: email,
    subject: "Account Role Updated — AutoLenis",
    html,
    type: "role_changed",
    userId,
    idempotencyKey: `role_changed_${userId}_${newRole}_${Date.now()}`,
  })
}

/**
 * I) Break-glass use — security alert (admin)
 */
export async function sendBreakGlassEmail(adminEmail: string, actorEmail: string, userId: string, action: string, reason: string) {
  const html = emailWrapper(
    `${securityAlertBanner()}
    <h2 class="text-primary" style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: ${TEXT_PRIMARY};">⚠️ Break-Glass Access Used</h2>
    <p class="text-secondary" style="margin: 0 0 16px 0; color: ${TEXT_SECONDARY}; line-height: 1.6; font-size: 16px;">
      An administrator has used break-glass (emergency override) access on the AutoLenis platform.
    </p>
    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
      <p style="margin: 0 0 4px 0; color: #991b1b; font-size: 14px;"><strong>Actor:</strong> ${actorEmail}</p>
      <p style="margin: 0 0 4px 0; color: #991b1b; font-size: 14px;"><strong>Action:</strong> ${action}</p>
      <p style="margin: 0 0 4px 0; color: #991b1b; font-size: 14px;"><strong>Reason:</strong> ${reason}</p>
      <p style="margin: 0; color: #991b1b; font-size: 14px;"><strong>Time:</strong> ${new Date().toUTCString()}</p>
    </div>
    <p class="text-secondary" style="margin: 0 0 16px 0; color: ${TEXT_SECONDARY}; line-height: 1.6; font-size: 16px;">
      This event has been logged to the admin audit trail. Review it promptly to ensure compliance.
    </p>
    ${disclaimer("Break-glass events are automatically audited and require post-incident review per compliance policy.")}`,
    "URGENT: Break-glass access was used on AutoLenis."
  )

  return sendEmail({
    to: adminEmail,
    subject: "⚠️ Break-Glass Access Alert — AutoLenis",
    html,
    type: "break_glass",
    userId,
    idempotencyKey: `break_glass_${userId}_${Date.now()}`,
  })
}

/**
 * A) Migration Notice — campaign email for auth migration
 */
export async function sendMigrationNoticeEmail(email: string, firstName: string, userId: string) {
  const signinUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://autolenis.com"}/auth/signin`
  const html = emailWrapper(
    `<h2 class="text-primary" style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: ${TEXT_PRIMARY};">Important: Account Security Upgrade</h2>
    <p class="text-secondary" style="margin: 0 0 16px 0; color: ${TEXT_SECONDARY}; line-height: 1.6; font-size: 16px;">
      Hi ${firstName}, we've upgraded our authentication system to provide you with stronger security, faster logins, and a smoother experience across all AutoLenis portals.
    </p>
    <p class="text-secondary" style="margin: 0 0 16px 0; color: ${TEXT_SECONDARY}; line-height: 1.6; font-size: 16px;">
      <strong>What's changed:</strong> Your account now uses our new secure authentication platform. You may be asked to set a new password the next time you sign in.
    </p>
    <p class="text-secondary" style="margin: 0 0 24px 0; color: ${TEXT_SECONDARY}; line-height: 1.6; font-size: 16px;">
      All your data, preferences, and history remain exactly as they were. No action is needed right now.
    </p>
    ${ctaButton("Sign In", signinUrl)}
    ${disclaimer("If you have questions about this change, contact support@autolenis.com. AutoLenis is an informational platform and does not provide legal or financial advice.")}`,
    "Your AutoLenis account security has been upgraded."
  )

  return sendEmail({
    to: email,
    subject: "Account Security Upgrade — AutoLenis",
    html,
    type: "migration_notice",
    userId,
    idempotencyKey: `migration_notice_${userId}`,
  })
}

/**
 * B) Set Your Password — backfill email for users migrated without password
 */
export async function sendSetPasswordEmail(email: string, firstName: string, userId: string, resetUrl: string) {
  const html = emailWrapper(
    `<h2 class="text-primary" style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: ${TEXT_PRIMARY};">Set Your New Password</h2>
    <p class="text-secondary" style="margin: 0 0 16px 0; color: ${TEXT_SECONDARY}; line-height: 1.6; font-size: 16px;">
      Hi ${firstName}, as part of our security upgrade, you'll need to set a new password for your AutoLenis account.
    </p>
    <p class="text-secondary" style="margin: 0 0 24px 0; color: ${TEXT_SECONDARY}; line-height: 1.6; font-size: 16px;">
      Click the button below to create your new password. This link is valid for 24 hours.
    </p>
    ${ctaButton("Set New Password", resetUrl)}
    ${disclaimer("If you did not request this, you can safely ignore this email. Your current account remains unchanged until you set a new password.")}`,
    "Set your new password for AutoLenis."
  )

  return sendEmail({
    to: email,
    subject: "Set Your Password — AutoLenis",
    html,
    type: "set_password",
    userId,
    idempotencyKey: `set_password_${userId}`,
  })
}
