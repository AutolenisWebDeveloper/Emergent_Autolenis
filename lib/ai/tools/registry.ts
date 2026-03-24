/**
 * Tool Registry – central registry for all AI-callable tools.
 *
 * Each tool declares its name, description, JSON-schema input,
 * allowed roles, and whether it requires an audit log entry.
 *
 * The orchestrator uses this registry to:
 *  1. Validate tool calls against the agent's allowedTools list.
 *  2. Enforce role-based access before execution.
 *  3. Write audit entries for flagged tools.
 *
 * Tool handlers delegate to existing backend services.
 * NO DIRECT DATABASE MUTATIONS happen inside a tool handler.
 */

import type { AIRole } from "../context-builder"

export interface ToolInputProperty {
  type: string
  description: string
}

export interface ToolDefinition {
  name: string
  description: string
  inputSchema: {
    type: "object"
    properties: Record<string, ToolInputProperty>
    required: string[]
  }
  allowedRoles: AIRole[]
  auditRequired: boolean
  handler: (input: Record<string, unknown>) => Promise<unknown>
}

// ---------------------------------------------------------------------------
// Buyer tools
// ---------------------------------------------------------------------------
import { buyerTools } from "./buyer.tools"

// ---------------------------------------------------------------------------
// Dealer tools
// ---------------------------------------------------------------------------
import { dealerTools } from "./dealer.tools"

// ---------------------------------------------------------------------------
// Affiliate tools
// ---------------------------------------------------------------------------
import { affiliateTools } from "./affiliate.tools"

// ---------------------------------------------------------------------------
// Admin tools
// ---------------------------------------------------------------------------
import { adminTools } from "./admin.tools"

// ---------------------------------------------------------------------------
// SEO tools
// ---------------------------------------------------------------------------
import { seoTools } from "./seo.tools"

// ---------------------------------------------------------------------------
// Contract tools
// ---------------------------------------------------------------------------
import { contractTools } from "./contract.tools"

// ---------------------------------------------------------------------------
// Public / Sales tools (inlined – lightweight)
// ---------------------------------------------------------------------------
const salesTools: ToolDefinition[] = [
  {
    name: "createLead",
    description: "Capture a new sales lead with name, email and optional phone.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Full name of the lead" },
        email: { type: "string", description: "Email address" },
        phone: { type: "string", description: "Phone number (optional)" },
      },
      required: ["name", "email"],
    },
    allowedRoles: ["public", "buyer", "admin"],
    auditRequired: false,
    handler: async (_input) => {
      return { success: false, error: "Lead capture service not available" }
    },
  },
  {
    name: "scheduleConsultation",
    description: "Schedule a consultation call for a prospective buyer.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Full name" },
        email: { type: "string", description: "Email address" },
        preferredDate: { type: "string", description: "ISO date string of preferred date" },
      },
      required: ["name", "email"],
    },
    allowedRoles: ["public", "buyer", "admin"],
    auditRequired: false,
    handler: async (_input) => {
      return { success: false, error: "Consultation scheduling service not available" }
    },
  },
]

// ---------------------------------------------------------------------------
// Aggregate registry
// ---------------------------------------------------------------------------

const ALL_TOOLS: ToolDefinition[] = [
  ...salesTools,
  ...buyerTools,
  ...dealerTools,
  ...affiliateTools,
  ...adminTools,
  ...seoTools,
  ...contractTools,
]

const toolMap = new Map<string, ToolDefinition>()
for (const tool of ALL_TOOLS) {
  toolMap.set(tool.name, tool)
}

/** Look up a tool by name. */
export function getTool(name: string): ToolDefinition | undefined {
  return toolMap.get(name)
}

/** Return tools that a given role is permitted to use. */
export function getToolsForRole(role: AIRole): ToolDefinition[] {
  return ALL_TOOLS.filter((t) => t.allowedRoles.includes(role))
}

/** Return tools that match a specific list of tool names AND are allowed for the role. */
export function getToolsForAgent(toolNames: readonly string[], role: AIRole): ToolDefinition[] {
  return toolNames
    .map((n) => toolMap.get(n))
    .filter((t): t is ToolDefinition => t !== undefined && t.allowedRoles.includes(role))
}

/** Validate that a tool call is permitted for the given role. */
export function validateToolAccess(toolName: string, role: AIRole): { allowed: boolean; reason?: string } {
  const tool = toolMap.get(toolName)
  if (!tool) return { allowed: false, reason: `Tool "${toolName}" not found.` }
  if (!tool.allowedRoles.includes(role)) {
    return { allowed: false, reason: `Role "${role}" is not permitted to use tool "${toolName}".` }
  }
  return { allowed: true }
}
