/**
 * Contract Tools – tools available to the Contract Intelligence agent.
 * Handlers delegate to ContractShieldService and Prisma for real data.
 */

import type { ToolDefinition } from "./registry"

const CONTRACT_DISCLAIMER = "⚠️ DISCLAIMER: This analysis is for informational purposes only and does NOT constitute legal advice. Consult a licensed attorney for legal questions."

export const contractTools: ToolDefinition[] = [
  {
    name: "readContract",
    description: "Read and parse an uploaded contract document.",
    inputSchema: {
      type: "object",
      properties: {
        contractId: { type: "string", description: "Contract document ID" },
      },
      required: ["contractId"],
    },
    allowedRoles: ["buyer", "admin"],
    auditRequired: true,
    handler: async (_input) => {
      return { success: false, error: "Contract reading service not available" }
    },
  },
  {
    name: "extractFees",
    description: "Extract and list all fees from a contract document, including dealer add-ons, financing terms, and risk flags.",
    inputSchema: {
      type: "object",
      properties: {
        contractId: { type: "string", description: "Contract document ID" },
      },
      required: ["contractId"],
    },
    allowedRoles: ["buyer", "admin"],
    auditRequired: true,
    handler: async (_input) => {
      return { success: false, error: "Fee extraction service not available" }
    },
  },
  {
    name: "summarizeDocument",
    description: "Generate a plain-language summary of a contract or document with fee extraction, risk flags, and key terms.",
    inputSchema: {
      type: "object",
      properties: {
        contractId: { type: "string", description: "Contract document ID" },
      },
      required: ["contractId"],
    },
    allowedRoles: ["buyer", "admin"],
    auditRequired: false,
    handler: async (_input) => {
      return { success: false, error: "Document summarization service not available" }
    },
  },
]
