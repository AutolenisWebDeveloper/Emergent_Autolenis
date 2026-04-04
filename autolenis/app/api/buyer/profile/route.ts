import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { supabase } from "@/lib/db"
import { requireDatabase } from "@/lib/require-database"
import { buyerProfileSchema } from "@/lib/validators/prequal"
import { isTestWorkspace } from "@/lib/app-mode"
import { mockDb } from "@/lib/mocks/mockStore"
import { ZodError } from "zod"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user || user.role !== "BUYER") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    if (isTestWorkspace(user)) {
      const profile = mockDb.buyerProfiles.find((buyer: any) => buyer.userId === user.userId) || null
      return NextResponse.json({ success: true, data: { profile } })
    }

    const dbUnavailable = requireDatabase()
    if (dbUnavailable) return dbUnavailable

    const { data: profile, error } = await supabase
      .from("BuyerProfile")
      .select("*")
      .eq("userId", user.userId)
      .maybeSingle()

    if (error) {
      console.error("[Buyer Profile] Failed to fetch profile:", error)
      return NextResponse.json({ success: false, error: "Failed to load profile" }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: { profile } })
  } catch (error) {
    console.error("[Buyer Profile] GET error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch profile" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getSessionUser()
    if (!user || user.role !== "BUYER") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { email, ...profileBody } = body || {}

    if (typeof profileBody.phone === "string") {
      const normalizedPhone = profileBody.phone.replace(/\D/g, "")
      profileBody.phone = normalizedPhone || undefined
    }

    const sanitizedProfile = Object.fromEntries(
      Object.entries(profileBody).filter(([, value]) => value !== "" && value !== null && value !== undefined),
    )

    const validated = buyerProfileSchema.parse(sanitizedProfile)
    const now = new Date().toISOString()

    if (isTestWorkspace(user)) {
      const existing = mockDb.buyerProfiles.find((buyer: any) => buyer.userId === user.userId)
      if (existing) {
        Object.assign(existing, validated)
      }
      return NextResponse.json({ success: true, data: { profile: existing || validated } })
    }

    const dbCheck = requireDatabase()
    if (dbCheck) return dbCheck

    if (email || validated.firstName || validated.lastName || validated.phone) {
      const userUpdates: Record<string, unknown> = { updatedAt: now }
      if (email) userUpdates.email = email
      if (validated.firstName) userUpdates.first_name = validated.firstName
      if (validated.lastName) userUpdates.last_name = validated.lastName
      if (validated.phone) userUpdates.phone = validated.phone

      const { error: userError } = await supabase.from("User").update(userUpdates).eq("id", user.userId)
      if (userError) {
        console.error("[Buyer Profile] Failed to update user:", userError)
        return NextResponse.json({ success: false, error: "Failed to update user" }, { status: 500 })
      }
    }

    const { data: existingProfile } = await supabase
      .from("BuyerProfile")
      .select("id")
      .eq("userId", user.userId)
      .maybeSingle()

    let profile = null
    if (existingProfile) {
      const { data, error } = await supabase
        .from("BuyerProfile")
        .update({
          ...validated,
          updatedAt: now,
        })
        .eq("userId", user.userId)
        .select("*")
        .single()

      if (error) {
        console.error("[Buyer Profile] Failed to update profile:", error)
        return NextResponse.json({ success: false, error: "Failed to update profile" }, { status: 500 })
      }
      profile = data
    } else {
      const profilePayload: Record<string, unknown> = {
        userId: user.userId,
        address: "",
        city: "",
        state: "",
        zip: "",
        createdAt: now,
        updatedAt: now,
        ...validated,
      }

      if (!profilePayload.firstName) profilePayload.firstName = ""
      if (!profilePayload.lastName) profilePayload.lastName = ""
      if (profilePayload.phone === undefined) profilePayload.phone = null

      const { data, error } = await supabase
        .from("BuyerProfile")
        .insert(profilePayload)
        .select("*")
        .single()

      if (error) {
        console.error("[Buyer Profile] Failed to create profile:", error)
        return NextResponse.json({ success: false, error: "Failed to create profile" }, { status: 500 })
      }
      profile = data
    }

    return NextResponse.json({
      success: true,
      data: { profile },
    })
  } catch (error) {
    if (error instanceof ZodError) {
      const fields: Record<string, string> = {}
      error.errors.forEach((err) => {
        fields[err.path.join(".")] = err.message
      })
      return NextResponse.json(
        {
          success: false,
          error: error.errors[0]?.message || "Validation failed",
          code: "VALIDATION_ERROR",
          fields,
        },
        { status: 400 },
      )
    }
    console.error("[Buyer Profile] PATCH error:", error)
    return NextResponse.json({ success: false, error: "Failed to update profile" }, { status: 500 })
  }
}
