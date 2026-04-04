/**
 * Admin Tools – tools available to the Admin Ops agent.
 *
 * Every tool in this set has auditRequired: true.
 * Handlers delegate to existing backend services.
 */

import type { ToolDefinition } from "./registry"

export const adminTools: ToolDefinition[] = [
  {
    name: "searchUser",
    description: "Search for a user by email, name, or ID.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query (email, name, or user ID)" },
      },
      required: ["query"],
    },
    allowedRoles: ["admin"],
    auditRequired: true,
    handler: async (_input) => {
      return { success: false, error: "User search service not available" }
    },
  },
  {
    name: "generateReport",
    description: "Generate a business report (revenue, pipeline, conversion, etc.).",
    inputSchema: {
      type: "object",
      properties: {
        reportType: { type: "string", description: "Type of report: revenue | pipeline | conversion | affiliate" },
        dateRange: { type: "string", description: "Date range in ISO format (e.g. 2024-01-01/2024-12-31)" },
      },
      required: ["reportType"],
    },
    allowedRoles: ["admin"],
    auditRequired: true,
    handler: async (_input) => {
      return { success: false, error: "Report generation service not available" }
    },
  },
  {
    name: "reconcileAffiliatePayout",
    description: "Trigger reconciliation for affiliate payouts.",
    inputSchema: {
      type: "object",
      properties: {
        affiliateId: { type: "string", description: "Affiliate ID to reconcile (optional – all if omitted)" },
      },
      required: [],
    },
    allowedRoles: ["admin"],
    auditRequired: true,
    handler: async (_input) => {
      return { success: false, error: "Reconciliation service not available" }
    },
  },
  {
    name: "markNotificationRead",
    description: "Mark one or all notifications as read.",
    inputSchema: {
      type: "object",
      properties: {
        notificationId: { type: "string", description: "Notification ID (optional – marks all if omitted)" },
      },
      required: [],
    },
    allowedRoles: ["admin"],
    auditRequired: true,
    handler: async (_input) => {
      return { success: false, error: "Notification service not available" }
    },
  },
  {
    name: "viewAuditLog",
    description: "Retrieve recent audit log entries.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "string", description: "Number of entries to return (default 20)" },
        actorId: { type: "string", description: "Filter by actor ID (optional)" },
      },
      required: [],
    },
    allowedRoles: ["admin"],
    auditRequired: true,
    handler: async (_input) => {
      return { success: false, error: "Audit log service not available" }
    },
  },
]
