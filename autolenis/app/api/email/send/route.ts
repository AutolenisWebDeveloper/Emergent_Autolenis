import { type NextRequest, NextResponse } from "next/server"
import { emailService } from "@/lib/services/email.service"
import { getCurrentUser, isAdminRole } from "@/lib/auth-server"

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    // Only admins can send arbitrary emails via API
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { type, to, data } = body

    let result: { success: boolean; messageId?: string; error?: string }

    switch (type) {
      case "welcome":
        result = await emailService.sendWelcomeEmail(to, data.firstName, data.role)
        break

      case "auction_started":
        result = await emailService.sendNotification(to, "Auction Started", `Your auction for ${data.vehicleInfo} has started. Dealers are now competing for your business.`, "View Auction", `${process.env['NEXT_PUBLIC_APP_URL'] || 'https://autolenis.com'}/dealer/auctions`)
        break

      case "new_offer":
        result = await emailService.sendNewOfferNotification(to, data.buyerName, data.vehicleName, data.lowestPriceCents)
        break

      case "auction_won":
        result = await emailService.sendNotification(to, "Congratulations — You Won the Auction!", `Great news, ${data.buyerName}! Your auction for ${data.vehicleInfo} has been won. Check your dashboard for details.`, "View Dashboard", `${process.env['NEXT_PUBLIC_APP_URL'] || 'https://autolenis.com'}/buyer/dashboard`)
        break

      case "contract_shield":
        result = await emailService.sendNotification(to, data.subject || "Contract Shield Update", data.message, data.ctaText, data.ctaUrl)
        break

      case "payment_confirmation":
        result = await emailService.sendNotification(to, "Payment Confirmed", `Hi ${data.buyerName}, your payment of $${data.amount} for ${data.description} has been confirmed.`, "View Dashboard", `${process.env['NEXT_PUBLIC_APP_URL'] || 'https://autolenis.com'}/buyer/dashboard`)
        break

      case "deal_complete":
        result = await emailService.sendDealCompletedNotification(to, data.buyerName, data.vehicleName)
        break

      case "referral_commission":
        result = await emailService.sendNotification(to, "Commission Earned!", `Hi ${data.firstName}, you've earned a commission of $${data.amount}. Check your affiliate dashboard for details.`, "View Dashboard", `${process.env['NEXT_PUBLIC_APP_URL'] || 'https://autolenis.com'}/affiliate/dashboard`)
        break

      default:
        return NextResponse.json({ error: "Invalid email type" }, { status: 400 })
    }

    if (!result.success) {
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
    }

    return NextResponse.json({ success: true, messageId: result.messageId })
  } catch (error) {
    console.error("[API] Email send error:", error)
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
  }
}
