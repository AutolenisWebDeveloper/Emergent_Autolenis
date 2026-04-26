/**
 * scripts/seed-deal.ts
 *
 * Idempotent seed script that creates a full dealer portal test fixture set.
 * Uses @prisma/client directly (not the @/lib/prisma singleton) because this
 * runs outside Next.js.
 *
 * CI-safe: if DATABASE_URL / POSTGRES_PRISMA_URL is not set the script prints
 * a message and exits 0 so it does not break CI pipelines.
 *
 * Usage:
 *   pnpm sandbox:seed-deal
 *   npx tsx scripts/seed-deal.ts
 */

import { PrismaClient } from "@prisma/client"
import * as crypto from "crypto"

// ---------------------------------------------------------------------------
// Guard: require a database URL so CI does not explode
// ---------------------------------------------------------------------------
const DB_URL = process.env.POSTGRES_PRISMA_URL ?? process.env.DATABASE_URL
if (!DB_URL) {
  console.log(
    "[seed-deal] No DATABASE_URL / POSTGRES_PRISMA_URL found — skipping seed (CI mode).",
  )
  process.exit(0)
}

const prisma = new PrismaClient()

// ---------------------------------------------------------------------------
// Stable IDs / values so upserts are idempotent
// ---------------------------------------------------------------------------
const IDS = {
  workspace: "seed-workspace-test-001",
  dealerUser: "seed-user-dealer-001",
  buyerUser: "seed-user-buyer-001",
  dealer: "seed-dealer-001",
  buyerProfile: "seed-buyer-profile-001",
  vehicle: "seed-vehicle-001",
  inventoryItem: "seed-inventory-item-001",
  shortlist: "seed-shortlist-001",
  shortlistItem: "seed-shortlist-item-001",
  auction: "seed-auction-001",
  auctionParticipant: "seed-auction-participant-001",
  auctionOffer: "seed-auction-offer-001",
  selectedDeal: "seed-selected-deal-001",
  contractDocument: "seed-contract-doc-001",
  contractShieldScan: "seed-contract-shield-scan-001",
  pickupAppointment: "seed-pickup-appointment-001",
  messageThread: "seed-message-thread-001",
  adminNotification: "seed-admin-notification-001",
}

// A deterministic bcrypt-like placeholder hash (never use in prod)
const PLACEHOLDER_HASH = "$2b$10$seedplaceholderhashdontuse1234567"

