import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { getSessionUser } from "@/lib/auth-server"
import { supabase } from "@/lib/db"
import { requireDatabase } from "@/lib/require-database"
import { emailService } from "@/lib/services/email.service"
import { isTestWorkspace } from "@/lib/app-mode"
import { mockDb } from "@/lib/mocks/mockStore"
import { escapeHtml } from "@/lib/utils/escape-html"
import { logger } from "@/lib/logger"

const schema = z.object({
  recipientEmail: z.string().email(),
  message: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser()
    const isAffiliate =
      user &&
      (user.role === "AFFILIATE" ||
        user.role === "AFFILIATE_ONLY" ||
        (user.role === "BUYER" && user.is_affiliate === true))

    if (!user || !isAffiliate) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { recipientEmail, message } = schema.parse(body)

    let affiliate:
      | {
          id: string
          firstName?: string | null
          lastName?: string | null
          refCode?: string | null
          referralCode?: string | null
          ref_code?: string | null
        }
      | null = null

    if (isTestWorkspace(user)) {
      affiliate =
        mockDb.affiliateProfiles.find((profile: any) => profile.userId === user.userId) || null
    } else {
      const dbUnavailable = requireDatabase()
      if (dbUnavailable) return dbUnavailable

      const { data: affiliateData, error } = await supabase
        .from("Affiliate")
        .select("id, firstName, lastName, refCode, referralCode, ref_code")
        .eq("userId", user.userId)
        .maybeSingle()

      if (error) {
        return NextResponse.json({ success: false, error: "Affiliate profile not found" }, { status: 404 })
      }
      affiliate = affiliateData
    }

    if (!affiliate) {
      return NextResponse.json({ success: false, error: "Affiliate profile not found" }, { status: 404 })
    }

    const refCode = affiliate.refCode || affiliate.referralCode || affiliate.ref_code
    const baseUrl = process.env['NEXT_PUBLIC_APP_URL'] || "https://autolenis.com"
    const referralLink = `${baseUrl}/?ref=${refCode}`
    const affiliateName = `${affiliate.firstName || ""} ${affiliate.lastName || ""}`.trim() || "An AutoLenis partner"

    const safeMessage = message ? escapeHtml(message).replace(/\n/g, "<br />") : ""
    const emailBody = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;">
<tr><td align="center" style="padding:24px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#2D1B69,#3d2066);padding:32px 24px;text-align:center;">
    <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:bold;">AutoLenis</h1>
    <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">Car Buying. Reengineered.</p>
  </td></tr>
  <!-- Body -->
  <tr><td style="padding:32px 24px;">
    <h2 style="margin:0 0 16px;color:#1a1a1a;font-size:22px;">${affiliateName} invited you to AutoLenis</h2>
    <p style="margin:0 0 16px;color:#555555;font-size:16px;line-height:1.6;">AutoLenis helps buyers get the best price on their next vehicle with full transparency — no hidden fees, no surprises.</p>
    ${safeMessage ? `<div style="margin:0 0 24px;padding:16px;background-color:#f9f9fb;border-left:4px solid #2D1B69;border-radius:4px;"><p style="margin:0;color:#333333;font-size:15px;line-height:1.5;">${safeMessage}</p></div>` : ""}
    <table role="presentation" width="100%"><tr><td align="center" style="padding:8px 0 24px;">
      <a href="${referralLink}" style="display:inline-block;background-color:#2D1B69;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:bold;">View My AutoLenis Link</a>
    </td></tr></table>
    <p style="margin:0 0 8px;color:#888888;font-size:13px;">Or copy and paste this link into your browser:</p>
    <p style="margin:0;color:#2D1B69;font-size:13px;word-break:break-all;">${referralLink}</p>
    <p style="margin:24px 0 0;color:#888888;font-size:13px;line-height:1.5;">Use this link to start your AutoLenis request. ${escapeHtml(affiliateName)} may earn a referral commission if you sign up.</p>
  </td></tr>
  <!-- Footer -->
  <tr><td style="padding:24px;background-color:#f9f9fb;border-top:1px solid #eeeeee;text-align:center;">
    <p style="margin:0 0 8px;color:#999999;font-size:12px;">&copy; ${new Date().getFullYear()} AutoLenis. All rights reserved.</p>
    <p style="margin:0;color:#999999;font-size:11px;line-height:1.5;">This email was sent because ${escapeHtml(affiliateName)} shared their referral link with you. If you believe this was sent in error, you can safely ignore this email.</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`

    const plainText = `${affiliateName} invited you to AutoLenis\n\nAutoLenis helps buyers get the best price on their next vehicle with full transparency.\n\n${message ? `Message from ${affiliateName}:\n${message}\n\n` : ""}View the referral link: ${referralLink}\n\nUse this link to start your AutoLenis request. ${affiliateName} may earn a referral commission if you sign up.\n\n© ${new Date().getFullYear()} AutoLenis. All rights reserved.`

    const sendResult = await emailService.send({
      to: recipientEmail,
      subject: `${affiliateName} shared an AutoLenis referral link with you`,
      html: emailBody,
      text: plainText,
    })

    const eventPayload = {
      affiliateId: affiliate.id,
      workspaceId: user.workspace_id || null,
      recipientEmail,
      message: message || null,
      referralLink,
      status: sendResult.success ? "sent" : "failed",
      providerMessageId: sendResult.messageId || null,
      error: sendResult.success ? null : sendResult.error || "Unknown error",
      sentAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    if (isTestWorkspace(user)) {
      const events = (mockDb.affiliateShareEvents ||= [])
      events.unshift({ id: `test_share_${Date.now()}`, ...eventPayload })
    } else {
      const { error: eventError } = await supabase.from("AffiliateShareEvent").insert(eventPayload)
      if (eventError) {
        logger.error("[Affiliate Share] Failed to log share event:", eventError)
      }
    }

    if (!sendResult.success) {
      return NextResponse.json({ success: false, error: sendResult.error || "Failed to send email" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to share link" }, { status: 500 })
  }
}
