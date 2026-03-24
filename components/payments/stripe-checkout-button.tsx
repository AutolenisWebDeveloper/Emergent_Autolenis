"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, CreditCard } from "lucide-react"
import { extractApiError } from "@/lib/utils/error-message"

interface StripeCheckoutButtonProps {
  type: "deposit" | "service_fee"
  auctionId?: string
  dealId?: string
  amount: number
  label?: string
  className?: string
}

export function StripeCheckoutButton({ type, auctionId, dealId, amount, label, className }: StripeCheckoutButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleCheckout = async () => {
    setLoading(true)

    try {
      const response = await fetch("/api/payments/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          auctionId,
          dealId,
        }),
      })

      const data = await response.json()

      if (data.success && data.data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.data.url
      } else {
        throw new Error(extractApiError(data.error, "Failed to create checkout session"))
      }
    } catch (error: any) {
      console.error("Checkout error:", error)
      alert(error.message || "Failed to start checkout")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleCheckout} disabled={loading} className={className}>
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <CreditCard className="mr-2 h-4 w-4" />
          {label || `Pay $${amount}`}
        </>
      )}
    </Button>
  )
}
