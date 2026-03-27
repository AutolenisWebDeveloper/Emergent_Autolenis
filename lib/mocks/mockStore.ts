import type { SessionUser } from "@/lib/auth"
import { InventoryStatus } from "@/lib/constants/statuses"

const baseTimeline = {
  signedUp: "2026-01-03T16:00:00Z",
  requestSubmitted: "2026-01-03T17:00:00Z",
  prequalStarted: "2026-01-04T10:00:00Z",
  prequalified: "2026-01-04T16:00:00Z",
  docsUploaded: "2026-01-04T18:00:00Z",
  shortlist: "2026-01-05T16:00:00Z",
  auctionOpen: "2026-01-06T16:00:00Z",
  bidsReceived: "2026-01-07T16:00:00Z",
  offerSelected: "2026-01-07T18:00:00Z",
  selected: "2026-01-08T16:00:00Z",
  depositHeld: "2026-01-08T18:00:00Z",
  contractUploaded: "2026-01-09T10:00:00Z",
  contractShield: "2026-01-09T12:00:00Z",
  esignSent: "2026-01-09T14:00:00Z",
  contractSigned: "2026-01-09T16:00:00Z",
  funded: "2026-01-10T16:00:00Z",
  paymentRequested: "2026-01-10T18:00:00Z",
  paymentReceived: "2026-01-11T10:00:00Z",
  deliveryScheduled: "2026-01-14T16:00:00Z",
  deliveryConfirmed: "2026-01-15T10:00:00Z",
  completed: "2026-01-15T16:00:00Z",
} as const

const amounts = {
  msrpCents: 3_795_000,
  targetPriceCents: 3_450_000,
  winningBidCents: 3_435_000,
  dealerFeesCents: 45_000,
  serviceFeeCents: 89_900,
  escrowFeeCents: 25_000,
  depositCents: 100_000,
  affiliateCommissionCents: 75_000,
} as const

const finalPriceCents = amounts.winningBidCents + amounts.dealerFeesCents

let actionCounter = 0
const actionBaseTimestamp = new Date("2026-01-20T10:00:00Z").getTime()
const nextActionTimestamp = () => new Date(actionBaseTimestamp + actionCounter++ * 1000).toISOString()

