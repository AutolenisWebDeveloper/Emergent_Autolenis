/**
 * Admin copilot tools.
 *
 * - Read-only navigation only (no write operations with financial consequences)
 * - All actions logged to compliance event ledger
 * - Operations report stub handled gracefully
 */

import type { CopilotTool, ActionResult, CopilotContext } from "../shared/types"
import { translateDealStage } from "../shared/base-orchestrator"
import { logger } from "@/lib/logger"

// ---------------------------------------------------------------------------
// Compliance event logger
// ---------------------------------------------------------------------------

export function logAdminCopilotAction(actorId: string, intent: string, route: string): void {
  logger.info("ADMIN_COPILOT_ACTION", {
    type: "ADMIN_COPILOT_ACTION",
    actorId,
    intent,
    route,
    timestamp: new Date().toISOString(),
  })
}

// ---------------------------------------------------------------------------
// lookup_deal — plain English stage, never raw enum
// ---------------------------------------------------------------------------

const lookupDealTool: CopilotTool = {
  name: "lookup_deal",
  description: "Look up a deal by ID and display its status in plain English.",
  requiresConfirmation: false,
  requiredRole: ["admin"],
  execute: async (
    args: Record<string, string | number | boolean>,
    _context: CopilotContext,
    sessionToken: string,
  ): Promise<ActionResult> => {
    const dealId = args["dealId"] as string | undefined
    if (!dealId) {
      return {
        summary: "Please provide a deal ID to look up.",
        redirectTo: "/admin/deals",
        redirectLabel: "Search Deals",
      }
    }
    const res = await fetch(`/api/admin/deals/${dealId}`, {
      headers: { Authorization: `Bearer ${sessionToken}` },
    })
    if (!res.ok) {
      return {
        summary: `Deal ${dealId} could not be found.`,
        redirectTo: "/admin/deals",
        redirectLabel: "Search Deals",
      }
    }
    const data = (await res.json()) as { deal?: { status?: string; auctionId?: string } }
    const stage = data.deal?.status
    const stageLabel = stage ? translateDealStage(stage as Parameters<typeof translateDealStage>[0]) : "Unknown"
    return {
      summary: `Deal **${dealId}** is currently at: **${stageLabel}**.`,
      redirectTo: `/admin/deals/${dealId}`,
      redirectLabel: "View Deal →",
    }
  },
}

// ---------------------------------------------------------------------------
// lookup_buyer — status only, no sensitive PII exposed in summary
// ---------------------------------------------------------------------------

const lookupBuyerTool: CopilotTool = {
  name: "lookup_buyer",
  description: "Look up a buyer account by ID or email and show their status.",
  requiresConfirmation: false,
  requiredRole: ["admin"],
  execute: (
    args: Record<string, string | number | boolean>,
    _context: CopilotContext,
  ): Promise<ActionResult> => {
    const buyerId = args["buyerId"] as string | undefined
    if (!buyerId) {
      return Promise.resolve({
        summary: "Please provide a buyer ID to look up.",
        redirectTo: "/admin/buyers",
        redirectLabel: "Search Buyers",
      })
    }
    return Promise.resolve({
      summary: `Navigating to buyer record.`,
      redirectTo: `/admin/buyers/${buyerId}`,
      redirectLabel: "View Buyer →",
    })
  },
}

// ---------------------------------------------------------------------------
// stuck_deals — deals over 72h in same stage
// ---------------------------------------------------------------------------

const stuckDealsTool: CopilotTool = {
  name: "stuck_deals",
  description: "Find deals that have been in the same stage for more than 72 hours.",
  requiresConfirmation: false,
  requiredRole: ["admin"],
  execute: (
    _args: Record<string, string | number | boolean>,
    _context: CopilotContext,
    _sessionToken: string,
  ): Promise<ActionResult> => {
    return Promise.resolve({
      summary: "Navigate to the deals dashboard and filter by status to identify stuck deals (over 72 hours in the same stage).",
      redirectTo: "/admin/deals",
      redirectLabel: "View Deals Dashboard →",
    })
  },
}

// ---------------------------------------------------------------------------
// finance_report
// ---------------------------------------------------------------------------

