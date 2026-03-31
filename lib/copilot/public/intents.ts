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
  | "TIMELINE_INQUIRY"
  | "TRADE_IN_INQUIRY"
  | "DELIVERY_INQUIRY"
  | "FINANCING_FAQ"
  | "PRIVACY_SECURITY"
  | "AUCTION_PROCESS"
  | "COMPARE_DEALERSHIP"
  | "FALLBACK"

export const PUBLIC_INTENT_PATTERNS: IntentPattern[] = [
  {
    name: "HOW_IT_WORKS",
    phrases: ["how does autolenis work", "how it works", "what is autolenis", "explain autolenis", "what do you do", "tell me about autolenis", "how does this work", "what does autolenis do"],
    keywords: ["how", "works", "process", "steps", "explain", "overview", "about", "platform", "what is"],
    routeBonus: ["/", "/how-it-works"],
  },
  {
    name: "PRICING_INQUIRY",
    phrases: ["how much does it cost", "what does it cost", "pricing", "what are the fees", "total cost", "how much do you charge", "is it free"],
    keywords: ["cost", "price", "pricing", "fee", "fees", "charge", "pay", "money", "how much", "expensive", "cheap", "affordable"],
    routeBonus: ["/pricing"],
  },
  {
    name: "DEPOSIT_INQUIRY",
    phrases: ["how much is the deposit", "refundable deposit", "deposit amount", "$99 deposit", "deposit fee", "is the deposit refundable", "can i get my deposit back"],
    keywords: ["deposit", "$99", "refundable", "hold"],
    routeBonus: ["/pricing", "/how-it-works"],
  },
  {
    name: "CONCIERGE_FEE_INQUIRY",
    phrases: ["what is the concierge fee", "concierge fee", "$499 fee", "service fee", "success fee", "how much is the concierge fee"],
    keywords: ["concierge", "$499", "service fee", "success fee", "completion fee"],
    routeBonus: ["/pricing"],
  },
  {
    name: "PREQUAL_INQUIRY",
    phrases: ["pre-qualification", "prequalification", "get prequalified", "check my credit", "credit check", "does it affect my credit", "soft pull", "hard pull"],
    keywords: ["prequalif", "prequal", "qualify", "qualification", "credit", "eligibility", "soft pull", "hard pull", "credit score"],
    routeBonus: ["/how-it-works", "/"],
  },
  {
    name: "BUYER_SIGNUP_PROMPT",
    phrases: ["how do i sign up", "create an account", "get started", "register as a buyer", "join autolenis", "how do i start", "sign me up"],
    keywords: ["sign up", "signup", "register", "create account", "get started", "join", "start", "begin", "account"],
    routeBonus: ["/", "/how-it-works"],
  },
  {
    name: "DEALER_INQUIRY",
    phrases: ["how do dealers work", "dealer program", "list my inventory", "sell through autolenis", "become a dealer", "dealer partnership", "for dealers"],
    keywords: ["dealer", "inventory", "list", "selling", "auction", "dealership", "partnership"],
    routeBonus: ["/for-dealers"],
  },
  {
    name: "AFFILIATE_INQUIRY",
    phrases: ["affiliate program", "refer a friend", "earn commission", "referral program", "how to earn", "become an affiliate"],
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
    phrases: ["what insurance options", "car insurance", "auto insurance", "insurance through autolenis", "do i need insurance"],
    keywords: ["insurance", "coverage", "insure", "policy", "premium"],
    routeBonus: ["/insurance"],
  },
  {
    name: "CONTRACT_SHIELD_INFO",
    phrases: ["what is contract shield", "contract review", "contract protection", "shield my contract", "how does contract shield work"],
    keywords: ["contract shield", "shield", "contract review", "protection", "scan"],
    routeBonus: ["/contract-shield"],
  },
  {
    name: "CONTACT_SUPPORT",
    phrases: ["contact support", "talk to someone", "get help", "email support", "phone number", "how to reach you", "customer service"],
    keywords: ["contact", "support", "help", "phone", "email", "reach", "talk", "customer service"],
    routeBonus: ["/contact", "/faq"],
  },
  {
    name: "TIMELINE_INQUIRY",
    phrases: ["how long does it take", "what is the timeline", "when will i get my car", "how fast", "process timeline", "how many days"],
    keywords: ["timeline", "how long", "days", "weeks", "fast", "quick", "duration", "time", "when"],
    routeBonus: ["/how-it-works"],
  },
  {
    name: "TRADE_IN_INQUIRY",
    phrases: ["can i trade in", "trade in my car", "trade-in value", "sell my current car", "what about my old car"],
    keywords: ["trade in", "trade-in", "sell my car", "old car", "current vehicle", "trade"],
    routeBonus: ["/"],
  },
  {
    name: "DELIVERY_INQUIRY",
    phrases: ["how does delivery work", "can you deliver", "home delivery", "vehicle delivery", "pickup options", "how do i get my car"],
    keywords: ["delivery", "deliver", "pickup", "ship", "transport", "receive"],
    routeBonus: ["/how-it-works"],
  },
  {
    name: "FINANCING_FAQ",
    phrases: ["how does financing work", "financing options", "can i get a loan", "auto loan", "financing through autolenis", "what rates do you offer"],
    keywords: ["financing", "loan", "lender", "apr", "rate", "monthly", "borrow", "finance"],
    routeBonus: ["/how-it-works", "/pricing"],
  },
  {
    name: "PRIVACY_SECURITY",
    phrases: ["is my data safe", "privacy policy", "data security", "how secure", "do you sell my data", "is it secure"],
    keywords: ["privacy", "security", "secure", "data", "safe", "encrypted", "protection", "personal information"],
    routeBonus: ["/"],
  },
  {
    name: "AUCTION_PROCESS",
    phrases: ["how does the auction work", "blind auction", "dealer bidding", "how do dealers bid", "auction process"],
    keywords: ["auction", "bid", "bidding", "blind", "compete", "competing"],
    routeBonus: ["/how-it-works"],
  },
  {
    name: "COMPARE_DEALERSHIP",
    phrases: ["why not go to a dealership", "autolenis vs dealership", "why use autolenis", "what makes autolenis different", "why should i use this"],
    keywords: ["compare", "versus", "better", "different", "advantage", "why use", "dealership", "traditional"],
    routeBonus: ["/"],
  },
  {
    name: "FALLBACK",
    phrases: [],
    keywords: [],
  },
]