export const mockDb: Record<string, any[]> = {
  users: [
    {
      id: "user_admin_001",
      email: "admin@autolenis.demo",
      role: "ADMIN",
      firstName: "Avery",
      lastName: "Admin",
      createdAt: baseTimeline.signedUp,
    },
    {
      id: "user_buyer_001",
      email: "testbuyer+001@autolenis.demo",
      role: "BUYER",
      firstName: "Jordan",
      lastName: "Ellis",
      createdAt: baseTimeline.signedUp,
      is_affiliate: false,
    },
    {
      id: "user_dealer_001",
      email: "inventory@northstar.demo",
      role: "DEALER",
      firstName: "Morgan",
      lastName: "Nguyen",
      createdAt: baseTimeline.signedUp,
    },
    {
      id: "user_dealer_002",
      email: "team@evergreen.demo",
      role: "DEALER",
      firstName: "Riley",
      lastName: "Ortiz",
      createdAt: baseTimeline.signedUp,
    },
    {
      id: "user_dealer_003",
      email: "winner@aurora.demo",
      role: "DEALER",
      firstName: "Harper",
      lastName: "Lee",
      createdAt: baseTimeline.signedUp,
    },
    {
      id: "user_affiliate_001",
      email: "partners@atlas.demo",
      role: "AFFILIATE",
      firstName: "Alex",
      lastName: "Morgan",
      createdAt: baseTimeline.signedUp,
      is_affiliate: true,
    },
  ],
  adminUsers: [
    {
      id: "admin_user_001",
      userId: "user_admin_001",
      name: "Avery Admin",
      role: "SUPER_ADMIN",
      createdAt: baseTimeline.signedUp,
    },
  ],
  buyerProfiles: [
    {
      id: "buyer_gold_001",
      userId: "user_buyer_001",
      firstName: "Jordan",
      lastName: "Ellis",
      email: "testbuyer+001@autolenis.demo",      phone: "(555) 210-2026",
      creditScore: 742,
      prequalStatus: "approved",
      affiliateId: "affiliate_gold_001",
      createdAt: baseTimeline.signedUp,
    },
  ],
  dealerProfiles: [
    {
      id: "dealer_gold_001",
      userId: "user_dealer_001",
      name: "Northstar Auto Group",
      rating: 4.7,
      location: "Austin, TX",
      city: "Austin",
      state: "TX",
      verified: true,
      active: true,
      integrityScore: 95,
      createdAt: "2025-10-15T08:00:00Z",
    },
    {
      id: "dealer_gold_002",
      userId: "user_dealer_002",
      name: "Evergreen Motors",
      rating: 4.5,
      location: "Dallas, TX",
      city: "Dallas",
      state: "TX",
      verified: true,
      active: true,
      integrityScore: 92,
      createdAt: "2025-09-01T08:00:00Z",
    },
    {
      id: "dealer_gold_003",
      userId: "user_dealer_003",
      name: "Aurora Auto Marketplace",
      rating: 4.8,
      location: "Phoenix, AZ",
      city: "Phoenix",
      state: "AZ",
      verified: true,
      active: true,
      integrityScore: 97,
      createdAt: "2025-11-20T08:00:00Z",
    },
  ],
  affiliateProfiles: [
    {
      id: "affiliate_gold_001",
      userId: "user_affiliate_001",
      name: "Atlas Auto Advisors",
      referralCode: "ATLAS-2026",
      commissionCents: amounts.affiliateCommissionCents,
      payoutStatus: "pending",
      status: "ACTIVE",
      totalEarnings: 125_000,
      pendingEarnings: amounts.affiliateCommissionCents,
      paidEarnings: 50_000,
      createdAt: baseTimeline.signedUp,
      bankDetails: {
        accountName: "Atlas Auto Advisors",
        bankName: "First National",
      },
    },
  ],
  carRequests: [
    {
      id: "req_gold_001",
      buyerId: "buyer_gold_001",
      status: "shortlisted",
      budgetCents: 4_200_000,
      createdAt: baseTimeline.shortlist,
    },
  ],
  prequals: [
    {
      id: "prequal_gold_001",
      buyerId: "buyer_gold_001",
      status: "approved",
      creditTier: "PRIME",
      maxOtdAmountCents: 4_200_000,
      minMonthlyPaymentCents: 55_000,
      maxMonthlyPaymentCents: 85_000,
      dtiRatio: 32.4,
      providerName: "MockPrequalProvider",
      createdAt: baseTimeline.prequalified,
      expiresAt: "2026-02-05T16:00:00Z",
    },
  ],
  vehicles: [
    {
      id: "vehicle_gold_001",
      year: 2024,
      make: "Honda",
      model: "Accord",
      trim: "Touring Hybrid",
      msrpCents: amounts.msrpCents,
      targetPriceCents: amounts.targetPriceCents,
    },
    {
      id: "vehicle_gold_002",
      year: 2024,
      make: "Toyota",
      model: "Camry",
      trim: "XSE",
      msrpCents: 3_650_000,
      targetPriceCents: 3_390_000,
    },
    {
      id: "vehicle_gold_003",
      year: 2025,
      make: "Hyundai",
      model: "Sonata",
      trim: "Limited",
      msrpCents: 3_575_000,
      targetPriceCents: 3_280_000,
    },
  ],
  inventoryItems: [
    {
      id: "inventory_gold_001",
      dealerId: "dealer_gold_003",
      workspaceId: "workspace_gold",
      stockNumber: "AUR-2026-01",
      priceCents: finalPriceCents,
      status: InventoryStatus.AVAILABLE,
      year: 2024,
      make: "Honda",
      model: "Accord",
      trim: "Touring Hybrid",
      vin: "1HGCV1F94MA000001",
    },
    {
      id: "inventory_gold_002",
      dealerId: "dealer_gold_001",
      workspaceId: "workspace_gold",
      stockNumber: "NOR-1122",
      priceCents: 3_490_000,
      status: InventoryStatus.AVAILABLE,
      year: 2024,
      make: "Toyota",
      model: "Camry",
      trim: "XSE",
      vin: "4T1BZ1HK7LU000002",
    },
    {
      id: "inventory_gold_003",
      dealerId: "dealer_gold_002",
      workspaceId: "workspace_gold",
      stockNumber: "EVE-3399",
      priceCents: 3_550_000,
      status: InventoryStatus.AVAILABLE,
      year: 2025,
      make: "Hyundai",
      model: "Sonata",
      trim: "Limited",
      vin: "5NPE24AF7LH000003",
    },
  ],
  shortlists: [
    {
      id: "shortlist_gold_001",
      buyerId: "buyer_gold_001",
      name: "Golden Deal Shortlist",
      createdAt: baseTimeline.shortlist,
      items: [
        {
          id: "shortlist_item_gold_001",
          inventoryItemId: "inventory_gold_001",
          notes: "Top choice for comfort and efficiency",
          isPrimary: true,
        },
      ],
    },
  ],
  auctions: [
    {
      id: "auc_gold_001",
      buyerId: "buyer_gold_001",
      status: "CLOSED",
      createdAt: baseTimeline.auctionOpen,
      endsAt: baseTimeline.bidsReceived,
      shortlistId: "shortlist_gold_001",
    },
  ],
  dealerInvites: [
    {
      id: "invite_gold_001",
      auctionId: "auc_gold_001",
      dealerId: "dealer_gold_001",
      status: "invited",
      invitedAt: baseTimeline.auctionOpen,
    },
    {
      id: "invite_gold_002",
      auctionId: "auc_gold_001",
      dealerId: "dealer_gold_002",
      status: "invited",
      invitedAt: baseTimeline.auctionOpen,
    },
    {
      id: "invite_gold_003",
      auctionId: "auc_gold_001",
      dealerId: "dealer_gold_003",
      status: "invited",
      invitedAt: baseTimeline.auctionOpen,
    },
  ],
  offers: [
    {
      id: "offer_gold_001",
      auctionId: "auc_gold_001",
      dealerId: "dealer_gold_001",
      bidPriceCents: 3_490_000,
      feesCents: amounts.dealerFeesCents,
      submittedAt: baseTimeline.bidsReceived,
    },
    {
      id: "offer_gold_002",
      auctionId: "auc_gold_001",
      dealerId: "dealer_gold_002",
      bidPriceCents: 3_520_000,
      feesCents: amounts.dealerFeesCents,
      submittedAt: baseTimeline.bidsReceived,
    },
    {
      id: "offer_gold_003",
      auctionId: "auc_gold_001",
      dealerId: "dealer_gold_003",
      bidPriceCents: amounts.winningBidCents,
      feesCents: amounts.dealerFeesCents,
      submittedAt: baseTimeline.bidsReceived,
    },
  ],
  selectedOffers: [
    {
      id: "sel_offer_gold_001",
      auctionId: "auc_gold_001",
      offerId: "offer_gold_003",
      dealerId: "dealer_gold_003",
      finalPriceCents,
      selectedAt: baseTimeline.selected,
    },
  ],
  deals: [
    {
      id: "deal_gold_001",
      buyerId: "buyer_gold_001",
      dealerId: "dealer_gold_003",
      auctionId: "auc_gold_001",
      offerId: "offer_gold_003",
      inventoryItemId: "inventory_gold_001",
      status: "COMPLETED",
      createdAt: baseTimeline.selected,
      updatedAt: baseTimeline.completed,
    },
  ],
  deposits: [
    {
      id: "deposit_gold_001",
      dealId: "deal_gold_001",
      buyerId: "buyer_gold_001",
      amountCents: amounts.depositCents,
      status: "held",
      createdAt: baseTimeline.depositHeld,
    },
  ],
  contracts: [
    {
      id: "ctr_gold_001",
      dealId: "deal_gold_001",
      status: "signed",
      signedAt: baseTimeline.contractSigned,
    },
  ],
  insuranceQuotes: [
    {
      id: "quote_gold_001",
      dealId: "deal_gold_001",
      carrier: "Progressive",
      productName: "Full Coverage 100/300",
      monthlyPremium: 125.00,
      status: "ACTIVE",
      expiresAt: "2026-02-05T16:00:00Z",
    },
    {
      id: "quote_gold_002",
      dealId: "deal_gold_001",
      carrier: "State Farm",
      productName: "Premium Coverage Plus",
      monthlyPremium: 139.00,
      status: "ACTIVE",
      expiresAt: "2026-02-05T16:00:00Z",
    },
  ],
  insurancePolicies: [
    {
      id: "policy_gold_001",
      dealId: "deal_gold_001",
      type: "EXTERNAL",
      carrier: "Progressive",
      policyNumber: "POL-GOLD-001",
      status: "ACTIVE",
      startDate: baseTimeline.contractSigned,
      endDate: "2026-07-09T16:00:00Z",
      isVerified: true,
      documentUrl: "https://cdn.autolenis.com/policies/ctr_gold_001.pdf",
    },
  ],
  insuranceEvents: [
    {
      id: "ins_event_gold_001",
      dealId: "deal_gold_001",
      type: "policy_bound",
      provider: "AutoLenis Partner Network",
      timestamp: baseTimeline.contractSigned,
      details: "Insurance policy bound for Golden Deal",
    },
  ],
  insuranceDocRequests: [
    {
      id: "ins_doc_req_gold_001",
      dealId: "deal_gold_001",
      type: "proof_of_insurance",
      status: "REQUESTED",
      notes: "Provide proof of active coverage",
      createdAt: baseTimeline.contractSigned,
    },
  ],
  contractLineItems: [
    {
      id: "contract_line_gold_001",
      contractId: "ctr_gold_001",
      label: "Vehicle Price",
      amountCents: amounts.winningBidCents,
    },
    {
      id: "contract_line_gold_002",
      contractId: "ctr_gold_001",
      label: "Dealer Fees",
      amountCents: amounts.dealerFeesCents,
    },
  ],
  contractFlags: [
    {
      id: "contract_flag_gold_001",
      contractId: "ctr_gold_001",
      type: "DISCLOSURE_ACK",
      status: "resolved",
      createdAt: baseTimeline.contractSigned,
    },
  ],
  esignEnvelopes: [
    {
      id: "esign_gold_001",
      contractId: "ctr_gold_001",
      status: "completed",
      completedAt: baseTimeline.contractSigned,
    },
  ],
  fundings: [
    {
      id: "fund_gold_001",
      dealId: "deal_gold_001",
      lender: "AutoLenis Capital",
      apr: 4.9,
      termMonths: 60,
      monthlyPaymentCents: 64_000,
      status: "funded",
      fundedAt: baseTimeline.funded,
    },
  ],
  deliveries: [
    {
      id: "del_gold_001",
      dealId: "deal_gold_001",
      status: "scheduled",
      scheduledAt: baseTimeline.deliveryScheduled,
      location: "Dallas, TX",
    },
  ],
  dealStatusHistory: [
    { id: "deal_status_001", dealId: "deal_gold_001", status: "REQUEST_SUBMITTED", createdAt: baseTimeline.requestSubmitted },
    { id: "deal_status_002", dealId: "deal_gold_001", status: "PREQUAL_STARTED", createdAt: baseTimeline.prequalStarted },
    { id: "deal_status_003", dealId: "deal_gold_001", status: "PREQUAL_APPROVED", createdAt: baseTimeline.prequalified },
    { id: "deal_status_004", dealId: "deal_gold_001", status: "DOCS_UPLOADED", createdAt: baseTimeline.docsUploaded },
    { id: "deal_status_005", dealId: "deal_gold_001", status: "SHORTLIST_CREATED", createdAt: baseTimeline.shortlist },
    { id: "deal_status_006", dealId: "deal_gold_001", status: "AUCTION_STARTED", createdAt: baseTimeline.auctionOpen },
    { id: "deal_status_007", dealId: "deal_gold_001", status: "OFFERS_RECEIVED", createdAt: baseTimeline.bidsReceived },
    { id: "deal_status_008", dealId: "deal_gold_001", status: "OFFER_SELECTED", createdAt: baseTimeline.offerSelected },
    { id: "deal_status_009", dealId: "deal_gold_001", status: "DEAL_SELECTED", createdAt: baseTimeline.selected },
    { id: "deal_status_010", dealId: "deal_gold_001", status: "DEPOSIT_PAID", createdAt: baseTimeline.depositHeld },
    { id: "deal_status_011", dealId: "deal_gold_001", status: "CONTRACT_UPLOADED", createdAt: baseTimeline.contractUploaded },
    { id: "deal_status_012", dealId: "deal_gold_001", status: "CONTRACT_SHIELD_COMPLETE", createdAt: baseTimeline.contractShield },
    { id: "deal_status_013", dealId: "deal_gold_001", status: "ESIGN_SENT", createdAt: baseTimeline.esignSent },
    { id: "deal_status_014", dealId: "deal_gold_001", status: "ESIGN_COMPLETED", createdAt: baseTimeline.contractSigned },
    { id: "deal_status_015", dealId: "deal_gold_001", status: "FUNDING_STARTED", createdAt: baseTimeline.funded },
    { id: "deal_status_016", dealId: "deal_gold_001", status: "PAYMENT_REQUESTED", createdAt: baseTimeline.paymentRequested },
    { id: "deal_status_017", dealId: "deal_gold_001", status: "BUYER_PAYMENT_RECEIVED", createdAt: baseTimeline.paymentReceived },
    { id: "deal_status_018", dealId: "deal_gold_001", status: "DELIVERY_SCHEDULED", createdAt: baseTimeline.deliveryScheduled },
    { id: "deal_status_019", dealId: "deal_gold_001", status: "DELIVERY_CONFIRMED", createdAt: baseTimeline.deliveryConfirmed },
    { id: "deal_status_020", dealId: "deal_gold_001", status: "DEAL_COMPLETED", createdAt: baseTimeline.completed },
  ],
  ledgerEntries: [
    {
      id: "ledger_dep_gold_001",
      type: "deposit",
      amount: amounts.depositCents,
      dealId: "deal_gold_001",
      dealerId: null,
      affiliateId: null,
      createdAt: baseTimeline.depositHeld,
      status: "posted",
    },
    {
      id: "ledger_fee_gold_001",
      type: "fee",
      amount: amounts.serviceFeeCents,
      dealId: "deal_gold_001",
      dealerId: null,
      affiliateId: null,
      createdAt: baseTimeline.selected,
      status: "posted",
    },
    {
      id: "ledger_aff_payout_gold_001",
      type: "payout",
      amount: amounts.affiliateCommissionCents,
      dealId: "deal_gold_001",
      dealerId: null,
      affiliateId: "affiliate_gold_001",
      createdAt: baseTimeline.funded,
      status: "pending",
    },
    {
      id: "ledger_dealer_payout_gold_001",
      type: "payout",
      amount: finalPriceCents,
      dealId: "deal_gold_001",
      dealerId: "dealer_gold_003",
      affiliateId: null,
      createdAt: baseTimeline.completed,
      status: "posted",
    },
    {
      id: "ledger_refund_gold_001",
      type: "refund",
      amount: 15_000,
      dealId: "deal_gold_001",
      dealerId: null,
      affiliateId: null,
      createdAt: baseTimeline.completed,
      status: "pending",
    },
    {
      id: "ledger_payment_request_gold_001",
      type: "fee",
      amount: amounts.escrowFeeCents,
      dealId: "deal_gold_001",
      dealerId: null,
      affiliateId: null,
      createdAt: baseTimeline.selected,
      status: "pending",
    },
  ],
  payouts: [
    {
      id: "payout_aff_gold_001",
      dealId: "deal_gold_001",
      affiliateId: "affiliate_gold_001",
      amountCents: amounts.affiliateCommissionCents,
      status: "PENDING",
      requestedAt: baseTimeline.funded,
    },
    {
      id: "payout_aff_gold_002",
      dealId: "deal_gold_001",
      affiliateId: "affiliate_gold_001",
      amountCents: 50000,
      status: "COMPLETED",
      paymentMethod: "bank_transfer",
      paymentId: "TXN-12345",
      requestedAt: baseTimeline.completed,
      paidAt: baseTimeline.completed,
    },
    {
      id: "payout_dealer_gold_001",
      dealId: "deal_gold_001",
      dealerId: "dealer_gold_003",
      amountCents: finalPriceCents,
      status: "COMPLETED",
      requestedAt: baseTimeline.completed,
      paidAt: baseTimeline.completed,
    },
  ],
  affiliateClicks: [
    {
      id: "click_001",
      affiliateId: "affiliate_gold_001",
      ipAddress: "203.0.113.10",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      referer: "https://google.com/search?q=car+buying+service",
      landingPage: "/ref/ATLAS-2026",
      clickedAt: baseTimeline.signedUp,
    },
    {
      id: "click_002",
      affiliateId: "affiliate_gold_001",
      ipAddress: "198.51.100.20",
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)",
      referer: "https://facebook.com",
      landingPage: "/ref/ATLAS-2026?utm_source=facebook&utm_medium=social",
      clickedAt: baseTimeline.prequalStarted,
    },
    {
      id: "click_003",
      affiliateId: "affiliate_gold_001",
      ipAddress: "192.0.2.30",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      referer: null,
      landingPage: "/ref/ATLAS-2026",
      clickedAt: baseTimeline.shortlist,
    },
  ],
  affiliateDocuments: [
    {
      id: "doc_001",
      affiliateId: "affiliate_gold_001",
      type: "W9",
      fileName: "w9_atlas_auto_2026.pdf",
      filePath: "/documents/affiliates/affiliate_gold_001/w9_atlas_auto_2026.pdf",
      fileSize: 245000,
      mimeType: "application/pdf",
      status: "APPROVED",
      createdAt: baseTimeline.signedUp,
      updatedAt: baseTimeline.prequalStarted,
    },
    {
      id: "doc_002",
      affiliateId: "affiliate_gold_001",
      type: "BANK",
      fileName: "bank_verification.pdf",
      filePath: "/documents/affiliates/affiliate_gold_001/bank_verification.pdf",
      fileSize: 128000,
      mimeType: "application/pdf",
      status: "PENDING",
      createdAt: baseTimeline.prequalStarted,
      updatedAt: baseTimeline.prequalStarted,
    },
  ],
  affiliateAuditLogs: [
    {
      id: "audit_aff_001",
      action: "AFFILIATE_CREATED",
      userId: "user_admin_001",
      details: { entityId: "affiliate_gold_001", entityType: "AFFILIATE", referralCode: "ATLAS-2026" },
      createdAt: baseTimeline.signedUp,
    },
    {
      id: "audit_aff_002",
      action: "AFFILIATE_STATUS_ACTIVE",
      userId: "user_admin_001",
      details: { entityId: "affiliate_gold_001", entityType: "AFFILIATE", newStatus: "ACTIVE" },
      createdAt: baseTimeline.prequalStarted,
    },
    {
      id: "audit_aff_003",
      action: "DOCUMENT_APPROVED",
      userId: "user_admin_001",
      details: { entityId: "affiliate_gold_001", entityType: "AFFILIATE", documentType: "W9" },
      createdAt: baseTimeline.prequalified,
    },
  ],
  refunds: [
    {
      id: "refund_gold_001",
      dealId: "deal_gold_001",
      buyerId: "buyer_gold_001",
      amountCents: 15_000,
      status: "PENDING",
      reason: "Delivery schedule adjustment",
      createdAt: baseTimeline.completed,
    },
  ],
  depositRequests: [
    {
      id: "depreq_gold_001",
      buyerId: "buyer_gold_001",
      buyerName: "Jordan Ellis",
      buyerEmail: "testbuyer+001@autolenis.demo",
      dealId: "deal_gold_001",
      amount: 9900,
      notes: "Auction deposit for Honda Accord",
      dueDate: "2026-02-01T00:00:00Z",
      status: "REQUESTED",
      createdBy: "user_admin_001",
      createdAt: baseTimeline.depositHeld,
    },
  ],
  conciergeFeeRequests: [
    {
      id: "cfreq_gold_001",
      buyerId: "buyer_gold_001",
      buyerName: "Jordan Ellis",
      buyerEmail: "testbuyer+001@autolenis.demo",
      dealId: "deal_gold_001",
      amount: 49900,
      notes: "Concierge fee for Honda Accord deal",
      status: "REQUESTED",
      createdBy: "user_admin_001",
      createdAt: baseTimeline.selected,
    },
  ],
  refundRecords: [
    {
      id: "ref_gold_001",
      buyerId: "buyer_gold_001",
      buyerName: "Jordan Ellis",
      buyerEmail: "testbuyer+001@autolenis.demo",
      relatedPaymentId: "deposit_gold_001",
      relatedPaymentType: "deposit",
      amount: 9900,
      reason: "Buyer cancelled auction",
      status: "SUCCEEDED",
      createdBy: "user_admin_001",
      createdAt: baseTimeline.completed,
    },
  ],
  paymentRequests: [
    {
      id: "payreq_gold_001",
      dealId: "deal_gold_001",
      buyerId: "buyer_gold_001",
      amountCents: amounts.escrowFeeCents,
      status: "REQUESTED",
      reason: "Escrow fee",
      createdAt: baseTimeline.selected,
      receivedAt: null,
    },
  ],
  notifications: [
    {
      id: "notif_gold_001",
      userId: "user_buyer_001",
      title: "Deal Completed",
      body: "Your Golden Deal has been completed and delivery is scheduled.",
      createdAt: baseTimeline.completed,
    },
    {
      id: "notif_gold_002",
      userId: "user_affiliate_001",
      title: "Affiliate payout queued",
      body: "Your payout is queued for deal_gold_001.",
      createdAt: baseTimeline.funded,
    },
  ],
  emailEvents: [
    {
      id: "email_gold_001",
      to: "testbuyer+001@autolenis.demo",
      subject: "Your AutoLenis deal is complete",
      createdAt: baseTimeline.completed,
      status: "sent",
    },
    {
      id: "email_gold_002",
      to: "partners@atlas.demo",
      subject: "Affiliate payout queued",
      createdAt: baseTimeline.funded,
      status: "sent",
    },
  ],
  dealDocuments: [
    {
      id: "doc_gold_001",
      ownerUserId: "user_buyer_001",
      dealId: "deal_gold_001",
      type: "ID",
      fileName: "drivers-license.pdf",
      mimeType: "application/pdf",
      fileSize: 204800,
      fileUrl: "mock://documents/ws_test_001/user_buyer_001/deal_gold_001/drivers-license.pdf",
      storagePath: "ws_test_001/user_buyer_001/deal_gold_001/drivers-license.pdf",
      status: "APPROVED",
      rejectionReason: null,
      requestId: null,
      workspaceId: "ws_test_001",
      createdAt: baseTimeline.docsUploaded,
      updatedAt: baseTimeline.docsUploaded,
    },
    {
      id: "doc_gold_002",
      ownerUserId: "user_buyer_001",
      dealId: "deal_gold_001",
      type: "INSURANCE_PROOF",
      fileName: "insurance-card.jpg",
      mimeType: "image/jpeg",
      fileSize: 102400,
      fileUrl: "mock://documents/ws_test_001/user_buyer_001/deal_gold_001/insurance-card.jpg",
      storagePath: "ws_test_001/user_buyer_001/deal_gold_001/insurance-card.jpg",
      status: "UPLOADED",
      rejectionReason: null,
      requestId: null,
      workspaceId: "ws_test_001",
      createdAt: baseTimeline.docsUploaded,
      updatedAt: baseTimeline.docsUploaded,
    },
  ],
}

