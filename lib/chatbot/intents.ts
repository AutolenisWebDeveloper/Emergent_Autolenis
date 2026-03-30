/**
 * Chatbot FAQ intents — deterministic knowledge base for the Lenis Concierge.
 *
 * Each intent defines:
 *  - `id`        Unique identifier
 *  - `category`  Grouping for route-aware prioritization
 *  - `keywords`  Tokens / phrases that signal this intent
 *  - `answer`    Markdown-formatted response text
 *  - `chips`     Follow-up quick-reply suggestions
 *
 * Categories align with site sections for route-aware boosting:
 *  - "pricing"   → /pricing, /fees
 *  - "process"   → /how-it-works, /about
 *  - "prequal"   → /buyer, /prequal
 *  - "dealer"    → /dealer
 *  - "affiliate" → /affiliate
 *  - "support"   → everywhere (default)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChatbotIntent {
  readonly id: string
  readonly category: IntentCategory
  readonly keywords: readonly string[]
  readonly answer: string
  readonly chips: readonly SuggestedChip[]
}

export interface SuggestedChip {
  readonly label: string
  readonly query: string
}

export type IntentCategory =
  | "pricing"
  | "process"
  | "prequal"
  | "dealer"
  | "affiliate"
  | "support"

// ---------------------------------------------------------------------------
// Intents
// ---------------------------------------------------------------------------

export const INTENTS: readonly ChatbotIntent[] = [
  /* ---- How AutoLenis works ---- */
  {
    id: "how_it_works",
    category: "process",
    keywords: [
      "how does autolenis work",
      "how it works",
      "what is autolenis",
      "explain autolenis",
      "how do you work",
      "process",
      "steps",
      "how does this work",
      "tell me about autolenis",
      "what do you do",
      "getting started",
    ],
    answer:
      "AutoLenis is a car-buying concierge that puts you in control:\n\n" +
      "1. **Get Pre-Qualified** — Quick, soft-pull pre-qualification with no impact on your credit.\n" +
      "2. **Build Your Shortlist** — Tell us your ideal vehicle (make, model, budget) and we source options.\n" +
      "3. **Dealers Compete** — Certified dealers submit offers, so you get the best price without negotiating.\n" +
      "4. **Contract Shield™** — Our AI reviews every deal before you sign, flagging hidden fees and unfavorable terms.\n" +
      "5. **Close & Pick Up** — E-sign from home and schedule pickup at your convenience.\n\n" +
      "The entire process is designed to save you time, money, and stress.",
    chips: [
      { label: "💰 What does it cost?", query: "What are AutoLenis fees?" },
      { label: "📋 Pre-qualification", query: "How does pre-qualification work?" },
      { label: "🤝 Dealer info", query: "How do dealers participate?" },
    ],
  },

  /* ---- Pricing / Service fee / Deposit ---- */
  {
    id: "pricing",
    category: "pricing",
    keywords: [
      "pricing",
      "price",
      "cost",
      "fee",
      "fees",
      "how much",
      "service fee",
      "concierge fee",
      "deposit",
      "what does it cost",
      "is it free",
      "charge",
      "payment",
      "expensive",
      "affordable",
      "money",
      "budget",
    ],
    answer:
      "AutoLenis charges a one-time **concierge service fee** — no hidden charges, no markups.\n\n" +
      "• **Pre-qualification** — Completely free, no credit impact.\n" +
      "• **Service Fee** — A transparent flat fee applied only when you close a deal through our platform.\n" +
      "• **Refundable Deposit** — A small deposit secures your spot in the auction; it's credited toward your service fee at closing.\n\n" +
      "You never pay unless you complete a purchase, and the fee is disclosed upfront before you commit.\n\n" +
      "⚠️ *Fee amounts may vary. This is general guidance — not a binding quote.*",
    chips: [
      { label: "🚗 How it works", query: "How does AutoLenis work?" },
      { label: "📋 Pre-qualification", query: "How does pre-qualification work?" },
      { label: "📞 Contact support", query: "How do I contact support?" },
    ],
  },

  /* ---- Pre-qualification ---- */
  {
    id: "prequal",
    category: "prequal",
    keywords: [
      "pre-qualification",
      "prequalification",
      "prequal",
      "pre-qualify",
      "prequalify",
      "pre qual",
      "credit check",
      "soft pull",
      "hard pull",
      "credit score",
      "credit impact",
      "qualify",
      "eligibility",
      "am i eligible",
      "can i qualify",
      "financing",
      "loan",
      "approval",
    ],
    answer:
      "Our pre-qualification is fast, free, and has **no impact on your credit score** (soft pull only).\n\n" +
      "**How it works:**\n" +
      "1. Provide basic info (name, income, employment).\n" +
      "2. We run a soft credit inquiry — your score is never affected.\n" +
      "3. You receive a pre-qualification result showing your estimated buying power.\n\n" +
      "**Important:**\n" +
      "• Pre-qualification is not a guarantee of financing — final terms depend on the lender.\n" +
      "• No SSN is required for the initial check; only a soft pull is used.\n" +
      "• Results are typically available within minutes.\n\n" +
      "⚠️ *Pre-qualification is informational only and does not constitute a loan offer.*",
    chips: [
      { label: "💰 Pricing details", query: "What are AutoLenis fees?" },
      { label: "🚗 How it works", query: "How does AutoLenis work?" },
      { label: "📞 Contact support", query: "How do I contact support?" },
    ],
  },

  /* ---- Dealer onboarding / partnership ---- */
  {
    id: "dealer_onboarding",
    category: "dealer",
    keywords: [
      "dealer",
      "dealership",
      "dealer onboarding",
      "become a dealer",
      "dealer partnership",
      "partner",
      "join as dealer",
      "dealer signup",
      "dealer registration",
      "sell cars",
      "dealer benefits",
      "dealer program",
      "dealer network",
      "how to join as a dealer",
      "dealer application",
    ],
    answer:
      "AutoLenis partners with certified dealers nationwide to create a transparent, competitive marketplace.\n\n" +
      "**Dealer Benefits:**\n" +
      "• Access to pre-qualified, ready-to-buy leads.\n" +
      "• Competitive auction format — win deals by offering the best price.\n" +
      "• Streamlined digital process (e-sign, Contract Shield™ review).\n" +
      "• No upfront fees — you only pay when a deal closes.\n\n" +
      "**How to Join:**\n" +
      "1. Submit a dealer application on our website.\n" +
      "2. Our team reviews and verifies your dealership.\n" +
      "3. Once approved, you receive access to the dealer portal and start receiving buyer requests.\n\n" +
      "Interested? Reach out to our dealer partnerships team to get started.",
    chips: [
      { label: "🚗 How it works", query: "How does AutoLenis work?" },
      { label: "💰 Pricing info", query: "What are AutoLenis fees?" },
      { label: "📞 Contact support", query: "How do I contact support?" },
    ],
  },

  /* ---- Affiliate program ---- */
  {
    id: "affiliate_program",
    category: "affiliate",
    keywords: [
      "affiliate",
      "affiliate program",
      "referral",
      "referral program",
      "refer a friend",
      "earn money",
      "commission",
      "affiliate signup",
      "become an affiliate",
      "referral link",
      "referral bonus",
      "payout",
      "affiliate earnings",
      "partner program",
    ],
    answer:
      "Earn commissions by referring buyers and dealers to AutoLenis through our affiliate program.\n\n" +
      "**How It Works:**\n" +
      "1. Sign up for an affiliate account — it's free.\n" +
      "2. Share your unique referral link with friends, family, or your audience.\n" +
      "3. Earn a commission for every successful deal completed through your referral.\n\n" +
      "**Key Details:**\n" +
      "• Commissions are paid after deals close and payments clear.\n" +
      "• Track your referrals, conversions, and earnings in real-time via the Affiliate Portal.\n" +
      "• Multiple payout options available.\n\n" +
      "Ready to start earning? Sign up for the affiliate program today.",
    chips: [
      { label: "🚗 How it works", query: "How does AutoLenis work?" },
      { label: "💰 Pricing info", query: "What are AutoLenis fees?" },
      { label: "📞 Contact support", query: "How do I contact support?" },
    ],
  },

  /* ---- Contact / Support ---- */
  {
    id: "contact_support",
    category: "support",
    keywords: [
      "contact",
      "support",
      "help",
      "customer service",
      "email",
      "phone",
      "call",
      "reach out",
      "talk to someone",
      "human",
      "agent",
      "live chat",
      "representative",
      "speak to",
      "next step",
      "what should i do",
      "what now",
      "need help",
      "assistance",
      "question",
    ],
    answer:
      "We're here to help! Here's how to reach AutoLenis:\n\n" +
      "📧 **Email:** info@autolenis.com\n" +
      "🌐 **Website:** Visit our Contact page for a support form.\n\n" +
      "**Tips for Fast Support:**\n" +
      "• Include your account email or deal reference number.\n" +
      "• Describe your issue or question clearly.\n" +
      "• Our team typically responds within 1 business day.\n\n" +
      "You can also browse common topics below for instant answers.",
    chips: [
      { label: "🚗 How it works", query: "How does AutoLenis work?" },
      { label: "💰 Pricing info", query: "What are AutoLenis fees?" },
      { label: "📋 Pre-qualification", query: "How does pre-qualification work?" },
    ],
  },

  /* ---- Contract Shield ---- */
  {
    id: "contract_shield",
    category: "process",
    keywords: [
      "contract shield",
      "contract review",
      "hidden fees",
      "contract protection",
      "deal review",
      "fine print",
      "contract analysis",
      "what is contract shield",
    ],
    answer:
      "**Contract Shield™** is AutoLenis's proprietary deal-review system that protects you before you sign.\n\n" +
      "**What It Does:**\n" +
      "• Scans dealer contracts for hidden fees, inflated charges, and unfavorable terms.\n" +
      "• Compares the final deal against your pre-qualified terms (APR, monthly payment, total cost).\n" +
      "• Flags any discrepancies so you can negotiate or walk away informed.\n\n" +
      "**Key Points:**\n" +
      "• Contract Shield runs automatically on every deal — no extra cost.\n" +
      "• Results are informational only; AutoLenis does not provide legal or financial advice.\n" +
      "• You always have the final say before signing.\n\n" +
      "⚠️ *Contract Shield is an informational tool. It is not a substitute for professional legal or financial advice.*",
    chips: [
      { label: "🚗 How it works", query: "How does AutoLenis work?" },
      { label: "💰 Pricing info", query: "What are AutoLenis fees?" },
      { label: "📞 Contact support", query: "How do I contact support?" },
    ],
  },

  /* ---- Vehicle search / sourcing ---- */
  {
    id: "vehicle_search",
    category: "process",
    keywords: [
      "find a car",
      "search vehicle",
      "vehicle search",
      "car search",
      "sourcing",
      "inventory",
      "find vehicle",
      "looking for a car",
      "car request",
      "buyer request",
      "shortlist",
      "vehicle options",
    ],
    answer:
      "AutoLenis makes finding your perfect car easy:\n\n" +
      "1. **Create a Buyer Request** — Specify your ideal make, model, year, budget, and preferences.\n" +
      "2. **We Source Options** — Our network of certified dealers receives your request and competes for your business.\n" +
      "3. **Compare Offers** — Review and compare competing dealer offers side-by-side.\n" +
      "4. **Select & Close** — Pick the best deal, review with Contract Shield™, and e-sign from home.\n\n" +
      "You never have to step foot in a dealership unless you want to.",
    chips: [
      { label: "📋 Pre-qualification", query: "How does pre-qualification work?" },
      { label: "💰 Pricing info", query: "What are AutoLenis fees?" },
      { label: "🛡️ Contract Shield", query: "What is Contract Shield?" },
    ],
  },

  /* ---- Refinance ---- */
  {
    id: "refinance",
    category: "pricing",
    keywords: [
      "refinance",
      "refinancing",
      "lower rate",
      "lower payment",
      "refi",
      "trade in",
      "trade-in",
      "current loan",
      "existing loan",
    ],
    answer:
      "AutoLenis focuses on new vehicle purchases through our concierge platform. For refinancing options:\n\n" +
      "• We can help you understand your current loan terms during the pre-qualification process.\n" +
      "• If you're looking to trade in your current vehicle, mention it in your buyer request and dealers can factor it into their offers.\n\n" +
      "For dedicated refinance services, we recommend consulting with your bank or a licensed lender.\n\n" +
      "⚠️ *AutoLenis does not provide refinancing services directly. This is general guidance only.*",
    chips: [
      { label: "📋 Pre-qualification", query: "How does pre-qualification work?" },
      { label: "🚗 How it works", query: "How does AutoLenis work?" },
      { label: "📞 Contact support", query: "How do I contact support?" },
    ],
  },
] as const

// ---------------------------------------------------------------------------
// Fallback
// ---------------------------------------------------------------------------

export const FALLBACK_RESPONSE =
  "I can help with pricing, pre-qualification, dealers, affiliates, and how AutoLenis works. " +
  "Choose one of the suggested topics below, or type your question and I'll do my best to help."

export const FALLBACK_CHIPS: readonly SuggestedChip[] = [
  { label: "🚗 How AutoLenis works", query: "How does AutoLenis work?" },
  { label: "💰 Pricing & fees", query: "What are AutoLenis fees?" },
  { label: "📋 Pre-qualification", query: "How does pre-qualification work?" },
  { label: "🤝 Dealer partnership", query: "How do dealers participate?" },
  { label: "🔗 Affiliate program", query: "Tell me about the affiliate program" },
  { label: "📞 Contact support", query: "How do I contact support?" },
]
