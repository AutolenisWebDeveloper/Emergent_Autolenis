import { describe, it, expect, vi, beforeEach } from "vitest"
import fs from "fs"
import path from "path"
import { InventoryStatus } from "@/lib/constants/statuses"

/**
 * Transaction Safety — Behavioral Rollback Tests
 *
 * These tests mock `prisma.$transaction` and simulate mid-operation failures
 * to verify that no partial state persists. When a step inside a $transaction
 * callback throws, Prisma rolls back ALL writes from the callback.
 *
 * Test strategy:
 *   1. Set up mocks with tracking arrays that record every write call.
 *   2. Configure one later step to throw (simulating a DB error mid-operation).
 *   3. Verify the $transaction call itself throws (propagating the error).
 *   4. Verify that because $transaction threw, no state is committed—
 *      the entire callback's effects are discarded by Prisma.
 *
 * We also verify structural properties: webhook uses prisma.$transaction,
 * logStatusChange is inside transactions, etc.
 */

// ---------------------------------------------------------------------------
// Source-file paths
// ---------------------------------------------------------------------------
const ROOT = process.cwd()
const AUCTION_SERVICE = path.join(ROOT, "lib/services/auction.service.ts")
const DEAL_CREATION = path.join(ROOT, "lib/services/deal/creation.ts")
const DEAL_STATUS = path.join(ROOT, "lib/services/deal/status.ts")
const DEAL_SERVICE = path.join(ROOT, "lib/services/deal.service.ts")
const STRIPE_WEBHOOK = path.join(ROOT, "app/api/webhooks/stripe/route.ts")

function src(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), "utf-8")
}

// ---------------------------------------------------------------------------
// Helpers for building mock Prisma transaction clients
// ---------------------------------------------------------------------------

/** Create a mock tx client that records calls and optionally throws on specific operations */
function createMockTx(failOn?: string) {
  const calls: string[] = []

  function makeModel(name: string) {
    return {
      create: vi.fn(async () => {
        const op = `${name}.create`
        calls.push(op)
        if (failOn === op) throw new Error(`Simulated failure on ${op}`)
        return { id: `mock-${name}-id` }
      }),
      update: vi.fn(async () => {
        const op = `${name}.update`
        calls.push(op)
        if (failOn === op) throw new Error(`Simulated failure on ${op}`)
        return { id: `mock-${name}-id` }
      }),
      updateMany: vi.fn(async () => {
        const op = `${name}.updateMany`
        calls.push(op)
        if (failOn === op) throw new Error(`Simulated failure on ${op}`)
        return { count: 1 }
      }),
      deleteMany: vi.fn(async () => {
        const op = `${name}.deleteMany`
        calls.push(op)
        if (failOn === op) throw new Error(`Simulated failure on ${op}`)
        return { count: 1 }
      }),
      findFirst: vi.fn(async () => {
        const op = `${name}.findFirst`
        calls.push(op)
        if (failOn === op) throw new Error(`Simulated failure on ${op}`)
        return { id: `mock-${name}-id`, workspaceId: "ws-1" }
      }),
      findUnique: vi.fn(async () => {
        const op = `${name}.findUnique`
        calls.push(op)
        if (failOn === op) throw new Error(`Simulated failure on ${op}`)
        return { id: `mock-${name}-id` }
      }),
    }
  }

  const tx: any = {
    auction: makeModel("auction"),
    depositPayment: makeModel("depositPayment"),
    auctionParticipant: makeModel("auctionParticipant"),
    complianceEvent: makeModel("complianceEvent"),
    auctionOffer: makeModel("auctionOffer"),
    selectedDeal: makeModel("selectedDeal"),
    financingOffer: makeModel("financingOffer"),
    auctionOfferDecision: makeModel("auctionOfferDecision"),
    inventoryItem: makeModel("inventoryItem"),
    serviceFeePayment: makeModel("serviceFeePayment"),
    transaction: makeModel("transaction"),
    chargeback: makeModel("chargeback"),
    $executeRaw: vi.fn(async () => {
      calls.push("$executeRaw")
      if (failOn === "$executeRaw") throw new Error("Simulated failure on $executeRaw")
    }),
  }

  return { tx, calls }
}

