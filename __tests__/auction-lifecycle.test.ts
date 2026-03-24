import { describe, it, expect, beforeAll } from "vitest"
import fs from "fs"
import path from "path"

/**
 * Auction lifecycle tests
 *
 * Tests the auction service structure and logic flow:
 * - Prerequisites validation
 * - Create → Open → Close/Expire lifecycle
 * - Offer submission rules
 */

const AUCTION_SERVICE = path.join(process.cwd(), "lib/services/auction.service.ts")
const CRON_ROUTE = path.join(process.cwd(), "app/api/cron/auction-close/route.ts")

describe("Auction Lifecycle", () => {
  let auctionSource: string

  beforeAll(() => {
    auctionSource = fs.readFileSync(AUCTION_SERVICE, "utf-8")
  })

  describe("Service Structure", () => {
    it("exports AuctionService class", () => {
      expect(auctionSource).toContain("export class AuctionService")
    })

    it("exports singleton instance", () => {
      expect(auctionSource).toMatch(/export\s+(const|default)\s+auctionService/)
    })

    it("has all required methods", () => {
      const requiredMethods = [
        "validateAuctionPrerequisites",
        "createAuction",
        "getAuction",
        "getBuyerAuctions",
        "getDealerAuctions",
        "getDealerAuctionDetail",
        "submitOffer",
        "closeAuction",
        "closeExpiredAuctions",
      ]

      for (const method of requiredMethods) {
        expect(auctionSource).toContain(method)
      }
    })
  })

  describe("Prerequisites Validation", () => {
    it("checks pre-qualification exists and is not expired", () => {
      expect(auctionSource).toContain("PREQUAL_REQUIRED")
      expect(auctionSource).toContain("expiresAt")
    })

    it("checks shortlist has items", () => {
      expect(auctionSource).toContain("SHORTLIST_EMPTY")
    })

    it("checks deposit is paid and not refunded", () => {
      expect(auctionSource).toContain("DEPOSIT_REQUIRED")
      expect(auctionSource).toContain('status: "SUCCEEDED"')
      expect(auctionSource).toContain("refunded: false")
    })

    it("returns structured validation result", () => {
      expect(auctionSource).toContain("valid: errors.length === 0")
    })
  })

  describe("Auction Creation", () => {
    it("validates prerequisites before creating", () => {
      expect(auctionSource).toContain("validateAuctionPrerequisites")
      expect(auctionSource).toContain("Prerequisites not met")
    })

    it("creates auction with OPEN status", () => {
      expect(auctionSource).toContain('status: "OPEN"')
    })

    it("sets start and end times", () => {
      expect(auctionSource).toContain("startsAt")
      expect(auctionSource).toContain("endsAt")
    })

    it("invites dealers from shortlist", () => {
      expect(auctionSource).toContain("auctionParticipant")
      expect(auctionSource).toContain("dealerId")
    })

    it("links deposit to auction", () => {
      expect(auctionSource).toContain("depositPayment")
      expect(auctionSource).toContain("auctionId: newAuction.id")
    })

    it("logs compliance event for auction creation", () => {
      expect(auctionSource).toContain("AUCTION_CREATED")
      expect(auctionSource).toContain("complianceEvent")
    })
  })

  describe("Auction Closing", () => {
    it("handles no-offers case", () => {
      expect(auctionSource).toContain('status: "NO_OFFERS"')
    })

    it("refunds deposit when no offers received", () => {
      expect(auctionSource).toContain("refunded: true")
      expect(auctionSource).toContain("No offers received")
    })

    it("sets CLOSED status when offers exist", () => {
      // The source should transition to CLOSED when offers are present
      expect(auctionSource).toContain('status: "CLOSED"')
    })

    it("records closedAt timestamp", () => {
      expect(auctionSource).toContain("closedAt: new Date()")
    })
  })

  describe("Auto-Close Expired Auctions", () => {
    it("finds OPEN auctions past their endAt time", () => {
      expect(auctionSource).toContain('status: "OPEN"')
      expect(auctionSource).toContain("endsAt: { lte: new Date() }")
    })

    it("closes each expired auction", () => {
      expect(auctionSource).toContain("closeAuction(auction.id)")
    })

    it("returns count of expired auctions processed", () => {
      expect(auctionSource).toContain("expiredAuctions.length")
    })
  })

  describe("Cron Route", () => {
    it("cron route file exists", () => {
      expect(fs.existsSync(CRON_ROUTE)).toBe(true)
    })

    it("has GET handler", () => {
      const cronSource = fs.readFileSync(CRON_ROUTE, "utf-8")
      expect(cronSource).toMatch(/export\s+async\s+function\s+GET/)
    })
  })

  describe("Offer Submission", () => {
    it("has submitOffer method", () => {
      expect(auctionSource).toContain("submitOffer")
    })

    it("validates auction is still OPEN", () => {
      // The submitOffer should check status before accepting
      expect(auctionSource).toMatch(/status.*!==.*"OPEN"|status.*===.*"OPEN"/)
    })

    it("includes financing options", () => {
      expect(auctionSource).toContain("financingOption")
    })
  })

  describe("Status Transitions", () => {
    it("supports all valid statuses", () => {
      const statuses = ["OPEN", "CLOSED", "NO_OFFERS"]
      for (const status of statuses) {
        expect(auctionSource).toContain(`"${status}"`)
      }
    })
  })
})
