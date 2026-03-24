// Health check endpoint at root level for load balancers
// Returns simple JSON status - no auth required

import { NextResponse } from "next/server"

export async function OPTIONS() {
  const appUrl = process.env['NEXT_PUBLIC_APP_URL'] || 'https://autolenis.com'
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": appUrl,
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}

export async function GET() {
  return NextResponse.json(
    {
      status: "healthy",
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  )
}
