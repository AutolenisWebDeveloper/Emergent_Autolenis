import { describe, it, expect } from "vitest"
import fs from "fs"
import path from "path"

describe("AdminListPageShell", () => {
  const shellPath = path.resolve("components/admin/admin-list-page-shell.tsx")
  const shellContent = fs.readFileSync(shellPath, "utf-8")

  describe("shell component exists and exports correctly", () => {
    it("should export AdminListPageShell", () => {
      expect(shellContent).toContain("export function AdminListPageShell")
    })

    it("should export AdminListColumn type", () => {
      expect(shellContent).toContain("export interface AdminListColumn")
    })

    it("should export StatCard type", () => {
      expect(shellContent).toContain("export interface StatCard")
    })
  })

  describe("shell renders required sections", () => {
    it("should render header section", () => {
      expect(shellContent).toContain('data-testid="shell-header"')
    })

    it("should render search section", () => {
      expect(shellContent).toContain('data-testid="shell-search"')
    })

    it("should render stats section", () => {
      expect(shellContent).toContain('data-testid="shell-stats"')
    })

    it("should render table section", () => {
      expect(shellContent).toContain('data-testid="shell-table"')
    })

    it("should render pagination section", () => {
      expect(shellContent).toContain('data-testid="shell-pagination"')
    })
  })

  describe("shell supports required props", () => {
    it("should accept title prop", () => {
      expect(shellContent).toContain("title")
    })

    it("should accept subtitle prop", () => {
      expect(shellContent).toContain("subtitle")
    })

    it("should accept headerActions prop", () => {
      expect(shellContent).toContain("headerActions")
    })

    it("should support empty state text", () => {
      expect(shellContent).toContain("emptyText")
    })

    it("should support loading state", () => {
      expect(shellContent).toContain("isLoading")
      expect(shellContent).toContain("loadingText")
    })

    it("should support error state", () => {
      expect(shellContent).toContain("errorText")
    })

    it("should accept filterSlot for custom filters", () => {
      expect(shellContent).toContain("filterSlot")
    })
  })
})

describe("Admin list pages use AdminListPageShell", () => {
  it("Buyers page imports and uses AdminListPageShell", () => {
    const content = fs.readFileSync(path.resolve("app/admin/buyers/page.tsx"), "utf-8")
    expect(content).toContain("AdminListPageShell")
    expect(content).toContain("@/components/admin/admin-list-page-shell")
  })

  it("Dealers page imports and uses AdminListPageShell", () => {
    const content = fs.readFileSync(path.resolve("app/admin/dealers/page.tsx"), "utf-8")
    expect(content).toContain("AdminListPageShell")
    expect(content).toContain("@/components/admin/admin-list-page-shell")
  })

  it("Affiliates page imports and uses AdminListPageShell", () => {
    const content = fs.readFileSync(path.resolve("app/admin/affiliates/page.tsx"), "utf-8")
    expect(content).toContain("AdminListPageShell")
    expect(content).toContain("@/components/admin/admin-list-page-shell")
  })
})

describe("Admin list pages use useAdminList hook where applicable", () => {
  it("Buyers page uses useAdminList hook", () => {
    const content = fs.readFileSync(path.resolve("app/admin/buyers/page.tsx"), "utf-8")
    expect(content).toContain("useAdminList")
    expect(content).toContain("@/hooks/use-admin-list")
  })

  it("Dealers page uses useAdminList hook", () => {
    const content = fs.readFileSync(path.resolve("app/admin/dealers/page.tsx"), "utf-8")
    expect(content).toContain("useAdminList")
    expect(content).toContain("@/hooks/use-admin-list")
  })
})

describe("useAdminList hook", () => {
  const hookPath = path.resolve("hooks/use-admin-list.ts")
  const hookContent = fs.readFileSync(hookPath, "utf-8")

  it("should exist and export useAdminList", () => {
    expect(hookContent).toContain("export function useAdminList")
  })

  it("should use SWR for data fetching", () => {
    expect(hookContent).toContain("useSWR")
  })

  it("should manage search state", () => {
    expect(hookContent).toContain("search")
    expect(hookContent).toContain("searchQuery")
    expect(hookContent).toContain("handleSearch")
  })

  it("should manage pagination state", () => {
    expect(hookContent).toContain("page")
    expect(hookContent).toContain("setPage")
  })

  it("should support extra params for filters", () => {
    expect(hookContent).toContain("extraParams")
  })
})

describe("Admin API role checks still use isAdminRole", () => {
  const apiRoutes = [
    "app/api/admin/buyers/route.ts",
    "app/api/admin/dealers/route.ts",
    "app/api/admin/affiliates/route.ts",
  ]

  apiRoutes.forEach((route) => {
    it(`${route} should use isAdminRole`, () => {
      const content = fs.readFileSync(path.resolve(route), "utf-8")
      expect(content).toContain("isAdminRole")
    })
  })
})