async function main() {
  console.log("[seed-deal] Starting seed…")

  // -------------------------------------------------------------------------
  // 1. Workspace (TEST mode)
  // -------------------------------------------------------------------------
  const workspace = await prisma.workspace.upsert({
    where: { id: IDS.workspace },
    create: { id: IDS.workspace, name: "Test Workspace (seed)", mode: "TEST" },
    update: { name: "Test Workspace (seed)", mode: "TEST" },
  })
  console.log("[seed-deal] Workspace:", workspace.id)

  // -------------------------------------------------------------------------
  // 2. Dealer User
  // -------------------------------------------------------------------------
  const dealerUser = await prisma.user.upsert({
    where: { id: IDS.dealerUser },
    create: {
      id: IDS.dealerUser,
      email: "seed-dealer@autolenis.test",
      passwordHash: PLACEHOLDER_HASH,
      role: "DEALER",
      first_name: "Seed",
      last_name: "Dealer",
      workspaceId: workspace.id,
    },
    update: { role: "DEALER", workspaceId: workspace.id },
  })
  console.log("[seed-deal] Dealer User:", dealerUser.id)

  // -------------------------------------------------------------------------
  // 3. Buyer User
  // -------------------------------------------------------------------------
  const buyerUser = await prisma.user.upsert({
    where: { id: IDS.buyerUser },
    create: {
      id: IDS.buyerUser,
      email: "seed-buyer@autolenis.test",
      passwordHash: PLACEHOLDER_HASH,
      role: "BUYER",
      first_name: "Seed",
      last_name: "Buyer",
      workspaceId: workspace.id,
    },
    update: { role: "BUYER", workspaceId: workspace.id },
  })
  console.log("[seed-deal] Buyer User:", buyerUser.id)

  // -------------------------------------------------------------------------
  // 4. Dealer record (status = APPROVED / FULLY_ACTIVE)
  // -------------------------------------------------------------------------
  const dealer = await prisma.dealer.upsert({
    where: { id: IDS.dealer },
    create: {
      id: IDS.dealer,
      userId: dealerUser.id,
      workspaceId: workspace.id,
      businessName: "Seed Motors LLC",
      licenseNumber: "SEED-LIC-001",
      phone: "555-000-0001",
      address: "1 Seed Street",
      city: "Testville",
      state: "TX",
      zip: "75001",
      applicationApproved: true,
      onboardingStatus: "APPROVED",
      accessState: "FULLY_ACTIVE",
      agreementSigned: true,
      agreementCompleted: true,
      complianceApproved: true,
      active: true,
    },
    update: {
      applicationApproved: true,
      onboardingStatus: "APPROVED",
      accessState: "FULLY_ACTIVE",
      active: true,
    },
  })
  console.log("[seed-deal] Dealer:", dealer.id)

  // -------------------------------------------------------------------------
  // 5. BuyerProfile
  // -------------------------------------------------------------------------
  const buyerProfile = await prisma.buyerProfile.upsert({
    where: { id: IDS.buyerProfile },
    create: {
      id: IDS.buyerProfile,
      userId: buyerUser.id,
      workspaceId: workspace.id,
      firstName: "Seed",
      lastName: "Buyer",
      phone: "555-000-0002",
      address: "2 Buyer Lane",
      city: "Testville",
      state: "TX",
      zip: "75001",
    },
    update: { workspaceId: workspace.id },
  })
  console.log("[seed-deal] BuyerProfile:", buyerProfile.id)

  // -------------------------------------------------------------------------
  // 6. Vehicle
  // -------------------------------------------------------------------------
  const vehicle = await prisma.vehicle.upsert({
    where: { vin: "SEEDVIN00000000001" },
    create: {
      id: IDS.vehicle,
      vin: "SEEDVIN00000000001",
      year: 2024,
      make: "Toyota",
      model: "Camry",
      trim: "XSE",
      bodyStyle: "Sedan",
      mileage: 5000,
      exteriorColor: "Midnight Black",
      interiorColor: "Black",
    },
    update: { year: 2024, make: "Toyota", model: "Camry" },
  })
  console.log("[seed-deal] Vehicle:", vehicle.id)

  // -------------------------------------------------------------------------
  // 7. InventoryItem
  // -------------------------------------------------------------------------
  const inventoryItem = await prisma.inventoryItem.upsert({
    where: { id: IDS.inventoryItem },
    create: {
      id: IDS.inventoryItem,
      dealerId: dealer.id,
      vehicleId: vehicle.id,
      workspaceId: workspace.id,
      priceCents: 3200000,
      vin: "SEEDVIN00000000001",
      year: 2024,
      make: "Toyota",
      model: "Camry",
      trim: "XSE",
      isNew: false,
      mileage: 5000,
      status: "AVAILABLE",
      source: "SEED",
    },
    update: { priceCents: 3200000, status: "AVAILABLE" },
  })
  console.log("[seed-deal] InventoryItem:", inventoryItem.id)

  // -------------------------------------------------------------------------
  // 8. Shortlist + ShortlistItem
  // -------------------------------------------------------------------------
  const shortlist = await prisma.shortlist.upsert({
    where: { id: IDS.shortlist },
    create: {
      id: IDS.shortlist,
      buyerId: buyerProfile.id,
      workspaceId: workspace.id,
      name: "Seed Shortlist",
    },
    update: {},
  })
  console.log("[seed-deal] Shortlist:", shortlist.id)

  await prisma.shortlistItem.upsert({
    where: {
      shortlistId_inventoryItemId: {
        shortlistId: shortlist.id,
        inventoryItemId: inventoryItem.id,
      },
    },
    create: {
      id: IDS.shortlistItem,
      shortlistId: shortlist.id,
      inventoryItemId: inventoryItem.id,
    },
    update: {},
  })

  // -------------------------------------------------------------------------
  // 9. Auction (ACTIVE)
  // -------------------------------------------------------------------------
  const now = new Date()
  const endsAt = new Date(now.getTime() + 48 * 60 * 60 * 1000)

  const auction = await prisma.auction.upsert({
    where: { id: IDS.auction },
    create: {
      id: IDS.auction,
      buyerId: buyerProfile.id,
      shortlistId: shortlist.id,
      workspaceId: workspace.id,
      status: "ACTIVE",
      startsAt: now,
      endsAt,
    },
    update: { status: "ACTIVE" },
  })
  console.log("[seed-deal] Auction:", auction.id)

  // -------------------------------------------------------------------------
  // 10. AuctionParticipant
  // -------------------------------------------------------------------------
  const participant = await prisma.auctionParticipant.upsert({
    where: {
      auctionId_dealerId: { auctionId: auction.id, dealerId: dealer.id },
    },
    create: {
      id: IDS.auctionParticipant,
      auctionId: auction.id,
      dealerId: dealer.id,
      workspaceId: workspace.id,
    },
    update: {},
  })
  console.log("[seed-deal] AuctionParticipant:", participant.id)

  // -------------------------------------------------------------------------
  // 11. AuctionOffer
  // -------------------------------------------------------------------------
  const auctionOffer = await prisma.auctionOffer.upsert({
    where: { id: IDS.auctionOffer },
    create: {
      id: IDS.auctionOffer,
      auctionId: auction.id,
      participantId: participant.id,
      inventoryItemId: inventoryItem.id,
      workspaceId: workspace.id,
      cashOtd: 31800.0,
      taxAmount: 2600.0,
      feesBreakdown: {
        docFee: 499,
        registration: 350,
        titleFee: 50,
        dealerFee: 299,
      },
    },
    update: { cashOtd: 31800.0 },
  })
  console.log("[seed-deal] AuctionOffer:", auctionOffer.id)

  // Financing option for the offer
  const existingFin = await prisma.auctionOfferFinancingOption.findFirst({
    where: { offerId: auctionOffer.id },
  })
  if (!existingFin) {
    await prisma.auctionOfferFinancingOption.create({
      data: {
        offerId: auctionOffer.id,
        apr: 6.9,
        termMonths: 60,
        downPayment: 3000,
        monthlyPayment: 514.0,
      },
    })
    console.log("[seed-deal] AuctionOfferFinancingOption created")
  }

  // -------------------------------------------------------------------------
  // 12. SelectedDeal
  // -------------------------------------------------------------------------
  const selectedDeal = await prisma.selectedDeal.upsert({
    where: { id: IDS.selectedDeal },
    create: {
      id: IDS.selectedDeal,
      buyerId: buyerProfile.id,
      auctionId: auction.id,
      offerId: auctionOffer.id,
      inventoryItemId: inventoryItem.id,
      dealerId: dealer.id,
      workspaceId: workspace.id,
      status: "PICKUP_SCHEDULED",
      cashOtd: 31800.0,
      taxAmount: 2600.0,
      feesBreakdown: {
        docFee: 499,
        registration: 350,
        titleFee: 50,
        dealerFee: 299,
      },
    },
    update: { status: "PICKUP_SCHEDULED" },
  })
  console.log("[seed-deal] SelectedDeal:", selectedDeal.id)

  // -------------------------------------------------------------------------
  // 13. ContractDocument + ContractShieldScan
  // -------------------------------------------------------------------------
  const contractDoc = await prisma.contractDocument.upsert({
    where: { id: IDS.contractDocument },
    create: {
      id: IDS.contractDocument,
      dealId: selectedDeal.id,
      dealerId: dealer.id,
      workspaceId: workspace.id,
      documentUrl: "https://storage.autolenis.test/seed-contract.pdf",
      documentType: "PURCHASE_AGREEMENT",
      version: 1,
    },
    update: {},
  })
  console.log("[seed-deal] ContractDocument:", contractDoc.id)

  const existingScan = await prisma.contractShieldScan.findUnique({
    where: { id: IDS.contractShieldScan },
  })
  if (!existingScan) {
    const scan = await prisma.contractShieldScan.create({
      data: {
        id: IDS.contractShieldScan,
        dealId: selectedDeal.id,
        dealerId: dealer.id,
        contractDocumentId: contractDoc.id,
        workspaceId: workspace.id,
        status: "PASSED",
        overallScore: 88,
        aprMatch: true,
        paymentMatch: true,
        otdMatch: true,
        junkFeesDetected: false,
      },
    })
    console.log("[seed-deal] ContractShieldScan:", scan.id)
  } else {
    console.log("[seed-deal] ContractShieldScan already exists, skipping")
  }

  // -------------------------------------------------------------------------
  // 14. PickupAppointment
  // -------------------------------------------------------------------------
  const qrToken = crypto.randomUUID()
  const existingPickup = await prisma.pickupAppointment.findUnique({
    where: { dealId: selectedDeal.id },
  })
  if (!existingPickup) {
    const pickup = await prisma.pickupAppointment.create({
      data: {
        id: IDS.pickupAppointment,
        dealId: selectedDeal.id,
        buyerId: buyerProfile.id,
        dealerId: dealer.id,
        workspaceId: workspace.id,
        status: "SCHEDULED",
        scheduledDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
        scheduledTime: "10:00 AM",
        qrCode: qrToken,
        qrCodeExpiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      },
    })
    console.log("[seed-deal] PickupAppointment:", pickup.id)
  } else {
    console.log("[seed-deal] PickupAppointment already exists, skipping")
  }

  // -------------------------------------------------------------------------
  // 15. MessageThread + Messages
  // -------------------------------------------------------------------------
  const thread = await prisma.messageThread.upsert({
    where: { id: IDS.messageThread },
    create: {
      id: IDS.messageThread,
      workspaceId: workspace.id,
      buyerId: buyerProfile.id,
      dealerId: dealer.id,
      dealId: selectedDeal.id,
      status: "ACTIVE",
    },
    update: {},
  })
  console.log("[seed-deal] MessageThread:", thread.id)

  const existingMsg = await prisma.message.findFirst({
    where: { threadId: thread.id },
  })
  if (!existingMsg) {
    await prisma.message.create({
      data: {
        threadId: thread.id,
        senderType: "DEALER",
        senderId: dealerUser.id,
        body: "Hello! I'm excited to assist you with your 2024 Toyota Camry purchase. Let me know if you have any questions.",
      },
    })
    await prisma.message.create({
      data: {
        threadId: thread.id,
        senderType: "BUYER",
        senderId: buyerUser.id,
        body: "Thanks! Can we confirm the pickup time for next week?",
      },
    })
    console.log("[seed-deal] Messages created")
  }

  // -------------------------------------------------------------------------
  // 16. AdminNotification
  // -------------------------------------------------------------------------
  const existingNotif = await prisma.adminNotification.findUnique({
    where: { id: IDS.adminNotification },
  })
  if (!existingNotif) {
    await prisma.adminNotification.create({
      data: {
        id: IDS.adminNotification,
        workspaceId: workspace.id,
        priority: "MEDIUM",
        category: "DEAL",
        type: "deal.status.changed",
        title: "Seed Deal Ready for Pickup",
        message: "Test deal SEED-001 has been scheduled for pickup.",
        entityType: "SelectedDeal",
        entityId: selectedDeal.id,
        ctaPath: `/admin/deals/${selectedDeal.id}`,
      },
    })
    console.log("[seed-deal] AdminNotification created")
  }

  console.log("[seed-deal] ✅ Seed complete.")
  console.log("[seed-deal] Summary:")
  console.log("  Workspace:", workspace.id)
  console.log("  Dealer User:", dealerUser.email)
  console.log("  Buyer User:", buyerUser.email)
  console.log("  Dealer:", dealer.businessName, "(", dealer.id, ")")
  console.log("  BuyerProfile:", buyerProfile.id)
  console.log("  Auction:", auction.id, "status:", auction.status)
  console.log("  AuctionOffer:", auctionOffer.id)
  console.log("  SelectedDeal:", selectedDeal.id, "status:", "PICKUP_SCHEDULED")
  console.log("  ContractDocument:", contractDoc.id)
  console.log("  MessageThread:", thread.id)
}

main()
  .catch((e) => {
    console.error("[seed-deal] ERROR:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
