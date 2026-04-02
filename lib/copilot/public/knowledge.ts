/**
 * Knowledge modules for the public copilot.
 * All information is compliance-safe and publicly shareable.
 *
 * Each module maps an intent to a conversational, professional response
 * with follow-up chip suggestions for guided conversation flow.
 */

export interface KnowledgeModule {
  intent: string
  text: string
  chips?: string[]
}

export const PUBLIC_KNOWLEDGE: KnowledgeModule[] = [
  {
    intent: "HOW_IT_WORKS",
    text: "AutoLenis is a concierge car-buying platform that handles the entire process for you. Here's how it works: (1) You complete a short prequalification. (2) We search our dealer network for matching vehicles. (3) Dealers submit offers through our blind auction — they compete for your business. (4) You review offers and select your favorite. (5) Our Contract Shield tool reviews your agreement for accuracy. (6) You sign and schedule pickup — all without visiting a dealership. The process typically takes a few days from start to finish, and you stay in control at every step.",
    chips: ["What does it cost?", "How do I get started?", "What is Contract Shield?"],
  },
  {
    intent: "PRICING_INQUIRY",
    text: "AutoLenis charges two fees: a fully refundable $99 deposit to start your search, and a $499 concierge fee only when you successfully purchase a vehicle. There are no hidden fees, no monthly charges, and no obligations. The $99 deposit is returned to you if you don't find a vehicle you love. The $499 concierge fee can be paid separately or included in your financing — your choice.",
    chips: ["Tell me about the deposit", "What is the concierge fee?", "How do I get started?"],
  },
  {
    intent: "DEPOSIT_INQUIRY",
    text: "The $99 deposit is fully refundable. It's used to confirm your intent and activate your personalized vehicle search. If you don't complete a purchase, your $99 is returned — no questions asked. The deposit is processed securely through Stripe and can be refunded at any time during the process.",
    chips: ["What is the concierge fee?", "How does AutoLenis work?"],
  },
  {
    intent: "CONCIERGE_FEE_INQUIRY",
    text: "The $499 concierge fee is a one-time success fee charged only when you complete a vehicle purchase through AutoLenis. It covers our full-service coordination: offer management, contract review, financing support, and delivery coordination. You can pay it separately or ask to include it in your financing — most buyers choose one of those two options.",
    chips: ["How does AutoLenis work?", "What is the $99 deposit?"],
  },
  {
    intent: "PREQUAL_INQUIRY",
    text: "AutoLenis uses a soft inquiry for initial prequalification, which does not affect your credit score. A standard credit pull occurs only when a lender formally reviews your financing application. We work with multiple lenders to find options that may fit your situation. The prequalification process is quick and entirely online — no paperwork needed to get started.",
    chips: ["How does AutoLenis work?", "What does it cost?", "How do I get started?"],
  },
  {
    intent: "BUYER_SIGNUP_PROMPT",
    text: "Getting started is easy. Create a free account, complete a short prequalification form, and we'll activate your personalized vehicle search. There's no obligation until you choose to place a $99 refundable deposit on a vehicle you like. The whole signup process takes just a few minutes.",
    chips: ["What does it cost?", "How does AutoLenis work?"],
  },
  {
    intent: "DEALER_INQUIRY",
    text: "AutoLenis connects franchised and independent dealers with qualified buyers through our blind auction marketplace. Dealers submit competitive offers on buyer requests without seeing competing bids. There's no listing fee — dealers pay only when a sale closes. Our platform brings pre-qualified buyers directly to your inventory. Learn more on our For Dealers page.",
    chips: ["How does AutoLenis work?", "What is the affiliate program?"],
  },
  {
    intent: "AFFILIATE_INQUIRY",
    text: "The AutoLenis affiliate program lets you earn commissions by referring buyers. You earn a percentage of the concierge fee on every completed purchase by your referrals. You can also build a team and earn from their referrals through our multi-tier structure. Commissions are activity-based and finalize when a referred deal closes. Visit our Affiliate page to learn more and sign up.",
    chips: ["How does AutoLenis work?", "What does it cost?"],
  },
  {
    intent: "REFINANCE_INQUIRY",
    text: "AutoLenis offers refinancing support for buyers who want to explore options for potentially lowering their interest rate or monthly payment after their initial purchase. Our team can connect you with lenders who specialize in auto refinancing. This service is available through your buyer account. Refinancing terms depend on your individual credit profile and lender criteria.",
    chips: ["How does AutoLenis work?", "How do I get started?"],
  },
  {
    intent: "INSURANCE_INFO",
    text: "AutoLenis partners with insurance providers to help you get auto coverage before or at the time of your vehicle purchase. You can explore insurance options directly through our platform as part of the deal process. Having insurance in place is typically required before finalizing delivery. Coverage terms and eligibility are determined by the insurer.",
    chips: ["How does AutoLenis work?", "What is Contract Shield?"],
  },
  {
    intent: "CONTRACT_SHIELD_INFO",
    text: "Contract Shield is AutoLenis's built-in contract review tool. It automatically compares the terms of your purchase agreement against the offer you accepted — checking for APR discrepancies, fee inconsistencies, monthly payment mismatches, and other common issues. If something doesn't match, it flags it for your attention before you sign. It's an informational tool designed to help protect your interests — not a substitute for professional legal advice.",
    chips: ["How does AutoLenis work?", "What does it cost?"],
  },
  {
    intent: "CONTACT_SUPPORT",
    text: "You can reach AutoLenis support through the Contact page on our website. Our team typically responds within one business day. For urgent matters related to an active deal, please log in to your buyer account where you can get real-time assistance. We're here to help at every stage of your car-buying journey.",
    chips: ["How does AutoLenis work?", "How do I get started?"],
  },
  {
    intent: "TIMELINE_INQUIRY",
    text: "The AutoLenis process typically takes a few days from prequalification to vehicle delivery. After you prequalify and place your deposit, dealers are invited to compete in a blind auction — this usually takes 24–48 hours. Once you select an offer, we coordinate financing, insurance, and contract review. The exact timeline depends on lender processing and your responsiveness, but most buyers complete the process within a week.",
    chips: ["How does AutoLenis work?", "What does it cost?", "What is Contract Shield?"],
  },
  {
    intent: "TRADE_IN_INQUIRY",
    text: "AutoLenis currently focuses on helping you purchase your next vehicle at the best possible price through our dealer auction. If you have a vehicle to trade in, you can discuss trade-in options directly with the winning dealer as part of your deal negotiation. We recommend getting a market value estimate before starting — tools like Kelley Blue Book or Edmunds can help.",
    chips: ["How does AutoLenis work?", "What does it cost?"],
  },
  {
    intent: "DELIVERY_INQUIRY",
    text: "Once your deal is finalized and all documents are signed, you'll schedule your vehicle pickup or delivery through your buyer dashboard. Many of our partner dealers offer home delivery options depending on your location. The delivery timeline is coordinated between you and the dealer, and your AutoLenis concierge is available to help with any logistics.",
    chips: ["How does AutoLenis work?", "What is the process timeline?"],
  },
  {
    intent: "FINANCING_FAQ",
    text: "AutoLenis works with a network of lenders to present you with financing options as part of the deal process. You can compare rates and terms directly on the platform. The initial prequalification uses a soft inquiry that doesn't affect your credit score. A full credit check happens only when you formally apply with a lender. Financing terms vary based on your credit profile and the lender's criteria — we never guarantee specific rates or approval.",
    chips: ["What does it cost?", "How do I get started?"],
  },
  {
    intent: "PRIVACY_SECURITY",
    text: "AutoLenis takes your privacy and data security seriously. Your personal information is encrypted and only shared with parties involved in your deal — lenders, dealers, and insurers as needed. We never sell your data to third parties. Our platform uses bank-grade encryption and secure payment processing through Stripe. You can review our full privacy policy on our website.",
    chips: ["How does AutoLenis work?", "How do I get started?"],
  },
  {
    intent: "AUCTION_PROCESS",
    text: "The AutoLenis blind auction is how dealers compete for your business. After you prequalify and describe the vehicle you want, our partner dealers are invited to submit their best offers. The auction is blind — dealers can't see competing bids, which encourages competitive pricing. You review all offers and choose the best one for you. There's no obligation to accept any offer.",
    chips: ["What does it cost?", "How do I get started?", "What is Contract Shield?"],
  },
  {
    intent: "COMPARE_DEALERSHIP",
    text: "Unlike visiting dealerships in person, AutoLenis lets dealers compete for your business through a blind auction — so you get competitive offers without the pressure of in-person negotiations. You save time by managing everything online, and our Contract Shield tool reviews your agreement before you sign. The $99 deposit is fully refundable, and you only pay the $499 concierge fee if you complete a purchase.",
    chips: ["How does AutoLenis work?", "What does it cost?"],
  },
  {
    intent: "FALLBACK",
    text: "I'm here to help you learn about AutoLenis — your concierge car-buying platform. I can explain how the process works, our pricing, prequalification, the dealer auction, Contract Shield, financing options, our affiliate program, and more. What would you like to know?",
    chips: ["How does AutoLenis work?", "What does it cost?", "How do I get started?"],
  },
]
