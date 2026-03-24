// Health check endpoint for monitoring
// Returns service status and database connectivity
// Protected: requires admin auth or internal API key

import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getSession, isAdminRole } from "@/lib/auth-server"

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
  const startTime = Date.now()

  try {
    // Require admin auth or internal API key
    const internalKey = process.env["INTERNAL_API_KEY"]
    const authHeader = request.headers.get("x-internal-key")

    if (internalKey && authHeader === internalKey) {
      // Internal key auth — proceed
    } else {
      const session = await getSession()
      if (!session || !isAdminRole(session.role)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

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
