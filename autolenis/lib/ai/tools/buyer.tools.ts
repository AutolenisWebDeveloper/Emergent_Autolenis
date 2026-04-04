/**
 * Buyer Tools – tools available to the Buyer Concierge agent.
 *
 * Each handler delegates to existing backend services / API routes.
 * No direct DB mutations occur here.
 */

import type { ToolDefinition } from "./registry"
import { estimateAffordability, validateAffordabilityInput } from "@/lib/calculators/affordability"

export const buyerTools: ToolDefinition[] = [
  {
    name: "startPreQual",
    description: "Initiate a pre-qualification check for the authenticated buyer.",
    inputSchema: {
      type: "object",
      properties: {
        userId: { type: "string", description: "Buyer user ID" },
      },
      required: ["userId"],
    },
    allowedRoles: ["buyer", "admin"],
    auditRequired: true,
    handler: async (_input) => {
      return { success: false, error: "Pre-qualification service not available" }
    },
  },
  {
    name: "refreshPreQual",
    description: "Refresh an existing pre-qualification for updated terms.",
    inputSchema: {
      type: "object",
      properties: {
        userId: { type: "string", description: "Buyer user ID" },
      },
      required: ["userId"],
    },
    allowedRoles: ["buyer", "admin"],
    auditRequired: true,
    handler: async (_input) => {
      return { success: false, error: "Pre-qualification service not available" }
    },
  },
  {
    name: "createBuyerRequest",
    description: "Create a new vehicle purchase request for the buyer.",
    inputSchema: {
      type: "object",
      properties: {
        userId: { type: "string", description: "Buyer user ID" },
        vehiclePrefs: { type: "string", description: "JSON string of vehicle preferences" },
        budget: { type: "string", description: "Maximum budget in dollars" },
      },
      required: ["userId"],
    },
    allowedRoles: ["buyer", "admin"],
    auditRequired: true,
    handler: async (_input) => {
      return { success: false, error: "Buyer request service not available" }
    },
  },
  {
    name: "uploadDocuments",
    description: "Upload one or more documents for the buyer's deal.",
    inputSchema: {
      type: "object",
      properties: {
        userId: { type: "string", description: "Buyer user ID" },
        documentType: { type: "string", description: "Type of document (contract, insurance, title, registration, other)" },
      },
      required: ["userId", "documentType"],
    },
    allowedRoles: ["buyer", "admin"],
    auditRequired: true,
    handler: async (_input) => {
      return { success: false, error: "Document upload service not available" }
    },
  },
  {
    name: "checkDealStatus",
    description: "Check the current status of the buyer's active deal.",
    inputSchema: {
      type: "object",
      properties: {
        userId: { type: "string", description: "Buyer user ID" },
        dealId: { type: "string", description: "Deal ID (optional – defaults to active deal)" },
      },
      required: ["userId"],
    },
    allowedRoles: ["buyer", "dealer", "admin"],
    auditRequired: false,
    handler: async (_input) => {
      return { success: false, error: "Deal status service not available" }
    },
  },
  {
    name: "explainContract",
    description: "Provide a plain-language explanation of contract terms for the buyer.",
    inputSchema: {
      type: "object",
      properties: {
        dealId: { type: "string", description: "Deal ID whose contract to explain" },
      },
      required: ["dealId"],
    },
    allowedRoles: ["buyer", "admin"],
    auditRequired: false,
    handler: async (_input) => {
      return { success: false, error: "Contract explanation service not available" }
    },
  },
  {
    name: "estimateAffordability",
    description:
      "Run the official affordability calculator to estimate a monthly payment based on buyer-provided inputs. " +
      "Requires: monthlyPayment (target range), downPayment, creditTier, state. Optional: loanTermMonths.",
    inputSchema: {
      type: "object",
      properties: {
        monthlyPayment: { type: "string", description: "Target monthly payment amount in dollars" },
        downPayment: { type: "string", description: "Down payment amount in dollars" },
        creditTier: {
          type: "string",
          description: "Estimated credit tier: excellent, good, fair, or rebuilding",
        },
        state: { type: "string", description: "US state abbreviation for tax/fee estimation" },
        loanTermMonths: { type: "string", description: "Desired loan term in months (optional, e.g. 36, 48, 60, 72)" },
      },
      required: ["monthlyPayment", "downPayment", "creditTier", "state"],
    },
    allowedRoles: ["buyer", "public", "admin"],
    auditRequired: false,
    handler: async (input) => {
      const validated = validateAffordabilityInput(input)
      if ("error" in validated) {
        return { success: false, error: validated.error }
      }
      return estimateAffordability(validated)
    },
  },
]