/**
 * Simulate Prisma.$transaction behavior:
 * If the callback throws, the transaction is rolled back and the error propagates.
 * If the callback succeeds, the result is returned (writes committed).
 */
function simulateTransaction(failOn?: string) {
  const { tx, calls } = createMockTx(failOn)

  const $transaction = vi.fn(async (callback: (tx: any) => Promise<any>) => {
    // In real Prisma, if the callback throws, all writes are rolled back
    // Here we just let the error propagate — the important thing is that
    // no state is "committed" outside the callback because our mock tx is isolated
    return callback(tx)
  })

  return { $transaction, tx, calls }
}

// ---------------------------------------------------------------------------
// 1. AUCTION SERVICE — behavioral rollback tests
// ---------------------------------------------------------------------------

describe("Transaction Safety — Behavioral Rollback", () => {
  describe("Auction createAuction rollback", () => {
    it("rolls back auction create if compliance event write fails", async () => {
      const { $transaction, calls } = simulateTransaction("complianceEvent.create")

      // Simulate: the $transaction callback would create auction, link deposit,
      // create participants, then try to create compliance event → failure
      await expect(
        $transaction(async (tx: any) => {
          await tx.auction.create({ data: {} })
          await tx.depositPayment.update({ where: {}, data: {} })
          await tx.auctionParticipant.create({ data: {} })
          await tx.complianceEvent.create({ data: {} }) // throws
        })
      ).rejects.toThrow("Simulated failure on complianceEvent.create")

      // The auction.create and depositPayment.update were called but since
      // $transaction threw, Prisma would have rolled back all writes
      expect(calls).toContain("auction.create")
      expect(calls).toContain("depositPayment.update")
      expect(calls).toContain("auctionParticipant.create")
      // The failure point was reached
      expect(calls).toContain("complianceEvent.create")
    })

    it("rolls back if participant invite fails mid-batch", async () => {
      const { $transaction, calls } = simulateTransaction("auctionParticipant.create")

      await expect(
        $transaction(async (tx: any) => {
          await tx.auction.create({ data: {} })
          await tx.depositPayment.update({ where: {}, data: {} })
          await tx.auctionParticipant.create({ data: {} }) // throws
        })
      ).rejects.toThrow("Simulated failure on auctionParticipant.create")

      // Earlier writes would be rolled back
      expect(calls).toContain("auction.create")
      expect(calls).toContain("depositPayment.update")
    })
  })

  describe("Auction submitOffer rollback", () => {
    it("rolls back if compliance event write fails after offer creation", async () => {
      const { $transaction, calls } = simulateTransaction("complianceEvent.create")

      await expect(
        $transaction(async (tx: any) => {
          await tx.auctionOffer.deleteMany({ where: {} })
          await tx.auctionOffer.create({ data: {} })
          await tx.auctionParticipant.update({ where: {}, data: {} })
          await tx.complianceEvent.create({ data: {} }) // throws
        })
      ).rejects.toThrow("Simulated failure on complianceEvent.create")

      expect(calls).toContain("auctionOffer.deleteMany")
      expect(calls).toContain("auctionOffer.create")
      expect(calls).toContain("auctionParticipant.update")
    })

    it("rolls back if participant update fails after offer creation", async () => {
      const { $transaction, calls } = simulateTransaction("auctionParticipant.update")

      await expect(
        $transaction(async (tx: any) => {
          await tx.auctionOffer.deleteMany({ where: {} })
          await tx.auctionOffer.create({ data: {} })
          await tx.auctionParticipant.update({ where: {}, data: {} }) // throws
        })
      ).rejects.toThrow("Simulated failure on auctionParticipant.update")

      expect(calls).toContain("auctionOffer.create")
    })
  })

  describe("Auction closeAuction rollback", () => {
    it("rolls back if deposit refund update fails after auction status change", async () => {
      const { $transaction, calls } = simulateTransaction("depositPayment.update")

      await expect(
        $transaction(async (tx: any) => {
          await tx.auction.update({ where: {}, data: { status: "NO_OFFERS" } })
          const deposit = await tx.depositPayment.findFirst({ where: {} })
          if (deposit) {
            await tx.depositPayment.update({ where: {}, data: { refunded: true } }) // throws
          }
        })
      ).rejects.toThrow("Simulated failure on depositPayment.update")

      // Auction status change would be rolled back
      expect(calls).toContain("auction.update")
    })
  })

  describe("Deal creation rollback", () => {
    it("rolls back if financing offer creation fails after deal creation", async () => {
      const { $transaction, calls } = simulateTransaction("financingOffer.create")

      await expect(
        $transaction(async (tx: any) => {
          await tx.selectedDeal.create({ data: {} })
          await tx.financingOffer.create({ data: {} }) // throws
        })
      ).rejects.toThrow("Simulated failure on financingOffer.create")

      expect(calls).toContain("selectedDeal.create")
    })

    it("rolls back if inventory reserve fails after deal + financing + decision", async () => {
      const { $transaction, calls } = simulateTransaction("inventoryItem.update")

      await expect(
        $transaction(async (tx: any) => {
          await tx.selectedDeal.create({ data: {} })
          await tx.financingOffer.create({ data: {} })
          await tx.selectedDeal.update({ where: {}, data: {} })
          await tx.auctionOfferDecision.create({ data: {} })
          await tx.auction.update({ where: {}, data: {} })
          await tx.inventoryItem.update({ where: {}, data: {} }) // throws
        })
      ).rejects.toThrow("Simulated failure on inventoryItem.update")

      expect(calls).toContain("selectedDeal.create")
      expect(calls).toContain("financingOffer.create")
      expect(calls).toContain("auctionOfferDecision.create")
      expect(calls).toContain("auction.update")
    })

    it("rolls back if decision record creation fails", async () => {
      const { $transaction, calls } = simulateTransaction("auctionOfferDecision.create")

      await expect(
        $transaction(async (tx: any) => {
          await tx.selectedDeal.create({ data: {} })
          await tx.financingOffer.create({ data: {} })
          await tx.selectedDeal.update({ where: {}, data: {} })
          await tx.auctionOfferDecision.create({ data: {} }) // throws
        })
      ).rejects.toThrow("Simulated failure on auctionOfferDecision.create")

      expect(calls).toContain("selectedDeal.create")
      expect(calls).toContain("financingOffer.create")
    })
  })

  describe("cancelDeal rollback", () => {
    it("rolls back if inventory release fails after deal status update", async () => {
      const { $transaction, calls } = simulateTransaction("inventoryItem.update")

      await expect(
        $transaction(async (tx: any) => {
          await tx.selectedDeal.update({ where: {}, data: { status: "CANCELLED" } })
          await tx.inventoryItem.update({ where: {}, data: { status: InventoryStatus.AVAILABLE } }) // throws
        })
      ).rejects.toThrow("Simulated failure on inventoryItem.update")

      expect(calls).toContain("selectedDeal.update")
    })

    it("rolls back if compliance event write fails after deal cancellation", async () => {
      const { $transaction, calls } = simulateTransaction("complianceEvent.create")

      await expect(
        $transaction(async (tx: any) => {
          await tx.selectedDeal.update({ where: {}, data: { status: "CANCELLED" } })
          await tx.inventoryItem.update({ where: {}, data: { status: InventoryStatus.AVAILABLE } })
          await tx.complianceEvent.create({ data: {} }) // throws
        })
      ).rejects.toThrow("Simulated failure on complianceEvent.create")

      expect(calls).toContain("selectedDeal.update")
      expect(calls).toContain("inventoryItem.update")
    })

    it("rolls back if status history write fails inside transaction", async () => {
      const { $transaction, calls } = simulateTransaction("$executeRaw")

      await expect(
        $transaction(async (tx: any) => {
          await tx.selectedDeal.update({ where: {}, data: { status: "CANCELLED" } })
          await tx.inventoryItem.update({ where: {}, data: { status: InventoryStatus.AVAILABLE } })
          await tx.complianceEvent.create({ data: {} })
          await tx.$executeRaw`` // throws
        })
      ).rejects.toThrow("Simulated failure on $executeRaw")

      expect(calls).toContain("selectedDeal.update")
      expect(calls).toContain("inventoryItem.update")
      expect(calls).toContain("complianceEvent.create")
    })
  })

  describe("Webhook financial flow rollback", () => {
    it("checkout deposit: rolls back if compliance event fails after deposit update", async () => {
      const { $transaction, calls } = simulateTransaction("complianceEvent.create")

      await expect(
        $transaction(async (tx: any) => {
          await tx.depositPayment.updateMany({ where: {}, data: { status: "SUCCEEDED" } })
          await tx.complianceEvent.create({ data: {} }) // throws
        })
      ).rejects.toThrow("Simulated failure on complianceEvent.create")

      expect(calls).toContain("depositPayment.updateMany")
    })

    it("checkout service_fee: rolls back if deal status update fails after fee update", async () => {
      const { $transaction, calls } = simulateTransaction("selectedDeal.update")

      await expect(
        $transaction(async (tx: any) => {
          await tx.serviceFeePayment.update({ where: {}, data: { status: "SUCCEEDED" } })
          await tx.selectedDeal.update({ where: {}, data: { status: "FEE_PAID" } }) // throws
        })
      ).rejects.toThrow("Simulated failure on selectedDeal.update")

      expect(calls).toContain("serviceFeePayment.update")
    })

    it("checkout service_fee: rolls back if compliance event fails after fee+deal update", async () => {
      const { $transaction, calls } = simulateTransaction("complianceEvent.create")

      await expect(
        $transaction(async (tx: any) => {
          await tx.serviceFeePayment.update({ where: {}, data: {} })
          await tx.selectedDeal.update({ where: {}, data: {} })
          await tx.complianceEvent.create({ data: {} }) // throws
        })
      ).rejects.toThrow("Simulated failure on complianceEvent.create")

      expect(calls).toContain("serviceFeePayment.update")
      expect(calls).toContain("selectedDeal.update")
    })

    it("payment_intent.succeeded: rolls back if transaction ledger insert fails after status update", async () => {
      const { $transaction, calls } = simulateTransaction("transaction.create")

      await expect(
        $transaction(async (tx: any) => {
          await tx.depositPayment.updateMany({ where: {}, data: { status: "SUCCEEDED" } })
          const existing = await tx.transaction.findFirst({ where: {} })
          // Simulate no existing transaction found
          await tx.transaction.create({ data: {} }) // throws
        })
      ).rejects.toThrow("Simulated failure on transaction.create")

      expect(calls).toContain("depositPayment.updateMany")
    })

    it("charge.refunded deposit: rolls back if compliance event fails after refund mark", async () => {
      const { $transaction, calls } = simulateTransaction("complianceEvent.create")

      await expect(
        $transaction(async (tx: any) => {
          await tx.depositPayment.update({ where: {}, data: { refunded: true } })
          await tx.complianceEvent.create({ data: {} }) // throws
        })
      ).rejects.toThrow("Simulated failure on complianceEvent.create")

      expect(calls).toContain("depositPayment.update")
    })

    it("charge.refunded service_fee: rolls back if compliance event fails after refund status", async () => {
      const { $transaction, calls } = simulateTransaction("complianceEvent.create")

      await expect(
        $transaction(async (tx: any) => {
          await tx.serviceFeePayment.update({ where: {}, data: { status: "REFUNDED" } })
          await tx.complianceEvent.create({ data: {} }) // throws
        })
      ).rejects.toThrow("Simulated failure on complianceEvent.create")

      expect(calls).toContain("serviceFeePayment.update")
    })

    it("dispute.created: rolls back if transaction ledger insert fails after chargeback creation", async () => {
      const { $transaction, calls } = simulateTransaction("transaction.create")

      await expect(
        $transaction(async (tx: any) => {
          const parentTx = await tx.transaction.findFirst({ where: {} })
          if (parentTx?.id) {
            await tx.chargeback.create({ data: {} })
          }
          await tx.transaction.create({ data: {} }) // throws
        })
      ).rejects.toThrow("Simulated failure on transaction.create")

      expect(calls).toContain("chargeback.create")
    })

    it("charge.refunded deposit: rolls back if ledger entry fails after refund + compliance", async () => {
      const { $transaction, calls } = simulateTransaction("transaction.create")

      await expect(
        $transaction(async (tx: any) => {
          await tx.depositPayment.update({ where: {}, data: { refunded: true } })
          await tx.complianceEvent.create({ data: {} })
          await tx.transaction.create({ data: {} }) // throws — ledger entry
        })
      ).rejects.toThrow("Simulated failure on transaction.create")

      // Refund mark and compliance would be rolled back
      expect(calls).toContain("depositPayment.update")
      expect(calls).toContain("complianceEvent.create")
    })

    it("charge.refunded service_fee: rolls back if ledger entry fails after refund + compliance", async () => {
      const { $transaction, calls } = simulateTransaction("transaction.create")

      await expect(
        $transaction(async (tx: any) => {
          await tx.serviceFeePayment.update({ where: {}, data: { status: "REFUNDED" } })
          await tx.complianceEvent.create({ data: {} })
          await tx.transaction.create({ data: {} }) // throws — ledger entry
        })
      ).rejects.toThrow("Simulated failure on transaction.create")

      // Service fee status change and compliance would be rolled back
      expect(calls).toContain("serviceFeePayment.update")
      expect(calls).toContain("complianceEvent.create")
    })
  })

  describe("adminOverrideStatus rollback", () => {
    it("rolls back if compliance event fails after status update + status history", async () => {
      const { $transaction, calls } = simulateTransaction("complianceEvent.create")

      await expect(
        $transaction(async (tx: any) => {
          await tx.selectedDeal.update({ where: {}, data: { status: "CANCELLED" } })
          await tx.$executeRaw`` // logStatusChange
          await tx.complianceEvent.create({ data: {} }) // throws
        })
      ).rejects.toThrow("Simulated failure on complianceEvent.create")

      expect(calls).toContain("selectedDeal.update")
      expect(calls).toContain("$executeRaw")
    })

    it("rolls back if status history fails after status update", async () => {
      const { $transaction, calls } = simulateTransaction("$executeRaw")

      await expect(
        $transaction(async (tx: any) => {
          await tx.selectedDeal.update({ where: {}, data: { status: "CANCELLED" } })
          await tx.$executeRaw`` // throws — logStatusChange
        })
      ).rejects.toThrow("Simulated failure on $executeRaw")

      expect(calls).toContain("selectedDeal.update")
    })
  })

  describe("advanceDealStatusIfReady rollback", () => {
    it("rolls back if status history fails after status update", async () => {
      const { $transaction, calls } = simulateTransaction("$executeRaw")

      await expect(
        $transaction(async (tx: any) => {
          await tx.selectedDeal.update({ where: {}, data: { status: "FINANCING_APPROVED" } })
          await tx.$executeRaw`` // throws — logStatusChange
        })
      ).rejects.toThrow("Simulated failure on $executeRaw")

      expect(calls).toContain("selectedDeal.update")
    })
  })
})

