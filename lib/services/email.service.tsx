/**
 * Email Service - Using Resend as the ONLY email provider
 * Core email functions (verification, password reset, welcome, contact) delegate to lib/email/triggers.ts
 * All other domain-specific emails are handled here with Resend SDK + automatic logging
 */

import { logger } from "@/lib/logger"
import { prisma } from "@/lib/db"
import { resend, EMAIL_CONFIG } from "@/lib/resend"
import { sendEmail, sendVerificationEmail, sendPasswordResetEmail as triggerPasswordResetEmail, sendContactNotification } from "@/lib/email/triggers"
import { escapeHtml } from "@/lib/utils/escape-html"


// Type definitions for the email service
interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
  from?: string
  replyTo?: string
  tags?: Array<{ name: string; value: string }>
}

interface EmailLogContext {
  templateKey?: string
  userId?: string
  affiliateId?: string
  dealId?: string
  auctionId?: string
  correlationId?: string
}

interface SendEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

function getFromName() {
  return process.env['FROM_NAME'] || "AutoLenis"
}
function getAppUrl() {
  return process.env['NEXT_PUBLIC_APP_URL'] || "https://autolenis.com"
}
function getAdminEmail() {
  return EMAIL_CONFIG.adminEmail
}

/**
 * Resolve recipient - in dev, redirect to DEV_EMAIL_TO if set
 */
function resolveRecipient(originalTo: string): string {
  const isDev = process.env.NODE_ENV !== "production"
  const devOverride = process.env.DEV_EMAIL_TO

  if (isDev && devOverride) {
    logger.info(`DEV_EMAIL_TO active - redirecting ${originalTo} to ${devOverride}`)
    return devOverride
  }
  return originalTo
}

export class EmailService {
  /**
   * Email verification - delegates to triggers
   */
  async sendEmailVerification(email: string, token: string, userId?: string) {
    const resolvedEmail = resolveRecipient(email)
    return sendVerificationEmail(resolvedEmail, token, userId)
  }

  private async sendViaResend(options: EmailOptions & { from: string }): Promise<SendEmailResult> {
    const payload: Record<string, unknown> = {
      from: options.from,
      to: options.to,
      subject: options.subject,
    }
    if (options.html) payload.html = options.html
    if (options.text) payload.text = options.text
    if (options.replyTo) payload.replyTo = options.replyTo
    if (options.tags) payload.tags = options.tags

    const { data, error } = await resend.emails.send(payload as any)

    if (error) {
      throw new Error(`Resend API error: ${error.message}`)
    }

    return { success: true, messageId: data?.id }
  }

  private async logEmail(entry: Record<string, unknown>): Promise<void> {
    try {
      await prisma.emailSendLog.create({
        data: {
          idempotencyKey: (entry.correlationId as string) || crypto.randomUUID(),
          emailType: (entry.templateKey as string) || "unknown",
          recipient: (entry.to as string) || "",
          subject: (entry.subject as string) || "",
          userId: (entry.userId as string) || null,
          resendMessageId: (entry.resendMessageId as string) || null,
          status: ((entry.status as string) || "pending").toLowerCase(),
          metadata: {
            from: (entry.from as string) || "",
            affiliateId: (entry.affiliateId as string) || null,
            dealId: (entry.dealId as string) || null,
            auctionId: (entry.auctionId as string) || null,
            errorMessage: (entry.errorMessage as string) || null,
          },
        },
      })
    } catch {
      // best-effort — never fail the send
    }
  }

  /**
   * Core send method — resolves recipient, sends via Resend, logs the result.
   * Used internally by all domain-specific email methods and can be called
   * directly for ad-hoc emails (e.g. affiliate share-link).
   */
  async send(options: EmailOptions, context: EmailLogContext = {}): Promise<SendEmailResult> {
    // Validate required env vars — fail loudly, never silently skip
    if (!process.env['RESEND_API_KEY']) {
      throw new Error("RESEND_API_KEY is not configured. Set this environment variable to enable email sending via Resend.")
    }

    // FROM_EMAIL or RESEND_FROM_EMAIL must be set
    if (!process.env['FROM_EMAIL'] && !process.env['RESEND_FROM_EMAIL']) {
      throw new Error("FROM_EMAIL is not configured. Set FROM_EMAIL or RESEND_FROM_EMAIL environment variable.")
    }

    const fromAddress = EMAIL_CONFIG.from

    const resolvedTo = resolveRecipient(options.to)
    const from = options.from || `${getFromName()} <${fromAddress}>`

    try {
      const result = await this.sendViaResend({ ...options, to: resolvedTo, from })

      await this.logEmail({
        ...context,
        to: resolvedTo,
        from,
        subject: options.subject,
        resendMessageId: result.messageId,
        status: "SENT",
      })

      return result
    } catch (err: any) {
      const errorMessage = err?.message || "Unknown send error"
      logger.error("[EmailService.send] failed", { to: resolvedTo, subject: options.subject, error: errorMessage })

      await this.logEmail({
        ...context,
        to: resolvedTo,
        from,
        subject: options.subject,
        status: "FAILED",
        errorMessage,
      })

      return { success: false, error: errorMessage }
    }
  }

  /**
   * Welcome email
   */
  async sendWelcomeEmail(
    email: string,
    firstName: string,
    role?: string,
    userId?: string
  ) {
    const appUrl = getAppUrl()
    const html = `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: oklch(0.38 0.14 278); margin: 0; font-size: 28px; font-weight: 700;">AutoLenis</h1>
        </div>
        <div style="background: white; border-radius: 12px; padding: 32px; border: 1px solid oklch(0.915 0.008 260); box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
          <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: oklch(0.13 0.02 260);">Welcome to AutoLenis!</h2>
          <p style="margin: 0 0 16px 0; color: oklch(0.42 0.02 260); line-height: 1.6; font-size: 16px;">
            Hi ${firstName}, welcome to AutoLenis! We're excited to have you on board${role ? ` as a ${role.toLowerCase()}` : ""}.
          </p>
          <a href="${appUrl}/dashboard" style="display: inline-block; background: oklch(0.38 0.14 278); color: white; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px;">
            Go to Dashboard
          </a>
        </div>
      </div>
    `
    return this.send(
      { to: email, subject: "Welcome to AutoLenis!", html },
      { templateKey: "welcome", userId },
    )
  }

  /**
   * Contact notification - delegates to triggers
   */
  async sendContactNotification(
    name: string,
    email: string,
    subject: string,
    message: string
  ) {
    return sendContactNotification(name, email, subject, message)
  }

  /**
   * Password changed confirmation
   */
  async sendPasswordChangedEmail(
    email: string,
    firstName: string,
    userId?: string
  ) {
    const html = `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: oklch(0.38 0.14 278); margin: 0; font-size: 28px; font-weight: 700;">AutoLenis</h1>
        </div>
        
        <div style="background: white; border-radius: 12px; padding: 32px; border: 1px solid oklch(0.915 0.008 260); box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
          <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: oklch(0.13 0.02 260);">Password Changed</h2>
          
          <p style="margin: 0 0 16px 0; color: oklch(0.42 0.02 260); line-height: 1.6; font-size: 16px;">
            Hi ${firstName},
          </p>
          
          <p style="margin: 0 0 16px 0; color: oklch(0.42 0.02 260); line-height: 1.6; font-size: 16px;">
            Your AutoLenis password was recently changed. If you made this change, no further action is needed.
          </p>
          
          <p style="margin: 0; color: oklch(0.42 0.02 260); line-height: 1.6; font-size: 16px;">
            If you did not change your password, please reset it immediately or contact support.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 32px;">
          <p style="margin: 0; color: oklch(0.55 0.02 260); font-size: 13px;">
            &copy; ${new Date().getFullYear()} <span style="color: oklch(0.65 0.18 278);">AutoLenis</span>. All rights reserved.
          </p>
        </div>
      </div>
    `

    return this.send(
      { to: email, subject: "Your password was changed - AutoLenis", html },
      { templateKey: "password_changed", userId },
    )
  }

