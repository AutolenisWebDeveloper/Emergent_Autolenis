import "server-only"

import Stripe from "stripe"

let _stripe: Stripe | null = null

function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not configured")
    }
    _stripe = new Stripe(key)
  }
  return _stripe
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    return Reflect.get(getStripe(), prop, receiver)
  },
})

// Helper to get Stripe publishable key for client
export const getStripePublishableKey = () => {
  return process.env['NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY']!
}

/**
 * Low-level Stripe checkout session creators.
 *
 * ⚠️  For new code, use CheckoutService (lib/services/checkout.service.ts)
 * which wraps these with idempotency, session reuse, and ownership checks.
 *
 * These functions are kept for backward compatibility with
 * PaymentService.createDepositPayment / createServiceFeePayment
 * which use PaymentIntents directly.
 */
export async function createDepositCheckoutSession(params: {
  buyerId: string
  auctionId: string
  amount: number
  successUrl?: string
  cancelUrl?: string
}) {
  const session = await stripe.checkout.sessions.create({
    ui_mode: params.successUrl ? "hosted" as any : "embedded",
    redirect_on_completion: params.successUrl ? undefined : "never",
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "AutoLenis Deposit",
            description: "Refundable deposit for vehicle auction",
          },
          unit_amount: params.amount * 100, // Convert to cents
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    metadata: {
      type: "deposit",
      buyerId: params.buyerId,
      auctionId: params.auctionId,
    },
  })

  return session
}

export async function createServiceFeeCheckoutSession(params: {
  dealId: string
  buyerId: string
  amount: number
  successUrl?: string
  cancelUrl?: string
}) {
  const session = await stripe.checkout.sessions.create({
    ui_mode: params.successUrl ? "hosted" as any : "embedded",
    redirect_on_completion: params.successUrl ? undefined : "never",
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "AutoLenis Concierge Fee",
            description: "One-time service fee for vehicle purchase assistance",
          },
          unit_amount: params.amount * 100,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    metadata: {
      type: "service_fee",
      dealId: params.dealId,
      buyerId: params.buyerId,
    },
  })

  return session
}

// Verify webhook signature
export function constructWebhookEvent(payload: string | Buffer, signature: string) {
  const webhookSecret = process.env['STRIPE_WEBHOOK_SECRET']

  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured")
  }

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret)
}
