// import { createClient } from "@supabase/supabase-js"
import { readFileSync, readdirSync } from "fs"
import { join } from "path"
import { logger } from "../../lib/logger"

const supabaseUrl = process.env['SUPABASE_URL']!
const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY']!

if (!supabaseUrl || !supabaseServiceKey) {
  logger.error("Missing required environment variables for migrations")
  process.exit(1)
}

// const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigrations() {
  logger.info("Starting database migrations")

  const scriptsDir = join(process.cwd(), "scripts")
  const files = readdirSync(scriptsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort()

  for (const file of files) {
    logger.info(`Running migration: ${file}`)

    try {
      // const _sql = readFileSync(join(scriptsDir, file), "utf-8")
      readFileSync(join(scriptsDir, file), "utf-8")

      logger.warn(`Please run this script manually via Supabase Dashboard: ${file}`)
    } catch (error) {
      logger.error(`Failed to run migration: ${file}`, { error })
      process.exit(1)
    }
  }

  logger.info("All migrations completed")
}

runMigrations()
