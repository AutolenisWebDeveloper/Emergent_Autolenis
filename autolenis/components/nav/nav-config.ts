/**
 * Navigation Configuration — Single Source of Truth
 *
 * All nav items for the public header / mobile drawer are defined here.
 * Both desktop and mobile menus consume this ordered list.
 *
 * IMPORTANT: Do NOT remove items or change hrefs without reviewing
 * existing routes and e2e tests (e2e/audit-validation.spec.ts,
 * e2e/header-navigation.spec.ts).
 */

export interface NavItem {
  /** Route path */
  href: string
  /** Display label */
  label: string
}

/**
 * Ordered nav links rendered in the public header.
 * The order here determines render order in both desktop and mobile menus.
 */
export const NAV_LINKS: readonly NavItem[] = [
  { href: "/how-it-works", label: "How It Works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/refinance", label: "Refinance" },
  { href: "/about", label: "About" },
  { href: "/contract-shield", label: "Contract Shield" },
  { href: "/contact", label: "Contact" },
  { href: "/affiliate", label: "Partner Program" },
  { href: "/dealer-application", label: "Dealers" },
] as const
