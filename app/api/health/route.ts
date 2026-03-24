// Health check endpoint for monitoring
// Returns service status and database connectivity
// Public endpoint — no authentication required

import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function OPTIONS() {
  const appUrl = process.env['NEXT_PUBLIC_APP_URL'] || 'https://autolenis.com'
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": appUrl,
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-internal-key",
    },
  })
}

export async function GET(request: NextRequest) {
  // Health check is a public endpoint — monitoring tools and uptime checkers
  // must be able to query it without credentials. No sensitive information is
  // returned; the response only indicates service/database availability.
  const startTime = Date.now()

  try {
    // Check database connectivity
    const supabase = await createClient()
    const { error } = await supabase.from("User").select("id").limit(1)

    const responseTime = Date.now() - startTime

    if (error) {
      return NextResponse.json(
        {
          status: "unhealthy",
          database: "down",
          error: "Database connection failed",
          responseTime,
          timestamp: new Date().toISOString(),
        },
        { status: 503 },
      )
    }

    return NextResponse.json({
      status: "healthy",
      database: "up",
      responseTime,
      timestamp: new Date().toISOString(),
      version: process.env['npm_package_version'] || "unknown",
    })
  } catch (error) {
    const responseTime = Date.now() - startTime

    return NextResponse.json(
      {
        status: "unhealthy",
        error: "Service error",
        responseTime,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
