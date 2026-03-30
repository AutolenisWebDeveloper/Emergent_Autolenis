/**
 * Affiliate copilot tools.
 *
 * Commission structure: 15% / 3% / 2%
 * NEVER include income projections or earnings guarantees.
 */

import type { CopilotTool, ActionResult, CopilotContext } from "../shared/types"

// ---------------------------------------------------------------------------
// Commission structure — informational only, no earnings projections
// ---------------------------------------------------------------------------

const viewCommissionBreakdownTool: CopilotTool = {
  name: "view_commission_breakdown",
  description: "Show the affiliate commission structure (structure only — no earnings projections).",
  requiresConfirmation: false,
  requiredRole: ["affiliate"],
  execute: (): Promise<ActionResult> => Promise.resolve({
    summary:
      "Here is the AutoLenis affiliate commission structure: **Tier 1** — 15% of the concierge fee on direct referrals. **Tier 2** — 3% on referrals made by your direct referrals. **Tier 3** — 2% on the next level down. Commissions are earned on completed purchases only. Actual earnings depend on your activity and referral network.",
    redirectTo: "/affiliate/commissions",
    redirectLabel: "View Commission Details →",
  }),
}

// ---------------------------------------------------------------------------
// view_referrals
// ---------------------------------------------------------------------------

const viewReferralsTool: CopilotTool = {
  name: "view_referrals",
  description: "Navigate to the affiliate's referral list.",
  requiresConfirmation: false,
  requiredRole: ["affiliate"],
  execute: async (
    _args: Record<string, string | number | boolean>,
    _context: CopilotContext,
    sessionToken: string,
  ): Promise<ActionResult> => {
    const res = await fetch("/api/affiliate/referrals", {
      headers: { Authorization: `Bearer ${sessionToken}` },
    })
    if (!res.ok) {
      return {
        summary: "Navigate to your referrals page for the full list.",
        redirectTo: "/affiliate/referrals",
        redirectLabel: "View Referrals →",
      }
    }
    const data = (await res.json()) as { count?: number }
    const count = data.count ?? 0
    return {
      summary: `You have **${count} referral${count === 1 ? "" : "s"}** in your network.`,
      redirectTo: "/affiliate/referrals",
      redirectLabel: "View All Referrals →",
    }
  },
}

// ---------------------------------------------------------------------------
// view_payout_history
// ---------------------------------------------------------------------------

const viewPayoutHistoryTool: CopilotTool = {
  name: "view_payout_history",
  description: "Navigate to payout history.",
  requiresConfirmation: false,
  requiredRole: ["affiliate"],
  execute: (): Promise<ActionResult> => Promise.resolve({
    summary: "Here is your payout history.",
    redirectTo: "/affiliate/payouts",
    redirectLabel: "View Payout History →",
  }),
}

// ---------------------------------------------------------------------------
// get_referral_link
// ---------------------------------------------------------------------------

const getReferralLinkTool: CopilotTool = {
  name: "get_referral_link",
  description: "Navigate to the affiliate's referral link page.",
  requiresConfirmation: false,
  requiredRole: ["affiliate"],
  execute: (): Promise<ActionResult> => Promise.resolve({
    summary: "Your referral link is available on your affiliate dashboard.",
    redirectTo: "/affiliate/links",
    redirectLabel: "Get My Referral Link →",
  }),
}

// ---------------------------------------------------------------------------
// view_team
// ---------------------------------------------------------------------------

const viewTeamTool: CopilotTool = {
  name: "view_team",
  description: "Navigate to the affiliate's team / downline.",
  requiresConfirmation: false,
  requiredRole: ["affiliate"],
  execute: (): Promise<ActionResult> => Promise.resolve({
    summary: "Here is your affiliate team.",
    redirectTo: "/affiliate/team",
    redirectLabel: "View Team →",
  }),
}

// ---------------------------------------------------------------------------
// view_dashboard
// ---------------------------------------------------------------------------

const viewDashboardTool: CopilotTool = {
  name: "view_dashboard",
  description: "Navigate to the affiliate dashboard.",
  requiresConfirmation: false,
  requiredRole: ["affiliate"],
  execute: (): Promise<ActionResult> => Promise.resolve({
    summary: "Here is your affiliate dashboard.",
    redirectTo: "/affiliate/portal",
    redirectLabel: "Go to Dashboard →",
  }),
}

// ---------------------------------------------------------------------------
// Tool registry
// ---------------------------------------------------------------------------

export const AFFILIATE_TOOLS: Record<string, CopilotTool> = {
  view_commission_breakdown: viewCommissionBreakdownTool,
  view_referrals: viewReferralsTool,
  view_payout_history: viewPayoutHistoryTool,
  get_referral_link: getReferralLinkTool,
  view_team: viewTeamTool,
  view_dashboard: viewDashboardTool,
}

export const AFFILIATE_INTENT_TO_TOOL: Record<string, string> = {
  VIEW_COMMISSION_BREAKDOWN: "view_commission_breakdown",
  VIEW_REFERRALS: "view_referrals",
  VIEW_PAYOUT_HISTORY: "view_payout_history",
  GET_REFERRAL_LINK: "get_referral_link",
  VIEW_TEAM: "view_team",
  VIEW_DASHBOARD: "view_dashboard",
}
