import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { supabase } from "@/lib/db"
import { requireDatabase } from "@/lib/require-database"
import { InventoryStatus } from "@/lib/constants/statuses"

export const dynamic = "force-dynamic"

const MAX_SHORTLIST_ITEMS = 10

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user || user.role !== "BUYER") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const dbUnavailable = requireDatabase()
    if (dbUnavailable) return dbUnavailable

    // Get buyer profile
    const { data: buyer, error: buyerError } = await supabase
      .from("BuyerProfile")
      .select("id")
      .eq("userId", user.userId)
      .maybeSingle()

    if (buyerError || !buyer) {
      console.warn("[Shortlist API] No buyer profile found:", buyerError?.message)
      return NextResponse.json({ success: true, data: getDefaultShortlist() })
    }

    // Get or create shortlist
    let { data: shortlist } = await supabase
      .from("Shortlist")
      .select("id, name, active")
      .eq("buyerId", buyer.id)
      .eq("active", true)
      .maybeSingle()

    if (!shortlist) {
      // Create new shortlist
      const { data: newShortlist, error: createError } = await supabase
        .from("Shortlist")
        .insert({
          buyerId: buyer.id,
          name: "My Shortlist",
          active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .select("id, name, active")
        .single()

      if (createError) {
        console.error("[Shortlist API] Error creating shortlist:", createError)
        return NextResponse.json({ success: true, data: getDefaultShortlist() })
      }
      shortlist = newShortlist
    }

    // Get shortlist items with vehicle and dealer info
    const { data: items, error: itemsError } = await supabase
      .from("ShortlistItem")
      .select(`
        id,
        inventoryItemId,
        notes,
        is_primary_choice,
        addedAt,
        removed_at,
        inventoryItem:InventoryItem(
          id,
          priceCents,
          price_cents,
          status,
          photos_json,
          photosJson,
          year,
          make,
          model,
          trim,
          bodyStyle,
          body_style,
          vin,
          mileage,
          dealer:Dealer(
            id,
            businessName,
            name,
            city,
            state
          )
        )
      `)
      .eq("shortlistId", shortlist.id)
      .is("removed_at", null)
      .order("addedAt", { ascending: false })

    if (itemsError) {
      console.error("[Shortlist API] Error fetching items:", itemsError)
    }

    // Get prequalification for budget info
    const { data: preQual } = await supabase
      .from("PreQualification")
      .select("maxOtdAmountCents, maxOtd, expiresAt, status")
      .eq("buyerId", buyer.id)
      .eq("status", "ACTIVE")
      .gt("expiresAt", new Date().toISOString())
      .order("createdAt", { ascending: false })
      .limit(1)
      .maybeSingle()

    const maxOtdCents = preQual?.maxOtdAmountCents || (preQual?.maxOtd ? Math.floor(preQual.maxOtd * 100) : null)

    // Transform items
    const transformedItems = (items || []).map((item: any) => {
      const inv = item.inventoryItem
      const vehicle = inv?.vehicle
      const dealer = inv?.dealer
      const priceCents = inv?.priceCents || inv?.price_cents || Math.floor((inv?.price || 0) * 100)

      let withinBudget: boolean | null = null
      if (maxOtdCents && priceCents > 0) {
        withinBudget = priceCents <= maxOtdCents
      }

      const photos: string[] = []
      if (inv?.photos_json && Array.isArray(inv.photos_json)) {
        photos.push(...inv.photos_json)
      } else if (vehicle?.images_json && Array.isArray(vehicle.images_json)) {
        photos.push(...vehicle.images_json)
      } else if (vehicle?.images && Array.isArray(vehicle.images)) {
        photos.push(...vehicle.images)
      }

      return {
        shortlistItemId: item.id,
        inventoryItemId: item.inventoryItemId,
        vehicle: {
          year: vehicle?.year || 0,
          make: vehicle?.make || "",
          model: vehicle?.model || "",
          trim: vehicle?.trim || null,
          bodyStyle: vehicle?.bodyStyle || vehicle?.body_style || null,
        },
        dealer: {
          id: dealer?.id || "",
          name: dealer?.businessName || dealer?.name || null,
          city: dealer?.city || null,
          state: dealer?.state || null,
        },
        priceCents,
        status: inv?.status || "UNKNOWN",
        withinBudget,
        isValidForAuction: inv?.status === InventoryStatus.AVAILABLE,
        isPrimaryChoice: item.is_primary_choice || false,
        notes: item.notes || null,
        photos,
        addedAt: item.addedAt,
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        shortlist: {
          id: shortlist.id,
          name: shortlist.name,
          active: shortlist.active,
          items: transformedItems,
        },
        preQualification: preQual
          ? {
              active: true,
              maxOtdAmountCents: maxOtdCents,
              expiresAt: preQual.expiresAt,
            }
          : null,
      },
    })
  } catch (error) {
    console.error("[Shortlist API] GET error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch shortlist" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser()
    if (!user || user.role !== "BUYER") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    if (!body.inventoryItemId) {
      return NextResponse.json({ success: false, error: "inventoryItemId is required" }, { status: 400 })
    }

    const dbCheck = requireDatabase()
    if (dbCheck) return dbCheck

    // Get buyer profile
    const { data: buyer } = await supabase.from("BuyerProfile").select("id").eq("userId", user.userId).maybeSingle()

    if (!buyer) {
      return NextResponse.json({ success: false, error: "Buyer profile not found" }, { status: 404 })
    }

    // Get or create shortlist
    let { data: shortlist } = await supabase
      .from("Shortlist")
      .select("id")
      .eq("buyerId", buyer.id)
      .eq("active", true)
      .maybeSingle()

    if (!shortlist) {
      const { data: newShortlist } = await supabase
        .from("Shortlist")
        .insert({
          buyerId: buyer.id,
          name: "My Shortlist",
          active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .select("id")
        .single()
      shortlist = newShortlist
    }

    if (!shortlist) {
      return NextResponse.json({ success: false, error: "Failed to create shortlist" }, { status: 500 })
    }

    // Check if inventory item exists
    const { data: inventoryItem } = await supabase
      .from("InventoryItem")
      .select("id, status")
      .eq("id", body.inventoryItemId)
      .maybeSingle()

    if (!inventoryItem) {
      return NextResponse.json({ success: false, error: "Vehicle not found" }, { status: 404 })
    }

    if (inventoryItem.status === "SOLD" || inventoryItem.status === "REMOVED") {
      return NextResponse.json({ success: false, error: "This vehicle is no longer available" }, { status: 410 })
    }

    // Check if already in shortlist
    const { data: existing } = await supabase
      .from("ShortlistItem")
      .select("id")
      .eq("shortlistId", shortlist.id)
      .eq("inventoryItemId", body.inventoryItemId)
      .is("removed_at", null)
      .maybeSingle()

    if (existing) {
      // Already in shortlist - return success (idempotent)
      return NextResponse.json({ success: true, message: "Already in shortlist" })
    }

    // Check item count
    const { count } = await supabase
      .from("ShortlistItem")
      .select("id", { count: "exact", head: true })
      .eq("shortlistId", shortlist.id)
      .is("removed_at", null)

    if ((count || 0) >= MAX_SHORTLIST_ITEMS) {
      return NextResponse.json(
        { success: false, error: `Maximum of ${MAX_SHORTLIST_ITEMS} items reached` },
        { status: 400 },
      )
    }

    // Add item
    const { error: insertError } = await supabase.from("ShortlistItem").insert({
      shortlistId: shortlist.id,
      inventoryItemId: body.inventoryItemId,
      notes: body.notes || null,
      is_primary_choice: false,
      addedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    if (insertError) {
      console.error("[Shortlist API] Insert error:", insertError)
      return NextResponse.json({ success: false, error: "Failed to add item" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Shortlist API] POST error:", error)
    return NextResponse.json({ success: false, error: "Failed to add to shortlist" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getSessionUser()
    if (!user || user.role !== "BUYER") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const inventoryItemId = searchParams.get("inventoryItemId")

    if (!inventoryItemId) {
      return NextResponse.json({ success: false, error: "inventoryItemId is required" }, { status: 400 })
    }

    const dbCheck3 = requireDatabase()
    if (dbCheck3) return dbCheck3

    // Get buyer profile
    const { data: buyer } = await supabase.from("BuyerProfile").select("id").eq("userId", user.userId).maybeSingle()

    if (!buyer) {
      return NextResponse.json({ success: false, error: "Buyer profile not found" }, { status: 404 })
    }

    // Get shortlist
    const { data: shortlist } = await supabase
      .from("Shortlist")
      .select("id")
      .eq("buyerId", buyer.id)
      .eq("active", true)
      .maybeSingle()

    if (!shortlist) {
      return NextResponse.json({ success: false, error: "Shortlist not found" }, { status: 404 })
    }

    // Soft delete item
    const { error: updateError } = await supabase
      .from("ShortlistItem")
      .update({
        removed_at: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .eq("shortlistId", shortlist.id)
      .eq("inventoryItemId", inventoryItemId)
      .is("removed_at", null)

    if (updateError) {
      console.error("[Shortlist API] Delete error:", updateError)
      return NextResponse.json({ success: false, error: "Failed to remove item" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Shortlist API] DELETE error:", error)
    return NextResponse.json({ success: false, error: "Failed to remove from shortlist" }, { status: 500 })
  }
}

function getDefaultShortlist() {
  return {
    shortlist: {
      id: "",
      name: "My Shortlist",
      active: true,
      items: [],
    },
    preQualification: null,
  }
}
