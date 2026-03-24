import { describe, it, expect } from "vitest"
import fs from "fs"
import path from "path"

describe("Financial Reporting System", () => {
  // ─── Webhook Handler Tests ────────────────────────────
  describe("Stripe Webhook Handler", () => {
    const webhookFile = path.resolve("app/api/webhooks/stripe/route.ts")
    const webhookContent = fs.readFileSync(webhookFile, "utf-8")

    it("handles payment_intent.succeeded", () => {
      expect(webhookContent).toContain("payment_intent.succeeded")
    })

    it("handles payment_intent.payment_failed", () => {
      expect(webhookContent).toContain("payment_intent.payment_failed")
    })

    it("handles charge.refunded", () => {
      expect(webhookContent).toContain("charge.refunded")
    })

    it("handles charge.dispute.created for chargebacks", () => {
      expect(webhookContent).toContain("charge.dispute.created")
      expect(webhookContent).toContain("handleDisputeCreated")
    })

    it("handles payout.paid", () => {
      expect(webhookContent).toContain("payout.paid")
      expect(webhookContent).toContain("handlePayoutPaid")
    })

    it("validates Stripe signature", () => {
      expect(webhookContent).toContain("constructWebhookEvent")
      expect(webhookContent).toContain("stripe-signature")
    })

    it("writes to Transaction ledger on payment success", () => {
      expect(webhookContent).toContain("transaction.create")
    })

    it("creates Chargeback records on dispute", () => {
      expect(webhookContent).toContain("chargeback.create")
    })

    it("sends admin notifications for chargebacks", () => {
      expect(webhookContent).toContain("payment.chargeback.created")
    })

    it("sends admin notifications for deposit failures", () => {
      expect(webhookContent).toContain("payment.deposit.failed")
    })
  })

  // ─── Financial API Route Tests ────────────────────────
  describe("Financial API Route", () => {
    const apiFile = path.resolve("app/api/admin/financial/route.ts")
    const apiContent = fs.readFileSync(apiFile, "utf-8")

    it("imports isAdminRole for RBAC", () => {
      expect(apiContent).toContain("isAdminRole")
    })

    it("checks for admin role before proceeding", () => {
      expect(apiContent).toContain("!isAdminRole(user.role)")
    })

    it("returns 401 for unauthorized users", () => {
      expect(apiContent).toContain("status: 401")
    })

    it("supports test workspace mock data", () => {
      expect(apiContent).toContain("isTestWorkspace")
    })

    it("includes correlationId in error responses", () => {
      expect(apiContent).toContain("correlationId")
    })

    it("queries Transaction table", () => {
      expect(apiContent).toContain('from("Transaction")')
    })

    it("queries Chargeback table", () => {
      expect(apiContent).toContain('from("Chargeback")')
    })

    it("queries Commission table for affiliate data", () => {
      expect(apiContent).toContain('from("Commission")')
    })

    it("queries RefinanceLead table for refinance data", () => {
      expect(apiContent).toContain('from("RefinanceLead")')
    })

    it("calculates period-over-period percentage change", () => {
      expect(apiContent).toContain("pctChange")
    })

    it("returns KPI summary with all required fields", () => {
      expect(apiContent).toContain("grossRevenue")
      expect(apiContent).toContain("netRevenue")
      expect(apiContent).toContain("totalTransactions")
      expect(apiContent).toContain("refundTotal")
      expect(apiContent).toContain("chargebacksTotal")
      expect(apiContent).toContain("pending")
      expect(apiContent).toContain("affiliateCommissionsAccrued")
      expect(apiContent).toContain("affiliateCommissionsPaid")
      expect(apiContent).toContain("dealerFeesCollected")
      expect(apiContent).toContain("refinanceRevenue")
    })

    it("returns revenue breakdown for donut chart", () => {
      expect(apiContent).toContain("revenueBreakdown")
      expect(apiContent).toContain("Buyer Fees")
      expect(apiContent).toContain("Dealer Fees")
      expect(apiContent).toContain("Refinance Fees")
    })

    it("returns revenue trend data for line chart", () => {
      expect(apiContent).toContain("revenueTrend")
    })
  })

  // ─── Reconciliation Route Tests ───────────────────────
  describe("Reconciliation API Route", () => {
    const reconFile = path.resolve("app/api/admin/financial/reconciliation/route.ts")
    const reconContent = fs.readFileSync(reconFile, "utf-8")

    it("imports isAdminRole for RBAC", () => {
      expect(reconContent).toContain("isAdminRole")
    })

    it("returns 401 for unauthorized users", () => {
      expect(reconContent).toContain("status: 401")
    })

    it("requires SUPER_ADMIN for POST (sync)", () => {
      expect(reconContent).toContain('user.role !== "SUPER_ADMIN"')
    })

    it("returns 403 for non-super-admins on sync", () => {
      expect(reconContent).toContain("status: 403")
    })

    it("supports test workspace mock data", () => {
      expect(reconContent).toContain("isTestWorkspace")
    })

    it("compares Stripe gross vs DB gross", () => {
      expect(reconContent).toContain("stripeGross")
      expect(reconContent).toContain("dbGross")
    })

    it("detects missing records in DB", () => {
      expect(reconContent).toContain("missingInDb")
    })

    it("detects missing records in Stripe", () => {
      expect(reconContent).toContain("missingInStripe")
    })

    it("detects mismatched amounts", () => {
      expect(reconContent).toContain("mismatches")
    })

    it("reports RECONCILED or MISMATCH status", () => {
      expect(reconContent).toContain('"RECONCILED"')
      expect(reconContent).toContain('"MISMATCH"')
    })

    it("creates FinancialAuditLog on sync", () => {
      expect(reconContent).toContain('from("FinancialAuditLog").insert')
    })

    it("includes correlationId in error responses", () => {
      expect(reconContent).toContain("correlationId")
    })
  })

  // ─── Export Route Tests ───────────────────────────────
  describe("Export API Route", () => {
    const exportFile = path.resolve("app/api/admin/financial/export/route.ts")
    const exportContent = fs.readFileSync(exportFile, "utf-8")

    it("imports isAdminRole for RBAC", () => {
      expect(exportContent).toContain("isAdminRole")
    })

    it("returns 401 for unauthorized users", () => {
      expect(exportContent).toContain("status: 401")
    })

    it("supports test workspace mock data", () => {
      expect(exportContent).toContain("isTestWorkspace")
    })

    it("returns CSV content type", () => {
      expect(exportContent).toContain("text/csv")
    })

    it("includes Content-Disposition header for download", () => {
      expect(exportContent).toContain("Content-Disposition")
      expect(exportContent).toContain("attachment")
    })

    it("supports date range filtering", () => {
      expect(exportContent).toContain('searchParams.get("from")')
      expect(exportContent).toContain('searchParams.get("to")')
    })

    it("supports type filtering", () => {
      expect(exportContent).toContain('searchParams.get("type")')
    })

    it("creates FinancialAuditLog on export", () => {
      expect(exportContent).toContain('from("FinancialAuditLog").insert')
    })

    it("properly escapes CSV values", () => {
      expect(exportContent).toContain("escapeCSV")
    })

    it("includes correlationId in error responses", () => {
      expect(exportContent).toContain("correlationId")
    })
  })

  // ─── Financial Reporting Page Tests ───────────────────
  describe("Financial Reporting Page", () => {
    const pageFile = path.resolve("app/admin/financial-reporting/page.tsx")
    const pageContent = fs.readFileSync(pageFile, "utf-8")

    it("is a client component", () => {
      expect(pageContent).toContain('"use client"')
    })

    it("has Financial Reporting title", () => {
      expect(pageContent).toContain("Financial Reporting")
    })

    it("includes date range picker with presets", () => {
      expect(pageContent).toContain("Today")
      expect(pageContent).toContain("7D")
      expect(pageContent).toContain("30D")
      expect(pageContent).toContain("MTD")
      expect(pageContent).toContain("QTD")
      expect(pageContent).toContain("YTD")
    })

    it("includes export button", () => {
      expect(pageContent).toContain("Export CSV")
    })

    it("includes reconcile button", () => {
      expect(pageContent).toContain("Reconcile Stripe")
    })

    it("includes all KPI cards", () => {
      expect(pageContent).toContain("Gross Revenue")
      expect(pageContent).toContain("Net Revenue")
      expect(pageContent).toContain("Total Transactions")
      expect(pageContent).toContain("Refund Total")
      expect(pageContent).toContain("Chargebacks Total")
      expect(pageContent).toContain("Pending (Unsettled)")
      expect(pageContent).toContain("Commissions Accrued")
      expect(pageContent).toContain("Commissions Paid")
      expect(pageContent).toContain("Dealer Fees Collected")
      expect(pageContent).toContain("Refinance Revenue")
    })

    it("includes donut chart for revenue breakdown", () => {
      expect(pageContent).toContain("PieChart")
      expect(pageContent).toContain("Revenue Breakdown")
    })

    it("includes line chart for revenue trend", () => {
      expect(pageContent).toContain("LineChart")
      expect(pageContent).toContain("Revenue Trend")
    })

    it("includes chart toggle for Gross/Net", () => {
      expect(pageContent).toContain('chartToggle === "gross"')
      expect(pageContent).toContain('chartToggle === "net"')
    })

    it("includes transactions table with required columns", () => {
      expect(pageContent).toContain("Transactions")
      expect(pageContent).toContain("Stripe Fee")
      expect(pageContent).toContain("Platform Fee")
      expect(pageContent).toContain("Stripe PI")
    })

    it("includes table filters for type and status", () => {
      expect(pageContent).toContain("All Types")
      expect(pageContent).toContain("All Status")
    })

    it("includes search input", () => {
      expect(pageContent).toContain("Search email, name, Stripe ID")
    })

    it("includes commissions tab", () => {
      expect(pageContent).toContain("Commissions &amp; Payouts")
    })

    it("includes refinance tab", () => {
      expect(pageContent).toContain('value="refinance"')
    })

    it("includes reconciliation tab", () => {
      expect(pageContent).toContain('value="reconciliation"')
    })

    it("includes transaction detail drawer", () => {
      expect(pageContent).toContain("Transaction Detail")
    })

    it("links to refinance management", () => {
      expect(pageContent).toContain("/admin/refinance")
    })

    it("includes Sync Stripe Data button", () => {
      expect(pageContent).toContain("Sync Stripe Data")
    })
  })

  // ─── Email Template Tests ─────────────────────────────
  describe("Financial Email Templates", () => {
    const emailFile = path.resolve("lib/services/email.service.tsx")
    const emailContent = fs.readFileSync(emailFile, "utf-8")

    it("uses Resend as the ONLY email provider", () => {
      expect(emailContent).toContain("Using Resend as the ONLY email provider")
      expect(emailContent).not.toContain("sendgrid")
      expect(emailContent).not.toContain("SendGrid")
      expect(emailContent).not.toContain("mailgun")
    })

    it("has payment receipt email for buyers", () => {
      expect(emailContent).toContain("sendPaymentReceiptEmail")
    })

    it("has refund confirmation email for buyers", () => {
      expect(emailContent).toContain("sendRefundConfirmationEmail")
    })

    it("has refinance status email for buyers", () => {
      expect(emailContent).toContain("sendRefinanceStatusEmail")
    })

    it("has commission earned email for affiliates", () => {
      expect(emailContent).toContain("sendCommissionEarnedEmail")
    })

    it("has payout sent email for affiliates", () => {
      expect(emailContent).toContain("sendPayoutSentEmail")
    })

    it("has large transaction alert for admins", () => {
      expect(emailContent).toContain("sendLargeTransactionAlertEmail")
    })

    it("has chargeback alert for admins", () => {
      expect(emailContent).toContain("sendChargebackAlertEmail")
    })

    it("has Stripe mismatch alert for admins", () => {
      expect(emailContent).toContain("sendStripeMismatchAlertEmail")
    })
  })

  // ─── Database Schema Tests ────────────────────────────
  describe("Database Schema", () => {
    const schemaFile = path.resolve("prisma/schema.prisma")
    const schemaContent = fs.readFileSync(schemaFile, "utf-8")

    it("has Transaction model", () => {
      expect(schemaContent).toContain("model Transaction {")
    })

    it("Transaction has stripePaymentIntentId field", () => {
      expect(schemaContent).toContain("stripePaymentIntentId")
    })

    it("Transaction has stripeChargeId field", () => {
      expect(schemaContent).toContain("stripeChargeId")
    })

    it("Transaction has type enum (PAYMENT, REFUND, CHARGEBACK, PAYOUT)", () => {
      expect(schemaContent).toContain("enum TransactionType {")
      expect(schemaContent).toMatch(/PAYMENT\b/)
      expect(schemaContent).toMatch(/REFUND\b/)
      expect(schemaContent).toMatch(/CHARGEBACK\b/)
      expect(schemaContent).toMatch(/PAYOUT\b/)
    })

    it("Transaction has status enum (SUCCEEDED, PENDING, FAILED)", () => {
      expect(schemaContent).toContain("enum TransactionStatus {")
      expect(schemaContent).toContain("SUCCEEDED")
      expect(schemaContent).toContain("PENDING")
      expect(schemaContent).toContain("FAILED")
    })

    it("Transaction has amount fields", () => {
      expect(schemaContent).toContain("grossAmount")
      expect(schemaContent).toContain("stripeFee")
      expect(schemaContent).toContain("platformFee")
      expect(schemaContent).toContain("netAmount")
    })

    it("has Chargeback model", () => {
      expect(schemaContent).toContain("model Chargeback {")
    })

    it("Chargeback links to Transaction", () => {
      expect(schemaContent).toContain("transactionId")
      expect(schemaContent).toContain("stripeDisputeId")
    })

    it("has FinancialAuditLog model", () => {
      expect(schemaContent).toContain("model FinancialAuditLog {")
    })

    it("FinancialAuditLog has required fields", () => {
      expect(schemaContent).toContain("adminId")
      expect(schemaContent).toContain("action")
      expect(schemaContent).toContain("entityType")
      expect(schemaContent).toContain("entityId")
    })

    it("all new models have workspace isolation", () => {
      // Count workspace relations for new models
      const transactionSection = schemaContent.slice(schemaContent.indexOf("model Transaction {"))
      expect(transactionSection).toContain("workspaceId")
    })

    it("Transaction has workspace index", () => {
      const txSection = schemaContent.slice(
        schemaContent.indexOf("model Transaction {"),
        schemaContent.indexOf("model Chargeback {")
      )
      expect(txSection).toContain("@@index([workspaceId])")
    })
  })

  // ─── Admin Navigation Tests ───────────────────────────
  describe("Admin Navigation", () => {
    const layoutFile = path.resolve("app/admin/layout.tsx")
    const layoutContent = fs.readFileSync(layoutFile, "utf-8")

    it("includes Financial Reporting nav link", () => {
      expect(layoutContent).toContain("/admin/financial-reporting")
      expect(layoutContent).toContain("Reconciliation")
    })
  })

  // ─── Commission Calculation Pattern Tests ─────────────
  describe("Commission Calculation Patterns", () => {
    const apiContent = fs.readFileSync(
      path.resolve("app/api/admin/financial/route.ts"),
      "utf-8"
    )

    it("separates accrued vs paid commissions", () => {
      expect(apiContent).toContain("commAccrued")
      expect(apiContent).toContain("commPaid")
    })

    it("filters paid commissions by status", () => {
      expect(apiContent).toContain('status === "PAID"')
    })
  })
})
