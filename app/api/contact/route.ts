import { type NextRequest, NextResponse } from "next/server"
import { getSupabase, isDatabaseConfigured } from "@/lib/db"
import { emailService } from "@/lib/services/email.service"
import { logger } from "@/lib/logger"
import { escapeHtml } from "@/lib/utils/escape-html"
import { rateLimit } from "@/lib/middleware/rate-limit"

function getNotificationRecipient() {
  return process.env['ADMIN_NOTIFICATION_EMAIL'] || "info@autolenis.com"
}

// Contact form submission handler
export async function POST(request: NextRequest) {
  // Rate limit: 5 submissions per 15 minutes per IP to prevent spam
  const rateLimitResponse = await rateLimit(request, {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000,
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const body = await request.json()

    const { firstName, lastName, email, phone, subject, message, marketingConsent } = body

    // Validate required fields
    if (!firstName || !lastName || !email || !subject || !message) {
      return NextResponse.json({ success: false, error: "Please fill in all required fields" }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ success: false, error: "Please enter a valid email address" }, { status: 400 })
    }

    // Escape user-supplied values before embedding in HTML email templates
    const safeFirstName = escapeHtml(firstName)
    const safeLastName = escapeHtml(lastName)
    const safeEmail = escapeHtml(email)
    const safePhone = phone ? escapeHtml(phone) : "Not provided"
    const safeSubject = escapeHtml(subject)
    const safeMessage = escapeHtml(message)

    if (isDatabaseConfigured()) {
      try {
        const supabase = getSupabase()
        const { error } = await supabase.from("contact_messages").insert({
          id: crypto.randomUUID(),
          first_name: firstName,
          last_name: lastName,
          email: email,
          phone: phone || null,
          subject: subject,
          message: message,
          marketing_consent: !!marketingConsent,
          created_at: new Date().toISOString(),
          status: "new",
        })

        // Log but don't fail if table doesn't exist
        if (error) {
          logger.debug("Contact database insert skipped", { error: error.message })
        }
      } catch (dbError) {
        // If database operations fail, continue with email
        logger.warn("Contact database not available, continuing with email only")
      }
    }

    // Send notification email to admin via the shared emailService
    try {
      const notificationResult = await emailService.send(
        {
          to: getNotificationRecipient(),
          replyTo: email,
          subject: `[Contact Form] ${safeSubject} - from ${safeFirstName} ${safeLastName}`,
          html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #4338ca; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">New Contact Form Submission</h1>
            </div>
            <div style="padding: 30px; background: #f9f9f9;">
              <h2 style="color: #4338ca; margin-top: 0;">Contact Details</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold; width: 120px;">Name:</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${safeFirstName} ${safeLastName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold;">Email:</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><a href="mailto:${safeEmail}">${safeEmail}</a></td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold;">Phone:</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${safePhone}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold;">Subject:</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${safeSubject}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold;">Marketing Consent:</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${marketingConsent ? "Yes" : "No"}</td>
                </tr>
              </table>
              
              <h2 style="color: #4338ca; margin-top: 30px;">Message</h2>
              <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #eee;">
                <p style="margin: 0; white-space: pre-wrap;">${safeMessage}</p>
              </div>
              
              <p style="margin-top: 30px; color: #666; font-size: 12px;">
                This message was sent from the AutoLenis contact form at ${new Date().toLocaleString()}.
              </p>
            </div>
          </div>
        `,
        },
        { templateKey: "contact_form_notification" },
      )

      if (!notificationResult.success) {
        logger.error("Contact notification email failed", { error: notificationResult.error })
        return NextResponse.json(
          { success: false, error: "Failed to send message. Please try again later." },
          { status: 500 },
        )
      }
    } catch (emailError: unknown) {
      const msg = emailError instanceof Error ? emailError.message : String(emailError)
      logger.error("Contact email send error", { error: msg })
      return NextResponse.json(
        { success: false, error: "Failed to send message. Please try again later." },
        { status: 500 },
      )
    }

    // Send confirmation email to the submitter (non-blocking)
    try {
      await emailService.send(
        {
          to: email,
          subject: "We received your message - AutoLenis",
          html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #4338ca; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">Thank You for Contacting Us</h1>
            </div>
            <div style="padding: 30px;">
              <p>Hi ${safeFirstName},</p>
              <p>Thank you for reaching out to AutoLenis. We have received your message and our team will get back to you within 24 hours.</p>
              
              <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #4338ca;">Your Message Summary</h3>
                <p><strong>Subject:</strong> ${safeSubject}</p>
                <p style="margin-bottom: 0;"><strong>Message:</strong></p>
                <p style="white-space: pre-wrap; color: #666;">${safeMessage}</p>
              </div>
              
              <p>In the meantime, feel free to explore our platform:</p>
              <ul>
                <li><a href="https://autolenis.com/how-it-works">Learn how AutoLenis works</a></li>
                <li><a href="https://autolenis.com/about">About AutoLenis</a></li>
                <li><a href="https://autolenis.com/buyer/onboarding">Start your application</a></li>
              </ul>
              
              <p>Best regards,<br>The AutoLenis Team</p>
            </div>
            <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666;">
              <p style="margin: 0;">AutoLenis - Your Vehicle Purchase Concierge</p>
              <p style="margin: 5px 0 0 0;">Reply to this email: <a href="mailto:info@autolenis.com">info@autolenis.com</a></p>
            </div>
          </div>
        `,
        },
        { templateKey: "contact_form_confirmation" },
      )
    } catch {
      // Don't fail the request if confirmation email fails
    }

    return NextResponse.json({ success: true, message: "Message sent successfully" })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.error("Contact API error", { error: msg })
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred. Please try again." },
      { status: 500 },
    )
  }
}
