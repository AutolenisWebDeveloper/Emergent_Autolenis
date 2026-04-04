import { describe, it, expect } from "vitest"
import * as fs from "node:fs"
import * as path from "node:path"

/**
 * Guard against using <SelectItem value=""> which throws at runtime in
 * @radix-ui/react-select v2.x:
 *   "A <Select.Item /> must have a value prop that is not an empty string."
 *
 * This scanner catches the pattern across the entire app directory so the
 * bug cannot regress.
 */
describe("SelectItem empty-value guard", () => {
  function walk(dir: string): string[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    const files: string[] = []
    for (const e of entries) {
      const full = path.join(dir, e.name)
      if (e.isDirectory()) files.push(...walk(full))
      else if (/\.tsx?$/.test(e.name)) files.push(full)
    }
    return files
  }

  it('no <SelectItem value=""> or whitespace-only value in the codebase', () => {
    const root = path.resolve(__dirname, "..")
    const dirs = ["app", "components", "lib"].map((d) => path.join(root, d))
    const files = dirs.filter((d) => fs.existsSync(d)).flatMap(walk)
    const violations: string[] = []

    for (const file of files) {
      const content = fs.readFileSync(file, "utf-8")
      const lines = content.split("\n")
      for (let i = 0; i < lines.length; i++) {
        if (/SelectItem\s+[^>]*value\s*=\s*["']\s*["']/.test(lines[i])) {
          violations.push(`${path.relative(root, file)}:${i + 1}`)
        }
      }
    }

    expect(violations).toEqual([])
  })
})