  /**
   * 2FA status change notification
   */
  async send2FAStatusEmail(
    email: string,
    firstName: string,
    enabled: boolean,
    userId?: string
  ) {
    const action = enabled ? "enabled" : "disabled"
    const html = `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: oklch(0.38 0.14 278); margin: 0; font-size: 28px; font-weight: 700;">AutoLenis</h1>
        </div>
        
        <div style="background: white; border-radius: 12px; padding: 32px; border: 1px solid oklch(0.915 0.008 260); box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
          <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: oklch(0.13 0.02 260);">2FA ${
            enabled ? "Enabled" : "Disabled"
          }</h2>
          
          <p style="margin: 0 0 16px 0; color: oklch(0.42 0.02 260); line-height: 1.6; font-size: 16px;">
            Hi ${firstName},
          </p>
          
          <p style="margin: 0; color: oklch(0.42 0.02 260); line-height: 1.6; font-size: 16px;">
            Two-factor authentication has been <strong>${action}</strong> on your account. If you did not make this change, please contact support immediately.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 32px;">
          <p style="margin: 0; color: oklch(0.55 0.02 260); font-size: 13px;">
            &copy; ${new Date().getFullYear()} <span style="color: oklch(0.65 0.18 278);">AutoLenis</span>. All rights reserved.
          </p>
        </div>
      </div>
    `

    return this.send(
      { to: email, subject: `Two-Factor Authentication ${enabled ? "Enabled" : "Disabled"} - AutoLenis`, html },
      { templateKey: "2fa_status", userId },
    )
  }

  /**
   * Admin notification - new user signup
   */
  async sendAdminNewSignupNotification(
    newUserEmail: string,
    firstName: string,
    role: string,
    userId?: string,
    correlationId?: string
  ) {
    const html = `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 700; color: oklch(0.13 0.02 260);">New User Signup</h2>
        
        <div style="background: oklch(0.96 0.006 260); border-radius: 8px; padding: 20px; margin-bottom: 16px;">
          <p style="margin: 0 0 8px 0; color: oklch(0.42 0.02 260);"><strong>Name:</strong> ${firstName}</p>
          <p style="margin: 0 0 8px 0; color: oklch(0.42 0.02 260);"><strong>Email:</strong> ${newUserEmail}</p>
          <p style="margin: 0 0 8px 0; color: oklch(0.42 0.02 260);"><strong>Role:</strong> ${role}</p>
          <p style="margin: 0; color: oklch(0.42 0.02 260);"><strong>Time:</strong> ${new Date().toISOString()}</p>
        </div>
        
        <a href="${getAppUrl()}/admin/users" 
           style="display: inline-block; background: oklch(0.38 0.14 278); color: white; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px;">
          View in Admin Panel
        </a>
      </div>
    `

    return this.send(
      { to: getAdminEmail(), subject: `New ${role} signup: ${firstName} (${newUserEmail})`, html },
      { templateKey: "admin_new_signup", userId, correlationId },
    )
  }

  /**
   * Affiliate notification - new signup attributed
   */
  async sendAffiliateNewSignupNotification(
    affiliateEmail: string,
    affiliateFirstName: string,
    referredUserName: string,
    referralCode: string,
    affiliateId?: string,
    userId?: string,
    correlationId?: string
  ) {
    const html = `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: oklch(0.38 0.14 278); margin: 0; font-size: 28px; font-weight: 700;">AutoLenis</h1>
        </div>
        
        <div style="background: white; border-radius: 12px; padding: 32px; border: 1px solid oklch(0.915 0.008 260); box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
          <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: oklch(0.13 0.02 260);">New Referral Signup!</h2>
          
          <p style="margin: 0 0 16px 0; color: oklch(0.42 0.02 260); line-height: 1.6; font-size: 16px;">
            Hi ${affiliateFirstName},
          </p>
          
          <p style="margin: 0 0 24px 0; color: oklch(0.42 0.02 260); line-height: 1.6; font-size: 16px;">
            Someone signed up using your referral code <strong>${referralCode}</strong>.
          </p>
          
          <div style="background: oklch(0.96 0.006 260); padding: 20px; border-radius: 8px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px 0; color: oklch(0.42 0.02 260);"><strong>Referred user:</strong> ${referredUserName}</p>
            <p style="margin: 0; color: oklch(0.42 0.02 260);"><strong>Time:</strong> ${new Date().toISOString()}</p>
          </div>
          
          <a href="${getAppUrl()}/affiliate/dashboard" 
             style="display: inline-block; background: oklch(0.38 0.14 278); color: white; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px;">
            View Your Dashboard
          </a>
        </div>
        
        <div style="text-align: center; margin-top: 32px;">
          <p style="margin: 0; color: oklch(0.55 0.02 260); font-size: 13px;">
            &copy; ${new Date().getFullYear()} <span style="color: oklch(0.65 0.18 278);">AutoLenis</span>. All rights reserved.
          </p>
        </div>
      </div>
    `

    return this.send(
      { to: affiliateEmail, subject: "New Signup from Your Referral! - AutoLenis", html },
      { templateKey: "affiliate_new_signup", affiliateId, userId, correlationId },
    )
  }

  /**
   * Dealer application submitted (admin notification)
   */
  async sendDealerApplicationSubmittedNotification(
    businessName: string,
    dealerEmail: string,
    userId?: string,
    correlationId?: string
  ) {
    const safeName = escapeHtml(businessName)
    const safeEmail = escapeHtml(dealerEmail)
    const html = `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 700; color: oklch(0.13 0.02 260);">New Dealer Application</h2>
        
        <div style="background: oklch(0.96 0.006 260); border-radius: 8px; padding: 20px; margin-bottom: 16px;">
          <p style="margin: 0 0 8px 0; color: oklch(0.42 0.02 260);"><strong>Business:</strong> ${safeName}</p>
          <p style="margin: 0 0 8px 0; color: oklch(0.42 0.02 260);"><strong>Email:</strong> ${safeEmail}</p>
          <p style="margin: 0; color: oklch(0.42 0.02 260);"><strong>Time:</strong> ${new Date().toISOString()}</p>
        </div>
        
        <a href="${getAppUrl()}/admin/dealers/applications" 
           style="display: inline-block; background: oklch(0.38 0.14 278); color: white; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px;">
          Review Application
        </a>
      </div>
    `

    return this.send(
      { to: getAdminEmail(), subject: `New Dealer Application: ${safeName}`, html },
      { templateKey: "admin_notification", userId, correlationId },
    )
  }

