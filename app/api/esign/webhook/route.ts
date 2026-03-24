import { type NextRequest, NextResponse } from "next/server"
import { esignService } from "@/lib/services/esign.service"

const WEBHOOK_SECRET = process.env['ESIGN_WEBHOOK_SECRET']

export async function POST(req: NextRequest) {
  try {
    // Require webhook secret to be configured
    if (!WEBHOOK_SECRET) {
      console.error("[E-Sign Webhook] ESIGN_WEBHOOK_SECRET is not configured")
      return NextResponse.json({ error: "Service not configured" }, { status: 503 })
    }

    // Verify signature before processing
    const rawBody = await req.text()
    const signature = req.headers.get("x-esign-signature") || ""

    const isValid = esignService.verifyWebhookSignature(rawBody, signature, WEBHOOK_SECRET)
    if (!isValid) {
      console.error("[E-Sign Webhook] Invalid signature")
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    const payload = JSON.parse(rawBody)

    await esignService.handleWebhook(payload)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    const rawMessage = error && typeof error === "object" && "message" in error ? (error as Error).message : String(error)
    const safeMessage = rawMessage.replace(/[\r\n]/g, " ")
    console.error("[E-Sign Webhook] Error:", safeMessage)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}
