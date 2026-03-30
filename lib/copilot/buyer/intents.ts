/**
 * Intent patterns for the buyer copilot.
 */

import type { IntentPattern } from "../shared/intent-scorer"

export const BUYER_INTENT_PATTERNS: IntentPattern[] = [
  {
    name: "VIEW_DEAL_STATUS",
    phrases: ["what is my deal status", "where is my deal", "deal progress", "check my deal"],
    keywords: ["deal", "status", "progress", "stage", "where", "current", "update"],
    roleRequired: ["buyer"],
    routeBonus: ["/buyer"],
  },
  {
    name: "PAY_DEPOSIT",
    phrases: ["pay my deposit", "pay the deposit", "place deposit", "make deposit"],
    keywords: ["deposit", "pay", "place", "$99"],
    roleRequired: ["buyer"],
  },
  {
    name: "PAY_CONCIERGE_FEE",
    phrases: ["pay concierge fee", "pay the fee", "pay $499", "pay my fee"],
    keywords: ["concierge", "fee", "pay", "$499"],
    roleRequired: ["buyer"],
    stageBonus: ["FEE_PENDING"],
  },
  {
    name: "INCLUDE_FEE_IN_LOAN",
    phrases: ["include fee in loan", "add fee to financing", "roll fee into loan", "finance the fee"],
    keywords: ["include", "roll", "add fee", "financing", "loan", "finance fee"],
    roleRequired: ["buyer"],
    stageBonus: ["FEE_PENDING"],
  },
  {
    name: "VIEW_OFFERS",
    phrases: ["view my offers", "see my offers", "show offers", "what offers do i have"],
    keywords: ["offers", "bids", "auction", "vehicle options", "proposals"],
    roleRequired: ["buyer"],
    routeBonus: ["/buyer"],
  },
  {
    name: "ADD_TO_SHORTLIST",
    phrases: ["add to shortlist", "shortlist this", "save this offer", "favorite this"],
    keywords: ["shortlist", "save", "favorite", "bookmark", "add"],
    roleRequired: ["buyer"],
  },
  {
    name: "SELECT_OFFER",
    phrases: ["select this offer", "choose this vehicle", "accept this offer", "i want this car"],
    keywords: ["select", "choose", "accept", "pick", "this vehicle", "want"],
    roleRequired: ["buyer"],
  },
  {
    name: "VIEW_FINANCING",
    phrases: ["view financing options", "see financing", "financing status", "what financing"],
    keywords: ["financing", "loan", "rate", "apr", "monthly payment", "finance"],
    roleRequired: ["buyer"],
    stageBonus: ["FINANCING_PENDING", "FINANCING_APPROVED"],
  },
  {
    name: "VIEW_INSURANCE",
    phrases: ["view insurance options", "get insurance", "insurance status", "need insurance"],
    keywords: ["insurance", "coverage", "insure", "policy"],
    roleRequired: ["buyer"],
    stageBonus: ["INSURANCE_PENDING"],
  },
  {
    name: "VIEW_CONTRACT",
    phrases: ["view my contract", "see the contract", "review contract", "download contract"],
    keywords: ["contract", "document", "agreement", "paperwork"],
    roleRequired: ["buyer"],
    stageBonus: ["CONTRACT_PENDING", "CONTRACT_REVIEW", "CONTRACT_APPROVED", "SIGNING_PENDING"],
  },
  {
    name: "CONTRACT_SHIELD_SCAN",
    phrases: ["scan my contract", "check my contract", "contract shield", "review my terms"],
    keywords: ["scan", "shield", "verify contract", "check terms", "contract issues"],
    roleRequired: ["buyer"],
  },
  {
    name: "SCHEDULE_PICKUP",
    phrases: ["schedule pickup", "book pickup", "arrange delivery", "when can i pick up"],
    keywords: ["pickup", "delivery", "schedule", "pick up", "collect"],
    roleRequired: ["buyer"],
    stageBonus: ["SIGNED", "PICKUP_SCHEDULED"],
  },
  {
    name: "VIEW_DEAL_HISTORY",
    phrases: ["view my past deals", "deal history", "previous purchases", "all my deals"],
    keywords: ["history", "past deals", "previous", "all deals", "completed"],
    roleRequired: ["buyer"],
  },
  {
    name: "CONTACT_SUPPORT",
    phrases: ["contact support", "get help", "talk to someone", "need assistance"],
    keywords: ["support", "help", "contact", "assist", "problem", "issue"],
    roleRequired: ["buyer"],
  },
  {
    name: "VIEW_PREQUAL",
    phrases: ["view prequalification", "check prequal", "prequal status", "my prequalification"],
    keywords: ["prequal", "prequalification", "qualification", "eligibility"],
    roleRequired: ["buyer"],
  },
  {
    name: "REFINANCE_INQUIRY",
    phrases: ["refinance my loan", "lower my rate", "refinance options", "refinance help"],
    keywords: ["refinance", "refi", "lower rate", "monthly payment"],
    roleRequired: ["buyer"],
  },
  {
    name: "FALLBACK",
    phrases: [],
    keywords: [],
    roleRequired: ["buyer"],
  },
]