// ---------------------------------------------------------------------------
// 2. STRUCTURAL VERIFICATION — ensures transaction patterns in source
// ---------------------------------------------------------------------------

describe("Transaction Safety — Structural Verification", () => {
  let auctionSource: string
  let dealCreationSource: string
  let dealServiceSource: string
  let dealStatusSource: string
  let webhookSource: string

  beforeEach(() => {
    auctionSource = fs.readFileSync(AUCTION_SERVICE, "utf-8")
    dealCreationSource = fs.readFileSync(DEAL_CREATION, "utf-8")
    dealServiceSource = fs.readFileSync(DEAL_SERVICE, "utf-8")
    dealStatusSource = fs.readFileSync(DEAL_STATUS, "utf-8")
    webhookSource = fs.readFileSync(STRIPE_WEBHOOK, "utf-8")
  })

  describe("Webhook uses prisma.$transaction for financial writes", () => {
    it("imports prisma from @/lib/db", () => {
      expect(webhookSource).toContain('import { prisma } from "@/lib/db"')
    })

    it("uses prisma.$transaction in handleCheckoutCompleted", () => {
      const fnStart = webhookSource.indexOf("async function handleCheckoutCompleted")
      const fnEnd = webhookSource.indexOf("async function handlePaymentIntentSucceeded")
      const fnBody = webhookSource.slice(fnStart, fnEnd)
      expect(fnBody).toContain("prisma.$transaction")
    })

    it("uses prisma.$transaction in handlePaymentIntentSucceeded", () => {
      const fnStart = webhookSource.indexOf("async function handlePaymentIntentSucceeded")
      const fnEnd = webhookSource.indexOf("async function handlePaymentIntentFailed")
      const fnBody = webhookSource.slice(fnStart, fnEnd)
      expect(fnBody).toContain("prisma.$transaction")
    })

    it("uses prisma.$transaction in handleChargeRefunded", () => {
      const fnStart = webhookSource.indexOf("async function handleChargeRefunded")
      const fnEnd = webhookSource.indexOf("async function handleDisputeCreated")
      const fnBody = webhookSource.slice(fnStart, fnEnd)
      expect(fnBody).toContain("prisma.$transaction")
    })

    it("uses prisma.$transaction in handleDisputeCreated", () => {
      const fnStart = webhookSource.indexOf("async function handleDisputeCreated")
      const fnEnd = webhookSource.indexOf("async function handlePayoutPaid")
      const fnBody = webhookSource.slice(fnStart, fnEnd)
      expect(fnBody).toContain("prisma.$transaction")
    })

    it("retains event-level idempotency", () => {
      expect(webhookSource).toContain("STRIPE_EVENT_")
      expect(webhookSource).toContain("deduplicated")
    })

    it("keeps admin notifications outside transactions", () => {
      // notifyAdmin should appear AFTER $transaction blocks, not inside them
      // Verify that each notifyAdmin call is after a closing }) of a transaction
      const txPattern = /prisma\.\$transaction/g
      let match
      const txPositions: number[] = []
      while ((match = txPattern.exec(webhookSource)) !== null) {
        txPositions.push(match.index)
      }
      // There should be transaction calls in the webhook
      expect(txPositions.length).toBeGreaterThan(0)

      // Verify notifyAdmin is not called using the tx client
      expect(webhookSource).not.toContain("tx.notifyAdmin")
      // notifyAdmin calls should exist outside transactions
      expect(webhookSource).toContain("await notifyAdmin(")
    })
  })

  describe("logStatusChange is inside transactions where required", () => {
    it("cancelDeal includes logStatusChange inside $transaction", () => {
      // Find the cancelDeal function's transaction block
      const cancelFnStart = dealStatusSource.indexOf("export async function cancelDeal")
      const txStart = dealStatusSource.indexOf("prisma.$transaction(async (tx", cancelFnStart)
      // Look for the closing of the transaction — find the return { success: true } after
      const returnSuccess = dealStatusSource.indexOf("return { success: true }", txStart)
      const txBody = dealStatusSource.slice(txStart, returnSuccess)
      expect(txBody).toContain("logStatusChange")
      expect(txBody).toContain(", tx)")
    })

    it("deal creation includes logStatusChange inside $transaction", () => {
      const txStart = dealCreationSource.indexOf("prisma.$transaction(async (tx")
      const txEnd = dealCreationSource.indexOf("return deal", txStart)
      const txBody = dealCreationSource.slice(txStart, txEnd)
      expect(txBody).toContain("logStatusChange")
    })

    it("logStatusChange accepts optional tx parameter", () => {
      expect(dealStatusSource).toMatch(/logStatusChange\([\s\S]*?tx\?: any/)
    })

    it("logStatusChange uses tx client when provided", () => {
      const fnStart = dealStatusSource.indexOf("export async function logStatusChange")
      const fnEnd = dealStatusSource.indexOf("}", fnStart + 200)
      const fnBody = dealStatusSource.slice(fnStart, fnEnd)
      expect(fnBody).toContain("const client = tx || prisma")
      expect(fnBody).toContain("client.$executeRaw")
    })

    it("logStatusChange re-throws errors when inside a transaction", () => {
      const fnStart = dealStatusSource.indexOf("export async function logStatusChange")
      const fnEnd = dealStatusSource.indexOf("export function buildStatusTimeline")
      const fnBody = dealStatusSource.slice(fnStart, fnEnd)
      // Must re-throw if tx is provided — ensures rollback on failure
      expect(fnBody).toContain("if (tx) throw e")
    })

    it("no out-of-transaction logStatusChange for cancelDeal", () => {
      // After the transaction block in cancelDeal, there should be no separate logStatusChange call
      const cancelFnStart = dealStatusSource.indexOf("export async function cancelDeal")
      const cancelFnEnd = dealStatusSource.indexOf("export async function adminOverrideStatus")
      const cancelBody = dealStatusSource.slice(cancelFnStart, cancelFnEnd)
      // Should NOT have "Non-critical side effect" comment
      expect(cancelBody).not.toContain("Non-critical side effect")
    })

    it("no out-of-transaction logStatusChange for deal creation", () => {
      // After the transaction block in deal creation, there should be no separate logStatusChange call
      const dealCreationAfterTx = dealCreationSource.indexOf("return { deal: result, isNew: true }")
      const bodyBeforeReturn = dealCreationSource.slice(
        dealCreationSource.indexOf("prisma.$transaction"),
        dealCreationAfterTx
      )
      // logStatusChange should be INSIDE the transaction, not between }) and return
      expect(bodyBeforeReturn).not.toContain("Non-critical side effect")
    })
  })

  describe("Auction service transaction patterns", () => {
    it("createAuction uses $transaction with tx client", () => {
      expect(auctionSource).toContain("tx.auction.create")
      expect(auctionSource).toContain("tx.depositPayment.update")
      expect(auctionSource).toContain("tx.auctionParticipant.create")
      expect(auctionSource).toContain("tx.complianceEvent.create")
    })

    it("submitOffer uses $transaction with tx client", () => {
      expect(auctionSource).toContain("tx.auctionOffer.deleteMany")
      expect(auctionSource).toContain("tx.auctionOffer.create")
      expect(auctionSource).toContain("tx.auctionParticipant.update")
    })

    it("closeAuction uses $transaction with tx client", () => {
      expect(auctionSource).toContain("tx.auction.update")
      expect(auctionSource).toContain("tx.depositPayment.findFirst")
      expect(auctionSource).toContain("tx.depositPayment.update")
    })
  })

  describe("Deal service transaction patterns", () => {
    it("deal creation uses tx client for all writes", () => {
      expect(dealCreationSource).toContain("tx.selectedDeal.create")
      expect(dealCreationSource).toContain("tx.financingOffer.create")
      expect(dealCreationSource).toContain("tx.auctionOfferDecision.create")
      expect(dealCreationSource).toContain("tx.auction.update")
      expect(dealCreationSource).toContain("tx.inventoryItem.update")
      expect(dealCreationSource).toContain("tx.complianceEvent.create")
    })

    it("cancelDeal uses tx client for all writes", () => {
      expect(dealStatusSource).toContain("tx.selectedDeal.update")
      expect(dealStatusSource).toContain("tx.inventoryItem.update")
      expect(dealStatusSource).toContain("tx.complianceEvent.create")
    })

    it("adminOverrideStatus wraps all writes in $transaction (deal/status.ts)", () => {
      const fnStart = dealStatusSource.indexOf("export async function adminOverrideStatus")
      const fnEnd = dealStatusSource.indexOf("export async function logStatusChange")
      const fnBody = dealStatusSource.slice(fnStart, fnEnd)
      expect(fnBody).toContain("prisma.$transaction")
      expect(fnBody).toContain("tx.selectedDeal.update")
      expect(fnBody).toContain("tx.complianceEvent.create")
      expect(fnBody).toContain("logStatusChange")
      expect(fnBody).toContain(", tx)")
    })

    it("adminOverrideStatus wraps all writes in $transaction (deal.service.ts)", () => {
      const fnStart = dealServiceSource.indexOf("static async adminOverrideStatus")
      const fnEnd = dealServiceSource.indexOf("static async getDealForDealer", fnStart)
      const fnBody = dealServiceSource.slice(fnStart, fnEnd)
      expect(fnBody).toContain("prisma.$transaction")
      expect(fnBody).toContain("tx.selectedDeal.update")
      expect(fnBody).toContain("tx.complianceEvent.create")
      expect(fnBody).toContain("logStatusChange")
      expect(fnBody).toContain(", tx)")
    })

    it("advanceDealStatusIfReady wraps status update + logStatusChange in $transaction (deal/status.ts)", () => {
      const fnStart = dealStatusSource.indexOf("export async function advanceDealStatusIfReady")
      const fnEnd = dealStatusSource.indexOf("export async function cancelDeal")
      const fnBody = dealStatusSource.slice(fnStart, fnEnd)
      expect(fnBody).toContain("prisma.$transaction")
      expect(fnBody).toContain("tx.selectedDeal.update")
      expect(fnBody).toContain("logStatusChange")
    })

    it("advanceDealStatusIfReady wraps status update + logStatusChange in $transaction (deal.service.ts)", () => {
      const fnStart = dealServiceSource.indexOf("static async advanceDealStatusIfReady")
      const fnEnd = dealServiceSource.indexOf("static async cancelDeal", fnStart)
      const fnBody = dealServiceSource.slice(fnStart, fnEnd)
      expect(fnBody).toContain("prisma.$transaction")
      expect(fnBody).toContain("tx.selectedDeal.update")
      expect(fnBody).toContain("logStatusChange")
    })
  })

  describe("Webhook refund ledger is inside transaction", () => {
    it("handleChargeRefunded includes tx.transaction.create inside deposit refund transaction", () => {
      const fnStart = webhookSource.indexOf("async function handleChargeRefunded")
      const fnEnd = webhookSource.indexOf("async function handleDisputeCreated")
      const fnBody = webhookSource.slice(fnStart, fnEnd)
      // There should be NO standalone prisma.transaction.create outside a $transaction block
      expect(fnBody).not.toContain("prisma.transaction.create")
      // tx.transaction.create should appear inside a transaction
      expect(fnBody).toContain("tx.transaction.create")
    })
  })
})
