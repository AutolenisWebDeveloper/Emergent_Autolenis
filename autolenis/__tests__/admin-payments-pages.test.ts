import { describe, it, expect } from "vitest"
import fs from "fs"
import path from "path"

describe("Admin Payments Sub-Pages API RBAC", () => {
  const routeFiles = [
    "app/api/admin/payments/deposits/route.ts",
    "app/api/admin/payments/deposits/request/route.ts",
    "app/api/admin/payments/concierge-fees/route.ts",
    "app/api/admin/payments/concierge-fees/request/route.ts",
    "app/api/admin/payments/refunds/route.ts",
    "app/api/admin/payments/refunds/initiate/route.ts",
  ]

  it.each(routeFiles)("%s imports isAdminRole for RBAC", (routeFile) => {
    const filePath = path.resolve(routeFile)
    const content = fs.readFileSync(filePath, "utf-8")
    expect(content).toContain("isAdminRole")
  })

  it.each(routeFiles)("%s checks for admin role before proceeding", (routeFile) => {
    const filePath = path.resolve(routeFile)
    const content = fs.readFileSync(filePath, "utf-8")
    expect(content).toContain('!isAdminRole(user.role)')
  })

  it.each(routeFiles)("%s returns 401 for unauthorized users", (routeFile) => {
    const filePath = path.resolve(routeFile)
    const content = fs.readFileSync(filePath, "utf-8")
    expect(content).toContain("status: 401")
  })

  it.each(routeFiles)("%s supports test workspace mock data", (routeFile) => {
    const filePath = path.resolve(routeFile)
    const content = fs.readFileSync(filePath, "utf-8")
    expect(content).toContain("isTestWorkspace")
  })

  describe("POST routes return correlationId on 500", () => {
    const postRoutes = [
      "app/api/admin/payments/deposits/request/route.ts",
      "app/api/admin/payments/concierge-fees/request/route.ts",
      "app/api/admin/payments/refunds/initiate/route.ts",
    ]

    it.each(postRoutes)("%s includes correlationId in error responses", (routeFile) => {
      const filePath = path.resolve(routeFile)
      const content = fs.readFileSync(filePath, "utf-8")
      expect(content).toContain("correlationId")
    })
  })

  describe("GET routes return correlationId on 500", () => {
    const getRoutes = [
      "app/api/admin/payments/deposits/route.ts",
      "app/api/admin/payments/concierge-fees/route.ts",
      "app/api/admin/payments/refunds/route.ts",
    ]

    it.each(getRoutes)("%s includes correlationId in error responses", (routeFile) => {
      const filePath = path.resolve(routeFile)
      const content = fs.readFileSync(filePath, "utf-8")
      expect(content).toContain("correlationId")
    })
  })

  describe("POST routes validate required fields", () => {
    it("deposits/request requires buyerId and amount", () => {
      const content = fs.readFileSync(
        path.resolve("app/api/admin/payments/deposits/request/route.ts"),
        "utf-8",
      )
      expect(content).toContain("!buyerId")
      expect(content).toContain("!amount")
    })

    it("concierge-fees/request requires buyerId, dealId, and amount", () => {
      const content = fs.readFileSync(
        path.resolve("app/api/admin/payments/concierge-fees/request/route.ts"),
        "utf-8",
      )
      expect(content).toContain("!buyerId")
      expect(content).toContain("!dealId")
      expect(content).toContain("!amount")
    })

    it("refunds/initiate requires buyerId, amount, and reason", () => {
      const content = fs.readFileSync(
        path.resolve("app/api/admin/payments/refunds/initiate/route.ts"),
        "utf-8",
      )
      expect(content).toContain("!buyerId")
      expect(content).toContain("!amount")
      expect(content).toContain("!reason")
    })
  })

  describe("Page files exist with correct structure", () => {
    const pages = [
      { file: "app/admin/payments/deposits/page.tsx", title: "Deposits" },
      { file: "app/admin/payments/concierge-fees/page.tsx", title: "Concierge Fees" },
      { file: "app/admin/payments/refunds/page.tsx", title: "Refunds" },
    ]

    it.each(pages)("$file exists and is a client component", ({ file }) => {
      const content = fs.readFileSync(path.resolve(file), "utf-8")
      expect(content).toContain('"use client"')
    })

    it.each(pages)("$file contains the correct title: $title", ({ file, title }) => {
      const content = fs.readFileSync(path.resolve(file), "utf-8")
      expect(content).toContain(title)
    })

    it.each(pages)("$file links back to payments hub", ({ file }) => {
      const content = fs.readFileSync(path.resolve(file), "utf-8")
      expect(content).toContain("/admin/payments")
    })
  })

  describe("Hub page navigation", () => {
    it("payments hub page links to all three sub-pages", () => {
      const content = fs.readFileSync(
        path.resolve("app/admin/payments/page.tsx"),
        "utf-8",
      )
      expect(content).toContain("/admin/payments/deposits")
      expect(content).toContain("/admin/payments/concierge-fees")
      expect(content).toContain("/admin/payments/refunds")
    })
  })
})
