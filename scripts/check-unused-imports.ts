/**
 * Check for unused imports across the codebase
 * This is a basic implementation - for production use a tool like knip or depcheck
 */

import { readFileSync, readdirSync, statSync } from "fs"
import { join } from "path"
import { logger } from "../lib/logger"

const EXCLUDED_DIRS = ["node_modules", ".next", "dist", "build", ".git"]
const INCLUDED_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"]

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = readdirSync(dirPath)

  files.forEach((file) => {
    const filePath = join(dirPath, file)
    const stat = statSync(filePath)

    if (stat.isDirectory()) {
      if (!EXCLUDED_DIRS.includes(file)) {
        arrayOfFiles = getAllFiles(filePath, arrayOfFiles)
      }
    } else {
      if (INCLUDED_EXTENSIONS.some((ext) => file.endsWith(ext))) {
        arrayOfFiles.push(filePath)
      }
    }
  })

  return arrayOfFiles
}

function checkUnusedImports(filePath: string): string[] {
  const content = readFileSync(filePath, "utf-8")
  const unused: string[] = []

  // Simple regex-based check (not perfect, but catches common cases)
  const importRegex = /import\s+(?:{([^}]+)}|\*\s+as\s+(\w+)|(\w+))\s+from/g
  let match

  while ((match = importRegex.exec(content)) !== null) {
    const imports = match[1] || match[2] || match[3]
    if (!imports) continue

    const importNames = imports.split(",").map((name) => name.trim().split(" as ")[1] || name.trim())

    importNames.forEach((importName) => {
      // Check if import is used in the file (excluding the import line itself)
      // const _importLineIndex = lines.findIndex((line) => line.includes(`import`) && line.includes(importName))
      const usageCount = content.split(importName).length - 1

      // If appears only once (in the import statement), it's likely unused
      if (usageCount === 1) {
        unused.push(`${filePath}: Potentially unused import '${importName}'`)
      }
    })
  }

  return unused
}

function main() {
  logger.info("Starting unused imports check")

  const files = getAllFiles(process.cwd())
  let totalUnused = 0

  files.forEach((file) => {
    const unused = checkUnusedImports(file)
    if (unused.length > 0) {
      unused.forEach((msg) => logger.warn(msg))
      totalUnused += unused.length
    }
  })

  logger.info(`Check complete. Found ${totalUnused} potentially unused imports`)
  logger.info("Note: This is a basic check. Some imports may be used in ways not detected")
  logger.info("For more accurate results, use tools like 'knip' or 'ts-prune'")
}

main()
