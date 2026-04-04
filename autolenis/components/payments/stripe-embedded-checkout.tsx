"use client"

import { useCallback } from "react"
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"

import { startDepositCheckout, startServiceFeeCheckout } from "@/app/actions/stripe"

const stripePromise = loadStripe(process.env['NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY']!)

interface StripeEmbeddedCheckoutProps {
  type: "deposit" | "service_fee"
  auctionId?: string
  dealId?: string
  onComplete?: () => void
}

export function StripeEmbeddedCheckout({ type, auctionId, dealId, onComplete }: StripeEmbeddedCheckoutProps) {
  const fetchClientSecret = useCallback(async (): Promise<string> => {
    if (type === "deposit" && auctionId) {
      const secret = await startDepositCheckout(auctionId)
      if (!secret) throw new Error("Failed to get client secret")
      return secret
    } else if (type === "service_fee" && dealId) {
      const secret = await startServiceFeeCheckout(dealId)
      if (!secret) throw new Error("Failed to get client secret")
      return secret
    }
    throw new Error("Invalid checkout configuration")
  }, [type, auctionId, dealId])

  return (
    <div id="checkout" className="min-h-[400px]">
      <EmbeddedCheckoutProvider
        stripe={stripePromise}
        options={{
          fetchClientSecret,
          onComplete,
        }}
      >
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  )
}
