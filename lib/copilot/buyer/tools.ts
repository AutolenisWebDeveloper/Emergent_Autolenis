/**
 * Buyer copilot tools.
 * Each tool that executes a financial action requires requiresConfirmation: true.
 */

import type { CopilotTool, ActionResult, CopilotContext } from "../shared/types"
import { translateDealStage } from "../shared/base-orchestrator"

// ---------------------------------------------------------------------------
// view_deal_status — reads stage from context, never raw enum
// ---------------------------------------------------------------------------

const viewDealStatusTool: CopilotTool = {
  name: "view_deal_status",
  description: "Show the buyer's current deal stage in plain English.",
  requiresConfirmation: false,
  requiredRole: ["buyer"],
  execute: (
    _args: Record<string, string | number | boolean>,
    context: CopilotContext,
    _sessionToken: string,
  ): Promise<ActionResult> => {
    if (!context.dealId) {
      return Promise.resolve({
        summary: "You don't have an active deal yet. Once you select a vehicle offer, your deal status will appear here.",
        redirectTo: "/buyer/deals",
        redirectLabel: "View Deals",
      })
    }
    const stageLabel = context.dealStage ? translateDealStage(context.dealStage) : "Status Unavailable"
    return Promise.resolve({
      summary: `Your current deal is at: **${stageLabel}**. Visit your deal page for full details.`,
      redirectTo: `/buyer/deals/${context.dealId}`,
      redirectLabel: "Go to Deal",
    })
  },
}

// ---------------------------------------------------------------------------
// pay_deposit — requires confirmation, $99
// ---------------------------------------------------------------------------

const payDepositTool: CopilotTool = {
  name: "pay_deposit",
  description: "Initiate the $99 refundable deposit payment via Stripe.",
  requiresConfirmation: true,
  requiredRole: ["buyer"],
  execute: (
    _args: Record<string, string | number | boolean>,
    _context: CopilotContext,
    _sessionToken: string,
  ): Promise<ActionResult> => {
    return Promise.resolve({
      summary: "To activate your auction, complete the deposit step on your dashboard.",
      redirectTo: "/buyer/deposit",
      redirectLabel: "Pay Deposit →",
    })
  },
}

// ---------------------------------------------------------------------------
// pay_concierge_fee — requires confirmation, $499, only in FEE_PENDING stage
// ---------------------------------------------------------------------------

const payConciergeFee: CopilotTool = {
  name: "pay_concierge_fee",
  description: "Pay the $499 concierge fee. Only available when the deal is in Fee Pending stage.",
  requiresConfirmation: true,
  requiredRole: ["buyer"],
  requiredDealStage: ["FEE_PENDING"],
  execute: (
    _args: Record<string, string | number | boolean>,
    context: CopilotContext,
    _sessionToken: string,
  ): Promise<ActionResult> => {
    if (!context.dealId) {
      return Promise.resolve({ summary: "No active deal found. Please navigate to your deal to pay the concierge fee." })
    }
    return Promise.resolve({
      summary: "To pay your concierge fee, go to the fee page for your deal.",
      redirectTo: `/buyer/deals/${context.dealId}/fee`,
      redirectLabel: "Pay Fee →",
    })
  },
}

// ---------------------------------------------------------------------------
// include_fee_in_loan — requires confirmation, redirect only (no direct API call)
// ---------------------------------------------------------------------------

const includeFeeInLoanTool: CopilotTool = {
  name: "include_fee_in_loan",
  description: "Navigate to the option to include the concierge fee in the financing.",
  requiresConfirmation: true,
  requiredRole: ["buyer"],
  requiredDealStage: ["FEE_PENDING"],
  execute: (
    _args: Record<string, string | number | boolean>,
    context: CopilotContext,
    _sessionToken: string,
  ): Promise<ActionResult> => {
    const dealPath = context.dealId ? `/buyer/deals/${context.dealId}/fee` : "/buyer/deals"
    return Promise.resolve({
      summary: "You can include the $499 concierge fee in your financing on your deal page.",
      redirectTo: dealPath,
      redirectLabel: "Go to Fee Options →",
    })
  },
}

// ---------------------------------------------------------------------------
// add_to_shortlist — max 5 per buyer
// ---------------------------------------------------------------------------