  /**
   * Dealer application form details sent to info@autolenis.com
   */
  async sendDealerApplicationFormToInfo(
    applicationData: {
      dealershipName: string
      businessType: string
      licenseNumber: string
      yearsInBusiness: string
      contactName: string
      contactTitle: string
      email: string
      phone: string
      address: string
      city: string
      state: string
      zipCode: string
      averageInventory: string
      monthlyVolume: string
      website?: string
      additionalInfo?: string
    },
    userId?: string,
    correlationId?: string
  ) {
    const d = Object.fromEntries(
      Object.entries(applicationData).map(([k, v]) => [k, escapeHtml(String(v ?? ""))])
    ) as Record<string, string>

    const html = `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: oklch(0.38 0.14 278); margin: 0; font-size: 28px; font-weight: 700;">AutoLenis</h1>
        </div>
        
        <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: oklch(0.13 0.02 260);">Dealer Application Submitted</h2>
        <p style="margin: 0 0 24px 0; color: oklch(0.42 0.02 260); font-size: 14px;">Received: ${new Date().toISOString()}</p>
        
        <div style="background: oklch(0.96 0.006 260); border-radius: 8px; padding: 20px; margin-bottom: 16px;">
          <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: oklch(0.13 0.02 260);">Business Information</h3>
          <p style="margin: 0 0 6px 0; color: oklch(0.42 0.02 260);"><strong>Dealership Name:</strong> ${d.dealershipName}</p>
          <p style="margin: 0 0 6px 0; color: oklch(0.42 0.02 260);"><strong>Business Type:</strong> ${d.businessType}</p>
          <p style="margin: 0 0 6px 0; color: oklch(0.42 0.02 260);"><strong>License Number:</strong> ${d.licenseNumber}</p>
          <p style="margin: 0 0 6px 0; color: oklch(0.42 0.02 260);"><strong>Years in Business:</strong> ${d.yearsInBusiness}</p>
        </div>
        
        <div style="background: oklch(0.96 0.006 260); border-radius: 8px; padding: 20px; margin-bottom: 16px;">
          <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: oklch(0.13 0.02 260);">Contact Information</h3>
          <p style="margin: 0 0 6px 0; color: oklch(0.42 0.02 260);"><strong>Contact Name:</strong> ${d.contactName}</p>
          <p style="margin: 0 0 6px 0; color: oklch(0.42 0.02 260);"><strong>Title:</strong> ${d.contactTitle}</p>
          <p style="margin: 0 0 6px 0; color: oklch(0.42 0.02 260);"><strong>Email:</strong> ${d.email}</p>
          <p style="margin: 0 0 6px 0; color: oklch(0.42 0.02 260);"><strong>Phone:</strong> ${d.phone}</p>
        </div>
        
        <div style="background: oklch(0.96 0.006 260); border-radius: 8px; padding: 20px; margin-bottom: 16px;">
          <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: oklch(0.13 0.02 260);">Location</h3>
          <p style="margin: 0 0 6px 0; color: oklch(0.42 0.02 260);"><strong>Address:</strong> ${d.address}</p>
          <p style="margin: 0; color: oklch(0.42 0.02 260);"><strong>City/State/ZIP:</strong> ${d.city}, ${d.state} ${d.zipCode}</p>
        </div>
        
        <div style="background: oklch(0.96 0.006 260); border-radius: 8px; padding: 20px; margin-bottom: 16px;">
          <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: oklch(0.13 0.02 260);">Operations</h3>
          <p style="margin: 0 0 6px 0; color: oklch(0.42 0.02 260);"><strong>Average Inventory:</strong> ${d.averageInventory}</p>
          <p style="margin: 0 0 6px 0; color: oklch(0.42 0.02 260);"><strong>Monthly Volume:</strong> ${d.monthlyVolume}</p>
          ${d.website ? `<p style="margin: 0 0 6px 0; color: oklch(0.42 0.02 260);"><strong>Website:</strong> ${d.website}</p>` : ""}
          ${d.additionalInfo ? `<p style="margin: 0; color: oklch(0.42 0.02 260);"><strong>Additional Info:</strong> ${d.additionalInfo}</p>` : ""}
        </div>
        
        <a href="${getAppUrl()}/admin/dealers/applications" 
           style="display: inline-block; background: oklch(0.38 0.14 278); color: white; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px;">
          Review in Admin Dashboard
        </a>
        
        <div style="text-align: center; margin-top: 32px;">
          <p style="margin: 0; color: oklch(0.55 0.02 260); font-size: 13px;">
            &copy; ${new Date().getFullYear()} <span style="color: oklch(0.65 0.18 278);">AutoLenis</span>. All rights reserved.
          </p>
        </div>
      </div>
    `

    return this.send(
      { to: "info@autolenis.com", subject: `Dealer Application: ${d.dealershipName}`, html },
      { templateKey: "dealer_application_form", userId, correlationId },
    )
  }

  /**
   * Dealer application confirmation email (sent to the dealer applicant)
   */
  async sendDealerApplicationConfirmation(
    email: string,
    businessName: string,
    contactName: string,
    userId?: string,
    correlationId?: string
  ) {
    const safeName = escapeHtml(contactName)
    const safeBusiness = escapeHtml(businessName)

    const html = `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: oklch(0.38 0.14 278); margin: 0; font-size: 28px; font-weight: 700;">AutoLenis</h1>
        </div>
        
        <div style="background: white; border-radius: 12px; padding: 32px; border: 1px solid oklch(0.915 0.008 260); box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
          <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: oklch(0.13 0.02 260);">Application Received</h2>
          
          <p style="margin: 0 0 16px 0; color: oklch(0.42 0.02 260); line-height: 1.6; font-size: 16px;">
            Hi ${safeName}, thank you for applying to join the AutoLenis dealer network!
          </p>
          
          <p style="margin: 0 0 16px 0; color: oklch(0.42 0.02 260); line-height: 1.6; font-size: 16px;">
            We&rsquo;ve received your application for <strong>${safeBusiness}</strong> and our team will review it within 1&ndash;2 business days.
          </p>
          
          <p style="margin: 0 0 24px 0; color: oklch(0.42 0.02 260); line-height: 1.6; font-size: 16px;">
            You&rsquo;ll receive an email notification once your application has been reviewed. In the meantime, if you have any questions, feel free to reach us at <a href="mailto:info@autolenis.com" style="color: oklch(0.38 0.14 278);">info@autolenis.com</a>.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 32px;">
          <p style="margin: 0; color: oklch(0.55 0.02 260); font-size: 13px;">
            &copy; ${new Date().getFullYear()} <span style="color: oklch(0.65 0.18 278);">AutoLenis</span>. All rights reserved.
          </p>
        </div>
      </div>
    `

    return this.send(
      { to: email, subject: "We Received Your Dealer Application - AutoLenis", html },
      { templateKey: "dealer_application_confirmation", userId, correlationId },
    )
  }

