"use server"

import { requireAuth } from "@/lib/auth-server"
import { createClient } from "@/lib/supabase/server"
import { CheckoutService, CheckoutError } from "@/lib/services/checkout.service"

export async function startDepositCheckout(auctionId: string) {
  const session = await requireAuth(["BUYER"])
  const supabase = await createClient()

  const { data: buyer, error: buyerError } = await supabase
    .from("BuyerProfile")
    .select("id")
    .eq("userId", session.userId)
    .single()

  if (buyerError || !buyer) {
    console.error("[Stripe] Buyer profile not found:", buyerError)
    throw new Error("Buyer profile not found")
  }

  const result = await CheckoutService.getOrCreateDepositCheckout({
    buyerId: buyer.id,
    auctionId,
  })

  return result.clientSecret
}

export async function startServiceFeeCheckout(dealId: string) {
  const session = await requireAuth(["BUYER"])
  const supabase = await createClient()

  const { data: buyer, error: buyerError } = await supabase
    .from("BuyerProfile")
    .select("id")
    .eq("userId", session.userId)
    .single()

  if (buyerError || !buyer) {
    console.error("[Stripe] Buyer profile not found:", buyerError)
    throw new Error("Buyer profile not found")
  }

  const result = await CheckoutService.getOrCreateServiceFeeCheckout({
    buyerId: buyer.id,
    dealId,
  })

  return result.clientSecret
}