const addToShortlistTool: CopilotTool = {
  name: "add_to_shortlist",
  description: "Add a vehicle offer to the buyer's shortlist (max 5).",
  requiresConfirmation: false,
  requiredRole: ["buyer"],
  execute: async (
    args: Record<string, string | number | boolean>,
    _context: CopilotContext,
    sessionToken: string,
  ): Promise<ActionResult> => {
    const offerId = args["offerId"] as string | undefined
    if (!offerId) {
      return {
        summary: "Please navigate to the offer you'd like to shortlist and try again.",
        redirectTo: "/buyer/offers",
        redirectLabel: "View Offers",
      }
    }
    const res = await fetch("/api/buyer/shortlist", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ offerId }),
    })
    if (res.status === 409) {
      return { summary: "You've reached the maximum of 5 shortlisted vehicles. Remove one before adding another." }
    }
    if (!res.ok) {
      throw new Error("Unable to add to shortlist. Please try again.")
    }
    return { summary: "Vehicle added to your shortlist.", redirectTo: "/buyer/shortlist", redirectLabel: "View Shortlist" }
  },
}

// ---------------------------------------------------------------------------
// view_offers
// ---------------------------------------------------------------------------

const viewOffersTool: CopilotTool = {
  name: "view_offers",
  description: "Navigate to the buyer's vehicle offers.",
  requiresConfirmation: false,
  requiredRole: ["buyer"],
  execute: (): Promise<ActionResult> => Promise.resolve({
    summary: "Here are your current vehicle offers.",
    redirectTo: "/buyer/offers",
    redirectLabel: "View Offers →",
  }),
}

// ---------------------------------------------------------------------------
// view_financing
// ---------------------------------------------------------------------------

const viewFinancingTool: CopilotTool = {
  name: "view_financing",
  description: "Navigate to the buyer's financing options.",
  requiresConfirmation: false,
  requiredRole: ["buyer"],
  execute: (
    _args: Record<string, string | number | boolean>,
    context: CopilotContext,
  ): Promise<ActionResult> => Promise.resolve({
    summary: "Here are your financing options.",
    redirectTo: context.dealId ? `/buyer/deals/${context.dealId}/financing` : "/buyer/deals",
    redirectLabel: "View Financing →",
  }),
}

// ---------------------------------------------------------------------------
// view_contract
// ---------------------------------------------------------------------------

const viewContractTool: CopilotTool = {
  name: "view_contract",
  description: "Navigate to the buyer's contract for review.",
  requiresConfirmation: false,
  requiredRole: ["buyer"],
  execute: (
    _args: Record<string, string | number | boolean>,
    context: CopilotContext,
  ): Promise<ActionResult> => Promise.resolve({
    summary: "Your contract is ready for review.",
    redirectTo: context.dealId ? `/buyer/deals/${context.dealId}/contract` : "/buyer/deals",
    redirectLabel: "View Contract →",
  }),
}

// ---------------------------------------------------------------------------
// schedule_pickup
// ---------------------------------------------------------------------------

const schedulePickupTool: CopilotTool = {
  name: "schedule_pickup",
  description: "Navigate to the pickup scheduling page.",
  requiresConfirmation: false,
  requiredRole: ["buyer"],
  execute: (
    _args: Record<string, string | number | boolean>,
    context: CopilotContext,
  ): Promise<ActionResult> => Promise.resolve({
    summary: "Let's schedule your vehicle pickup.",
    redirectTo: context.dealId ? `/buyer/deals/${context.dealId}/pickup` : "/buyer/deals",
    redirectLabel: "Schedule Pickup →",
  }),
}

// ---------------------------------------------------------------------------
// Tool registry
// ---------------------------------------------------------------------------

export const BUYER_TOOLS: Record<string, CopilotTool> = {
  view_deal_status: viewDealStatusTool,
  pay_deposit: payDepositTool,
  pay_concierge_fee: payConciergeFee,
  include_fee_in_loan: includeFeeInLoanTool,
  add_to_shortlist: addToShortlistTool,
  view_offers: viewOffersTool,
  view_financing: viewFinancingTool,
  view_contract: viewContractTool,
  schedule_pickup: schedulePickupTool,
}

// Intent → Tool mapping
export const INTENT_TO_TOOL: Record<string, string> = {
  VIEW_DEAL_STATUS: "view_deal_status",
  PAY_DEPOSIT: "pay_deposit",
  PAY_CONCIERGE_FEE: "pay_concierge_fee",
  INCLUDE_FEE_IN_LOAN: "include_fee_in_loan",
  ADD_TO_SHORTLIST: "add_to_shortlist",
  VIEW_OFFERS: "view_offers",
  VIEW_FINANCING: "view_financing",
  VIEW_CONTRACT: "view_contract",
  SCHEDULE_PICKUP: "schedule_pickup",
}
