import { NextResponse } from "next/server"
import { cookies, headers } from "next/headers"
import { getSession, clearSession } from "@/lib/auth-server"
import { supabase as dbClient } from "@/lib/db"
import { requireDatabase } from "@/lib/require-database"
import { logger } from "@/lib/logger"
import { isTestWorkspace } from "@/lib/app-mode"
import { mockDb, mockSelectors } from "@/lib/mocks/mockStore"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    // For TEST workspace users, return mock user data
    if (isTestWorkspace(session)) {
      const cookieStore = await cookies()
      const headerStore = await headers()
      const mockRole = cookieStore.get("mock_role")?.value?.toUpperCase()
      const pathname = headerStore.get("x-pathname") || ""
      const mockUser = mockSelectors.sessionUser(pathname, mockRole)
      const buyerProfile = mockDb.buyerProfiles.find((buyer: any) => buyer.userId === mockUser.userId) || null
      const affiliateProfile =
        mockDb.affiliateProfiles.find((affiliate: any) => affiliate.userId === mockUser.userId) || null
      const dealerProfile = mockDb.dealerProfiles.find((dealer: any) => dealer.userId === mockUser.userId) || null

      return NextResponse.json({
        success: true,
        data: {
          user: {
            id: mockUser.id,
            email: mockUser.email,
            role: mockUser.role,
            is_affiliate: mockUser.is_affiliate || false,
            firstName: mockUser.first_name,
            lastName: mockUser.last_name,
            buyerProfile,
            affiliateProfile,
            dealerProfile,
            workspace_mode: "TEST",
          },
        },
      })
    }

    // Try to fetch full user from database, but fall back to session data
    // when the database is not configured (e.g. preview deployments)
    const dbUnavailable = requireDatabase()
    if (dbUnavailable) {
      logger.debug("Database not configured, returning session-only data", { userId: session.userId })
      return NextResponse.json({
        success: true,
        data: {
          user: {
            id: session.userId,
            email: session.email,
            role: session.role,
            is_affiliate: session.is_affiliate || false,
            workspace_mode: session.workspace_mode || "LIVE",
          },
        },
      })
    }

    const { data: user, error } = await dbClient
      .from("User")
      .select("id, email, role, is_email_verified, is_affiliate, createdAt, first_name, last_name, phone")
      .eq("id", session.userId)
      .maybeSingle()

    if (error) {
      logger.error("Database error fetching user", { error, userId: session.userId })
      // Fall back to session data on database errors
      return NextResponse.json({
        success: true,
        data: {
          user: {
            id: session.userId,
            email: session.email,
            role: session.role,
            is_affiliate: session.is_affiliate || false,
            workspace_mode: session.workspace_mode || "LIVE",
          },
        },
      })
    }

    if (!user) {
      logger.warn("User not found for session", { userId: session.userId })
      await clearSession()
      return NextResponse.json({ success: false, error: "Session expired. Please sign in again." }, { status: 401 })
    }

    let buyerProfile = null
    let dealerProfile = null
    let affiliateProfile = null

    if (user.role === "BUYER") {
      const { data } = await dbClient.from("BuyerProfile").select("*").eq("userId", user.id).maybeSingle()
      buyerProfile = data

      if (user.is_affiliate) {
        const { data: affData } = await dbClient.from("Affiliate").select("*").eq("userId", user.id).maybeSingle()
        affiliateProfile = affData
      }
    } else if (user.role === "DEALER" || user.role === "DEALER_USER") {
      const { data } = await dbClient.from("Dealer").select("*").eq("userId", user.id).maybeSingle()
      dealerProfile = data
    } else if (user.role === "AFFILIATE" || user.role === "AFFILIATE_ONLY") {
      const { data } = await dbClient.from("Affiliate").select("*").eq("userId", user.id).maybeSingle()
      affiliateProfile = data
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          is_affiliate: user.is_affiliate || false,
          emailVerified: user.is_email_verified,
          createdAt: user.createdAt,
          firstName: user.first_name,
          lastName: user.last_name,
          phone: user.phone,
          buyerProfile,
          dealerProfile,
          affiliateProfile,
          workspace_mode: session.workspace_mode || "LIVE",
        },
      },
    })
  } catch (error: any) {
    logger.error("Error in /api/auth/me", { error: error.message })
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
