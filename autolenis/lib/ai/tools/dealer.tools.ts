/**
 * Dealer Tools – tools available to the Dealer Liaison agent.
 * Handlers delegate to existing backend services.
 */

import type { ToolDefinition } from "./registry"

export const dealerTools: ToolDefinition[] = [
  {
    name: "submitOffer",
    description: "Submit a competitive offer on a buyer request.",
    inputSchema: {
      type: "object",
      properties: {
        dealerId: { type: "string", description: "Dealer ID" },
        requestId: { type: "string", description: "Buyer request ID" },
        price: { type: "string", description: "Offer price in dollars" },
        vehicleSummary: { type: "string", description: "Brief vehicle description" },
      },
      required: ["dealerId", "requestId", "price"],
    },
    allowedRoles: ["dealer", "admin"],
    auditRequired: true,
    handler: async (_input) => {
      return { success: false, error: "Offer submission service not available" }
    },
  },
  {
    name: "uploadDealerDocument",
    description: "Upload a document from the dealer (title, registration, contract).",
    inputSchema: {
      type: "object",
      properties: {
        dealerId: { type: "string", description: "Dealer ID" },
        documentType: { type: "string", description: "Document type" },
      },
      required: ["dealerId", "documentType"],
    },
    allowedRoles: ["dealer", "admin"],
    auditRequired: true,
    handler: async (_input) => {
      return { success: false, error: "Document upload service not available" }
    },
  },
  {
    name: "checkBuyerRequest",
    description: "View details of a buyer request available to the dealer.",
    inputSchema: {
      type: "object",
      properties: {
        requestId: { type: "string", description: "Buyer request ID" },
      },
      required: ["requestId"],
    },
    allowedRoles: ["dealer", "admin"],
    auditRequired: false,
    handler: async (_input) => {
      return { success: false, error: "Buyer request service not available" }
    },
  },
]