const getUserByRole = (role: SessionUser["role"]) =>
  mockDb.users.find((user) => user.role === role) || mockDb.users[1]

const getVehicleById = (id: string) => mockDb.vehicles.find((vehicle) => vehicle.id === id)
const getInventoryById = (id: string) => mockDb.inventoryItems.find((item) => item.id === id)
const getDealerById = (id: string) => mockDb.dealerProfiles.find((dealer) => dealer.id === id) || mockDb.dealerProfiles.find((dealer) => dealer.userId === id)
const getBuyerProfile = (id: string) => mockDb.buyerProfiles.find((buyer) => buyer.id === id)
const getAffiliateProfile = (id: string) => mockDb.affiliateProfiles.find((affiliate) => affiliate.id === id)
const getDealById = (id: string) => mockDb.deals.find((deal) => deal.id === id)
const getAuctionById = (id: string) => mockDb.auctions.find((auction) => auction.id === id)
const getRequestById = (id: string) => mockDb.carRequests.find((request) => request.id === id)
const getContractByDealId = (dealId: string) => mockDb.contracts.find((contract) => contract.dealId === dealId)
const getBuyerUser = (buyerId: string) => {
  const buyer = getBuyerProfile(buyerId)
  return buyer ? mockDb.users.find((user) => user.id === buyer.userId) : undefined
}
const getDealerUser = (dealerId: string) => {
  const dealer = getDealerById(dealerId)
  return dealer ? mockDb.users.find((user) => user.id === dealer.userId) : undefined
}
const getNextShortlistItemId = () =>
  `shortlist_item_${mockDb.shortlists.reduce((sum, shortlist) => sum + (shortlist.items?.length || 0), 0) + 1}`

const appendNotification = (userId: string, title: string, body: string) => {
  mockDb.notifications.push({
    id: `notif_${mockDb.notifications.length + 1}`,
    userId,
    title,
    body,
    createdAt: nextActionTimestamp(),
  })
}

const appendEmailEvent = (to: string, subject: string) => {
  mockDb.emailEvents.push({
    id: `email_${mockDb.emailEvents.length + 1}`,
    to,
    subject,
    createdAt: nextActionTimestamp(),
    status: "sent",
  })
}

const appendDealStatus = (dealId: string, status: string) => {
  mockDb.dealStatusHistory.push({
    id: `deal_status_${mockDb.dealStatusHistory.length + 1}`,
    dealId,
    status,
    createdAt: nextActionTimestamp(),
  })
}

const appendLedgerEntry = (entry: Omit<(typeof mockDb.ledgerEntries)[number], "id" | "createdAt">) => {
  const newEntry = {
    id: `ledger_${mockDb.ledgerEntries.length + 1}`,
    createdAt: nextActionTimestamp(),
    ...entry,
  }
  mockDb.ledgerEntries.push(newEntry)
  return newEntry
}

const appendInsuranceEvent = (dealId: string, type: string, details: string) => {
  mockDb.insuranceEvents.push({
    id: `ins_event_${mockDb.insuranceEvents.length + 1}`,
    dealId,
    type,
    provider: "AutoLenis Partner Network",
    timestamp: nextActionTimestamp(),
    details,
  })
}

