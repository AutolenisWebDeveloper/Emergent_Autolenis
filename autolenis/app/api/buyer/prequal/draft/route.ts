import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { supabase } from "@/lib/db"
import { requireDatabase } from "@/lib/require-database"
import { isTestWorkspace } from "@/lib/app-mode"

export const dynamic = "force-dynamic"

// In-memory draft store for test workspaces (keyed by userId)
const testDrafts = new Map<string, Record<string, unknown>>()

// GET /api/buyer/prequal/draft — Load saved draft
export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user || user.role !== "BUYER") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    if (isTestWorkspace(user)) {
      const draft = testDrafts.get(user.userId) || null
      return NextResponse.json({ success: true, data: { draft } })
    }

    const dbUnavailable = requireDatabase()
    if (dbUnavailable) return dbUnavailable

    const { data: buyer } = await supabase
      .from("BuyerProfile")
      .select("id, firstName, lastName, phone, city, state, address, postalCode, monthlyIncomeCents, monthlyHousingCents, employer, employmentStatus, housingStatus")
      .eq("userId", user.userId)
      .maybeSingle()

    if (!buyer) {
      return NextResponse.json({ success: true, data: { draft: null } })
    }

    // Return existing profile data as the draft
    const draft = {
      firstName: buyer.firstName || "",
      lastName: buyer.lastName || "",
      phone: buyer.phone || "",
      address: buyer.address || "",
      city: buyer.city || "",
      state: buyer.state || "",
      zip: buyer.postalCode || "",
      employment: buyer.employmentStatus || "",
      employer: buyer.employer || "",
      annualIncome: buyer.monthlyIncomeCents ? Math.round((buyer.monthlyIncomeCents / 100) * 12) : "",
      housingStatus: buyer.housingStatus || "RENT",
      monthlyHousing: buyer.monthlyHousingCents ? buyer.monthlyHousingCents / 100 : "",
    }

    return NextResponse.json({ success: true, data: { draft } })
  } catch (error) {
    console.error("[PreQual Draft] GET error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch draft" }, { status: 500 })
  }
}

// PUT /api/buyer/prequal/draft — Upsert draft (debounced from client)
export async function PUT(request: Request) {
  try {
    const user = await getSessionUser()
    if (!user || user.role !== "BUYER") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    if (isTestWorkspace(user)) {
      testDrafts.set(user.userId, { ...body, updatedAt: new Date().toISOString() })
      return NextResponse.json({ success: true, data: { saved: true } })
    }

    const dbCheck = requireDatabase()
    if (dbCheck) return dbCheck

    // Upsert buyer profile with draft data
    const profileUpdate: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    }

    if (body.firstName !== undefined) profileUpdate.firstName = body.firstName
    if (body.lastName !== undefined) profileUpdate.lastName = body.lastName
    if (body.phone !== undefined) profileUpdate.phone = body.phone
    if (body.address !== undefined) profileUpdate.address = body.address
    if (body.city !== undefined) profileUpdate.city = body.city
    if (body.state !== undefined) profileUpdate.state = body.state
    if (body.zip !== undefined) profileUpdate.postalCode = body.zip
    if (body.employment !== undefined) profileUpdate.employmentStatus = body.employment
    if (body.employer !== undefined) profileUpdate.employer = body.employer
    if (body.annualIncome !== undefined && body.annualIncome !== "") {
      profileUpdate.monthlyIncomeCents = Math.round((Number(body.annualIncome) / 12) * 100)
    }
    if (body.housingStatus !== undefined) profileUpdate.housingStatus = body.housingStatus
    if (body.monthlyHousing !== undefined && body.monthlyHousing !== "") {
      profileUpdate.monthlyHousingCents = Math.round(Number(body.monthlyHousing) * 100)
    }

    // Check if profile exists
    const { data: existing } = await supabase
      .from("BuyerProfile")
      .select("id")
      .eq("userId", user.userId)
      .maybeSingle()

    if (existing) {
      const { error } = await supabase
        .from("BuyerProfile")
        .update(profileUpdate)
        .eq("userId", user.userId)

      if (error) {
        console.error("[PreQual Draft] Update error:", error)
        return NextResponse.json({ success: false, error: "Failed to save draft" }, { status: 500 })
      }
    } else {
      const { error } = await supabase
        .from("BuyerProfile")
        .insert({
          userId: user.userId,
          workspaceId: user.workspace_id || null,
          ...profileUpdate,
        })

      if (error) {
        console.error("[PreQual Draft] Insert error:", error)
        return NextResponse.json({ success: false, error: "Failed to save draft" }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, data: { saved: true } })
  } catch (error) {
    console.error("[PreQual Draft] PUT error:", error)
    return NextResponse.json({ success: false, error: "Failed to save draft" }, { status: 500 })
  }
}
