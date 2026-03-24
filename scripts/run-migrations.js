/**
 * Migration runner for v0 runtime
 * Uses Supabase REST API to execute SQL migrations
 *
 * This script handles the SSL requirement by using the Supabase client
 * instead of direct PostgreSQL connections.
 */

const migrations = [
  {
    name: "02-add-dealer-users-table",
    sql: `
      CREATE TABLE IF NOT EXISTS "DealerUser" (
        "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "userId" TEXT UNIQUE NOT NULL,
        "dealerId" TEXT NOT NULL,
        "roleLabel" TEXT,
        "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
        FOREIGN KEY ("dealerId") REFERENCES "Dealer"("id") ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS "DealerUser_userId_idx" ON "DealerUser"("userId");
      CREATE INDEX IF NOT EXISTS "DealerUser_dealerId_idx" ON "DealerUser"("dealerId");
    `,
  },
  {
    name: "03-add-missing-buyer-fields",
    sql: `
      ALTER TABLE "BuyerProfile" ADD COLUMN IF NOT EXISTS "middleName" TEXT;
      ALTER TABLE "BuyerProfile" ADD COLUMN IF NOT EXISTS "suffix" TEXT;
      ALTER TABLE "BuyerProfile" ADD COLUMN IF NOT EXISTS "dateOfBirth" TIMESTAMP(3);
      ALTER TABLE "BuyerProfile" ADD COLUMN IF NOT EXISTS "ssn" TEXT;
      ALTER TABLE "BuyerProfile" ADD COLUMN IF NOT EXISTS "driversLicenseNumber" TEXT;
      ALTER TABLE "BuyerProfile" ADD COLUMN IF NOT EXISTS "driversLicenseState" TEXT;
      ALTER TABLE "BuyerProfile" ADD COLUMN IF NOT EXISTS "employmentStatus" TEXT;
      ALTER TABLE "BuyerProfile" ADD COLUMN IF NOT EXISTS "employerName" TEXT;
      ALTER TABLE "BuyerProfile" ADD COLUMN IF NOT EXISTS "monthlyIncome" DECIMAL(10,2);
      ALTER TABLE "BuyerProfile" ADD COLUMN IF NOT EXISTS "housingStatus" TEXT;
      ALTER TABLE "BuyerProfile" ADD COLUMN IF NOT EXISTS "monthlyHousingPayment" DECIMAL(10,2);
    `,
  },
  {
    name: "04-add-missing-dealer-fields",
    sql: `
      ALTER TABLE "Dealer" ADD COLUMN IF NOT EXISTS "businessType" TEXT;
      ALTER TABLE "Dealer" ADD COLUMN IF NOT EXISTS "yearsInBusiness" INTEGER;
      ALTER TABLE "Dealer" ADD COLUMN IF NOT EXISTS "inventorySize" INTEGER;
      ALTER TABLE "Dealer" ADD COLUMN IF NOT EXISTS "primaryContactName" TEXT;
      ALTER TABLE "Dealer" ADD COLUMN IF NOT EXISTS "primaryContactEmail" TEXT;
      ALTER TABLE "Dealer" ADD COLUMN IF NOT EXISTS "primaryContactPhone" TEXT;
      ALTER TABLE "Dealer" ADD COLUMN IF NOT EXISTS "bankName" TEXT;
      ALTER TABLE "Dealer" ADD COLUMN IF NOT EXISTS "bankRoutingNumber" TEXT;
      ALTER TABLE "Dealer" ADD COLUMN IF NOT EXISTS "bankAccountNumber" TEXT;
    `,
  },
  {
    name: "05-add-vehicle-fields",
    sql: `
      ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "bodyStyle" TEXT;
      ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "drivetrain" TEXT;
      ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "fuelType" TEXT;
      ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "transmission" TEXT;
      ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "engineSize" TEXT;
      ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "exteriorColor" TEXT;
      ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "interiorColor" TEXT;
      ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "features" TEXT[];
    `,
  },
]

async function runMigrations() {
  const supabaseUrl = process.env['SUPABASE_URL'] || process.env['NEXT_PUBLIC_SUPABASE_URL']
  const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY']

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables")
    process.exit(1)
  }

  console.log("Starting migrations...\n")

  for (const migration of migrations) {
    console.log(`Running migration: ${migration.name}`)

    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ query: migration.sql }),
      })

      if (!response.ok) {
        // Try alternative: direct SQL via postgres endpoint
        const pgResponse = await fetch(`${supabaseUrl}/pg/query`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ query: migration.sql }),
        })

        if (!pgResponse.ok) {
          const errorText = await pgResponse.text()
          console.log(`  Warning: ${migration.name} - ${errorText}`)
          console.log("  Continuing to next migration...\n")
          continue
        }
      }

      console.log(`  Success: ${migration.name}\n`)
    } catch (error) {
      console.log(`  Warning: ${migration.name} - ${error.message}`)
      console.log("  Continuing to next migration...\n")
    }
  }

  console.log("Migrations complete!")
}

runMigrations()
