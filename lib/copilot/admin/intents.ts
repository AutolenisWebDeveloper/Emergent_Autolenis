/**
 * Intent patterns for the admin copilot.
 */

import type { IntentPattern } from "../shared/intent-scorer"

export const ADMIN_INTENT_PATTERNS: IntentPattern[] = [
  {
    name: "LOOKUP_DEAL",
    phrases: ["look up deal", "find deal", "lookup deal", "show deal", "deal details"],
    keywords: ["deal", "lookup", "find", "locate", "details", "search deal"],
    roleRequired: ["admin"],
    routeBonus: ["/admin"],
  },
  {
    name: "LOOKUP_BUYER",
    phrases: ["look up buyer", "find buyer", "buyer details", "user lookup", "show buyer"],
    keywords: ["buyer", "user", "lookup", "find", "customer", "account"],
    roleRequired: ["admin"],
  },
  {
    name: "LOOKUP_DEALER",
    phrases: ["look up dealer", "find dealer", "dealer details", "dealer info"],
    keywords: ["dealer", "dealership", "lookup", "find", "locate"],
    roleRequired: ["admin"],
  },
  {
    name: "STUCK_DEALS",
    phrases: ["stuck deals", "stalled deals", "deals not progressing", "deals over 72 hours", "find stuck deals"],
    keywords: ["stuck", "stalled", "stagnant", "72 hours", "not progressing", "delayed", "blocked"],
    roleRequired: ["admin"],
    routeBonus: ["/admin/deals"],
  },
  {
    name: "FINANCE_REPORT",
    phrases: ["finance report", "financial summary", "revenue report", "payments summary"],
    keywords: ["finance", "financial", "revenue", "payments", "report", "summary"],
    roleRequired: ["admin"],
    routeBonus: ["/admin/reports"],
  },
  {
    name: "FUNNEL_REPORT",
    phrases: ["funnel report", "conversion funnel", "deal funnel", "pipeline report"],
    keywords: ["funnel", "pipeline", "conversion", "stages", "report"],
    roleRequired: ["admin"],
    routeBonus: ["/admin/reports"],
  },
  {
    name: "OPERATIONS_REPORT",
    phrases: ["operations report", "ops report", "operational summary", "system report"],
    keywords: ["operations", "ops", "operational", "system"],
    roleRequired: ["admin"],
  },
  {
    name: "CRON_STATUS",
    phrases: ["cron job status", "last cron run", "cron jobs", "scheduled jobs"],
    keywords: ["cron", "scheduled", "job", "last run", "status"],
    roleRequired: ["admin"],
    routeBonus: ["/admin/system"],
  },
  {
    name: "AUDIT_LOG",
    phrases: ["view audit log", "audit trail", "compliance log", "admin activity"],
    keywords: ["audit", "log", "trail", "compliance", "activity", "history"],
    roleRequired: ["admin"],
    routeBonus: ["/admin/audit"],
  },
  {
    name: "VIEW_AFFILIATE_COMMISSIONS",
    phrases: ["affiliate commissions", "commission payout", "affiliate earnings", "commission report"],
    keywords: ["affiliate", "commission", "payout", "earnings"],
    roleRequired: ["admin"],
    routeBonus: ["/admin/affiliates"],
  },
  {
    name: "VIEW_PLATFORM_HEALTH",
    phrases: ["platform health", "system status", "service health", "check health"],
    keywords: ["health", "status", "system", "service", "uptime"],
    roleRequired: ["admin"],
    routeBonus: ["/admin/system"],
  },
  {
    name: "VIEW_PREQUAL_PIPELINE",
    phrases: ["prequal pipeline", "prequalification queue", "pending prequals"],
    keywords: ["prequal", "prequalification", "pipeline", "queue", "pending"],
    roleRequired: ["admin"],
  },
  {
    name: "VIEW_WORKSPACE_SETTINGS",
    phrases: ["workspace settings", "platform settings", "admin settings"],
    keywords: ["workspace", "settings", "configuration", "admin"],
    roleRequired: ["admin"],
    routeBonus: ["/admin/settings"],
  },
  {
    name: "CONTACT_SUPPORT_ESCALATION",
    phrases: ["escalate issue", "create support ticket", "flag for review"],
    keywords: ["escalate", "ticket", "flag", "review", "support"],
    roleRequired: ["admin"],
  },
  {
    name: "FALLBACK",
    phrases: [],
    keywords: [],
    roleRequired: ["admin"],
  },
]
