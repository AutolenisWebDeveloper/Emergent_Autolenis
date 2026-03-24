/**
 * DEPRECATED — This unscoped route has been removed.
 *
 * Buyer access: /api/buyer/auctions/[auctionId]/best-price
 * Admin access:  /api/admin/auctions/[auctionId]/best-price
 * Admin recompute: /api/admin/auctions/[auctionId]/best-price/recompute
 */

import { NextResponse } from "next/server"

function goneResponse() {
  return NextResponse.json(
    {
      error: {
        code: "GONE",
        message: "This endpoint has been removed. Use /api/buyer/auctions/[auctionId]/best-price or /api/admin/auctions/[auctionId]/best-price instead.",
      },
    },
    { status: 410 },
  )
}

export async function POST() {
  return goneResponse()
}

export async function GET() {
  return goneResponse()
}
