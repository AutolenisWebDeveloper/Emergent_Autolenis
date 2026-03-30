/**
 * Knowledge modules for the public copilot.
 * All information is compliance-safe and publicly shareable.
 */

export interface KnowledgeModule {
  intent: string
  text: string
  chips?: string[]
}

export const PUBLIC_KNOWLEDGE: KnowledgeModule[] = [
  {
    intent: "HOW_IT_WORKS",
    text: "AutoLenis is a concierge car-buying platform that handles the entire process for you. Here's how it works: (1) You complete a short prequalification. (2) We search our dealer network for matching vehicles. (3) Dealers submit offers through our blind auction. (4) You review offers and select your favorite. (5) We coordinate financing, insurance, and the contract review. (6) You sign and schedule pickup — all without visiting a dealership.",
    chips: ["What does it cost?", "How do I get started?", "What is Contract Shield?"],
  },
  {
    intent: "PRICING_INQUIRY",
    text: "AutoLenis charges two fees: a fully refundable $99 deposit to start your search, and a $499 concierge fee only when you successfully purchase a vehicle. There are no hidden fees. The $99 deposit is returned to you if you don't find a vehicle you love.",
    chips: ["Tell me about the deposit", "What is the concierge fee?", "How do I get started?"],
  },
  {
    intent: "DEPOSIT_INQUIRY",
    text: "The $99 deposit is fully refundable. It's used to confirm your intent and activate your personalized vehicle search. If you don't complete a purchase, your $99 is returned — no questions asked.",
    chips: ["What is the concierge fee?", "How does AutoLenis work?"],
  },
  {
    intent: "CONCIERGE_FEE_INQUIRY",
    text: "The $499 concierge fee is a one-time success fee charged only when you complete a vehicle purchase through AutoLenis. It covers our full-service coordination: offer management, contract review, financing support, and delivery coordination. You can pay it separately or ask to include it in your financing.",
    chips: ["How does AutoLenis work?", "What is the $99 deposit?"],
  },
  {
    intent: "PREQUAL_INQUIRY",
    text: "AutoLenis uses a soft inquiry for initial prequalification, which does not affect your credit score. A standard credit pull occurs only when a lender formally reviews your financing application. We work with multiple lenders to find options that may fit your situation.",
    chips: ["How does AutoLenis work?", "What does it cost?"],
  },
  {
    intent: "BUYER_SIGNUP_PROMPT",
    text: "Getting started is easy. Create a free account, complete a short prequalification form, and we'll activate your personalized vehicle search. There's no obligation until you choose to place a $99 refundable deposit on a vehicle you like.",
    chips: ["What does it cost?", "How does AutoLenis work?"],
  },
  {
    intent: "DEALER_INQUIRY",
    text: "AutoLenis connects franchised and independent dealers with qualified buyers through our blind auction marketplace. Dealers submit competitive offers on buyer requests without seeing competing bids. There's no listing fee — dealers pay only when a sale closes. Learn more on our For Dealers page.",
    chips: ["How does AutoLenis work?", "What is the affiliate program?"],
  },
  {
    intent: "AFFILIATE_INQUIRY",
    text: "The AutoLenis affiliate program lets you earn commissions by referring buyers. You earn a percentage of the concierge fee on every completed purchase by your referrals. You can also build a team and earn from their referrals. Visit our Affiliate page to learn more.",
    chips: ["How does AutoLenis work?", "What does it cost?"],
  },
  {
    intent: "REFINANCE_INQUIRY",
    text: "AutoLenis offers refinancing support for buyers who want to lower their interest rate or monthly payment after their initial purchase. Our team can connect you with lenders who specialize in auto refinancing. This service is available through your buyer account.",
    chips: ["How does AutoLenis work?", "How do I get started?"],
  },
  {
    intent: "INSURANCE_INFO",
    text: "AutoLenis partners with insurance providers to help you get auto coverage before or at the time of your vehicle purchase. You can explore insurance options directly through our platform as part of the deal process. This is informational — coverage terms and eligibility are determined by the insurer.",
    chips: ["How does AutoLenis work?", "What is Contract Shield?"],
  },
  {
    intent: "CONTRACT_SHIELD_INFO",
    text: "Contract Shield is AutoLenis's built-in contract review tool. It compares the terms of your purchase agreement against the offer you accepted — checking for APR discrepancies, fee inconsistencies, and other common issues. It's an informational tool to help you review your contract, not legal advice.",
    chips: ["How does AutoLenis work?", "What does it cost?"],
  },
  {
    intent: "CONTACT_SUPPORT",
    text: "You can reach AutoLenis support through the Contact page on our website. Our team typically responds within one business day. For urgent matters related to an active deal, please log in to your buyer account for real-time assistance.",
    chips: ["How does AutoLenis work?", "How do I get started?"],
  },
  {
    intent: "FALLBACK",
    text: "I'm here to help you learn about AutoLenis. I can explain how the platform works, pricing, prequalification, our dealer and affiliate programs, Contract Shield, and more. What would you like to know?",
    chips: ["How does AutoLenis work?", "What does it cost?", "How do I get started?"],
  },
]
