import { describe, it, expect } from "vitest"
import { NAV_LINKS } from "@/components/nav/nav-config"

/**
 * Nav Config Integrity Tests
 *
 * Ensures the single-source-of-truth nav configuration contains all
 * required items with valid structure. Guards against accidental removal.
 */

/** All required nav labels per the product spec */
const REQUIRED_LABELS = [
  "How It Works",
  "Pricing",
  "Refinance",
  "About",
  "Contract Shield",
  "Contact",
  "Partner Program",
  "Dealers",
]

/** All required hrefs per the product spec */
const REQUIRED_HREFS = [
  "/how-it-works",
  "/pricing",
  "/refinance",
  "/about",
  "/contract-shield",
  "/contact",
  "/affiliate",
  "/dealer-application",
]

describe("NAV_LINKS config", () => {
  it("contains all required nav labels", () => {
    const labels = NAV_LINKS.map((l) => l.label)
    for (const required of REQUIRED_LABELS) {
      expect(labels, `Missing required label: ${required}`).toContain(required)
    }
  })

  it("contains all required hrefs", () => {
    const hrefs = NAV_LINKS.map((l) => l.href)
    for (const required of REQUIRED_HREFS) {
      expect(hrefs, `Missing required href: ${required}`).toContain(required)
    }
  })

  it("has exactly 8 nav items", () => {
    expect(NAV_LINKS).toHaveLength(8)
  })

  it("has no duplicate hrefs", () => {
    const hrefs = NAV_LINKS.map((l) => l.href)
    const unique = new Set(hrefs)
    expect(unique.size).toBe(hrefs.length)
  })

  it("has no duplicate labels", () => {
    const labels = NAV_LINKS.map((l) => l.label)
    const unique = new Set(labels)
    expect(unique.size).toBe(labels.length)
  })

  it("all hrefs start with /", () => {
    for (const link of NAV_LINKS) {
      expect(link.href.startsWith("/"), `${link.label} href should start with /`).toBe(true)
    }
  })

  it("preserves the approved ordering", () => {
    const labels = NAV_LINKS.map((l) => l.label)
    expect(labels).toEqual(REQUIRED_LABELS)
  })
})
