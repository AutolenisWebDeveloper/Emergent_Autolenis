/**
 * Route context map for the public copilot.
 * Maps known public routes to relevant intents for context hints.
 */

export interface RouteContext {
  route: string
  primaryIntent: string
  description: string
}

export const PUBLIC_ROUTE_CONTEXTS: RouteContext[] = [
  {
    route: "/",
    primaryIntent: "HOW_IT_WORKS",
    description: "AutoLenis homepage — platform overview and how it works",
  },
  {
    route: "/how-it-works",
    primaryIntent: "HOW_IT_WORKS",
    description: "How AutoLenis works — step-by-step process",
  },
  {
    route: "/pricing",
    primaryIntent: "PRICING_INQUIRY",
    description: "Pricing page — deposit and concierge fee details",
  },
  {
    route: "/contract-shield",
    primaryIntent: "CONTRACT_SHIELD_INFO",
    description: "Contract Shield — contract review tool overview",
  },
  {
    route: "/for-dealers",
    primaryIntent: "DEALER_INQUIRY",
    description: "Dealer program — how dealers participate in the marketplace",
  },
  {
    route: "/affiliate",
    primaryIntent: "AFFILIATE_INQUIRY",
    description: "Affiliate program — commission structure and referral program",
  },
  {
    route: "/insurance",
    primaryIntent: "INSURANCE_INFO",
    description: "Insurance options through AutoLenis",
  },
  {
    route: "/faq",
    primaryIntent: "HOW_IT_WORKS",
    description: "Frequently asked questions about AutoLenis",
  },
  {
    route: "/contact",
    primaryIntent: "CONTACT_SUPPORT",
    description: "Contact AutoLenis support",
  },
]

/**
 * Look up the route context for a given pathname.
 * Returns undefined if no context is found.
 */
export function getRouteContext(pathname: string): RouteContext | undefined {
  return PUBLIC_ROUTE_CONTEXTS.find((rc) => pathname.startsWith(rc.route) && rc.route !== "/")
    ?? PUBLIC_ROUTE_CONTEXTS.find((rc) => rc.route === "/")
}
