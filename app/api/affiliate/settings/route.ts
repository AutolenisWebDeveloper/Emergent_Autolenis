import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { supabase } from "@/lib/db"
import { requireDatabase } from "@/lib/require-database"
import { isTestWorkspace } from "@/lib/app-mode"
import { mockDb } from "@/lib/mocks/mockStore"

const getAffiliateAccess = (user: Awaited<ReturnType<typeof getSessionUser>>) => {
  return (
    user &&
    (user.role === "AFFILIATE" ||
      user.role === "AFFILIATE_ONLY" ||
      (user.role === "BUYER" && user.is_affiliate === true))
  )
}

export async function GET(_req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!getAffiliateAccess(user)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    if (isTestWorkspace(user)) {
      const mockUser = mockDb.users.find((item: any) => item.id === user!.userId)
      const profile = {
        firstName: mockUser?.firstName || "",
        lastName: mockUser?.lastName || "",
        email: mockUser?.email || "",
        phone: "",
      }
      return NextResponse.json({ success: true, data: { profile } })
    }

    const dbUnavailable = requireDatabase()
    if (dbUnavailable) return dbUnavailable

    const { data: userRecord } = await supabase
      .from("User")
      .select("id, email, first_name, last_name, phone")
      .eq("id", user!.userId)
      .maybeSingle()

    const profile = {
      firstName: userRecord?.first_name || "",
      lastName: userRecord?.last_name || "",
      email: userRecord?.email || "",
      phone: userRecord?.phone || "",
    }

    return NextResponse.json({ success: true, data: { profile } })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to load settings" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!getAffiliateAccess(user)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { firstName, lastName, email, phone } = body || {}
    const now = new Date().toISOString()

    if (isTestWorkspace(user)) {
      const mockUser = mockDb.users.find((item: any) => item.id === user!.userId)
      if (mockUser) {
        mockUser.firstName = firstName ?? mockUser.firstName
        mockUser.lastName = lastName ?? mockUser.lastName
        mockUser.email = email ?? mockUser.email
      }
      return NextResponse.json({ success: true })
    }

    const dbCheck = requireDatabase()
    if (dbCheck) return dbCheck

    const userUpdates: Record<string, unknown> = { updatedAt: now }
    if (firstName !== undefined) userUpdates.first_name = firstName
    if (lastName !== undefined) userUpdates.last_name = lastName
    if (email !== undefined) userUpdates.email = email
    if (phone !== undefined) userUpdates.phone = phone

    const { error: userError } = await supabase.from("User").update(userUpdates).eq("id", user!.userId)
    if (userError) {
      return NextResponse.json({ success: false, error: "Failed to update user" }, { status: 500 })
    }

    const { error: affiliateError } = await supabase
      .from("Affiliate")
      .update({
        firstName: firstName ?? null,
        lastName: lastName ?? null,
        updatedAt: now,
      })
      .eq("userId", user!.userId)

    if (affiliateError) {
      return NextResponse.json({ success: false, error: "Failed to update affiliate profile" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to update settings" }, { status: 500 })
  }
}
