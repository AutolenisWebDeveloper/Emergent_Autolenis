import { describe, it, expect } from "vitest"
import {
  faithContent,
  defaultFaithEntry,
  getFaithContent,
  PLATFORM_DISCLOSURE,
  type FaithEntry,
} from "@/lib/content/faith-content"

/* ------------------------------------------------------------------ */
/*  Routes that must have dedicated faith content                      */
/* ------------------------------------------------------------------ */
const EXPECTED_ROUTES = [
  "/",
  "/how-it-works",
  "/pricing",
  "/insurance",
  "/refinance",
  "/contract-shield",
  "/contact",
  "/dealer-application",
  "/for-dealers",
  "/faq",
  "/about",
  "/affiliate",
  "/feedback",
]

/* Routes where showDisclosure must be false */
const NO_DISCLOSURE_ROUTES = ["/contact", "/faq", "/feedback"]

/* ------------------------------------------------------------------ */
/*  Content registry completeness                                      */
/* ------------------------------------------------------------------ */
describe("faithContent registry", () => {
  it("has an entry for every expected route", () => {
    for (const route of EXPECTED_ROUTES) {
      expect(
        faithContent[route],
        `Missing faith content for route: ${route}`,
      ).toBeDefined()
    }
  })

  it.each(EXPECTED_ROUTES)(
    "entry for %s has all required fields",
    (route) => {
      const entry = faithContent[route]!
      const requiredKeys: (keyof FaithEntry)[] = [
        "kicker",
        "headline",
        "body",
        "verse",
        "reference",
        "closing",
        "showDisclosure",
      ]
      for (const key of requiredKeys) {
        expect(entry[key], `Missing field "${key}" on route ${route}`).toBeDefined()
      }
    },
  )

  it("all text fields are non-empty strings", () => {
    for (const [route, entry] of Object.entries(faithContent)) {
      for (const key of ["kicker", "headline", "body", "verse", "reference", "closing"] as const) {
        expect(typeof entry[key]).toBe("string")
        expect(entry[key].length, `Empty ${key} on route ${route}`).toBeGreaterThan(0)
      }
    }
  })

  it("has no duplicate entries (each route is unique)", () => {
    const routes = Object.keys(faithContent)
    const unique = new Set(routes)
    expect(unique.size).toBe(routes.length)
  })
})

/* ------------------------------------------------------------------ */
/*  Disclosure flag correctness                                        */
/* ------------------------------------------------------------------ */
describe("showDisclosure flag", () => {
  it.each(NO_DISCLOSURE_ROUTES)(
    "%s has showDisclosure = false",
    (route) => {
      expect(faithContent[route]!.showDisclosure).toBe(false)
    },
  )

  it("all other expected routes have showDisclosure = true", () => {
    const disclosureRoutes = EXPECTED_ROUTES.filter(
      (r) => !NO_DISCLOSURE_ROUTES.includes(r),
    )
    for (const route of disclosureRoutes) {
      expect(
        faithContent[route]!.showDisclosure,
        `Expected showDisclosure = true for ${route}`,
      ).toBe(true)
    }
  })
})

/* ------------------------------------------------------------------ */
/*  getFaithContent lookup helper                                      */
/* ------------------------------------------------------------------ */
describe("getFaithContent()", () => {
  it("returns the correct entry for a known route", () => {
    const entry = getFaithContent("/pricing")
    expect(entry.headline).toBe("God Is Faithful in Every Season")
    expect(entry.reference).toBe("Philippians 4:19")
  })

  it("returns the default (home) entry for an unknown route", () => {
    const entry = getFaithContent("/some-unknown-page")
    expect(entry).toEqual(defaultFaithEntry)
    expect(entry.headline).toBe("We Proudly Honor Jesus Christ")
  })
})

/* ------------------------------------------------------------------ */
/*  Platform disclosure constant                                       */
/* ------------------------------------------------------------------ */
describe("PLATFORM_DISCLOSURE", () => {
  it("is a non-empty string", () => {
    expect(typeof PLATFORM_DISCLOSURE).toBe("string")
    expect(PLATFORM_DISCLOSURE.length).toBeGreaterThan(100)
  })

  it("contains key compliance phrases", () => {
    expect(PLATFORM_DISCLOSURE).toContain("automotive concierge platform")
    expect(PLATFORM_DISCLOSURE).toContain("do not make loans")
    expect(PLATFORM_DISCLOSURE).toContain("does not guarantee")
    expect(PLATFORM_DISCLOSURE).toContain("consult qualified professionals")
  })
})