export const mockActions = {
  submitRequest(reqId: string) {
    let request = getRequestById(reqId)
    const buyerId = request?.buyerId || mockDb.buyerProfiles[0].id
    if (!request) {
      request = {
        id: reqId,
        buyerId,
        status: "submitted",
        budgetCents: 4_200_000,
        createdAt: nextActionTimestamp(),
      }
      mockDb.carRequests.push(request)
    } else {
      request.status = "submitted"
    }

    const deal = mockDb.deals.find((item) => item.buyerId === buyerId)
    if (deal) {
      appendDealStatus(deal.id, "REQUEST_SUBMITTED")
    }

    const buyerUser = getBuyerUser(buyerId)
    if (buyerUser) {
      appendNotification(buyerUser.id, "Request submitted", `Your request ${reqId} was submitted.`)
      appendEmailEvent(buyerUser.email, "Request submitted")
    }
    return request
  },
  runPrequal(reqId: string) {
    const request = getRequestById(reqId)
    const buyerId = request?.buyerId || mockDb.buyerProfiles[0].id
    let prequal = mockDb.prequals.find((item) => item.buyerId === buyerId)
    const createdAt = nextActionTimestamp()
    if (!prequal) {
      const expiresAt = new Date(new Date(createdAt).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
      prequal = {
        id: `prequal_${mockDb.prequals.length + 1}`,
        buyerId,
        status: "approved",
        creditTier: "PRIME",
        maxOtdAmountCents: 4_200_000,
        minMonthlyPaymentCents: 55_000,
        maxMonthlyPaymentCents: 85_000,
        dtiRatio: 32.4,
        providerName: "MockPrequalProvider",
        createdAt,
        expiresAt,
      }
      mockDb.prequals.push(prequal)
    } else {
      prequal.status = "approved"
      prequal.createdAt = createdAt
    }

    const deal = mockDb.deals.find((item) => item.buyerId === buyerId)
    if (deal) {
      appendDealStatus(deal.id, "PREQUAL_STARTED")
      appendDealStatus(deal.id, "PREQUAL_APPROVED")
    }

    const buyerUser = getBuyerUser(buyerId)
    if (buyerUser) {
      appendNotification(buyerUser.id, "Pre-qualification complete", "Your pre-qualification is approved.")
      appendEmailEvent(buyerUser.email, "Pre-qualification approved")
    }
    return prequal
  },
  createShortlist(reqId: string) {
    const request = getRequestById(reqId)
    const buyerId = request?.buyerId || mockDb.buyerProfiles[0].id
    if (request) {
      request.status = "shortlisted"
    }

    let shortlist = mockDb.shortlists.find((item) => item.buyerId === buyerId)
    if (!shortlist) {
      shortlist = {
        id: `shortlist_${mockDb.shortlists.length + 1}`,
        buyerId,
        name: "Preferred Vehicles",
        createdAt: nextActionTimestamp(),
        items: [
          {
            id: getNextShortlistItemId(),
            inventoryItemId: mockDb.inventoryItems[0]?.id,
            notes: "Primary selection",
            isPrimary: true,
          },
        ].filter((item) => item.inventoryItemId),
      }
      mockDb.shortlists.push(shortlist)
    }

    const deal = mockDb.deals.find((item) => item.buyerId === buyerId)
    if (deal) {
      appendDealStatus(deal.id, "SHORTLIST_CREATED")
    }

    const buyerUser = getBuyerUser(buyerId)
    if (buyerUser) {
      appendNotification(buyerUser.id, "Shortlist created", "We saved your vehicle shortlist.")
      appendEmailEvent(buyerUser.email, "Shortlist created")
    }
    return shortlist
  },
  selectVehicle(vehicleId: string) {
    const inventoryItem = mockDb.inventoryItems.find((item) => item.vin === vehicleId || item.id === vehicleId) || mockDb.inventoryItems[0]
    const shortlist = mockDb.shortlists[0]
    if (shortlist && inventoryItem) {
      shortlist.items = shortlist.items.map((item: any) => ({
        ...item,
        isPrimary: item.inventoryItemId === inventoryItem.id,
      }))
      if (!shortlist.items.some((item: any) => item.inventoryItemId === inventoryItem.id)) {
        shortlist.items.push({
          id: getNextShortlistItemId(),
          inventoryItemId: inventoryItem.id,
          notes: "Selected vehicle",
          isPrimary: true,
        })
      }
    }

    const deal = mockDb.deals[0]
    if (deal) {
      appendDealStatus(deal.id, "SHORTLIST_CREATED")
    }
    return inventoryItem
  },
  generateDealerOffers(auctionId: string) {
    const auction = getAuctionById(auctionId)
    if (!auction) return []
    const existing = mockDb.offers.filter((offer) => offer.auctionId === auctionId)
    if (existing.length) return existing

    const invitedDealers = mockDb.dealerInvites
      .filter((invite) => invite.auctionId === auctionId)
      .map((invite) => invite.dealerId)
    const dealers = invitedDealers.length ? invitedDealers : mockDb.dealerProfiles.map((dealer) => dealer.id)
    const offers = dealers.map((dealerId, index) => {
      const bidPriceCents = dealerId === "dealer_gold_003" ? amounts.winningBidCents : amounts.winningBidCents + (index + 1) * 15000
      return {
        id: `offer_${mockDb.offers.length + index + 1}`,
        auctionId,
        dealerId,
        bidPriceCents,
        feesCents: amounts.dealerFeesCents,
        submittedAt: nextActionTimestamp(),
      }
    })
    mockDb.offers.push(...offers)

    const deal = mockDb.deals.find((item) => item.auctionId === auctionId)
    if (deal) {
      appendDealStatus(deal.id, "OFFERS_RECEIVED")
    }
    return offers
  },
  closeAuction(auctionId: string) {
    const auction = getAuctionById(auctionId)
    if (!auction) return null
    auction.status = "CLOSED"
    auction.endsAt = nextActionTimestamp()

    const deal = mockDb.deals.find((item) => item.auctionId === auctionId)
    if (deal) {
      appendDealStatus(deal.id, "OFFERS_RECEIVED")
    }
    return auction
  },
  chooseOffer(offerId: string) {
    const offer = mockDb.offers.find((item) => item.id === offerId)
    if (!offer) return null

    let selectedOffer = mockDb.selectedOffers.find((item) => item.offerId === offerId)
    if (!selectedOffer) {
      selectedOffer = {
        id: `sel_offer_${mockDb.selectedOffers.length + 1}`,
        auctionId: offer.auctionId,
        offerId,
        dealerId: offer.dealerId,
        finalPriceCents: offer.bidPriceCents + offer.feesCents,
        selectedAt: nextActionTimestamp(),
      }
      mockDb.selectedOffers.push(selectedOffer)
    }

    let deal = mockDb.deals.find((item) => item.auctionId === offer.auctionId)
    if (!deal) {
      deal = {
        id: "deal_gold_001",
        buyerId: mockDb.buyerProfiles[0].id,
        dealerId: offer.dealerId,
        auctionId: offer.auctionId,
        offerId,
        inventoryItemId: mockDb.inventoryItems[0]?.id,
        status: "DEALER_SELECTED",
        createdAt: nextActionTimestamp(),
        updatedAt: nextActionTimestamp(),
      }
      mockDb.deals.push(deal)
    } else if (deal.status !== "COMPLETED") {
      deal.status = "DEALER_SELECTED"
      deal.offerId = offerId
      deal.dealerId = offer.dealerId
      deal.updatedAt = nextActionTimestamp()
    }

    appendDealStatus(deal.id, "OFFER_SELECTED")
    appendDealStatus(deal.id, "DEAL_SELECTED")

    const buyerUser = getBuyerUser(deal.buyerId)
    if (buyerUser) {
      appendNotification(buyerUser.id, "Offer selected", `You selected offer ${offerId}.`)
      appendEmailEvent(buyerUser.email, "Offer selected")
    }

    return { deal, selectedOffer }
  },
  payDeposit(dealId: string) {
    let deposit = mockDb.deposits.find((item) => item.dealId === dealId)
    if (!deposit) {
      const deal = getDealById(dealId) || mockDb.deals[0]
      deposit = {
        id: `deposit_${mockDb.deposits.length + 1}`,
        dealId,
        buyerId: deal?.buyerId || mockDb.buyerProfiles[0].id,
        amountCents: amounts.depositCents,
        status: "held",
        createdAt: nextActionTimestamp(),
      }
      mockDb.deposits.push(deposit)
    } else {
      deposit.status = "held"
    }

    const ledgerEntry = mockDb.ledgerEntries.find((entry) => entry.type === "deposit" && entry.dealId === dealId)
    if (!ledgerEntry) {
      appendLedgerEntry({
        type: "deposit",
        amount: deposit.amountCents,
        dealId,
        dealerId: null,
        affiliateId: null,
        status: "posted",
      })
    }

    appendDealStatus(dealId, "DEPOSIT_PAID")

    const buyerUser = getBuyerUser(deposit.buyerId)
    if (buyerUser) {
      appendNotification(buyerUser.id, "Deposit received", `Deposit received for ${dealId}.`)
      appendEmailEvent(buyerUser.email, "Deposit received")
    }
    return deposit
  },
  uploadContract(dealId: string) {
    let contract = getContractByDealId(dealId)
    if (!contract) {
      contract = {
        id: `ctr_${mockDb.contracts.length + 1}`,
        dealId,
        status: "uploaded",
        signedAt: null,
      }
      mockDb.contracts.push(contract)
    } else {
      contract.status = "uploaded"
    }

    appendDealStatus(dealId, "CONTRACT_UPLOADED")
    return contract
  },
  esign(dealId: string) {
    const contract = getContractByDealId(dealId) || mockActions.uploadContract(dealId)
    contract.status = "signed"
    contract.signedAt = nextActionTimestamp()

    let envelope = mockDb.esignEnvelopes.find((item) => item.contractId === contract.id)
    if (!envelope) {
      envelope = {
        id: `esign_${mockDb.esignEnvelopes.length + 1}`,
        contractId: contract.id,
        status: "completed",
        completedAt: contract.signedAt,
      }
      mockDb.esignEnvelopes.push(envelope)
    } else {
      envelope.status = "completed"
      envelope.completedAt = contract.signedAt
    }

    appendDealStatus(dealId, "ESIGN_COMPLETED")
    return { contract, envelope }
  },
  confirmDelivery(dealId: string) {
    let delivery = mockDb.deliveries.find((item) => item.dealId === dealId)
    if (!delivery) {
      delivery = {
        id: `del_${mockDb.deliveries.length + 1}`,
        dealId,
        status: "completed",
        scheduledAt: nextActionTimestamp(),
        location: "Austin, TX",
      }
      mockDb.deliveries.push(delivery)
    } else {
      delivery.status = "completed"
    }

    const deal = getDealById(dealId)
    if (deal) {
      deal.status = "COMPLETED"
      deal.updatedAt = nextActionTimestamp()
    }
    appendDealStatus(dealId, "DEAL_COMPLETED")
    return delivery
  },
  generateContractShield(contractId: string) {
    const existing = mockDb.contractFlags.filter((flag) => flag.contractId === contractId)
    if (existing.length) return existing

    const flags = [
      {
        id: `contract_flag_${mockDb.contractFlags.length + 1}`,
        contractId,
        type: "DISCLOSURE_ACK",
        status: "resolved",
        createdAt: nextActionTimestamp(),
      },
      {
        id: `contract_flag_${mockDb.contractFlags.length + 2}`,
        contractId,
        type: "LIEN_CHECK",
        status: "clear",
        createdAt: nextActionTimestamp(),
      },
    ]
    mockDb.contractFlags.push(...flags)
    return flags
  },
  queueDealerPayout(dealerId: string, dealId: string, amount: number) {
    const payout = {
      id: `payout_dealer_${mockDb.payouts.length + 1}`,
      dealerId,
      dealId,
      amountCents: amount,
      status: "PENDING",
      requestedAt: nextActionTimestamp(),
    }
    mockDb.payouts.push(payout)
    appendLedgerEntry({
      type: "payout",
      amount,
      dealId,
      dealerId,
      affiliateId: null,
      status: "pending",
    })
    appendDealStatus(dealId, "dealer_payout_queued")

    const dealerUser = getDealerUser(dealerId)
    if (dealerUser) {
      appendNotification(dealerUser.id, "Dealer payout queued", `Payout queued for ${dealId}.`)
      appendEmailEvent(dealerUser.email, "Dealer payout queued")
    }
    return payout
  },
  queueAffiliatePayout(affiliateId: string, dealId: string, amount: number) {
    const payout = {
      id: `payout_aff_${mockDb.payouts.length + 1}`,
      affiliateId,
      dealId,
      amountCents: amount,
      status: "PENDING",
      requestedAt: nextActionTimestamp(),
    }
    mockDb.payouts.push(payout)
    appendLedgerEntry({
      type: "payout",
      amount,
      dealId,
      dealerId: null,
      affiliateId,
      status: "pending",
    })
    appendDealStatus(dealId, "affiliate_payout_queued")

    const affiliate = getAffiliateProfile(affiliateId)
    const user = mockDb.users.find((u) => u.id === affiliate?.userId)
    if (user) {
      appendNotification(user.id, "Affiliate payout queued", `Payout queued for ${dealId}.`)
      appendEmailEvent(user.email, "Affiliate payout queued")
    }
    return payout
  },
  processAffiliatePayout(payoutId: string) {
    return mockActions.approveAffiliatePayout(payoutId)
  },
  approveAffiliatePayout(payoutId: string) {
    const payout = mockDb.payouts.find((item) => item.id === payoutId)
    if (!payout) return null
    payout.status = "COMPLETED"
    payout.paidAt = nextActionTimestamp()

    const ledger = mockDb.ledgerEntries.find(
      (entry) => entry.type === "payout" && entry.affiliateId === payout.affiliateId && entry.dealId === payout.dealId,
    )
    if (ledger) {
      ledger.status = "posted"
    }

    appendDealStatus(payout.dealId, "affiliate_payout_approved")
    const affiliateUser = mockDb.users.find((u) => u.id === getAffiliateProfile(payout.affiliateId)?.userId)
    if (affiliateUser) {
      appendNotification(affiliateUser.id, "Affiliate payout approved", `Payout ${payoutId} approved.`)
      appendEmailEvent(affiliateUser.email, "Affiliate payout approved")
    }
    return payout
  },
  createBuyerRefund(dealId: string, buyerId: string, amount: number, reason: string) {
    const refund = {
      id: `refund_${mockDb.refunds.length + 1}`,
      dealId,
      buyerId,
      amountCents: amount,
      status: "PENDING",
      reason,
      createdAt: nextActionTimestamp(),
    }
    mockDb.refunds.push(refund)
    appendLedgerEntry({
      type: "refund",
      amount,
      dealId,
      dealerId: null,
      affiliateId: null,
      status: "pending",
    })
    appendDealStatus(dealId, "refund_requested")

    const buyerUser = mockDb.users.find((u) => u.id === getBuyerProfile(buyerId)?.userId)
    if (buyerUser) {
      appendNotification(buyerUser.id, "Refund requested", `Refund requested for ${dealId}.`)
      appendEmailEvent(buyerUser.email, "Refund requested")
    }
    return refund
  },
  processBuyerRefund(refundId: string) {
    return mockActions.issueBuyerRefund(refundId)
  },
  issueBuyerRefund(refundId: string) {
    const refund = mockDb.refunds.find((item) => item.id === refundId)
    if (!refund) return null
    refund.status = "SUCCEEDED"

    const ledger = mockDb.ledgerEntries.find((entry) => entry.type === "refund" && entry.dealId === refund.dealId)
    if (ledger) {
      ledger.status = "posted"
    }
    appendDealStatus(refund.dealId, "refund_issued")
    const buyerUser = mockDb.users.find((u) => u.id === getBuyerProfile(refund.buyerId)?.userId)
    if (buyerUser) {
      appendNotification(buyerUser.id, "Refund issued", `Refund ${refundId} issued.`)
      appendEmailEvent(buyerUser.email, "Refund issued")
    }
    return refund
  },
  createDepositRequest(data: { buyerId: string; dealId?: string; amount: number; notes?: string; dueDate?: string; createdBy: string }) {
    const buyer = getBuyerProfile(data.buyerId)
    const buyerUser = buyer ? mockDb.users.find((u) => u.id === buyer.userId) : null
    const record = {
      id: `depreq_${mockDb.depositRequests.length + 1}`,
      buyerId: data.buyerId,
      buyerName: buyerUser ? `${buyerUser.firstName} ${buyerUser.lastName}` : data.buyerId,
      buyerEmail: buyerUser?.email || "",
      dealId: data.dealId || null,
      amount: data.amount,
      notes: data.notes || null,
      dueDate: data.dueDate || null,
      status: "REQUESTED",
      createdBy: data.createdBy,
      createdAt: nextActionTimestamp(),
    }
    mockDb.depositRequests.push(record)
    if (buyerUser) {
      appendNotification(buyerUser.id, "Deposit requested", `A deposit of $${(data.amount / 100).toFixed(2)} has been requested.`)
      appendEmailEvent(buyerUser.email, "Deposit requested")
    }
    return record
  },
  createConciergeFeeRequest(data: { buyerId: string; dealId: string; amount: number; notes?: string; createdBy: string }) {
    const buyer = getBuyerProfile(data.buyerId)
    const buyerUser = buyer ? mockDb.users.find((u) => u.id === buyer.userId) : null
    const record = {
      id: `cfreq_${mockDb.conciergeFeeRequests.length + 1}`,
      buyerId: data.buyerId,
      buyerName: buyerUser ? `${buyerUser.firstName} ${buyerUser.lastName}` : data.buyerId,
      buyerEmail: buyerUser?.email || "",
      dealId: data.dealId,
      amount: data.amount,
      notes: data.notes || null,
      status: "REQUESTED",
      createdBy: data.createdBy,
      createdAt: nextActionTimestamp(),
    }
    mockDb.conciergeFeeRequests.push(record)
    if (buyerUser) {
      appendNotification(buyerUser.id, "Concierge fee requested", `A concierge fee of $${(data.amount / 100).toFixed(2)} has been requested.`)
      appendEmailEvent(buyerUser.email, "Concierge fee requested")
    }
    return record
  },
  initiateRefund(data: { buyerId: string; relatedPaymentId?: string; relatedPaymentType?: string; amount: number; reason?: string; createdBy: string }) {
    const buyer = getBuyerProfile(data.buyerId)
    const buyerUser = buyer ? mockDb.users.find((u) => u.id === buyer.userId) : null
    const record = {
      id: `ref_${mockDb.refundRecords.length + 1}`,
      buyerId: data.buyerId,
      buyerName: buyerUser ? `${buyerUser.firstName} ${buyerUser.lastName}` : data.buyerId,
      buyerEmail: buyerUser?.email || "",
      relatedPaymentId: data.relatedPaymentId || null,
      relatedPaymentType: data.relatedPaymentType || "manual",
      amount: data.amount,
      reason: data.reason || null,
      status: "PENDING",
      createdBy: data.createdBy,
      createdAt: nextActionTimestamp(),
    }
    mockDb.refundRecords.push(record)
    if (buyerUser) {
      appendNotification(buyerUser.id, "Refund initiated", `A refund of $${(data.amount / 100).toFixed(2)} has been initiated.`)
      appendEmailEvent(buyerUser.email, "Refund initiated")
    }
    return record
  },
  /** Supports (dealId, amount, reason) and (dealId, buyerId, amount, reason) with the second arg as amount or buyerId. */
  requestBuyerPayment(
    dealId: string,
    buyerIdOrAmount: string | number | undefined,
    amountOrReason?: number | string,
    reasonOverride?: string,
  ) {
    let buyerId = typeof buyerIdOrAmount === "string" ? buyerIdOrAmount : undefined
    let amount = 0
    let reason = reasonOverride || "Payment requested"

    if (typeof buyerIdOrAmount === "number") {
      amount = buyerIdOrAmount
      reason = typeof amountOrReason === "string" ? amountOrReason : reason
    } else {
      amount = typeof amountOrReason === "number" ? amountOrReason : amount
    }

    const resolvedBuyerId = buyerId || getDealById(dealId)?.buyerId || mockDb.buyerProfiles[0].id
    const paymentRequest = {
      id: `payreq_${mockDb.paymentRequests.length + 1}`,
      dealId,
      buyerId: resolvedBuyerId,
      amountCents: amount,
      status: "REQUESTED",
      reason,
      createdAt: nextActionTimestamp(),
      receivedAt: null,
    }
    mockDb.paymentRequests.push(paymentRequest)
    appendLedgerEntry({
      type: "fee",
      amount,
      dealId,
      dealerId: null,
      affiliateId: null,
      status: "pending",
    })
    appendDealStatus(dealId, "PAYMENT_REQUESTED")

    const buyerUser = mockDb.users.find((u) => u.id === getBuyerProfile(resolvedBuyerId)?.userId)
    if (buyerUser) {
      appendNotification(buyerUser.id, "Payment requested", `Payment requested for ${dealId}.`)
      appendEmailEvent(buyerUser.email, "Payment requested")
    }
    return paymentRequest
  },
  markBuyerPaymentReceived(paymentRequestId: string) {
    const paymentRequest = mockDb.paymentRequests.find((item) => item.id === paymentRequestId)
    if (!paymentRequest) return null
    paymentRequest.status = "RECEIVED"
    paymentRequest.receivedAt = nextActionTimestamp()

    const ledger = mockDb.ledgerEntries.find(
      (entry) => entry.type === "fee" && entry.dealId === paymentRequest.dealId && entry.status === "pending",
    )
    if (ledger) {
      ledger.status = "posted"
    }
    appendDealStatus(paymentRequest.dealId, "BUYER_PAYMENT_RECEIVED")

    const buyerUser = mockDb.users.find((u) => u.id === getBuyerProfile(paymentRequest.buyerId)?.userId)
    if (buyerUser) {
      appendNotification(buyerUser.id, "Payment received", `Payment ${paymentRequestId} received.`)
      appendEmailEvent(buyerUser.email, "Payment received")
    }
    return paymentRequest
  },
  processDealerPayout(payoutId: string) {
    const payout = mockDb.payouts.find((item) => item.id === payoutId)
    if (!payout) return null
    payout.status = "COMPLETED"
    payout.paidAt = nextActionTimestamp()

    const ledger = mockDb.ledgerEntries.find(
      (entry) => entry.type === "payout" && entry.dealerId === payout.dealerId && entry.dealId === payout.dealId,
    )
    if (ledger) {
      ledger.status = "posted"
    }
    appendDealStatus(payout.dealId, "dealer_payout_processed")

    const dealerUser = payout.dealerId ? getDealerUser(payout.dealerId) : undefined
    if (dealerUser) {
      appendNotification(dealerUser.id, "Dealer payout processed", `Payout ${payoutId} processed.`)
      appendEmailEvent(dealerUser.email, "Dealer payout processed")
    }
    return payout
  },
  generateLedgerForDeposit(dealId: string) {
    const deposit = mockDb.deposits.find((item) => item.dealId === dealId)
    if (!deposit) return null
    const existing = mockDb.ledgerEntries.find((entry) => entry.type === "deposit" && entry.dealId === dealId)
    if (existing) return existing
    return appendLedgerEntry({
      type: "deposit",
      amount: deposit.amountCents,
      dealId,
      dealerId: null,
      affiliateId: null,
      status: "posted",
    })
  },
  generateLedgerForFee(dealId: string) {
    const existing = mockDb.ledgerEntries.find((entry) => entry.type === "fee" && entry.dealId === dealId)
    if (existing) return existing
    return appendLedgerEntry({
      type: "fee",
      amount: amounts.serviceFeeCents,
      dealId,
      dealerId: null,
      affiliateId: null,
      status: "posted",
    })
  },
  generateLedgerForPayout(dealId: string, recipientType: "dealer" | "affiliate") {
    const deal = getDealById(dealId) || mockDb.deals[0]
    const isAffiliate = recipientType === "affiliate"
    const existing = mockDb.ledgerEntries.find(
      (entry) => entry.type === "payout" && entry.dealId === dealId && Boolean(entry.affiliateId) === isAffiliate,
    )
    if (existing) return existing

    const offer = deal?.offerId ? mockDb.offers.find((item) => item.id === deal.offerId) : undefined
    let payoutAmount = amounts.affiliateCommissionCents
    if (!isAffiliate) {
      payoutAmount = offer ? offer.bidPriceCents + offer.feesCents : amounts.winningBidCents + amounts.dealerFeesCents
    }

    return appendLedgerEntry({
      type: "payout",
      amount: payoutAmount,
      dealId,
      dealerId: isAffiliate ? null : deal?.dealerId || null,
      affiliateId: isAffiliate ? mockDb.affiliateProfiles[0]?.id || null : null,
      status: "pending",
    })
  },
  generateLedgerForRefund(dealId: string) {
    const refund = mockDb.refunds.find((item) => item.dealId === dealId)
    if (!refund) return null
    const existing = mockDb.ledgerEntries.find((entry) => entry.type === "refund" && entry.dealId === dealId)
    if (existing) return existing
    return appendLedgerEntry({
      type: "refund",
      amount: refund.amountCents,
      dealId,
      dealerId: null,
      affiliateId: null,
      status: refund.status === "SUCCEEDED" ? "posted" : "pending",
    })
  },
  verifyInsurancePolicy(dealId: string, policyId: string, verified: boolean) {
    const policy = mockDb.insurancePolicies.find((item) => item.id === policyId && item.dealId === dealId)
    if (!policy) return null
    policy.isVerified = verified
    appendInsuranceEvent(dealId, "policy_verification", `Policy ${policyId} verification ${verified ? "approved" : "reverted"}`)
    return policy
  },
  requestInsuranceDocs(dealId: string, type: string, notes?: string, dueDate?: string) {
    const request = {
      id: `ins_doc_req_${mockDb.insuranceDocRequests.length + 1}`,
      dealId,
      type,
      status: "REQUESTED",
      notes: notes || null,
      dueDate: dueDate || null,
      createdAt: nextActionTimestamp(),
    }
    mockDb.insuranceDocRequests.push(request)
    appendInsuranceEvent(dealId, "doc_request", `Requested ${type} documents`)
    return request
  },
  uploadDocs(dealId: string) {
    const deal = getDealById(dealId) || mockDb.deals[0]
    appendDealStatus(deal?.id || dealId, "DOCS_UPLOADED")

    const buyerUser = deal ? getBuyerUser(deal.buyerId) : undefined
    if (buyerUser) {
      appendNotification(buyerUser.id, "Documents uploaded", "Your documents have been uploaded successfully.")
      appendEmailEvent(buyerUser.email, "Documents uploaded")
    }
    return { success: true }
  },
  startAuction(auctionId: string) {
    const auction = getAuctionById(auctionId)
    if (!auction) return null
    auction.status = "ACTIVE"

    const deal = mockDb.deals.find((item) => item.auctionId === auctionId)
    if (deal) {
      appendDealStatus(deal.id, "AUCTION_STARTED")
    }

    const buyerUser = deal ? getBuyerUser(deal.buyerId) : undefined
    if (buyerUser) {
      appendNotification(buyerUser.id, "Auction started", `Auction ${auctionId} is now live.`)
      appendEmailEvent(buyerUser.email, "Auction started")
    }
    // Notify invited dealers
    mockDb.dealerInvites
      .filter((invite) => invite.auctionId === auctionId)
      .forEach((invite) => {
        const dealerUser = getDealerUser(invite.dealerId)
        if (dealerUser) {
          appendNotification(dealerUser.id, "Auction invite", `You have been invited to auction ${auctionId}.`)
          appendEmailEvent(dealerUser.email, "Auction invite")
        }
      })
    return auction
  },
  sendEsign(dealId: string) {
    const contract = getContractByDealId(dealId)
    if (!contract) return null
    let envelope = mockDb.esignEnvelopes.find((item) => item.contractId === contract.id)
    if (!envelope) {
      envelope = {
        id: `esign_${mockDb.esignEnvelopes.length + 1}`,
        contractId: contract.id,
        status: "sent",
        completedAt: null,
      }
      mockDb.esignEnvelopes.push(envelope)
    } else {
      envelope.status = "sent"
    }
    appendDealStatus(dealId, "ESIGN_SENT")

    const deal = getDealById(dealId)
    const buyerUser = deal ? getBuyerUser(deal.buyerId) : undefined
    if (buyerUser) {
      appendNotification(buyerUser.id, "eSign sent", "Your contract is ready for electronic signature.")
      appendEmailEvent(buyerUser.email, "eSign envelope sent")
    }
    return envelope
  },
  completeEsign(dealId: string) {
    return mockActions.esign(dealId)
  },
  startFunding(dealId: string) {
    let funding = mockDb.fundings.find((item) => item.dealId === dealId)
    if (!funding) {
      funding = {
        id: `fund_${mockDb.fundings.length + 1}`,
        dealId,
        lender: "AutoLenis Finance Partner",
        apr: 4.9,
        termMonths: 60,
        monthlyPaymentCents: 65_400,
        status: "funded",
        fundedAt: nextActionTimestamp(),
      }
      mockDb.fundings.push(funding)
    } else {
      funding.status = "funded"
      funding.fundedAt = nextActionTimestamp()
    }
    appendDealStatus(dealId, "FUNDING_STARTED")

    const deal = getDealById(dealId)
    const buyerUser = deal ? getBuyerUser(deal.buyerId) : undefined
    if (buyerUser) {
      appendNotification(buyerUser.id, "Funding started", "Your deal funding has been initiated.")
      appendEmailEvent(buyerUser.email, "Funding started")
    }
    return funding
  },
  scheduleDelivery(dealId: string) {
    let delivery = mockDb.deliveries.find((item) => item.dealId === dealId)
    if (!delivery) {
      delivery = {
        id: `del_${mockDb.deliveries.length + 1}`,
        dealId,
        status: "scheduled",
        scheduledAt: nextActionTimestamp(),
        location: "Austin, TX",
      }
      mockDb.deliveries.push(delivery)
    } else {
      delivery.status = "scheduled"
      delivery.scheduledAt = nextActionTimestamp()
    }
    appendDealStatus(dealId, "DELIVERY_SCHEDULED")

    const deal = getDealById(dealId)
    const buyerUser = deal ? getBuyerUser(deal.buyerId) : undefined
    if (buyerUser) {
      appendNotification(buyerUser.id, "Delivery scheduled", "Your vehicle delivery has been scheduled.")
      appendEmailEvent(buyerUser.email, "Delivery scheduled")
    }
    return delivery
  },
  confirmDeliveryFull(dealId: string) {
    const delivery = mockActions.confirmDelivery(dealId)
    appendDealStatus(dealId, "DELIVERY_CONFIRMED")
    return delivery
  },
  generateContractShieldForDeal(dealId: string) {
    const contract = getContractByDealId(dealId)
    if (!contract) return null
    const flags = mockActions.generateContractShield(contract.id)
    appendDealStatus(dealId, "CONTRACT_SHIELD_COMPLETE")

    const deal = getDealById(dealId)
    const buyerUser = deal ? getBuyerUser(deal.buyerId) : undefined
    if (buyerUser) {
      appendNotification(buyerUser.id, "Contract Shield complete", "Your contract has been reviewed by Contract Shield.")
      appendEmailEvent(buyerUser.email, "Contract Shield review complete")
    }
    return flags
  },
}

export const mockSelectors = {
  sessionUser(pathname: string, roleOverride?: string): SessionUser {
    const role = roleOverride
      ? roleOverride
      : pathname.startsWith("/admin") || pathname.startsWith("/api/admin")
        ? "ADMIN"
        : pathname.startsWith("/dealer") || pathname.startsWith("/api/dealer")
          ? "DEALER"
          : pathname.startsWith("/affiliate") || pathname.startsWith("/api/affiliate")
            ? "AFFILIATE"
            : "BUYER"

    const user = getUserByRole(role as SessionUser["role"])
    return {
      id: user.id,
      userId: user.id,
      email: user.email,
      role: user.role,
      is_affiliate: user.is_affiliate || false,
      first_name: user.firstName,
      last_name: user.lastName,
      workspace_id: "ws_test_001",
      workspace_mode: "TEST" as const,
    }
  },
  adminDashboard() {
    const totalBuyers = mockDb.buyerProfiles.length
    const totalDealers = mockDb.dealerProfiles.length
    const activeDealers = mockDb.dealerProfiles.filter((dealer) => dealer.active).length
    const activeAuctions = mockDb.auctions.filter((auction) => auction.status === "ACTIVE").length
    const completedDeals = mockDb.deals.filter((deal) => deal.status === "COMPLETED").length

    const feeRevenue = mockDb.ledgerEntries.filter((entry) => entry.type === "fee" && entry.status === "posted")
    const totalRevenue = feeRevenue.reduce((sum, entry) => sum + entry.amount, 0)

    const pendingDeposits = mockDb.deposits.filter((deposit) => deposit.status === "held").length
    const affiliatePayouts = mockDb.payouts.filter((payout) => payout.affiliateId)

    return {
      stats: {
        totalBuyers,
        activeBuyers: totalBuyers,
        totalDealers,
        activeDealers,
        activeAuctions,
        auctionsLast30Days: mockDb.auctions.length,
        completedDeals,
        dealsLast30Days: completedDeals,
        totalRevenue: totalRevenue / 100,
        revenueLast30Days: totalRevenue / 100,
        pendingDeposits,
        totalAffiliatePayouts: affiliatePayouts.reduce((sum, payout) => sum + payout.amountCents, 0) / 100,
        affiliatePayoutsLast30Days: affiliatePayouts.reduce((sum, payout) => sum + payout.amountCents, 0) / 100,
      },
      funnel: {
        signups: totalBuyers,
        preQuals: mockDb.prequals.length,
        shortlists: mockDb.shortlists.length,
        auctions: mockDb.auctions.length,
        dealsSelected: mockDb.selectedOffers.length,
        feesPaid: feeRevenue.length,
        completed: completedDeals,
      },
      topDealers: mockDb.dealerProfiles.map((dealer) => {
        const offers = mockDb.offers.filter((offer) => offer.dealerId === dealer.id).length
        const wonDeals = mockDb.deals.filter((deal) => deal.dealerId === dealer.id).length
        return {
          id: dealer.id,
          name: dealer.name,
          wonDeals,
          winRate: offers > 0 ? Math.round((wonDeals / offers) * 100) : 0,
        }
      }),
      topAffiliates: mockDb.affiliateProfiles.map((affiliate) => ({
        id: affiliate.id,
        name: affiliate.name,
        totalReferrals: mockDb.carRequests.length,
        totalEarnings: affiliate.totalEarnings / 100,
      })),
    }
  },
  adminDealers({ search, status = "all", page = 1, limit = 10 }: { search?: string; status?: string; page?: number; limit?: number }) {
    const normalizedSearch = search?.toLowerCase()
    let dealers = mockDb.dealerProfiles.map((dealer) => {
      const offersCount = mockDb.offers.filter((offer) => offer.dealerId === dealer.id).length
      const wonDeals = mockDb.deals.filter((deal) => deal.dealerId === dealer.id).length
      return {
        ...dealer,
        inventoryCount: mockDb.inventoryItems.filter((item) => item.dealerId === dealer.id).length,
        offersCount,
        winRate: offersCount > 0 ? Math.round((wonDeals / offersCount) * 100) : 0,
      }
    })

    if (normalizedSearch) {
      dealers = dealers.filter((dealer) => dealer.name.toLowerCase().includes(normalizedSearch))
    }

    if (status === "active") {
      dealers = dealers.filter((dealer) => dealer.active && dealer.verified)
    } else if (status === "inactive") {
      dealers = dealers.filter((dealer) => !dealer.active)
    } else if (status === "pending") {
      dealers = dealers.filter((dealer) => !dealer.verified)
    }

    const total = dealers.length
    const totalPages = Math.max(1, Math.ceil(total / limit))
    const start = (page - 1) * limit

    return { dealers: dealers.slice(start, start + limit), total, totalPages, page }
  },
  adminDealerDetail(dealerId: string) {
    const dealer = getDealerById(dealerId)
    if (!dealer) return null

    const inventoryItems = mockDb.inventoryItems
      .filter((item) => item.dealerId === dealerId)

    const offers = mockDb.offers
      .filter((offer) => offer.dealerId === dealerId)
      .map((offer) => ({
        id: offer.id,
        auctionId: offer.auctionId,
        cashOtd: offer.bidPriceCents / 100,
        createdAt: offer.submittedAt,
      }))

    const selectedDeals = mockDb.deals
      .filter((deal) => deal.dealerId === dealerId)
      .map((deal) => {
        const inv = deal.inventoryItemId ? getInventoryById(deal.inventoryItemId) : null
        return {
          ...deal,
          cashOtd: finalPriceCents / 100,
          totalOtdAmountCents: finalPriceCents,
          inventoryItem: inv ? {
            id: inv.id,
            year: inv.year,
            make: inv.make,
            model: inv.model,
            trim: inv.trim,
          } : null,
        }
      })

    return {
      ...dealer,
      _count: {
        inventoryItems: inventoryItems.length,
        offers: offers.length,
        selectedDeals: selectedDeals.length,
      },
      inventoryItems,
      offers,
      selectedDeals,
    }
  },
  adminAuctionDetail(auctionId: string) {
    const auction = getAuctionById(auctionId)
    if (!auction) return null

    const buyer = getBuyerProfile(auction.buyerId)
    const buyerUser = buyer ? mockDb.users.find((u) => u.id === buyer.userId) : undefined
    const shortlist = mockDb.shortlists.find((s) => s.id === auction.shortlistId)

    const participants = mockDb.dealerInvites
      .filter((invite) => invite.auctionId === auctionId)
      .map((invite) => {
        const dealer = getDealerById(invite.dealerId)
        return {
          id: invite.id,
          dealerId: invite.dealerId,
          dealerName: dealer?.name || "Unknown",
          invitedAt: invite.invitedAt,
          viewedAt: null,
        }
      })

    const offers = mockDb.offers
      .filter((offer) => offer.auctionId === auctionId)
      .map((offer) => {
        const dealer = getDealerById(offer.dealerId)
        return {
          id: offer.id,
          dealerId: offer.dealerId,
          dealerName: dealer?.name || "Unknown",
          bidPriceCents: offer.bidPriceCents,
          feesCents: offer.feesCents,
          submittedAt: offer.submittedAt,
        }
      })

    const selectedOffer = mockDb.selectedOffers.find((so) => so.auctionId === auctionId)
    const deal = mockDb.deals.find((d) => d.auctionId === auctionId)

    const shortlistItems = (shortlist?.items || []).map((item: any) => {
      const inventory = getInventoryById(item.inventoryItemId)
      return {
        id: item.id,
        inventoryItemId: item.inventoryItemId,
        vehicle: inventory
          ? { year: inventory.year, make: inventory.make, model: inventory.model, trim: inventory.trim }
          : null,
      }
    })

    return {
      id: auction.id,
      status: auction.status,
      createdAt: auction.createdAt,
      endsAt: auction.endsAt || null,
      buyer: buyer
        ? {
            id: buyer.id,
            firstName: buyer.firstName,
            lastName: buyer.lastName,
            email: buyer.email || buyerUser?.email || "",
            phone: buyer.phone || null,
            creditScore: buyer.creditScore || null,
            prequalStatus: buyer.prequalStatus || null,
          }
        : null,
      shortlistItems,
      participants,
      offers,
      selectedOffer: selectedOffer
        ? {
            id: selectedOffer.id,
            offerId: selectedOffer.offerId,
            dealerId: selectedOffer.dealerId,
            finalPriceCents: selectedOffer.finalPriceCents,
            selectedAt: selectedOffer.selectedAt,
          }
        : null,
      deal: deal
        ? {
            id: deal.id,
            status: deal.status,
            createdAt: deal.createdAt,
          }
        : null,
    }
  },
  adminDeals({ status = "all", page = 1, limit = 10 }: { status?: string; page?: number; limit?: number }) {
    let deals = mockDb.deals.map((deal) => {
      const buyer = getBuyerProfile(deal.buyerId)
      const dealer = getDealerById(deal.dealerId)
      const inventory = deal.inventoryItemId ? getInventoryById(deal.inventoryItemId) : null
      return {
        id: deal.id,
        buyerName: buyer ? `${buyer.firstName} ${buyer.lastName}` : "Unknown",
        buyerEmail: buyer?.email || "",
        dealerName: dealer?.name || "Unknown",
        vehicle: inventory ? `${inventory.year} ${inventory.make} ${inventory.model} ${inventory.trim}` : "Unknown",
        otdAmount: finalPriceCents / 100,
        status: deal.status,
        createdAt: deal.createdAt,
      }
    })

    if (status !== "all") {
      deals = deals.filter((deal) => deal.status === status)
    }

    const total = deals.length
    const totalPages = Math.max(1, Math.ceil(total / limit))
    const start = (page - 1) * limit

    return { deals: deals.slice(start, start + limit), total, totalPages, page }
  },
  adminDealDetail(dealId: string) {
    const deal = mockDb.deals.find((item) => item.id === dealId)
    if (!deal) return null
    const buyer = getBuyerProfile(deal.buyerId)
    const dealer = getDealerById(deal.dealerId)
    const inventory = deal.inventoryItemId ? getInventoryById(deal.inventoryItemId) : null

    return {
      id: deal.id,
      status: deal.status,
      amount: finalPriceCents / 100,
      vehicle: inventory ? `${inventory.year} ${inventory.make} ${inventory.model} ${inventory.trim}` : "Unknown",
      buyerName: buyer ? `${buyer.firstName} ${buyer.lastName}` : "Unknown",
      dealerName: dealer?.name || "Unknown",
    }
  },
  adminDealBilling(dealId: string) {
    const deal = mockDb.deals.find((item) => item.id === dealId)
    if (!deal) return null

    const ledger = mockDb.ledgerEntries.filter((entry) => entry.dealId === dealId)
    const paymentRequests = mockDb.paymentRequests.filter((item) => item.dealId === dealId)
    const deposits = mockDb.deposits.filter((item) => item.dealId === dealId)

    return {
      dealId,
      ledger,
      paymentRequests,
      deposits,
    }
  },
  adminDealRefunds(dealId: string) {
    const refunds = mockDb.refunds.filter((refund) => refund.dealId === dealId)
    return { dealId, refunds }
  },
  adminDealInsurance(dealId: string) {
    const deal = mockDb.deals.find((item) => item.id === dealId)
    if (!deal) return null
    const quotes = mockDb.insuranceQuotes.filter((quote) => quote.dealId === dealId)
    const policies = mockDb.insurancePolicies.filter((policy) => policy.dealId === dealId)
    const events = mockDb.insuranceEvents.filter((event) => event.dealId === dealId)
    return {
      deal: {
        id: dealId,
        insurance_status: policies.some((policy) => policy.isVerified) ? "VERIFIED" : "PENDING",
      },
      quotes,
      policies,
      events,
    }
  },
  insuranceDocRequests(dealId: string) {
    return mockDb.insuranceDocRequests.filter((request) => request.dealId === dealId)
  },
  adminPayments() {
    const buyer = mockDb.buyerProfiles[0]
    const buyerUser = mockDb.users.find((user) => user.id === buyer.userId)
    const auction = mockDb.auctions[0]
    const deal = mockDb.deals[0]

    const deposits = mockDb.deposits.map((deposit) => ({
      id: deposit.id,
      buyerId: deposit.buyerId,
      buyer: {
        user: {
          email: buyerUser?.email,
        },
      },
      auctionId: auction.id,
      amountCents: deposit.amountCents,
      status: deposit.status === "held" ? "PAID" : "PENDING",
      createdAt: deposit.createdAt,
    }))

    const serviceFees = [
      {
        id: "service_fee_gold_001",
        dealId: deal.id,
        baseFeeCents: amounts.serviceFeeCents,
        depositAppliedCents: 0,
        remainingCents: amounts.serviceFeeCents,
        status: "PAID",
        createdAt: baseTimeline.selected,
        method: "card",
        deal: {
          buyer: {
            user: {
              email: buyerUser?.email,
            },
          },
        },
      },
    ]

    return {
      deposits,
      serviceFees,
    }
  },
  adminDepositRequests() {
    return mockDb.depositRequests
  },
  adminConciergeFeeRequests() {
    return mockDb.conciergeFeeRequests
  },
  adminRefundRecords() {
    return mockDb.refundRecords
  },
  adminBuyersList() {
    return mockDb.buyerProfiles.map((bp) => {
      const user = mockDb.users.find((u) => u.id === bp.userId)
      return { id: bp.id, name: `${bp.firstName} ${bp.lastName}`, email: bp.email || user?.email || "" }
    })
  },
  adminDealsList() {
    return mockDb.deals.map((d) => ({ id: d.id, buyerId: d.buyerId, status: d.status }))
  },
  adminBuyerDetail(buyerId: string) {
    const buyerProfile = getBuyerProfile(buyerId)
    if (!buyerProfile) return null

    const user = mockDb.users.find((item) => item.id === buyerProfile.userId)
    const auctions = mockDb.auctions.filter((auction) => auction.buyerId === buyerId)
    const selectedDeals = mockDb.deals.filter((deal) => deal.buyerId === buyerId)

    return {
      id: user?.id || buyerProfile.userId,
      email: buyerProfile.email,
      first_name: buyerProfile.firstName,
      last_name: buyerProfile.lastName,
      phone: buyerProfile.phone,
      buyerProfile,
      buyerPreQualification: mockDb.prequals.find((prequal) => prequal.buyerId === buyerId) || null,
      auctions,
      selectedDeals,
      affiliate: getAffiliateProfile(buyerProfile.affiliateId || "") || null,
    }
  },
  adminBuyers({ search, page = 1, limit = 50 }: { search?: string; page?: number; limit?: number }) {
    const normalizedSearch = search?.toLowerCase()
    let buyers = mockDb.buyerProfiles.map((buyer) => {
      const hasPreQual = mockDb.prequals.some((prequal) => prequal.buyerId === buyer.id)
      const hasActiveAuction = mockDb.auctions.some((auction) => auction.buyerId === buyer.id && auction.status === "ACTIVE")
      const hasCompletedDeal = mockDb.deals.some((deal) => deal.buyerId === buyer.id && deal.status === "COMPLETED")
      return {
        id: buyer.id,
        firstName: buyer.firstName,
        lastName: buyer.lastName,
        email: buyer.email,
        phone: buyer.phone,
        createdAt: buyer.createdAt,
        hasPreQual,
        preQualStatus: hasPreQual ? "Active" : null,
        isAffiliate: Boolean(buyer.affiliateId),
        hasActiveAuction,
        hasCompletedDeal,
      }
    })

    if (normalizedSearch) {
      buyers = buyers.filter((buyer) => {
        return (
          buyer.firstName.toLowerCase().includes(normalizedSearch) ||
          buyer.lastName.toLowerCase().includes(normalizedSearch) ||
          buyer.email.toLowerCase().includes(normalizedSearch)
        )
      })
    }

    const total = buyers.length
    const totalPages = Math.max(1, Math.ceil(total / limit))
    const start = (page - 1) * limit

    return {
      buyers: buyers.slice(start, start + limit),
      total,
      totalPages,
      page,
    }
  },
  adminAffiliates({ search, status = "all", page = 1, limit = 50 }: { search?: string; status?: string; page?: number; limit?: number }) {
    let affiliates = mockDb.affiliateProfiles.map((affiliate) => {
      const user = mockDb.users.find((item) => item.id === affiliate.userId)
      return {
        id: affiliate.id,
        userId: affiliate.userId,
        status: affiliate.status,
        referralCode: affiliate.referralCode,
        totalReferrals: mockDb.carRequests.length,
        totalEarnings: affiliate.totalEarnings,
        pendingEarnings: affiliate.pendingEarnings,
        paidEarnings: affiliate.paidEarnings,
        createdAt: affiliate.createdAt,
        user: user
          ? {
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
            }
          : null,
        bankDetails: affiliate.bankDetails,
      }
    })

    if (search) {
      const normalizedSearch = search.toLowerCase()
      affiliates = affiliates.filter((affiliate) => affiliate.referralCode.toLowerCase().includes(normalizedSearch))
    }

    if (status !== "all") {
      affiliates = affiliates.filter((affiliate) => affiliate.status === status)
    }

    const total = affiliates.length
    const totalPages = Math.max(1, Math.ceil(total / limit))
    const start = (page - 1) * limit

    const stats = {
      totalAffiliates: total,
      activeAffiliates: affiliates.length,
      totalReferrals: affiliates.reduce((sum, affiliate) => sum + affiliate.totalReferrals, 0),
      totalEarnings: affiliates.reduce((sum, affiliate) => sum + affiliate.totalEarnings, 0),
      pendingPayouts: affiliates.reduce((sum, affiliate) => sum + affiliate.pendingEarnings, 0),
      paidPayouts: affiliates.reduce((sum, affiliate) => sum + affiliate.paidEarnings, 0),
    }

    return {
      affiliates: affiliates.slice(start, start + limit),
      stats,
      pagination: { page, limit, total, totalPages },
    }
  },
  adminAffiliateDetail(affiliateId: string) {
    const affiliate = getAffiliateProfile(affiliateId)
    if (!affiliate) return null
    const user = mockDb.users.find((item) => item.id === affiliate.userId)

    const clicks = mockDb.affiliateClicks.filter((c) => c.affiliateId === affiliateId)
    const totalClicks = clicks.length
    const totalReferrals = mockDb.carRequests.length
    const conversionRate = totalClicks > 0 ? (totalReferrals / totalClicks) * 100 : 0

    return {
      affiliate: {
        id: affiliate.id,
        userId: affiliate.userId,
        status: affiliate.status,
        referralCode: affiliate.referralCode,
        totalReferrals,
        totalEarnings: affiliate.totalEarnings,
        pendingEarnings: affiliate.pendingEarnings,
        paidEarnings: affiliate.paidEarnings,
        createdAt: affiliate.createdAt,
        totalClicks,
        conversionRate,
        user: user
          ? { email: user.email, firstName: user.firstName, lastName: user.lastName }
          : null,
        bankDetails: affiliate.bankDetails,
      },
      referrals: mockDb.carRequests.map((request) => ({
        id: request.id,
        status: request.status,
        createdAt: request.createdAt,
        level: 1,
        attributedAt: request.createdAt,
        referredBuyerId: request.buyerId,
        dealId: "deal_gold_001",
        buyer: getBuyerProfile(request.buyerId)
          ? {
              firstName: getBuyerProfile(request.buyerId)?.firstName || "",
              lastName: getBuyerProfile(request.buyerId)?.lastName || "",
            }
          : undefined,
      })),
      commissions: mockDb.payouts
        .filter((payout) => payout.affiliateId === affiliateId)
        .map((payout) => ({
          id: payout.id,
          amount: payout.amountCents,
          status: payout.status,
          type: "AFFILIATE",
          createdAt: payout.requestedAt,
          level: 1,
          commissionRate: 10,
          baseAmount: payout.amountCents * 10,
          dealId: payout.dealId || "deal_gold_001",
        })),
      clicks,
      payouts: mockDb.payouts
        .filter((payout) => payout.affiliateId === affiliateId)
        .map((payout) => ({
          id: payout.id,
          amount: payout.amountCents,
          status: payout.status,
          method: "Mock",
          providerRef: payout.id,
          createdAt: payout.requestedAt,
          paidAt: payout.paidAt || null,
        })),
      documents: mockDb.affiliateDocuments.filter((d) => d.affiliateId === affiliateId),
      auditLogs: mockDb.affiliateAuditLogs.filter(
        (log) => log.details?.entityId === affiliateId
      ),
      complianceEvents: [],
    }
  },
  adminAffiliatePayouts(affiliateId: string) {
    const payouts = mockDb.payouts
      .filter((payout) => payout.affiliateId === affiliateId)
      .map((payout) => ({
        id: payout.id,
        amountCents: payout.amountCents,
        status: payout.status,
        provider: "Mock",
        providerRef: payout.id,
        commissionCount: 1,
        createdAt: payout.requestedAt,
        paidAt: payout.paidAt || null,
      }))
    return { payouts }
  },
  adminPayouts({ status, page = 1, limit = 50 }: { status?: string; page?: number; limit?: number }) {
    let payouts = mockDb.payouts
    if (status && status !== "all") {
      payouts = payouts.filter((payout) => payout.status === status)
    }
    const total = payouts.length
    const totalPages = Math.max(1, Math.ceil(total / limit))
    const start = (page - 1) * limit
    const pending = mockDb.payouts.filter((payout) => payout.status === "PENDING")
    const completed = mockDb.payouts.filter((payout) => payout.status === "COMPLETED")
    return {
      payouts: payouts.slice(start, start + limit).map((payout) => ({
        id: payout.id,
        affiliateId: payout.affiliateId,
        amount: payout.amountCents,
        status: payout.status,
        requestedAt: payout.requestedAt,
        processedAt: payout.paidAt || null,
        transactionId: payout.id,
        affiliate: payout.affiliateId
          ? {
              referralCode: getAffiliateProfile(payout.affiliateId)?.referralCode,
              bankDetails: getAffiliateProfile(payout.affiliateId)?.bankDetails,
              user: mockDb.users.find((user) => user.id === getAffiliateProfile(payout.affiliateId)?.userId)
                ? {
                    email: mockDb.users.find((user) => user.id === getAffiliateProfile(payout.affiliateId)?.userId)?.email,
                    firstName: mockDb.users.find((user) => user.id === getAffiliateProfile(payout.affiliateId)?.userId)?.firstName,
                    lastName: mockDb.users.find((user) => user.id === getAffiliateProfile(payout.affiliateId)?.userId)?.lastName,
                  }
                : null,
            }
          : null,
      })),
      stats: {
        pending: pending.length,
        completed: completed.length,
        totalPending: pending.reduce((sum, payout) => sum + payout.amountCents, 0),
        totalPaid: completed.reduce((sum, payout) => sum + payout.amountCents, 0),
      },
      pagination: { page, limit, total, totalPages },
    }
  },
  adminAffiliatePayments({ status, affiliateId, page = 1, limit = 50 }: { status?: string; affiliateId?: string; page?: number; limit?: number }) {
    let payments = (mockDb.payouts as Record<string, unknown>[]).filter((p: Record<string, unknown>) => p["affiliateId"])
    if (status && status !== "all") {
      payments = payments.filter((p: any) => p.status === status)
    }
    if (affiliateId) {
      payments = payments.filter((p: any) => p.affiliateId === affiliateId)
    }
    const total = payments.length
    const totalPages = Math.max(1, Math.ceil(total / limit))
    const start = (page - 1) * limit
    return {
      payments: payments.slice(start, start + limit).map((p: any) => ({
        id: p.id,
        affiliateId: p.affiliateId,
        amount: p.amountCents || p.amount || 0,
        method: p.provider || p.paymentMethod || null,
        status: p.status,
        externalTransactionId: p.providerRef || p.paymentId || null,
        paidAt: p.paidAt || null,
        createdAt: p.requestedAt || p.createdAt,
        affiliate: p.affiliateId
          ? {
              referralCode: getAffiliateProfile(p.affiliateId)?.referralCode,
              user: mockDb.users.find((user) => user.id === getAffiliateProfile(p.affiliateId)?.userId)
                ? {
                    email: mockDb.users.find((user) => user.id === getAffiliateProfile(p.affiliateId)?.userId)?.email,
                    firstName: mockDb.users.find((user) => user.id === getAffiliateProfile(p.affiliateId)?.userId)?.firstName,
                    lastName: mockDb.users.find((user) => user.id === getAffiliateProfile(p.affiliateId)?.userId)?.lastName,
                  }
                : null,
            }
          : null,
      })),
      pagination: { page, limit, total, totalPages },
    }
  },
  buyerDashboard() {
    const profile = mockDb.buyerProfiles[0]
    const preQual = mockDb.prequals[0]
    const auction = mockDb.auctions[0]
    const deal = mockDb.deals[0]

    return {
      profile: {
        id: profile.id,
        userId: profile.userId,
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        createdAt: profile.createdAt,
        updatedAt: baseTimeline.prequalified,
      },
      preQual: {
        id: preQual.id,
        status: "ACTIVE",
        creditTier: preQual.creditTier,
        maxOtdAmountCents: preQual.maxOtdAmountCents,
        minMonthlyPaymentCents: preQual.minMonthlyPaymentCents,
        maxMonthlyPaymentCents: preQual.maxMonthlyPaymentCents,
        dtiRatio: preQual.dtiRatio,
        expiresAt: preQual.expiresAt,
        providerName: preQual.providerName,
        createdAt: preQual.createdAt,
        isExpired: false,
        daysUntilExpiry: 20,
      },
      stats: {
        shortlistCount: mockDb.shortlists[0].items.length,
        activeAuctions: auction.status === "ACTIVE" ? 1 : 0,
        completedAuctions: 1,
        totalOffers: mockDb.offers.length,
        pendingDeals: 0,
        completedDeals: 1,
        upcomingPickups: 1,
        totalSavings: 2_500,
        referralEarnings: mockDb.affiliateProfiles[0].totalEarnings,
        pendingReferrals: mockDb.affiliateProfiles[0].pendingEarnings,
        contractPassed: true,
        pickupScheduled: true,
      },
      shortlists: mockDb.shortlists,
      auctions: [
        {
          id: auction.id,
          buyerId: auction.buyerId,
          status: auction.status,
          endsAt: auction.endsAt,
          createdAt: auction.createdAt,
          offers: mockDb.offers.map((offer) => ({
            id: offer.id,
            cashOtd: offer.bidPriceCents / 100,
            status: "SUBMITTED",
            createdAt: offer.submittedAt,
          })),
        },
      ],
      deals: [
        {
          id: deal.id,
          buyerId: deal.buyerId,
          status: deal.status,
          total_otd_amount_cents: finalPriceCents,
          createdAt: deal.createdAt,
          updatedAt: deal.updatedAt,
        },
      ],
      pickups: [
        {
          id: "pickup_gold_001",
          buyerId: profile.id,
          scheduledDate: baseTimeline.deliveryScheduled,
          status: "SCHEDULED",
          dealer: {
            id: "dealer_gold_003",
            businessName: getDealerById("dealer_gold_003")?.name,
            city: "Phoenix",
            state: "AZ",
          },
        },
      ],
      recentActivity: [
        {
          type: "auction",
          title: "Auction Closed",
          description: `Auction #${auction.id}`,
          timestamp: baseTimeline.bidsReceived,
          icon: "gavel",
        },
        {
          type: "offer",
          title: "Winning Offer Selected",
          description: `Offer for $${(finalPriceCents / 100).toLocaleString()}`,
          timestamp: baseTimeline.selected,
          icon: "dollar",
        },
        {
          type: "deal",
          title: "Deal Completed",
          description: `Deal #${deal.id}`,
          timestamp: baseTimeline.completed,
          icon: "credit-card",
        },
        {
          type: "pickup",
          title: "Delivery Scheduled",
          description: "Dealer scheduled delivery appointment",
          timestamp: baseTimeline.deliveryScheduled,
          icon: "calendar",
        },
      ],
      referralStats: null,
    }
  },
  dealerDashboard() {
    const dealHistory = mockDb.dealStatusHistory.filter((h) => h.dealId === "deal_gold_001")
    return {
      success: true,
      activeAuctions: 0,
      awaitingBids: 0,
      pendingOffers: 0,
      completedDeals: 1,
      totalSales: 1,
      inventory: mockDb.inventoryItems.length,
      pendingContracts: 1,
      upcomingPickups: 1,
      recentActivity: [
        {
          id: "deal_gold_001",
          status: "COMPLETED",
          cashOtd: finalPriceCents / 100,
          createdAt: baseTimeline.completed,
          buyer: { firstName: "Jordan", lastName: "Ellis" },
          inventoryItem: {
            id: "inventory_gold_001",
            priceCents: finalPriceCents,
            year: 2024,
            make: "Honda",
            model: "Accord",
            trim: "Touring Hybrid",
          },
        },
      ],
      monthlyStats: {
        thisMonthDeals: 1,
        lastMonthDeals: 0,
        dealsChange: 100,
        revenue: finalPriceCents / 100,
      },
      goldenDeal: {
        dealId: "deal_gold_001",
        dealerId: "dealer_gold_003",
        status: mockDb.deals[0]?.status || "COMPLETED",
        history: dealHistory,
      },
    }
  },
  prequalPayload() {
    const prequal = mockDb.prequals[0]
    return {
      active: true,
      preQualification: {
        id: prequal.id,
        status: "ACTIVE",
        creditTier: prequal.creditTier,
        maxOtdAmountCents: prequal.maxOtdAmountCents,
        minMonthlyPaymentCents: prequal.minMonthlyPaymentCents,
        maxMonthlyPaymentCents: prequal.maxMonthlyPaymentCents,
        dtiRatio: prequal.dtiRatio,
        expiresAt: prequal.expiresAt,
        providerName: prequal.providerName,
        createdAt: prequal.createdAt,
      },
    }
  },
  financeReport({ from, to }: { from?: string; to?: string }) {
    const fromDate = from ? new Date(from).getTime() : null
    const toDate = to ? new Date(to).getTime() : null

    const ledgerEntries = mockDb.ledgerEntries.filter((entry) => {
      const timestamp = new Date(entry.createdAt).getTime()
      if (fromDate && timestamp < fromDate) return false
      if (toDate && timestamp > toDate) return false
      return true
    })

    const depositsReceived = ledgerEntries.filter((entry) => entry.type === "deposit" && entry.status === "posted")
    const platformFees = ledgerEntries.filter((entry) => entry.type === "fee" && entry.status === "posted")
    const refunds = ledgerEntries.filter((entry) => entry.type === "refund")
    const payouts = ledgerEntries.filter((entry) => entry.type === "payout")

    const totalDeposits = depositsReceived.reduce((sum, entry) => sum + entry.amount, 0)
    const totalFees = platformFees.reduce((sum, entry) => sum + entry.amount, 0)
    const totalRefunds = refunds.reduce((sum, entry) => sum + entry.amount, 0)

    const buyerPaymentsRequested = ledgerEntries.filter((entry) => entry.type === "fee" && entry.status === "pending")
    const buyerPaymentsReceived = ledgerEntries.filter((entry) => entry.type === "fee" && entry.status === "posted")

    const affiliatePayoutsPending = payouts.filter((entry) => entry.affiliateId && entry.status === "pending")
    const affiliatePayoutsPaid = payouts.filter((entry) => entry.affiliateId && entry.status === "posted")
    const dealerPayouts = payouts.filter((entry) => entry.dealerId)

    const netRevenue = totalFees - affiliatePayoutsPaid.reduce((sum, entry) => sum + entry.amount, 0) - totalRefunds

    return {
      summary: {
        depositsReceived: totalDeposits,
        buyerPaymentsRequested: buyerPaymentsRequested.reduce((sum, entry) => sum + entry.amount, 0),
        buyerPaymentsReceived: buyerPaymentsReceived.reduce((sum, entry) => sum + entry.amount, 0),
        platformFees: totalFees,
        affiliatePayoutsPending: affiliatePayoutsPending.reduce((sum, entry) => sum + entry.amount, 0),
        affiliatePayoutsPaid: affiliatePayoutsPaid.reduce((sum, entry) => sum + entry.amount, 0),
        dealerPayouts: dealerPayouts.reduce((sum, entry) => sum + entry.amount, 0),
        refunds: totalRefunds,
        netRevenue,
      },
      ledger: ledgerEntries.map((entry) => ({
        id: entry.id,
        type: entry.type,
        amount: entry.amount,
        dealId: entry.dealId,
        dealerId: entry.dealerId,
        affiliateId: entry.affiliateId,
        status: entry.status,
        createdAt: entry.createdAt,
      })),
    }
  },
  funnelReport() {
    const stageCounts = {
      signups: mockDb.buyerProfiles.length,
      preQuals: mockDb.prequals.length,
      shortlists: mockDb.shortlists.length,
      auctions: mockDb.auctions.length,
      dealsSelected: mockDb.selectedOffers.length,
      feesPaid: mockDb.ledgerEntries.filter((entry) => entry.type === "fee" && entry.status === "posted").length,
      completed: mockDb.deals.filter((deal) => deal.status === "COMPLETED").length,
    }

    const topCount = stageCounts.signups || 1
    const stages = [
      { stage: "Signed Up", count: stageCounts.signups },
      { stage: "Pre-Qualified", count: stageCounts.preQuals },
      { stage: "Shortlisted", count: stageCounts.shortlists },
      { stage: "Auction Started", count: stageCounts.auctions },
      { stage: "Dealer Selected", count: stageCounts.dealsSelected },
      { stage: "Fee Paid", count: stageCounts.feesPaid },
      { stage: "Completed", count: stageCounts.completed },
    ]

    return {
      stages: stages.map((stage) => ({
        ...stage,
        percentage: topCount > 0 ? Math.round((stage.count / topCount) * 100) : 0,
      })),
    }
  },
  operationsReport() {
    const totalBids = mockDb.offers.length
    const averageBid = Math.round(mockDb.offers.reduce((sum, offer) => sum + offer.bidPriceCents, 0) / totalBids)

    return {
      summary: {
        totalAuctions: mockDb.auctions.length,
        totalBids,
        avgBid: averageBid,
        avgDaysToClose: 6,
        depositsHeld: mockDb.deposits.filter((deposit) => deposit.status === "held").length,
      },
      lifecycle: [
        { label: "Buyer Signed Up", status: "signed_up", timestamp: baseTimeline.signedUp },
        { label: "Pre-Qualified", status: "approved", timestamp: baseTimeline.prequalified },
        { label: "Shortlist Created", status: "shortlisted", timestamp: baseTimeline.shortlist },
        { label: "Auction Closed", status: "closed", timestamp: baseTimeline.bidsReceived },
        { label: "Dealer Selected", status: "dealer_selected", timestamp: baseTimeline.selected },
        { label: "Funding Completed", status: "funded", timestamp: baseTimeline.funded },
        { label: "Delivery Scheduled", status: "scheduled", timestamp: baseTimeline.deliveryScheduled },
      ],
      payments: {
        deposit: mockDb.deposits[0],
        fees: { amountCents: amounts.serviceFeeCents, status: "PAID" },
        escrowStatus: "released",
      },
      financing: mockDb.fundings[0],
    }
  },
  goldenDealWalkthrough() {
    const deal = getDealById("deal_gold_001") || mockDb.deals[0]
    const history = mockDb.dealStatusHistory.filter((h) => h.dealId === "deal_gold_001")
    return {
      dealId: "deal_gold_001",
      buyerId: "buyer_gold_001",
      dealerId: "dealer_gold_003",
      affiliateId: "affiliate_gold_001",
      requestId: "req_gold_001",
      auctionId: "auc_gold_001",
      contractId: "ctr_gold_001",
      fundingId: mockDb.fundings.find((f) => f.dealId === "deal_gold_001")?.id || "fund_gold_001",
      deliveryId: mockDb.deliveries.find((d) => d.dealId === "deal_gold_001")?.id || "del_gold_001",
      paymentRequestId: "payreq_gold_001",
      depositId: mockDb.deposits.find((d) => d.dealId === "deal_gold_001")?.id || "dep_gold_001",
      deal,
      history,
      notifications: mockDb.notifications,
      emailEvents: mockDb.emailEvents,
      ledgerEntries: mockDb.ledgerEntries.filter((e) => e.dealId === "deal_gold_001"),
    }
  },
}

export const mockStateTransitions = {
  buyer: { current: "prequalified", history: ["signed_up", "prequalified"] },
  deal: { current: "dealer_selected", history: ["created", "shortlisted", "auction_started", "bid_received", "dealer_selected"] },
  auction: { current: "closed", history: ["open", "competitive", "closed"] },
  payment: { current: "released", history: ["pending", "held", "released"] },
  financing: { current: "approved", history: ["pending", "approved"] },
  completion: { current: "completed", history: ["selected", "funded", "completed"] },
}
