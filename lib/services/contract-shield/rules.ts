import { prisma } from "@/lib/db"
import { logger } from "@/lib/logger"
import { FLAGGED_ADD_ONS } from "./types"

export async function getActiveRules() {
  return prisma.contractShieldRule.findMany({
    where: { enabled: true },
    orderBy: { ruleName: "asc" },
  })
}

export async function updateRule(
  ruleId: string,
  updates: {
    enabled?: boolean
    thresholdValue?: number
    severity?: string
    configJson?: Record<string, any>
  },
) {
  const rule = await prisma.contractShieldRule.update({
    where: { id: ruleId },
    data: updates,
  })

  logger.info("Contract Shield rule updated", {
    ruleId,
    updates,
  })

  return rule
}

export async function initializeDefaultRules() {
  const defaultRules = [
    {
      ruleKey: "APR_THRESHOLD",
      ruleName: "APR Variance Threshold",
      ruleDescription: "Maximum allowed difference between offered and contract APR",
      ruleType: "THRESHOLD",
      severity: "CRITICAL",
      thresholdValue: 0.5, // 0.5%
      enabled: true,
    },
    {
      ruleKey: "OTD_THRESHOLD",
      ruleName: "Out-the-Door Price Threshold",
      ruleDescription: "Maximum allowed dollar difference in OTD price",
      ruleType: "THRESHOLD",
      severity: "CRITICAL",
      thresholdValue: 100, // $100
      enabled: true,
    },
    {
      ruleKey: "DOC_FEE_CA_MAX",
      ruleName: "California Doc Fee Maximum",
      ruleDescription: "Maximum allowed documentation fee in California",
      ruleType: "THRESHOLD",
      severity: "CRITICAL",
      thresholdValue: 85,
      enabled: true,
      configJson: { state: "CA" },
    },
    {
      ruleKey: "ADD_ON_ALERT",
      ruleName: "Optional Add-On Alert",
      ruleDescription: "Flag contracts with optional add-ons for buyer review",
      ruleType: "ALERT",
      severity: "IMPORTANT",
      enabled: true,
      configJson: {
        flaggedItems: FLAGGED_ADD_ONS,
      },
    },
    {
      ruleKey: "PAYMENT_VARIANCE",
      ruleName: "Monthly Payment Variance",
      ruleDescription: "Maximum allowed dollar difference in monthly payment",
      ruleType: "THRESHOLD",
      severity: "CRITICAL",
      thresholdValue: 5, // $5
      enabled: true,
    },
  ]

  for (const rule of defaultRules) {
    await prisma.contractShieldRule.upsert({
      where: { ruleKey: rule.ruleKey },
      update: {},
      create: rule,
    })
  }

  logger.info("Contract Shield default rules initialized")
}
