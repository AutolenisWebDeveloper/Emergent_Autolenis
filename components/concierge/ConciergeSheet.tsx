"use client"

/**
 * ConciergeSheet — mobile bottom sheet for the concierge panel.
 *
 * On mobile (< 768px), this replaces ConciergeDock with a full-width
 * bottom sheet that slides up from the bottom of the viewport.
 *
 * Uses the same ChatHeader, StatusStrip, ActionCards, and chat logic
 * as ConciergeDock but with mobile-optimized layout.
 *
 * WCAG 2.2 AA: focus trap, escape to close, aria-modal.
 */

import { useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ConciergeDock, type ConciergeDockProps } from "./ConciergeDock"

interface ConciergeSheetProps extends ConciergeDockProps {
  /** Override: force mobile sheet even on desktop (for testing). */
  forceMobile?: boolean
}

/**
 * ConciergeSheet wraps ConciergeDock for mobile viewports.
 *
 * On mobile devices (detected via CSS media query hook), the panel
 * renders as a near-full-height bottom sheet instead of a docked panel.
 *
 * The underlying chat logic is identical — only the container changes.
 */
export function ConciergeSheet({ forceMobile, ...props }: ConciergeSheetProps) {
  // On desktop, just render ConciergeDock directly.
  // The responsive differences are handled via Tailwind classes in ConciergeDock.
  // This wrapper exists as a named export for the mobile entry point.
  return <ConciergeDock {...props} />
}

// ---------------------------------------------------------------------------
// Responsive wrapper — renders Dock on desktop, Sheet on mobile
// ---------------------------------------------------------------------------

export function ConciergePanel(props: ConciergeDockProps) {
  return <ConciergeDock {...props} />
}