const financeReportTool: CopilotTool = {
  name: "finance_report",
  description: "Navigate to the finance report.",
  requiresConfirmation: false,
  requiredRole: ["admin"],
  execute: (): Promise<ActionResult> => Promise.resolve({
    summary: "Here is the finance report.",
    redirectTo: "/admin/reports/finance",
    redirectLabel: "View Finance Report →",
  }),
}

// ---------------------------------------------------------------------------
// funnel_report
// ---------------------------------------------------------------------------

const funnelReportTool: CopilotTool = {
  name: "funnel_report",
  description: "Navigate to the funnel conversion report.",
  requiresConfirmation: false,
  requiredRole: ["admin"],
  execute: (): Promise<ActionResult> => Promise.resolve({
    summary: "Here is the deal funnel report.",
    redirectTo: "/admin/reports/funnel",
    redirectLabel: "View Funnel Report →",
  }),
}

// ---------------------------------------------------------------------------
// operations_report — stub handled gracefully
// ---------------------------------------------------------------------------

const operationsReportTool: CopilotTool = {
  name: "operations_report",
  description: "Navigate to the operations report (stub if unavailable).",
  requiresConfirmation: false,
  requiredRole: ["admin"],
  execute: (): Promise<ActionResult> => Promise.resolve({
    summary:
      "The operations report is currently unavailable. Finance and funnel reports are accessible.",
    redirectTo: "/admin/reports",
    redirectLabel: "View Reports →",
  }),
}

// ---------------------------------------------------------------------------
// cron_status
// ---------------------------------------------------------------------------

const cronStatusTool: CopilotTool = {
  name: "cron_status",
  description: "View the status and last run times for scheduled cron jobs.",
  requiresConfirmation: false,
  requiredRole: ["admin"],
  execute: (): Promise<ActionResult> => Promise.resolve({
    summary: "Navigate to the system dashboard to view cron job last-run times.",
    redirectTo: "/admin/system/cron",
    redirectLabel: "View Cron Jobs →",
  }),
}

// ---------------------------------------------------------------------------
// audit_log
// ---------------------------------------------------------------------------

const auditLogTool: CopilotTool = {
  name: "audit_log",
  description: "Navigate to the admin audit log.",
  requiresConfirmation: false,
  requiredRole: ["admin"],
  execute: (): Promise<ActionResult> => Promise.resolve({
    summary: "Here is the compliance and admin audit log.",
    redirectTo: "/admin/audit",
    redirectLabel: "View Audit Log →",
  }),
}

// ---------------------------------------------------------------------------
// platform_health
// ---------------------------------------------------------------------------

const platformHealthTool: CopilotTool = {
  name: "platform_health",
  description: "Navigate to platform health dashboard.",
  requiresConfirmation: false,
  requiredRole: ["admin"],
  execute: (): Promise<ActionResult> => Promise.resolve({
    summary: "Here is the platform health status.",
    redirectTo: "/admin/system/health",
    redirectLabel: "View Health Dashboard →",
  }),
}

// ---------------------------------------------------------------------------
// Tool registry
// ---------------------------------------------------------------------------

export const ADMIN_TOOLS: Record<string, CopilotTool> = {
  lookup_deal: lookupDealTool,
  lookup_buyer: lookupBuyerTool,
  stuck_deals: stuckDealsTool,
  finance_report: financeReportTool,
  funnel_report: funnelReportTool,
  operations_report: operationsReportTool,
  cron_status: cronStatusTool,
  audit_log: auditLogTool,
  platform_health: platformHealthTool,
}

export const ADMIN_INTENT_TO_TOOL: Record<string, string> = {
  LOOKUP_DEAL: "lookup_deal",
  LOOKUP_BUYER: "lookup_buyer",
  STUCK_DEALS: "stuck_deals",
  FINANCE_REPORT: "finance_report",
  FUNNEL_REPORT: "funnel_report",
  OPERATIONS_REPORT: "operations_report",
  CRON_STATUS: "cron_status",
  AUDIT_LOG: "audit_log",
  VIEW_PLATFORM_HEALTH: "platform_health",
}
