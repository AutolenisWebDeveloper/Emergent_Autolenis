/**
 * Intent patterns for the public copilot.
 * No action tools — information only.
 */

import type { IntentPattern } from "../shared/intent-scorer"

export type PublicIntent =
  | "HOW_IT_WORKS"
  | "PRICING_INQUIRY"
  | "DEPOSIT_INQUIRY"
  | "CONCIERGE_FEE_INQUIRY"
  | "PREQUAL_INQUIRY"
  | "BUYER_SIGNUP_PROMPT"
  | "DEALER_INQUIRY"
  | "AFFILIATE_INQUIRY"
  | "REFINANCE_INQUIRY"
  | "INSURANCE_INFO"
  | "CONTRACT_SHIELD_INFO"
  | "CONTACT_SUPPORT"
  | "FALLBACK"

export const PUBLIC_INTENT_PATTERNS: IntentPattern[] = [
  {
    name: "HOW_IT_WORKS",
    phrases: ["how does autolenis work", "how it works", "what is autolenis", "explain autolenis", "what do you do"],
    keywords: ["how", "works", "process", "steps", "explain", "overview", "about", "platform"],
    routeBonus: ["/", "/how-it-works"],
  },
  {
    name: "PRICING_INQUIRY",
    phrases: ["how much does it cost", "what does it cost", "pricing", "what are the fees", "total cost"],
    keywords: ["cost", "price", "pricing", "fee", "fees", "charge", "pay", "money", "how much"],
    routeBonus: ["/pricing"],
  },
  {
    name: "DEPOSIT_INQUIRY",
    phrases: ["how much is the deposit", "refundable deposit", "deposit amount", "$99 deposit", "deposit fee"],
    keywords: ["deposit", "$99", "refundable", "hold"],
    routeBonus: ["/pricing", "/how-it-works"],
  },
  {
    name: "CONCIERGE_FEE_INQUIRY",
    phrases: ["what is the concierge fee", "concierge fee", "$499 fee", "service fee", "success fee"],
    keywords: ["concierge", "$499", "service fee", "success fee", "completion fee"],
    routeBonus: ["/pricing"],
  },
  {
    name: "PREQUAL_INQUIRY",
    phrases: ["pre-qualification", "prequalification", "get prequalified", "check my credit", "credit check"],
    keywords: ["prequalif", "prequal", "qualify", "qualification", "credit", "eligibility"],
    routeBonus: ["/how-it-works", "/"],
  },
  {
    name: "BUYER_SIGNUP_PROMPT",
    phrases: ["how do i sign up", "create an account", "get started", "register as a buyer", "join autolenis"],
    keywords: ["sign up", "signup", "register", "create account", "get started", "join", "start"],
    routeBonus: ["/", "/how-it-works"],
  },
  {
    name: "DEALER_INQUIRY",
    phrases: ["how do dealers work", "dealer program", "list my inventory", "sell through autolenis", "become a dealer"],
    keywords: ["dealer", "inventory", "list", "selling", "auction", "dealership"],
    routeBonus: ["/for-dealers"],
  },
  {
    name: "AFFILIATE_INQUIRY",
    phrases: ["affiliate program", "refer a friend", "earn commission", "referral program", "how to earn"],
    keywords: ["affiliate", "refer", "referral", "commission", "earn", "partner"],
    routeBonus: ["/affiliate"],
  },
  {
    name: "REFINANCE_INQUIRY",
    phrases: ["can i refinance", "refinance my car", "lower my rate", "refinance options"],
    keywords: ["refinance", "refi", "lower rate", "interest rate", "monthly payment", "refinancing"],
    routeBonus: ["/"],
  },
  {
    name: "INSURANCE_INFO",
    phrases: ["what insurance options", "car insurance", "auto insurance", "insurance through autolenis"],
    keywords: ["insurance", "coverage", "insure", "policy", "premium"],
    routeBonus: ["/insurance"],
  },
  {
    name: "CONTRACT_SHIELD_INFO",
    phrases: ["what is contract shield", "contract review", "contract protection", "shield my contract"],
    keywords: ["contract shield", "shield", "contract review", "protection", "scan"],
    routeBonus: ["/contract-shield"],
  },
  {
    name: "CONTACT_SUPPORT",
    phrases: ["contact support", "talk to someone", "get help", "email support", "phone number"],
    keywords: ["contact", "support", "help", "phone", "email", "reach", "talk"],
    routeBonus: ["/contact", "/faq"],
  },
  {
    name: "FALLBACK",
    phrases: [],
    keywords: [],
  },
]
