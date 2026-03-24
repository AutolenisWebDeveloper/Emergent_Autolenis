import { supabase } from "@/lib/db"

export async function refundDeposit(depositId: string, reason: string, adminId: string, workspaceId?: string) {
  const { data: deposit, error: fetchError } = await supabase
    .from("DepositPayment")
    .select("id, buyerId, status")
    .eq("id", depositId)
    .single()

  if (fetchError || !deposit) throw new Error("Deposit not found")

  // Fail-closed: if workspace is provided, verify the deposit belongs to this workspace
  if (workspaceId) {
    const { data: buyer } = await supabase
      .from("User")
      .select("id")
      .eq("id", deposit.buyerId)
      .eq("workspaceId", workspaceId)
      .single()
    if (!buyer) throw new Error("Deposit not found")
  }

  if (deposit.status !== "HELD") throw new Error("Deposit cannot be refunded")

  const refundId = `re_${Date.now()}`

  const { error: updateError } = await supabase
    .from("DepositPayment")
    .update({
      status: "REFUNDED",
      refundedAt: new Date().toISOString(),
      refundId,
      reason,
    })
    .eq("id", depositId)

  if (updateError) throw new Error("Failed to update deposit")

  await supabase.from("ComplianceEvent").insert({
    id: `ce_${Date.now()}`,
    type: "DEPOSIT_REFUNDED",
    userId: deposit.buyerId,
    severity: "INFO",
    details: { depositId, refundId, reason, adminId },
    createdAt: new Date().toISOString(),
  })

  return { success: true, refundId }
}

export async function suspendDealer(dealerId: string, reason: string, adminId: string, workspaceId?: string) {
  // Verify dealer belongs to this workspace before mutating
  if (workspaceId) {
    const { data: dealer } = await supabase
      .from("Dealer")
      .select("id")
      .eq("id", dealerId)
      .eq("workspaceId", workspaceId)
      .single()
    if (!dealer) throw new Error("Dealer not found")
  }

  const { error: updateError } = await supabase
    .from("Dealer")
    .update({ active: false })
    .eq("id", dealerId)

  if (updateError) throw new Error("Failed to suspend dealer")

  await supabase.from("ComplianceEvent").insert({
    id: `ce_${Date.now()}`,
    type: "DEALER_SUSPENDED",
    userId: adminId,
    severity: "WARNING",
    details: { dealerId, reason },
    createdAt: new Date().toISOString(),
  })

  return { success: true }
}

export async function approveDealer(dealerId: string, adminId: string, workspaceId?: string) {
  // Verify dealer belongs to this workspace before mutating
  if (workspaceId) {
    const { data: dealer } = await supabase
      .from("Dealer")
      .select("id")
      .eq("id", dealerId)
      .eq("workspaceId", workspaceId)
      .single()
    if (!dealer) throw new Error("Dealer not found")
  }

  const { error: updateError } = await supabase
    .from("Dealer")
    .update({ verified: true, active: true })
    .eq("id", dealerId)

  if (updateError) throw new Error("Failed to approve dealer")

  await supabase.from("ComplianceEvent").insert({
    id: `ce_${Date.now()}`,
    type: "DEALER_APPROVED",
    userId: adminId,
    severity: "INFO",
    details: { dealerId },
    createdAt: new Date().toISOString(),
  })

  return { success: true }
}

export async function getSystemSettings() {
  const { data: settings } = await supabase.from("AdminSettings").select("key, value, valueJson")

  const settingsMap: Record<string, any> = {}
  settings?.forEach((s) => {
    settingsMap[s.key] = s.valueJson || s.value || null
  })

  return {
    depositAmount: settingsMap['deposit_amount'] || 99,
    // V2: flat $499 Premium fee. Legacy tier settings kept for backward compatibility;
    // live payment routes use PREMIUM_FEE from lib/constants.ts directly.
    feeTierOneCents: settingsMap['fee_tier_one_cents'] || 49900,
    feeTierTwoCents: settingsMap['fee_tier_two_cents'] || 49900, // V2: same as tier one ($499)
    feeThresholdCents: settingsMap['fee_threshold_cents'] || 3500000,
    auctionDurationHours: settingsMap['auction_duration_hours'] || 48,
    depositGracePeriodHours: settingsMap['deposit_grace_period_hours'] || 24,
    feeFinancingEnabled: settingsMap['fee_financing_enabled'] !== false,
    affiliateCommissionL1: settingsMap['affiliate_commission_l1'] || 0.2,
    affiliateCommissionL2: settingsMap['affiliate_commission_l2'] || 0.15,
    affiliateCommissionL3: settingsMap['affiliate_commission_l3'] || 0.1,
    affiliateCommissionL4: settingsMap['affiliate_commission_l4'] || 0.05,
    affiliateCommissionL5: settingsMap['affiliate_commission_l5'] || 0.03,
    affiliateMinPayout: settingsMap['affiliate_min_payout'] || 50,
  }
}

export async function updateSystemSettings(key: string, value: any, adminId: string) {
  const id = `setting_${Date.now()}`

  const { error: upsertError } = await supabase.from("AdminSettings").upsert(
    {
      id,
      key,
      valueJson: value,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    { onConflict: "key" }
  )

  if (upsertError) {
    console.error("[AdminService] Error updating system settings:", upsertError)
    throw new Error("Failed to update settings")
  }

  await supabase.from("ComplianceEvent").insert({
    id: `ce_${Date.now()}`,
    type: "ADMIN_SETTING_CHANGED",
    userId: adminId,
    severity: "INFO",
    details: { key, newValue: value },
    createdAt: new Date().toISOString(),
  })

  return { success: true }
}
