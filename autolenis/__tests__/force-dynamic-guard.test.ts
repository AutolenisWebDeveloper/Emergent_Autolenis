/**
 * Force-Dynamic Guard — Comprehensive
 *
 * Scans ALL portal pages (buyer, dealer, affiliate, admin) to ensure
 * no "use client" component exports `const dynamic = "force-dynamic"`.
 * This breaks Turbopack's module graph and is invalid in client components.
 */
import { describe, expect, it } from "vitest"
import { readFileSync, readdirSync } from "fs"
import { resolve, join, relative } from "path"

const ROOT = resolve(__dirname, "..")

function findPages(dir: string): string[] {
  const results: string[] = []
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) {
        results.push(...findPages(fullPath))
      } else if (entry.name === "page.tsx" || entry.name === "page.ts") {
        results.push(fullPath)
      }
    }
  } catch {
    // directory may not exist
  }
  return results
}

describe("No 'use client' + force-dynamic conflict — All Portals", () => {
  const PORTAL_DIRS = ["app/buyer", "app/dealer", "app/affiliate", "app/admin"]

  for (const portalDir of PORTAL_DIRS) {
    const pages = findPages(resolve(ROOT, portalDir))

    for (const page of pages) {
      const relPath = relative(ROOT, page)

      it(`${relPath} does not combine "use client" with export const dynamic`, () => {
        const src = readFileSync(page, "utf-8")
        if (src.includes('"use client"') || src.includes("'use client'")) {
          expect(src).not.toMatch(/export\s+const\s+dynamic\s*=/)
        }
      })
    }
  }
})