  /**
   * Dealer approval email
   */
  async sendDealerApprovalEmail(
    email: string,
    businessName: string,
    userId?: string
  ) {
    const dashboardUrl = `${getAppUrl()}/dealer/dashboard`

    const html = `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: oklch(0.38 0.14 278); margin: 0; font-size: 28px; font-weight: 700;">AutoLenis</h1>
        </div>
        
        <div style="background: white; border-radius: 12px; padding: 32px; border: 1px solid oklch(0.915 0.008 260); box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
          <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: oklch(0.13 0.02 260);">Congratulations! Your Account Is Approved</h2>
          
          <p style="margin: 0 0 16px 0; color: oklch(0.42 0.02 260); line-height: 1.6; font-size: 16px;">
            Great news! Your dealer application for <strong>${businessName}</strong> has been approved.
          </p>
          
          <p style="margin: 0 0 16px 0; color: oklch(0.42 0.02 260); line-height: 1.6; font-size: 16px;">
            You can now access your dealer dashboard to manage inventory, respond to buyer auctions, and complete deals.
          </p>
          
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

    return this.send(
      { to: email, subject: "Your Dealer Account Has Been Approved - AutoLenis", html },
      { templateKey: "system", userId },
    )
  }

  /**
   * Dealer rejection email
   */
  async sendDealerRejectionEmail(
    email: string,
    businessName: string,
    reason: string,
    userId?: string
  ) {
    const html = `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: oklch(0.38 0.14 278); margin: 0; font-size: 28px; font-weight: 700;">AutoLenis</h1>
        </div>
        
        <div style="background: white; border-radius: 12px; padding: 32px; border: 1px solid oklch(0.915 0.008 260); box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
          <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: oklch(0.13 0.02 260);">Application Update</h2>
          
          <p style="margin: 0 0 16px 0; color: oklch(0.42 0.02 260); line-height: 1.6; font-size: 16px;">
            Thank you for your interest in joining AutoLenis as a dealer partner.
          </p>
          
          <p style="margin: 0 0 16px 0; color: oklch(0.42 0.02 260); line-height: 1.6; font-size: 16px;">
            After reviewing your application for <strong>${businessName}</strong>, we're unable to approve it at this time.
          </p>
          
          <div style="background: oklch(0.96 0.006 260); padding: 20px; border-radius: 8px; margin-bottom: 16px;">
            <p style="margin: 0; color: oklch(0.42 0.02 260);"><strong>Reason:</strong> ${reason}</p>
          </div>
          
          <p style="margin: 0; color: oklch(0.42 0.02 260); line-height: 1.6; font-size: 16px;">
            If you believe this is an error or have additional information to provide, please contact our support team.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 32px;">
          <p style="margin: 0; color: oklch(0.55 0.02 260); font-size: 13px;">
            &copy; ${new Date().getFullYear()} <span style="color: oklch(0.65 0.18 278);">AutoLenis</span>. All rights reserved.
          </p>
        </div>
      </div>
    `

    return this.send(
      { to: email, subject: "Update on Your Dealer Application - AutoLenis", html },
      { templateKey: "system", userId },
    )
  }

  /**
   * New offer notification for buyers
   */
  async sendNewOfferNotification(
    email: string,
    buyerName: string,
    vehicleInfo: string,
    offerAmount: number,
    userId?: string,
    auctionId?: string
  ) {
    const dashboardUrl = `${getAppUrl()}/buyer/dashboard`

    const html = `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: oklch(0.38 0.14 278); margin: 0; font-size: 28px; font-weight: 700;">AutoLenis</h1>
        </div>
        
        <div style="background: white; border-radius: 12px; padding: 32px; border: 1px solid oklch(0.915 0.008 260); box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
          <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: oklch(0.13 0.02 260);">You Have a New Offer!</h2>
          
          <p style="margin: 0 0 16px 0; color: oklch(0.42 0.02 260); line-height: 1.6; font-size: 16px;">
            Hi ${buyerName},
          </p>
          
          <p style="margin: 0 0 24px 0; color: oklch(0.42 0.02 260); line-height: 1.6; font-size: 16px;">
            A dealer has submitted an offer on your ${vehicleInfo}:
          </p>
          
          <div style="background: oklch(0.96 0.006 260); padding: 24px; border-radius: 10px; text-align: center; margin-bottom: 24px;">
            <p style="font-size: 32px; font-weight: 700; color: oklch(0.38 0.14 278); margin: 0 0 8px 0;">$${offerAmount.toLocaleString()}</p>
            <p style="color: oklch(0.55 0.02 260); margin: 0; font-size: 14px;">Out-the-door price</p>
          </div>
          
          <a href="${dashboardUrl}" 
             style="display: inline-block; background: oklch(0.38 0.14 278); color: white; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px;">
            View Offers
          </a>
        </div>
        
        <div style="text-align: center; margin-top: 32px;">
          <p style="margin: 0; color: oklch(0.55 0.02 260); font-size: 13px;">
            &copy; ${new Date().getFullYear()} <span style="color: oklch(0.65 0.18 278);">AutoLenis</span>. All rights reserved.
          </p>
        </div>
      </div>
    `

    return this.send(
      { to: email, subject: "New Offer on Your Auction - AutoLenis", html },
      { templateKey: "system", userId },
    )
  }

  /**
   * Deal completed notification
   */
  async sendDealCompletedNotification(
    email: string,
    buyerName: string,
    vehicleInfo: string,
    userId?: string,
    dealId?: string
  ) {
    const html = `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: oklch(0.38 0.14 278); margin: 0; font-size: 28px; font-weight: 700;">AutoLenis</h1>
        </div>
        
        <div style="background: white; border-radius: 12px; padding: 32px; border: 1px solid oklch(0.915 0.008 260); box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
          <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: oklch(0.13 0.02 260);">Congratulations!</h2>
          
          <p style="margin: 0 0 16px 0; color: oklch(0.42 0.02 260); line-height: 1.6; font-size: 16px;">
            Hi ${buyerName},
          </p>
          
          <p style="margin: 0 0 16px 0; color: oklch(0.42 0.02 260); line-height: 1.6; font-size: 16px;">
            Your purchase of the <strong>${vehicleInfo}</strong> is complete!
          </p>
          
          <p style="margin: 0; color: oklch(0.42 0.02 260); line-height: 1.6; font-size: 16px;">
            Thank you for using AutoLenis. We hope you enjoy your new vehicle! If you have any questions or need assistance, our support team is here to help.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 32px;">
          <p style="margin: 0; color: oklch(0.55 0.02 260); font-size: 13px;">
            &copy; ${new Date().getFullYear()} <span style="color: oklch(0.65 0.18 278);">AutoLenis</span>. All rights reserved.
          </p>
        </div>
      </div>
    `

    return this.send(
      { to: email, subject: "Congratulations on Your New Car! - AutoLenis", html },
      { templateKey: "deal_complete", userId },
    )
  }

  /**
   * Affiliate payout notification
   */
  async sendAffiliatePayoutNotification(
    email: string,
    firstName: string,
    amount: number,
    method: string,
    affiliateId?: string
  ) {
    const html = `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: oklch(0.38 0.14 278); margin: 0; font-size: 28px; font-weight: 700;">AutoLenis</h1>
        </div>
        
        <div style="background: white; border-radius: 12px; padding: 32px; border: 1px solid oklch(0.915 0.008 260); box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
          <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: oklch(0.13 0.02 260);">Payout Processed</h2>
          
          <p style="margin: 0 0 16px 0; color: oklch(0.42 0.02 260); line-height: 1.6; font-size: 16px;">
            Hi ${firstName},
          </p>
          
          <p style="margin: 0 0 24px 0; color: oklch(0.42 0.02 260); line-height: 1.6; font-size: 16px;">
            Great news! Your affiliate payout has been processed:
          </p>
          
          <div style="background: oklch(0.96 0.006 260); padding: 24px; border-radius: 10px; text-align: center; margin-bottom: 24px;">
            <p style="font-size: 32px; font-weight: 700; color: oklch(0.62 0.17 162); margin: 0 0 8px 0;">$${amount.toFixed(
              2
            )}</p>
            <p style="color: oklch(0.55 0.02 260); margin: 0; font-size: 14px;">via ${method}</p>
          </div>
          
          <p style="margin: 0; color: oklch(0.42 0.02 260); line-height: 1.6; font-size: 16px;">
            Funds should arrive within 1-3 business days depending on your payment method.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 32px;">
          <p style="margin: 0; color: oklch(0.55 0.02 260); font-size: 13px;">
            &copy; ${new Date().getFullYear()} <span style="color: oklch(0.65 0.18 278);">AutoLenis</span>. All rights reserved.
          </p>
        </div>
      </div>
    `

    return this.send(
      { to: email, subject: "Your Payout Has Been Processed - AutoLenis", html },
      { templateKey: "affiliate_payout" },
    )
  }

  /**
   * Generic notification method (fallback for simple messages)
   */
  async sendNotification(
    email: string,
    subject: string,
    message: string,
    ctaText?: string,
    ctaUrl?: string
  ) {
    const html = `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: oklch(0.38 0.14 278); margin: 0; font-size: 28px; font-weight: 700;">AutoLenis</h1>
        </div>
        
        <div style="background: white; border-radius: 12px; padding: 32px; border: 1px solid oklch(0.915 0.008 260); box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
          <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: oklch(0.13 0.02 260);">${subject}</h2>
          
          <p style="margin: 0 0 ${ctaText && ctaUrl ? "24px" : "0"} 0; color: oklch(0.42 0.02 260); line-height: 1.6; font-size: 16px;">
            ${message}
          </p>
          
          ${
            ctaText && ctaUrl
              ? `
            <a href="${ctaUrl}" 
               style="display: inline-block; background: oklch(0.38 0.14 278); color: white; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px;">
              ${ctaText}
            </a>
          `
              : ""
          }
        </div>
        
        <div style="text-align: center; margin-top: 32px;">
          <p style="margin: 0; color: oklch(0.55 0.02 260); font-size: 13px;">
            &copy; ${new Date().getFullYear()} <span style="color: oklch(0.65 0.18 278);">AutoLenis</span>. All rights reserved.
          </p>
        </div>
      </div>
    `

    return this.send(
      { to: email, subject: `${subject} - AutoLenis`, html },
      { templateKey: "system" },
    )
  }

  /**
   * Custom notification with full HTML
   */
  async sendNotificationEmail(email: string, subject: string, html: string) {
    return this.send(
      { to: email, subject, html },
      { templateKey: "system" },
    )
  }

  /**
   * Password reset email - delegates to triggers
   */
  async sendPasswordResetEmail(email: string, firstName: string, token: string) {
    return triggerPasswordResetEmail(resolveRecipient(email), firstName, token)
  }

  // Financial email methods — sendPaymentReceiptEmail, sendRefundConfirmationEmail,
  // sendRefinanceStatusEmail, sendCommissionEarnedEmail, sendPayoutSentEmail,
  // sendLargeTransactionAlertEmail, sendChargebackAlertEmail, sendStripeMismatchAlertEmail

  async sendPaymentReceiptEmail(email: string, buyerName: string, amount: number, description: string) {
    return this.send(
      { to: email, subject: `Payment Receipt - $${amount.toFixed(2)} - AutoLenis`, html: `<p>Hi ${buyerName}, your payment of $${amount.toFixed(2)} for ${description} has been confirmed.</p>` },
      { templateKey: "payment_receipt" },
    )
  }

  async sendRefundConfirmationEmail(email: string, buyerName: string, amount: number) {
    return this.send(
      { to: email, subject: "Refund Confirmed - AutoLenis", html: `<p>Hi ${buyerName}, your refund of $${amount.toFixed(2)} has been processed.</p>` },
      { templateKey: "refund_confirmation" },
    )
  }

  async sendRefinanceStatusEmail(email: string, firstName: string, status: string) {
    return this.send(
      { to: email, subject: "Refinance Application Update - AutoLenis", html: `<p>Hi ${firstName}, your refinance application status: ${status}.</p>` },
      { templateKey: "refinance_status" },
    )
  }

  async sendCommissionEarnedEmail(email: string, firstName: string, amount: number) {
    return this.send(
      { to: email, subject: "Commission Earned! - AutoLenis", html: `<p>Hi ${firstName}, you've earned a commission of $${amount.toFixed(2)}.</p>` },
      { templateKey: "commission_earned" },
    )
  }

  async sendPayoutSentEmail(email: string, firstName: string, amount: number, method: string) {
    return this.send(
      { to: email, subject: "Payout Sent - AutoLenis", html: `<p>Hi ${firstName}, your payout of $${amount.toFixed(2)} via ${method} has been sent.</p>` },
      { templateKey: "payout_sent" },
    )
  }

  async sendLargeTransactionAlertEmail(amount: number, userId: string) {
    return this.send(
      { to: getAdminEmail(), subject: "Large Transaction Alert - AutoLenis", html: `<p>A large transaction of $${amount.toFixed(2)} was detected for user ${userId}.</p>` },
      { templateKey: "large_transaction_alert" },
    )
  }

  async sendChargebackAlertEmail(chargebackId: string, amount: number) {
    return this.send(
      { to: getAdminEmail(), subject: "Chargeback Alert - AutoLenis", html: `<p>Chargeback ${chargebackId} for $${amount.toFixed(2)} requires attention.</p>` },
      { templateKey: "chargeback_alert" },
    )
  }

  async sendStripeMismatchAlertEmail(details: string) {
    return this.send(
      { to: getAdminEmail(), subject: "Stripe Mismatch Alert - AutoLenis", html: `<p>A Stripe data mismatch was detected: ${details}.</p>` },
      { templateKey: "stripe_mismatch_alert" },
    )
  }

  // ─── Stub methods for routes/services that reference EmailService ──────

  async sendAuctionStartedEmail(email: string, dealerName: string, vehicleInfo: string) {
    const html = `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h2>Auction Started</h2>
        <p>Hi ${dealerName}, a new auction has started for: <strong>${vehicleInfo}</strong>.</p>
        <a href="${getAppUrl()}/dealer/dashboard" style="display:inline-block;background:oklch(0.38 0.14 278);color:white;padding:14px 32px;text-decoration:none;border-radius:10px;font-weight:600;">View Auction</a>
      </div>`
    return sendEmail({ to: resolveRecipient(email), subject: `Auction Started: ${vehicleInfo}`, html, type: "system" })
  }

  async sendAuctionWonEmail(email: string, buyerName: string, vehicleInfo: string) {
    const html = `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h2>Congratulations!</h2>
        <p>Hi ${buyerName}, you won the auction for: <strong>${vehicleInfo}</strong>.</p>
        <a href="${getAppUrl()}/buyer/dashboard" style="display:inline-block;background:oklch(0.38 0.14 278);color:white;padding:14px 32px;text-decoration:none;border-radius:10px;font-weight:600;">View Deal</a>
      </div>`
    return sendEmail({ to: resolveRecipient(email), subject: `Auction Won: ${vehicleInfo}`, html, type: "deal_complete" })
  }

  async sendContractShieldEmail(email: string, subject: string, message: string, ctaText: string, ctaUrl: string) {
    const html = `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h2>${subject}</h2>
        <p>${message}</p>
        <a href="${ctaUrl}" style="display:inline-block;background:oklch(0.38 0.14 278);color:white;padding:14px 32px;text-decoration:none;border-radius:10px;font-weight:600;">${ctaText}</a>
      </div>`
    return sendEmail({ to: resolveRecipient(email), subject: `Contract Shield: ${subject}`, html, type: "system" })
  }

  async sendPaymentConfirmationEmail(email: string, buyerName: string, amount: number, description: string) {
    const html = `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h2>Payment Confirmed</h2>
        <p>Hi ${buyerName}, your payment of <strong>$${(amount / 100).toFixed(2)}</strong> for ${description} has been received.</p>
        <a href="${getAppUrl()}/buyer/dashboard" style="display:inline-block;background:oklch(0.38 0.14 278);color:white;padding:14px 32px;text-decoration:none;border-radius:10px;font-weight:600;">View Details</a>
      </div>`
    return sendEmail({ to: resolveRecipient(email), subject: "Payment Confirmed - AutoLenis", html, type: "system" })
  }

  async sendReferralCommissionEmail(email: string, firstName: string, amount: number) {
    const html = `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h2>Commission Earned!</h2>
        <p>Hi ${firstName}, you earned a referral commission of <strong>$${amount.toFixed(2)}</strong>.</p>
        <a href="${getAppUrl()}/affiliate/dashboard" style="display:inline-block;background:oklch(0.38 0.14 278);color:white;padding:14px 32px;text-decoration:none;border-radius:10px;font-weight:600;">View Earnings</a>
      </div>`
    return sendEmail({ to: resolveRecipient(email), subject: "Commission Earned - AutoLenis", html, type: "affiliate_payout" })
  }

  async sendAffiliateCommissionEmail(email: string, affiliateName: string, amountDollars: number, level: number) {
    const html = `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h2>Commission Earned!</h2>
        <p>Hi ${affiliateName}, you earned a Level ${level} commission of <strong>$${amountDollars.toFixed(2)}</strong>.</p>
        <a href="${getAppUrl()}/affiliate/dashboard" style="display:inline-block;background:oklch(0.38 0.14 278);color:white;padding:14px 32px;text-decoration:none;border-radius:10px;font-weight:600;">View Earnings</a>
      </div>`
    return sendEmail({ to: resolveRecipient(email), subject: "Commission Earned - AutoLenis", html, type: "affiliate_payout" })
  }

  async sendRefinanceAffiliateEmail(email: string, affiliateName: string, buyerFirstName: string, leadId: string) {
    const html = `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h2>Refinance Referral</h2>
        <p>Hi ${affiliateName}, your referral ${buyerFirstName} submitted a refinance application (Lead: ${leadId}).</p>
        <a href="${getAppUrl()}/affiliate/dashboard" style="display:inline-block;background:oklch(0.38 0.14 278);color:white;padding:14px 32px;text-decoration:none;border-radius:10px;font-weight:600;">View Dashboard</a>
      </div>`
    return sendEmail({ to: resolveRecipient(email), subject: "Refinance Referral - AutoLenis", html, type: "refinance_eligible" })
  }

  async sendRefinanceQualifiedEmail(email: string, firstName: string, redirectUrl: string, leadId: string) {
    const html = `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h2>You May Qualify for Refinancing!</h2>
        <p>Hi ${firstName}, based on your information you may qualify for vehicle refinancing.</p>
        <a href="${redirectUrl}" style="display:inline-block;background:oklch(0.38 0.14 278);color:white;padding:14px 32px;text-decoration:none;border-radius:10px;font-weight:600;">Continue Application</a>
      </div>`
    return sendEmail({ to: resolveRecipient(email), subject: "Refinance Pre-Qualification - AutoLenis", html, type: "refinance_eligible" })
  }

  async sendRefinanceDeclinedEmail(email: string, firstName: string, reasons: string[], leadId: string) {
    const html = `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h2>Refinance Application Update</h2>
        <p>Hi ${firstName}, unfortunately we were unable to pre-qualify you at this time.</p>
        <p><strong>Reasons:</strong> ${reasons.join(", ")}</p>
        <p>You can try again in the future or contact us for more information.</p>
      </div>`
    return sendEmail({ to: resolveRecipient(email), subject: "Refinance Update - AutoLenis", html, type: "system" })
  }

  /**
   * Account deletion confirmation email
   */
  async sendAccountDeletionConfirmationEmail(
    email: string,
    firstName: string,
    userId?: string
  ) {
    const html = `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: oklch(0.38 0.14 278); margin: 0; font-size: 28px; font-weight: 700;">AutoLenis</h1>
        </div>
        
        <div style="background: white; border-radius: 12px; padding: 32px; border: 1px solid oklch(0.915 0.008 260); box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
          <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: oklch(0.13 0.02 260);">Account Deleted</h2>
          
          <p style="margin: 0 0 16px 0; color: oklch(0.42 0.02 260); line-height: 1.6; font-size: 16px;">
            Hi ${firstName},
          </p>
          
          <p style="margin: 0 0 16px 0; color: oklch(0.42 0.02 260); line-height: 1.6; font-size: 16px;">
            Your AutoLenis account has been successfully deleted. All your personal data and associated records have been permanently removed from our system.
          </p>
          
          <div style="background: oklch(0.96 0.02 25); padding: 16px; border-radius: 8px; margin-bottom: 16px; border: 1px solid oklch(0.90 0.04 25);">
            <p style="margin: 0; color: oklch(0.42 0.02 260); font-size: 14px;">
              <strong>This action is irreversible.</strong> If you did not request this deletion, please contact our support team immediately.
            </p>
          </div>
          
          <p style="margin: 0 0 16px 0; color: oklch(0.42 0.02 260); line-height: 1.6; font-size: 16px;">
            We're sorry to see you go. If you change your mind in the future, you're always welcome to create a new account.
          </p>
          
          <p style="margin: 0; color: oklch(0.42 0.02 260); line-height: 1.6; font-size: 14px;">
            If you have any questions, please contact us at
            <a href="mailto:info@autolenis.com" style="color: oklch(0.38 0.14 278);">info@autolenis.com</a>
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 32px;">
          <p style="margin: 0; color: oklch(0.55 0.02 260); font-size: 13px;">
            &copy; ${new Date().getFullYear()} <span style="color: oklch(0.65 0.18 278);">AutoLenis</span>. All rights reserved.
          </p>
        </div>
      </div>
    `

    return this.send(
      { to: email, subject: "Your AutoLenis Account Has Been Deleted", html },
      { templateKey: "account_deletion", userId },
    )
  }

  // ---------------------------------------------------------------------------
  // Vehicle Request / Sourcing emails
  // ---------------------------------------------------------------------------

  /**
   * Buyer confirmation email — sent when a vehicle request is submitted
   */
  async sendVehicleRequestConfirmation(
    email: string,
    buyerName: string,
    userId?: string,
  ): Promise<SendEmailResult> {
    const appUrl = getAppUrl()
    const html = `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: oklch(0.38 0.14 278); margin: 0; font-size: 28px; font-weight: 700;">AutoLenis</h1>
        </div>
        <div style="background: white; border-radius: 12px; padding: 32px; border: 1px solid oklch(0.915 0.008 260); box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
          <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: oklch(0.13 0.02 260);">Your Vehicle Request Has Been Submitted</h2>
          <p style="margin: 0 0 16px 0; color: oklch(0.42 0.02 260); line-height: 1.6; font-size: 16px;">
            Hi ${buyerName}, we've received your vehicle request. Our sourcing team will review it and begin matching you with trusted dealers in your area.
          </p>
          <p style="margin: 0 0 24px 0; color: oklch(0.42 0.02 260); line-height: 1.6; font-size: 14px;">
            You'll receive email notifications as offers become available. Most requests are reviewed within 1 business day.
          </p>
          <a href="${appUrl}/buyer/requests" style="display: inline-block; background: oklch(0.38 0.14 278); color: white; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px;">
            View Your Requests
          </a>
        </div>
        <div style="text-align: center; margin-top: 32px;">
          <p style="margin: 0; color: oklch(0.55 0.02 260); font-size: 13px;">
            Questions? Reply to this email or visit our <a href="${appUrl}/faq" style="color: oklch(0.38 0.14 278);">FAQ</a>.
          </p>
        </div>
      </div>
    `

    return this.send(
      { to: email, subject: "Your Vehicle Request Has Been Submitted — AutoLenis", html },
      { templateKey: "sourcing_request_submitted", userId },
    )
  }

  /**
   * Admin notification email — sent to info@autolenis.com when a new vehicle request arrives
   */
  async sendVehicleRequestAdminNotification(
    buyerName: string,
    buyerEmail: string,
    marketZip: string,
    vehicles: Array<{
      make: string
      model?: string
      yearMin?: number
      yearMax?: number
      condition: string
    }>,
  ): Promise<SendEmailResult> {
    const appUrl = getAppUrl()
    const vehicleSummary = vehicles
      .map((v) => {
        const yr =
          v.yearMin && v.yearMax
            ? `${v.yearMin}–${v.yearMax}`
            : v.yearMin
              ? `${v.yearMin}+`
              : v.yearMax
                ? `up to ${v.yearMax}`
                : ""
        return `${yr} ${v.make}${v.model ? ` ${v.model}` : ""} (${v.condition})`
      })
      .join(", ")

    const html = `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: oklch(0.38 0.14 278); margin: 0; font-size: 28px; font-weight: 700;">AutoLenis Admin</h1>
        </div>
        <div style="background: white; border-radius: 12px; padding: 32px; border: 1px solid oklch(0.915 0.008 260); box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
          <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: oklch(0.13 0.02 260);">New Vehicle Request</h2>
          <p style="margin: 0 0 8px 0; color: oklch(0.42 0.02 260); font-size: 14px;"><strong>Buyer:</strong> ${buyerName} (${buyerEmail})</p>
          <p style="margin: 0 0 8px 0; color: oklch(0.42 0.02 260); font-size: 14px;"><strong>Market ZIP:</strong> ${marketZip}</p>
          <p style="margin: 0 0 24px 0; color: oklch(0.42 0.02 260); font-size: 14px;"><strong>Vehicle(s):</strong> ${vehicleSummary}</p>
          <a href="${appUrl}/admin/sourcing" style="display: inline-block; background: oklch(0.38 0.14 278); color: white; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px;">
            View in Sourcing Queue
          </a>
        </div>
        <div style="text-align: center; margin-top: 32px;">
          <p style="margin: 0; color: oklch(0.55 0.02 260); font-size: 13px;">
            This is an automated notification from the AutoLenis platform.
          </p>
        </div>
      </div>
    `

    const adminTarget = process.env['VEHICLE_REQUEST_ADMIN_EMAIL'] || "info@autolenis.com"

    return this.send(
      {
        to: adminTarget,
        subject: `New Vehicle Request — ${buyerName}`,
        html,
      },
      { templateKey: "admin_vehicle_request_notification" },
    )
  }

  /**
   * Status update notification — sent to buyer when admin changes the case status
   */
  async sendVehicleRequestStatusUpdate(
    email: string,
    buyerName: string,
    newStatus: string,
    userId?: string,
  ): Promise<SendEmailResult> {
    const appUrl = getAppUrl()
    const safeName = escapeHtml(buyerName)
    const humanStatus = newStatus.replace(/_/g, " ").toLowerCase()

    const html = `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: oklch(0.38 0.14 278); margin: 0; font-size: 28px; font-weight: 700;">AutoLenis</h1>
        </div>
        <div style="background: white; border-radius: 12px; padding: 32px; border: 1px solid oklch(0.915 0.008 260); box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
          <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: oklch(0.13 0.02 260);">Vehicle Request Update</h2>
          <p style="margin: 0 0 16px 0; color: oklch(0.42 0.02 260); line-height: 1.6; font-size: 16px;">
            Hi ${safeName}, your vehicle request status has been updated to <strong>${humanStatus}</strong>.
          </p>
          <p style="margin: 0 0 24px 0; color: oklch(0.42 0.02 260); line-height: 1.6; font-size: 14px;">
            Log in to your dashboard to see the latest details and any available offers.
          </p>
          <a href="${appUrl}/buyer/requests" style="display: inline-block; background: oklch(0.38 0.14 278); color: white; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px;">
            View Your Requests
          </a>
        </div>
        <div style="text-align: center; margin-top: 32px;">
          <p style="margin: 0; color: oklch(0.55 0.02 260); font-size: 13px;">
            Questions? Reply to this email or visit our <a href="${appUrl}/faq" style="color: oklch(0.38 0.14 278);">FAQ</a>.
          </p>
        </div>
      </div>
    `

    return this.send(
      {
        to: email,
        subject: `Vehicle Request Update: ${humanStatus} — AutoLenis`,
        html,
      },
      { templateKey: "sourcing_status_update", userId },
    )
  }

  /**
   * Offer received notification — sent to buyer when a dealer submits an offer
   */
  async sendOfferReceivedEmail(
    email: string,
    buyerName: string,
    vehicleInfo: string,
    offerAmount: number,
    dealerName: string,
    userId?: string,
    auctionId?: string
  ) {
    const safeBuyerName = escapeHtml(buyerName)
    const safeVehicleInfo = escapeHtml(vehicleInfo)
    const safeDealerName = escapeHtml(dealerName)
    const dashboardUrl = `${getAppUrl()}/buyer/offers`

    const html = `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: oklch(0.38 0.14 278); margin: 0; font-size: 28px; font-weight: 700;">AutoLenis</h1>
        </div>
        
        <div style="background: white; border-radius: 12px; padding: 32px; border: 1px solid oklch(0.915 0.008 260); box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
          <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: oklch(0.13 0.02 260);">Offer Received!</h2>
          
          <p style="margin: 0 0 16px 0; color: oklch(0.42 0.02 260); line-height: 1.6; font-size: 16px;">
            Hi ${safeBuyerName},
          </p>
          
          <p style="margin: 0 0 24px 0; color: oklch(0.42 0.02 260); line-height: 1.6; font-size: 16px;">
            <strong>${safeDealerName}</strong> has submitted an offer on your <strong>${safeVehicleInfo}</strong>:
          </p>
          
          <div style="background: oklch(0.96 0.006 260); padding: 24px; border-radius: 10px; text-align: center; margin-bottom: 24px;">
            <p style="font-size: 32px; font-weight: 700; color: oklch(0.38 0.14 278); margin: 0 0 8px 0;">$${offerAmount.toLocaleString()}</p>
            <p style="color: oklch(0.55 0.02 260); margin: 0; font-size: 14px;">Out-the-door price</p>
          </div>
          
          <a href="${dashboardUrl}" 
             style="display: inline-block; background: oklch(0.38 0.14 278); color: white; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px;">
            Review Offer
          </a>
        </div>
        
        <div style="text-align: center; margin-top: 32px;">
          <p style="margin: 0; color: oklch(0.55 0.02 260); font-size: 13px;">
            &copy; ${new Date().getFullYear()} <span style="color: oklch(0.65 0.18 278);">AutoLenis</span>. All rights reserved.
          </p>
        </div>
      </div>
    `

    return this.send(
      { to: email, subject: `Offer Received on Your ${safeVehicleInfo.replace(/[\r\n]/g, "")} - AutoLenis`, html },
      { templateKey: "offer_received", userId, auctionId },
    )
  }

  /**
   * Offer selected notification — sent to dealer when buyer selects their offer
   */
  async sendOfferSelectedEmail(
    email: string,
    dealerName: string,
    vehicleInfo: string,
    offerAmount: number,
    userId?: string,
    auctionId?: string
  ) {
    const safeDealerName = escapeHtml(dealerName)
    const safeVehicleInfo = escapeHtml(vehicleInfo)
    const dashboardUrl = `${getAppUrl()}/dealer/deals`

    const html = `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: oklch(0.38 0.14 278); margin: 0; font-size: 28px; font-weight: 700;">AutoLenis</h1>
        </div>
        
        <div style="background: white; border-radius: 12px; padding: 32px; border: 1px solid oklch(0.915 0.008 260); box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
          <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: oklch(0.13 0.02 260);">Your Offer Was Selected!</h2>
          
          <p style="margin: 0 0 16px 0; color: oklch(0.42 0.02 260); line-height: 1.6; font-size: 16px;">
            Hi ${safeDealerName},
          </p>
          
          <p style="margin: 0 0 24px 0; color: oklch(0.42 0.02 260); line-height: 1.6; font-size: 16px;">
            Great news! The buyer has selected your offer of <strong>$${offerAmount.toLocaleString()}</strong> on the <strong>${safeVehicleInfo}</strong>.
          </p>
          
          <p style="margin: 0 0 24px 0; color: oklch(0.42 0.02 260); line-height: 1.6; font-size: 16px;">
            Please proceed to finalize the deal and coordinate delivery.
          </p>
          
          <a href="${dashboardUrl}" 
             style="display: inline-block; background: oklch(0.38 0.14 278); color: white; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px;">
            View Deal
          </a>
        </div>
        
        <div style="text-align: center; margin-top: 32px;">
          <p style="margin: 0; color: oklch(0.55 0.02 260); font-size: 13px;">
            &copy; ${new Date().getFullYear()} <span style="color: oklch(0.65 0.18 278);">AutoLenis</span>. All rights reserved.
          </p>
        </div>
      </div>
    `

    return this.send(
      { to: email, subject: `Offer Selected: ${safeVehicleInfo.replace(/[\r\n]/g, "")} - AutoLenis`, html },
      { templateKey: "offer_selected", userId, auctionId },
    )
  }

  /**
   * Deal complete notification — sent to buyer when the deal is fully completed
   */
  async sendDealCompleteEmail(
    email: string,
    buyerName: string,
    vehicleInfo: string,
    userId?: string,
    dealId?: string
  ) {
    const safeBuyerName = escapeHtml(buyerName)
    const safeVehicleInfo = escapeHtml(vehicleInfo)
    const dashboardUrl = `${getAppUrl()}/buyer/deals`

    const html = `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: oklch(0.38 0.14 278); margin: 0; font-size: 28px; font-weight: 700;">AutoLenis</h1>
        </div>
        
        <div style="background: white; border-radius: 12px; padding: 32px; border: 1px solid oklch(0.915 0.008 260); box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
          <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: oklch(0.13 0.02 260);">🎉 Deal Complete!</h2>
          
          <p style="margin: 0 0 16px 0; color: oklch(0.42 0.02 260); line-height: 1.6; font-size: 16px;">
            Hi ${safeBuyerName},
          </p>
          
          <p style="margin: 0 0 16px 0; color: oklch(0.42 0.02 260); line-height: 1.6; font-size: 16px;">
            Your purchase of the <strong>${safeVehicleInfo}</strong> is now complete! All contracts have been signed and everything is finalized.
          </p>
          
          <p style="margin: 0 0 24px 0; color: oklch(0.42 0.02 260); line-height: 1.6; font-size: 16px;">
            Thank you for choosing AutoLenis. We hope you enjoy your new vehicle!
          </p>
          
          <a href="${dashboardUrl}" 
             style="display: inline-block; background: oklch(0.38 0.14 278); color: white; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px;">
            View Deal Details
          </a>
        </div>
        
        <div style="text-align: center; margin-top: 32px;">
          <p style="margin: 0; color: oklch(0.55 0.02 260); font-size: 13px;">
            &copy; ${new Date().getFullYear()} <span style="color: oklch(0.65 0.18 278);">AutoLenis</span>. All rights reserved.
          </p>
        </div>
      </div>
    `

    return this.send(
      { to: email, subject: "Deal Complete — Congratulations! - AutoLenis", html },
      { templateKey: "deal_complete", userId, dealId },
    )
  }

  // ---------------------------------------------------------------------------
  // Sourced Dealer Invitation emails
  // ---------------------------------------------------------------------------

  /**
   * Dealer invitation email — sent to an off-network dealer when admin triggers
   * an invite from a sourcing case. Contains a claim link with a time-limited token.
   */
  async sendDealerInviteEmail(
    dealerEmail: string,
    dealerName: string,
    claimToken: string,
    vehicleSummary: string,
    marketZip: string,
  ): Promise<SendEmailResult> {
    const appUrl = getAppUrl()
    const safeDealerName = escapeHtml(dealerName)
    const safeVehicleSummary = escapeHtml(vehicleSummary)
    const safeMarketZip = escapeHtml(marketZip)
    const claimUrl = `${appUrl}/dealer/invite/claim?token=${encodeURIComponent(claimToken)}`

    const html = `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: oklch(0.38 0.14 278); margin: 0; font-size: 28px; font-weight: 700;">AutoLenis</h1>
        </div>
        <div style="background: white; border-radius: 12px; padding: 32px; border: 1px solid oklch(0.915 0.008 260); box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
          <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: oklch(0.13 0.02 260);">You&apos;re Invited to AutoLenis</h2>
          <p style="margin: 0 0 16px 0; color: oklch(0.42 0.02 260); line-height: 1.6; font-size: 16px;">
            Hi ${safeDealerName},
          </p>
          <p style="margin: 0 0 16px 0; color: oklch(0.42 0.02 260); line-height: 1.6; font-size: 16px;">
            A buyer in the <strong>${safeMarketZip}</strong> area accepted your offer on a <strong>${safeVehicleSummary}</strong>. To continue the transaction inside AutoLenis, please claim your invite below.
          </p>
          <div style="background: oklch(0.96 0.006 260); padding: 20px; border-radius: 8px; margin-bottom: 24px;">
            <p style="margin: 0 0 4px 0; color: oklch(0.42 0.02 260); font-size: 14px;"><strong>Vehicle:</strong> ${safeVehicleSummary}</p>
            <p style="margin: 0; color: oklch(0.42 0.02 260); font-size: 14px;"><strong>Market:</strong> ${safeMarketZip}</p>
          </div>
          <p style="margin: 0 0 24px 0; color: oklch(0.42 0.02 260); line-height: 1.6; font-size: 14px;">
            This invite expires in 72 hours. Click below to claim it and create your dealer account.
          </p>
          <a href="${claimUrl}" style="display: inline-block; background: oklch(0.38 0.14 278); color: white; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px;">
            Claim Your Invite
          </a>
        </div>
        <div style="text-align: center; margin-top: 32px;">
          <p style="margin: 0; color: oklch(0.55 0.02 260); font-size: 13px;">
            &copy; ${new Date().getFullYear()} <span style="color: oklch(0.65 0.18 278);">AutoLenis</span>. All rights reserved.
          </p>
        </div>
      </div>
    `

    return this.send(
      {
        to: dealerEmail,
        subject: `You're Invited to AutoLenis — Claim Your Dealer Invite`,
        html,
      },
      { templateKey: "dealer_sourced_invite" },
    )
  }

  /**
   * Buyer notification — sent when admin presents a sourced offer to the buyer
   */
  async sendSourcedOfferPresentedEmail(
    email: string,
    buyerName: string,
    vehicleSummary: string,
    caseId: string,
    userId?: string,
  ): Promise<SendEmailResult> {
    const appUrl = getAppUrl()
    const safeBuyerName = escapeHtml(buyerName)
    const safeVehicleSummary = escapeHtml(vehicleSummary)

    const html = `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: oklch(0.38 0.14 278); margin: 0; font-size: 28px; font-weight: 700;">AutoLenis</h1>
        </div>
        <div style="background: white; border-radius: 12px; padding: 32px; border: 1px solid oklch(0.915 0.008 260); box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
          <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: oklch(0.13 0.02 260);">New Sourced Offer Available</h2>
          <p style="margin: 0 0 16px 0; color: oklch(0.42 0.02 260); line-height: 1.6; font-size: 16px;">
            Hi ${safeBuyerName},
          </p>
          <p style="margin: 0 0 24px 0; color: oklch(0.42 0.02 260); line-height: 1.6; font-size: 16px;">
            Great news! We&apos;ve sourced a new offer matching your vehicle request: <strong>${safeVehicleSummary}</strong>. Log in to review the details and accept or continue waiting for additional offers.
          </p>
          <a href="${appUrl}/buyer/requests/${encodeURIComponent(caseId)}" style="display: inline-block; background: oklch(0.38 0.14 278); color: white; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px;">
            Review Offer
          </a>
        </div>
        <div style="text-align: center; margin-top: 32px;">
          <p style="margin: 0; color: oklch(0.55 0.02 260); font-size: 13px;">
            Questions? Reply to this email or visit our <a href="${appUrl}/faq" style="color: oklch(0.38 0.14 278);">FAQ</a>.
          </p>
        </div>
      </div>
    `

    return this.send(
      {
        to: email,
        subject: `New Offer Available on Your Vehicle Request — AutoLenis`,
        html,
      },
      { templateKey: "sourced_offer_presented", userId },
    )
  }

}
export const emailService = new EmailService()
export default emailService
