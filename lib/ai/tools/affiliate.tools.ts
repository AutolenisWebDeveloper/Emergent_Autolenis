/**
 * Affiliate Tools – tools available to the Affiliate Growth agent.
 * Handlers delegate to existing backend services.
 */

import type { ToolDefinition } from "./registry"

export const affiliateTools: ToolDefinition[] = [
  {
    name: "generateReferralLink",
    description: "Generate a unique referral link for the affiliate.",
    inputSchema: {
      type: "object",
      properties: {
        affiliateId: { type: "string", description: "Affiliate ID" },
        campaign: { type: "string", description: "Optional campaign name for tracking" },
      },
      required: ["affiliateId"],
    },
    allowedRoles: ["affiliate", "admin"],
    auditRequired: false,
    handler: async (_input) => {
      return { success: false, error: "Referral link service not available" }
    },
  },
  {
    name: "checkReferralStats",
    description: "Retrieve referral statistics for the affiliate.",
    inputSchema: {
      type: "object",
      properties: {
        affiliateId: { type: "string", description: "Affiliate ID" },
      },
      required: ["affiliateId"],
    },
    allowedRoles: ["affiliate", "admin"],
    auditRequired: false,
    handler: async (_input) => {
      return { success: false, error: "Referral stats service not available" }
    },
  },
  {
    name: "checkPendingPayouts",
    description: "Check pending payout amounts for the affiliate.",
    inputSchema: {
      type: "object",
      properties: {
        affiliateId: { type: "string", description: "Affiliate ID" },
      },
      required: ["affiliateId"],
    },
    allowedRoles: ["affiliate", "admin"],
    auditRequired: false,
    handler: async (_input) => {
      return { success: false, error: "Payout service not available" }
    },
  },
  {
    name: "reportAttributionIssue",
    description: "Report a referral attribution issue for investigation.",
    inputSchema: {
      type: "object",
      properties: {
        affiliateId: { type: "string", description: "Affiliate ID" },
        description: { type: "string", description: "Description of the attribution issue" },
        referralCode: { type: "string", description: "Referral code in question" },
      },
      required: ["affiliateId", "description"],
    },
    allowedRoles: ["affiliate", "admin"],
    auditRequired: true,
    handler: async (_input) => {
      return { success: false, error: "Attribution reporting service not available" }
    },
  },
]
