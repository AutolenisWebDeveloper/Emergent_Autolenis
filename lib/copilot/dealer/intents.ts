/**
 * Intent patterns for the dealer copilot.
 */

import type { IntentPattern } from "../shared/intent-scorer"

export const DEALER_INTENT_PATTERNS: IntentPattern[] = [
  {
    name: "VIEW_ACTIVE_AUCTIONS",
    phrases: ["view active auctions", "open auctions", "current auctions", "what auctions"],
    keywords: ["auction", "active", "open", "current", "bidding"],
    roleRequired: ["dealer"],
    routeBonus: ["/dealer"],
  },
  {
    name: "SUBMIT_OFFER",
    phrases: ["submit an offer", "place an offer", "make a bid", "submit bid"],
    keywords: ["submit", "offer", "bid", "proposal", "quote"],
    roleRequired: ["dealer"],
  },
  {
    name: "VIEW_FIX_LIST",
    phrases: ["view fix list", "what needs fixing", "required fixes", "fix list", "inspection items"],
    keywords: ["fix", "repair", "inspection", "list", "issues", "problems", "required"],
    roleRequired: ["dealer"],
  },
  {
    name: "UPLOAD_CONTRACT",
    phrases: ["upload contract", "submit contract", "upload deal documents", "send contract"],
    keywords: ["upload", "contract", "document", "submit docs", "paperwork"],
    roleRequired: ["dealer"],
  },
  {
    name: "VIEW_MY_OFFERS",
    phrases: ["view my offers", "my submitted offers", "my bids", "see my offers"],
    keywords: ["my offers", "my bids", "submitted", "pending offers"],
    roleRequired: ["dealer"],
    routeBonus: ["/dealer"],
  },
  {
    name: "VIEW_INVENTORY",
    phrases: ["view my inventory", "manage inventory", "my vehicles", "my listings"],
    keywords: ["inventory", "vehicles", "listings", "stock"],
    roleRequired: ["dealer"],
    routeBonus: ["/dealer/inventory"],
  },
  {
    name: "UPDATE_INVENTORY",
    phrases: ["update inventory", "add a vehicle", "edit listing", "change price"],
    keywords: ["update", "add vehicle", "edit", "change", "listing", "price"],
    roleRequired: ["dealer"],
  },
  {
    name: "VIEW_DEAL_DETAILS",
    phrases: ["view deal details", "deal information", "deal status", "selected deal"],
    keywords: ["deal", "details", "selected", "status", "information"],
    roleRequired: ["dealer"],
  },
  {
    name: "VIEW_EARNINGS",
    phrases: ["view my earnings", "see payments", "my revenue", "payments received"],
    keywords: ["earnings", "payments", "revenue", "received", "payout"],
    roleRequired: ["dealer"],
    routeBonus: ["/dealer/earnings"],
  },
  {
    name: "CONTACT_SUPPORT",
    phrases: ["contact support", "get help", "need assistance", "talk to someone"],
    keywords: ["support", "help", "contact", "assist"],
    roleRequired: ["dealer"],
  },
  {
    name: "FALLBACK",
    phrases: [],
    keywords: [],
    roleRequired: ["dealer"],
  },
]
