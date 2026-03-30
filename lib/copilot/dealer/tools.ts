/**
 * Dealer copilot tools.
 * Never exposes buyer personal data in any response.
 */

import type { CopilotTool, ActionResult, CopilotContext } from "../shared/types"

// ---------------------------------------------------------------------------
// view_fix_list — returns issue count and types only
// ---------------------------------------------------------------------------

const viewFixListTool: CopilotTool = {
  name: "view_fix_list",
  description: "Show the fix list for an active deal (issue count and categories only — no buyer data).",
  requiresConfirmation: false,
  requiredRole: ["dealer"],
  execute: async (
    args: Record<string, string | number | boolean>,
    _context: CopilotContext,
    sessionToken: string,
  ): Promise<ActionResult> => {
    const dealId = args["dealId"] as string | undefined
    if (!dealId) {
      return {
        summary: "Please navigate to the deal and try again to view the fix list.",
        redirectTo: "/dealer/deals",
        redirectLabel: "Go to Deals",
      }
    }
    const res = await fetch(`/api/dealer/deals/${dealId}/fix-list`, {
      headers: { Authorization: `Bearer ${sessionToken}` },
    })
    if (!res.ok) {
      throw new Error("Unable to load fix list. Please try again from your deal page.")
    }
    const data = (await res.json()) as { items?: { category: string }[] }
    const items = data.items ?? []
    const count = items.length
    if (count === 0) {
      return { summary: "No fix items found for this deal.", redirectTo: `/dealer/deals/${dealId}`, redirectLabel: "View Deal" }
    }
    const categories = [...new Set(items.map((i) => i.category))].join(", ")
    return {
      summary: `This deal has **${count} fix item${count === 1 ? "" : "s"}** in the following categories: ${categories}.`,
      redirectTo: `/dealer/deals/${dealId}/fix-list`,
      redirectLabel: "View Fix List →",
    }
  },
}

// ---------------------------------------------------------------------------
// submit_offer — requires confirmation
// ---------------------------------------------------------------------------

const submitOfferTool: CopilotTool = {
  name: "submit_offer",
  description: "Submit a bid offer on an auction.",
  requiresConfirmation: true,
  requiredRole: ["dealer"],
  execute: (
    args: Record<string, string | number | boolean>,
    _context: CopilotContext,
    _sessionToken: string,
  ): Promise<ActionResult> => {
    const auctionId = args["auctionId"] as string | undefined
    if (!auctionId) {
      return Promise.resolve({
        summary: "Please navigate to the specific auction to submit your offer.",
        redirectTo: "/dealer/auctions",
        redirectLabel: "View Auctions",
      })
    }
    return Promise.resolve({
      summary: "Navigate to this auction to submit your offer.",
      redirectTo: `/dealer/auctions/${auctionId}/offer`,
      redirectLabel: "Submit Offer →",
    })
  },
}

// ---------------------------------------------------------------------------
// upload_contract — redirect only
// ---------------------------------------------------------------------------

const uploadContractTool: CopilotTool = {
  name: "upload_contract",
  description: "Navigate to the contract upload page for a specific deal.",
  requiresConfirmation: false,
  requiredRole: ["dealer"],
  execute: (
    args: Record<string, string | number | boolean>,
    _context: CopilotContext,
    _sessionToken: string,
  ): Promise<ActionResult> => {
    const dealId = args["dealId"] as string | undefined
    if (!dealId) {
      return Promise.resolve({
        summary: "Please navigate to the specific deal to upload a contract.",
        redirectTo: "/dealer/deals",
        redirectLabel: "Go to Deals",
      })
    }
    return Promise.resolve({
      summary: "Navigate to your deal to upload the contract documents.",
      redirectTo: `/dealer/deals/${dealId}/contract`,
      redirectLabel: "Upload Contract →",
    })
  },
}

// ---------------------------------------------------------------------------
// view_inventory
// ---------------------------------------------------------------------------

const viewInventoryTool: CopilotTool = {
  name: "view_inventory",
  description: "Navigate to the dealer's inventory management page.",
  requiresConfirmation: false,
  requiredRole: ["dealer"],
  execute: (): Promise<ActionResult> => Promise.resolve({
    summary: "Here is your inventory.",
    redirectTo: "/dealer/inventory",
    redirectLabel: "View Inventory →",
  }),
}

// ---------------------------------------------------------------------------
// view_active_auctions
// ---------------------------------------------------------------------------

const viewActiveAuctionsTool: CopilotTool = {
  name: "view_active_auctions",
  description: "Navigate to active auction requests matching the dealer's inventory.",
  requiresConfirmation: false,
  requiredRole: ["dealer"],
  execute: (): Promise<ActionResult> => Promise.resolve({
    summary: "Here are your active auction requests.",
    redirectTo: "/dealer/auctions",
    redirectLabel: "View Auctions →",
  }),
}

// ---------------------------------------------------------------------------
// view_deal_details
// ---------------------------------------------------------------------------

const viewDealDetailsTool: CopilotTool = {
  name: "view_deal_details",
  description: "Navigate to deal details. Never exposes buyer personal information.",
  requiresConfirmation: false,
  requiredRole: ["dealer"],
  execute: (
    args: Record<string, string | number | boolean>,
    _context: CopilotContext,
  ): Promise<ActionResult> => {
    const dealId = args["dealId"] as string | undefined
    return Promise.resolve({
      summary: dealId ? "Here are the details for this deal." : "Navigate to your deals to view deal details.",
      redirectTo: dealId ? `/dealer/deals/${dealId}` : "/dealer/deals",
      redirectLabel: "View Deal →",
    })
  },
}

// ---------------------------------------------------------------------------
// Tool registry
// ---------------------------------------------------------------------------

export const DEALER_TOOLS: Record<string, CopilotTool> = {
  view_fix_list: viewFixListTool,
  submit_offer: submitOfferTool,
  upload_contract: uploadContractTool,
  view_inventory: viewInventoryTool,
  view_active_auctions: viewActiveAuctionsTool,
  view_deal_details: viewDealDetailsTool,
}

export const DEALER_INTENT_TO_TOOL: Record<string, string> = {
  VIEW_FIX_LIST: "view_fix_list",
  SUBMIT_OFFER: "submit_offer",
  UPLOAD_CONTRACT: "upload_contract",
  VIEW_INVENTORY: "view_inventory",
  VIEW_ACTIVE_AUCTIONS: "view_active_auctions",
  VIEW_DEAL_DETAILS: "view_deal_details",
}
