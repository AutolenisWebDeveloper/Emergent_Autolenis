import { describe, it, expect } from "vitest"
import fs from "fs"
import path from "path"

/**
 * Comprehensive Audit Remediation Test
 * 
 * Validates all fixes from the production readiness audit:
 * 1. Error boundaries exist for all portals
 * 2. No API routes expose error.message to users
 * 3. All portal pages have loading.tsx boundaries
 * 4. No "use client" + "export const dynamic" conflicts
 * 5. All portal catch blocks use status 500 for unexpected errors
 */

const ROOT = process.cwd()

function readFile(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), "utf-8")
}

function fileExists(relPath: string): boolean {
  return fs.existsSync(path.join(ROOT, relPath))
}

function findFiles(dir: string, pattern: string): string[] {
  const results: string[] = []
  const absDir = path.join(ROOT, dir)
  if (!fs.existsSync(absDir)) return results

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)
      if (entry.isDirectory() && entry.name !== "node_modules") {
        walk(fullPath)
      } else if (entry.isFile() && entry.name === pattern) {
        results.push(path.relative(ROOT, fullPath))
      }
    }
  }

  walk(absDir)
  return results
}

describe("Audit Remediation", () => {
  describe("Error Boundaries", () => {
    const errorBoundaries = [
      "app/error.tsx",
      "app/not-found.tsx",
      "app/buyer/error.tsx",
      "app/dealer/error.tsx",
      "app/affiliate/error.tsx",
      "app/admin/error.tsx",
    ]

    for (const file of errorBoundaries) {
      it(`${file} exists`, () => {
        expect(fileExists(file)).toBe(true)
      })
    }

    it("portal error boundaries use ErrorState component", () => {
      for (const portal of ["buyer", "dealer", "affiliate", "admin"]) {
        const content = readFile(`app/${portal}/error.tsx`)
        expect(content).toContain('"use client"')
        expect(content).toContain("ErrorState")
        expect(content).toContain("reset")
      }
    })

    it("root error.tsx is a client component with reset", () => {
      const content = readFile("app/error.tsx")
      expect(content).toContain('"use client"')
      expect(content).toContain("reset")
    })

    it("not-found.tsx has link back home", () => {
      const content = readFile("app/not-found.tsx")
      expect(content).toContain('href="/"')
    })
  })

  describe("API Error Handling - No error.message exposure", () => {
    const apiDirs = [
      "app/api/affiliate",
      "app/api/dealer",
      "app/api/buyer",
    ]

    for (const dir of apiDirs) {
      it(`${dir}/ routes do not expose error.message in responses`, () => {
        const files = findFiles(dir, "route.ts")
        
        for (const file of files) {
          const content = readFile(file)
          
          // Find all NextResponse.json calls in catch blocks
          // Pattern: error.message used in NextResponse.json (not in console/logger)
          const lines = content.split("\n")
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i]
            if (
              line.includes("NextResponse.json") && 
              line.includes("error.message") &&
              !line.includes("console.") &&
              !line.includes("logger.")
            ) {
              throw new Error(
                `${file}:${i + 1} exposes error.message in response: ${line.trim()}`
              )
            }
          }
        }
      })
    }
  })

  describe("API Error Handling - Admin routes use static errors", () => {
    it("admin API catch blocks use static error messages", () => {
      const files = findFiles("app/api/admin", "route.ts")
      const violations: string[] = []
      
      // Exclude health endpoint (diagnostic) and auth signin (controlled)
      const excludePatterns = ["health/route.ts", "auth/signin/route.ts"]
      
      for (const file of files) {
        if (excludePatterns.some(p => file.includes(p))) continue
        
        const content = readFile(file)
        const lines = content.split("\n")
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]
          if (
            line.includes("NextResponse.json") && 
            line.includes("error.message") &&
            !line.includes("console.") &&
            !line.includes("logger.")
          ) {
            violations.push(`${file}:${i + 1}: ${line.trim()}`)
          }
        }
      }
      
      expect(violations).toEqual([])
    })
  })

  describe("Portal Loading Boundaries", () => {
    const portals = ["buyer", "dealer", "affiliate/portal", "admin"]
    
    for (const portal of portals) {
      it(`all ${portal}/ page directories have loading.tsx`, () => {
        const pages = findFiles(`app/${portal}`, "page.tsx")
        const missing: string[] = []
        
        for (const page of pages) {
          const dir = path.dirname(page)
          const loadingPath = path.join(dir, "loading.tsx")
          if (!fileExists(loadingPath)) {
            missing.push(dir)
          }
        }
        
        expect(missing).toEqual([])
      })
    }
  })

  describe("No 'use client' + 'export const dynamic' conflicts", () => {
    const portals = ["buyer", "dealer", "affiliate", "admin"]
    
    for (const portal of portals) {
      it(`${portal}/ pages have no client+dynamic conflicts`, () => {
        const pages = findFiles(`app/${portal}`, "page.tsx")
        const violations: string[] = []
        
        for (const page of pages) {
          const content = readFile(page)
          if (
            content.includes('"use client"') && 
            content.includes("export const dynamic")
          ) {
            violations.push(page)
          }
        }
        
        expect(violations).toEqual([])
      })
    }
  })

  describe("Catch blocks use 500 for unexpected errors", () => {
    it("affiliate API catch blocks do not return 400 for server errors", () => {
      const files = findFiles("app/api/affiliate", "route.ts")
      const violations: string[] = []
      
      for (const file of files) {
        const content = readFile(file)
        // Check for status: 400 in catch blocks (should be 500)
        const catchBlockRegex = /catch\s*\([^)]*\)\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g
        let match
        while ((match = catchBlockRegex.exec(content)) !== null) {
          const catchBody = match[1]
          if (
            catchBody.includes("status: 400") && 
            catchBody.includes("NextResponse.json")
          ) {
            violations.push(file)
            break
          }
        }
      }
      
      expect(violations).toEqual([])
    })
  })
})
