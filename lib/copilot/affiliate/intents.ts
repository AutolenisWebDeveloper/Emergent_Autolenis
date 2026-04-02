/**
 * Intent patterns for the affiliate copilot.
 */

import type { IntentPattern } from "../shared/intent-scorer"

export const AFFILIATE_INTENT_PATTERNS: IntentPattern[] = [
  {
    name: "VIEW_COMMISSION_BREAKDOWN",
    phrases: ["how do commissions work", "commission breakdown", "commission structure", "how much do i earn"],
    keywords: ["commission", "structure", "breakdown", "earn", "rate", "percentage"],
    roleRequired: ["affiliate"],
    routeBonus: ["/affiliate"],
  },
  {
    name: "VIEW_REFERRALS",
    phrases: ["view my referrals", "see referrals", "my referral list", "who have i referred"],
    keywords: ["referral", "referred", "list", "network", "links"],
    roleRequired: ["affiliate"],
    routeBonus: ["/affiliate"],
  },
  {
    name: "VIEW_PAYOUT_HISTORY",
    phrases: ["view payout history", "past payouts", "my payments", "what have i been paid"],
    keywords: ["payout", "payment", "history", "paid", "received", "earnings"],
    roleRequired: ["affiliate"],
  },
  {
    name: "GET_REFERRAL_LINK",
    phrases: ["get my referral link", "share my link", "referral url", "my affiliate link"],
    keywords: ["link", "url", "share", "referral link", "affiliate link"],
    roleRequired: ["affiliate"],
  },
  {
    name: "VIEW_TEAM",
    phrases: ["view my team", "see my downline", "team members", "my sub-affiliates"],
    keywords: ["team", "downline", "sub-affiliate", "tier 2", "tier 3", "network"],
    roleRequired: ["affiliate"],
    routeBonus: ["/affiliate/team"],
  },
  {
    name: "VIEW_DASHBOARD",
    phrases: ["view my dashboard", "affiliate dashboard", "my stats", "overview"],
    keywords: ["dashboard", "stats", "overview", "summary", "performance"],
    roleRequired: ["affiliate"],
    routeBonus: ["/affiliate"],
  },
  {
    name: "CONTACT_SUPPORT",
    phrases: ["contact support", "get help", "need assistance"],
    keywords: ["support", "help", "contact"],
    roleRequired: ["affiliate"],
  },
  {
    name: "FALLBACK",
    phrases: [],
    keywords: [],
    roleRequired: ["affiliate"],
  },
]
