import { NextResponse } from "next/server"
import { AuctionService } from "@/lib/services/auction.service"
import { requireAuth } from "@/lib/auth-server"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // SECURITY: Require authentication - only BUYER, DEALER, or ADMIN can view auctions
    const session = await requireAuth(["BUYER", "DEALER", "DEALER_USER", "ADMIN", "SUPER_ADMIN"])
    
    const { id } = await params
    const auction = await AuctionService.getAuction(id)

    if (!auction) {
      return NextResponse.json({ success: false, error: "Auction not found" }, { status: 404 })
    }
    
    // SECURITY: Filter sensitive data based on role
    // Only return full buyer preQualification data to the auction owner or admins
    const isOwner = auction.userId === session.userId
    const isAdmin = session.role === "ADMIN" || session.role === "SUPER_ADMIN"
    
    if (!isOwner && !isAdmin && auction.buyer?.preQualification) {
      // Remove sensitive financial data for non-owners/non-admins
      delete auction.buyer.preQualification
    }

    return NextResponse.json({
      success: true,
      data: { auction },
    })
  } catch (error: any) {
    if (error.statusCode === 401) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 })
    }
    if (error.statusCode === 403) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
