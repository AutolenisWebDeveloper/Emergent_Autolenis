import { getSupabase } from "@/lib/db"
import crypto from "crypto"
import {
  AuctionStatus,
  DealStatus,
  ContractStatus,
  InventoryStatus,
  PickupStatus,
} from "@/lib/constants/statuses"

export class DealerService {
  // Get dealer by user ID
  async getDealerByUserId(userId: string) {
    const supabase = getSupabase()

    const { data: dealerUser } = await supabase
      .from("DealerUser")
      .select(`
        *,
        dealer:Dealer(*)
      `)
      .eq("userId", userId)
      .limit(1)
      .maybeSingle()

    return dealerUser?.dealer || null
  }

  // Create dealer application
  async createDealerApplication(data: {
    dealershipName: string
    businessType: string
    licenseNumber: string
    yearsInBusiness: string
    contactName: string
    contactTitle: string
    email: string
    phone: string
    address: string
    city: string
    state: string
    zipCode: string
    averageInventory: string
    monthlyVolume: string
    website?: string
    additionalInfo?: string
  }) {
    const supabase = getSupabase()
    const now = new Date().toISOString()

    const { data: dealer, error } = await supabase
      .from("Dealer")
      .insert({
        id: crypto.randomUUID(),
        businessName: data.dealershipName,
        business_name: data.dealershipName,
        name: data.dealershipName,
        legalName: data.dealershipName,
        legal_name: data.dealershipName,
        licenseNumber: data.licenseNumber,
        license_number: data.licenseNumber,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        state: data.state,
        postalCode: data.zipCode,
        zip: data.zipCode,
        country: "US",
        verified: false,
        active: false,
        integrityScore: 100,
        createdAt: now,
        updatedAt: now,
      })
      .select()
      .single()

    if (error) throw new Error(`Failed to create dealer: ${error.message}`)

    return dealer
  }

  // Get comprehensive dashboard stats
  async getDealerDashboard(dealerId: string) {
    const supabase = getSupabase()

    const [
      { count: activeAuctions },
      { count: pendingOffers },
      { count: completedDeals },
      { count: inventoryCount },
      { count: pendingContracts },
      { count: upcomingPickups },
      { data: recentActivity },
      monthlyStats,
    ] = await Promise.all([
      supabase
        .from("AuctionParticipant")
        .select("*", { count: "exact", head: true })
        .eq("dealerId", dealerId)
        .eq("auction.status", AuctionStatus.ACTIVE),

      supabase.from("AuctionOffer").select("*", { count: "exact", head: true }).eq("participantId", dealerId),

      supabase
        .from("SelectedDeal")
        .select("*", { count: "exact", head: true })
        .eq("dealerId", dealerId)
        .eq("status", DealStatus.COMPLETED),

      supabase.from("InventoryItem").select("*", { count: "exact", head: true }).eq("dealerId", dealerId),

      supabase
        .from("ContractDocument")
        .select("*", { count: "exact", head: true })
        .eq("dealerId", dealerId)
        .eq("scan.status", ContractStatus.ISSUES_FOUND),

      supabase
        .from("PickupAppointment")
        .select("*", { count: "exact", head: true })
        .eq("dealerId", dealerId)
        .eq("status", PickupStatus.SCHEDULED)
        .gte("scheduledDate", new Date().toISOString()),

      supabase
        .from("SelectedDeal")
        .select(`
          *,
          buyer:BuyerProfile(
            *,
            profile:User(*)
          ),
          inventoryItem:InventoryItem(*)
        `)
        .eq("dealerId", dealerId)
        .order("createdAt", { ascending: false })
        .limit(10),

      this.getMonthlyStats(dealerId),
    ])

    return {
      activeAuctions: activeAuctions || 0,
      pendingOffers: pendingOffers || 0,
      completedDeals: completedDeals || 0,
      inventory: inventoryCount || 0,
      pendingContracts: pendingContracts || 0,
      upcomingPickups: upcomingPickups || 0,
      recentActivity: recentActivity || [],
      monthlyStats,
    }
  }

  // Get monthly statistics
  async getMonthlyStats(dealerId: string) {
    const supabase = getSupabase()
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString()

    const [{ count: thisMonthDeals }, { count: lastMonthDeals }, { data: thisMonthTransactions }] = await Promise.all([
      supabase
        .from("SelectedDeal")
        .select("*", { count: "exact", head: true })
        .eq("dealerId", dealerId)
        .eq("status", DealStatus.COMPLETED)
        .gte("createdAt", startOfMonth),

      supabase
        .from("SelectedDeal")
        .select("*", { count: "exact", head: true })
        .eq("dealerId", dealerId)
        .eq("status", DealStatus.COMPLETED)
        .gte("createdAt", lastMonth)
        .lte("createdAt", endOfLastMonth),

      // Use Transaction table (actual collected payments) instead of deal amount
      supabase
        .from("Transaction")
        .select("grossAmount, type")
        .eq("status", "SUCCEEDED")
        .in("type", ["DEPOSIT", "SERVICE_FEE", "PAYMENT"])
        .gte("createdAt", startOfMonth),
    ])

    const totalRevenueAmount = (thisMonthTransactions || []).reduce(
      (sum: number, tx: any) => sum + (tx.grossAmount || 0), 0,
    )

    return {
      thisMonthDeals: thisMonthDeals || 0,
      lastMonthDeals: lastMonthDeals || 0,
      dealsChange:
        lastMonthDeals && lastMonthDeals > 0 ? (((thisMonthDeals || 0) - lastMonthDeals) / lastMonthDeals) * 100 : 0,
      revenue: totalRevenueAmount,
    }
  }

  // Get inventory with full details
  async getInventory(dealerId: string) {
    const supabase = getSupabase()

    const { data } = await supabase
      .from("InventoryItem")
      .select("*")
      .eq("dealerId", dealerId)
      .order("createdAt", { ascending: false })

    return data || []
  }

  // Add vehicle to inventory
  async addVehicleToInventory(
    dealerId: string,
    data: {
      vin: string
      make: string
      model: string
      year: number
      trim?: string
      bodyStyle?: string
      mileage: number
      exteriorColor?: string
      interiorColor?: string
      engine?: string
      transmission?: string
      drivetrain?: string
      fuelType?: string
      price: number
      stockNumber?: string
      isNew: boolean
      locationCity?: string
      locationState?: string
      images?: string[]
    },
  ) {
    const supabase = getSupabase()
    const now = new Date().toISOString()

    const { data: vehicle, error: vehicleError } = await supabase
      .from("Vehicle")
      .insert({
        id: crypto.randomUUID(),
        vin: data.vin,
        make: data.make,
        model: data.model,
        year: data.year,
        trim: data.trim,
        bodyStyle: data.bodyStyle,
        body_style: data.bodyStyle,
        mileage: data.mileage,
        exteriorColor: data.exteriorColor,
        exterior_color: data.exteriorColor,
        interiorColor: data.interiorColor,
        interior_color: data.interiorColor,
        engine: data.engine,
        transmission: data.transmission,
        drivetrain: data.drivetrain,
        fuelType: data.fuelType,
        fuel_type: data.fuelType,
        images: data.images || [],
        createdAt: now,
        created_at: now,
        updatedAt: now,
        updated_at: now,
      })
      .select()
      .single()

    if (vehicleError) throw new Error(`Failed to create vehicle: ${vehicleError.message}`)

    const { data: inventoryItem, error: inventoryError } = await supabase
      .from("InventoryItem")
      .insert({
        id: crypto.randomUUID(),
        dealerId,
        dealer_id: dealerId,
        vehicleId: vehicle.id,
        vehicle_id: vehicle.id,
        price: data.price,
        priceCents: Math.round(data.price * 100),
        price_cents: Math.round(data.price * 100),
        stockNumber: data.stockNumber || `STK-${Date.now()}`,
        stock_number: data.stockNumber || `STK-${Date.now()}`,
        isNew: data.isNew,
        is_new: data.isNew,
        status: InventoryStatus.AVAILABLE,
        locationCity: data.locationCity,
        location_city: data.locationCity,
        locationState: data.locationState,
        location_state: data.locationState,
        createdAt: now,
        created_at: now,
        updatedAt: now,
        updated_at: now,
      })
      .select("*")
      .single()

    if (inventoryError) throw new Error(`Failed to create inventory item: ${inventoryError.message}`)

    return inventoryItem
  }

  // Update inventory item
  async updateInventoryItem(
    itemId: string,
    dealerId: string,
    data: {
      price?: number
      status?: string
      stockNumber?: string
    },
  ) {
    const supabase = getSupabase()

    const updateData: any = {
      updatedAt: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (data.price !== undefined) {
      updateData.price = data.price
      updateData.priceCents = Math.round(data.price * 100)
      updateData.price_cents = Math.round(data.price * 100)
    }

    if (data.status !== undefined) {
      updateData.status = data.status
    }

    if (data.stockNumber !== undefined) {
      updateData.stockNumber = data.stockNumber
      updateData.stock_number = data.stockNumber
    }

    const { data: inventoryItem, error } = await supabase
      .from("InventoryItem")
      .update(updateData)
      .eq("id", itemId)
      .eq("dealerId", dealerId)
      .select("*")
      .single()

    if (error) throw new Error(`Failed to update inventory item: ${error.message}`)

    return inventoryItem
  }

  // Delete inventory item
  async deleteInventoryItem(itemId: string, dealerId: string) {
    const supabase = getSupabase()

    const { error } = await supabase.from("InventoryItem").delete().eq("id", itemId).eq("dealerId", dealerId)

    if (error) throw new Error(`Failed to delete inventory item: ${error.message}`)

    return { success: true }
  }

  // Get auctions dealer is invited to
  async getInvitedAuctions(dealerId: string) {
    const supabase = getSupabase()

    const { data } = await supabase
      .from("AuctionParticipant")
      .select(`
        *,
        auction:Auction(
          *,
          buyer:Buyer(
            *,
            profile:User(*),
            prequal:Prequal(*)
          ),
          shortlist:Shortlist(
            items:ShortlistItem(
              inventoryItem:InventoryItem(*)
            )
          ),
          offers:AuctionOffer(
            filter: eq(participantId, ${dealerId})
          )
      `)
      .eq("dealerId", dealerId)
      .order("invitedAt", { ascending: false })

    return data || []
  }

  // Get dealer's submitted offers
  async getSubmittedOffers(dealerId: string) {
    const supabase = getSupabase()

    const { data } = await supabase
      .from("AuctionOffer")
      .select(`
        *,
        auction:Auction(
          buyer:Buyer(
            profile:User(*)
          )
        ),
        inventoryItem:InventoryItem(*)
      `)
      .eq("participantId", dealerId)
      .order("createdAt", { ascending: false })

    return data || []
  }

  // Submit offer for auction
  async submitOffer(
    auctionId: string,
    dealerId: string,
    data: {
      inventoryItemId: string
      cashOtd: number
      taxAmount: number
      feesBreakdown?: Record<string, number>
      financingOptions?: {
        lenderName: string
        apr: number
        termMonths: number
        downPayment: number
        monthlyPayment: number
      }[]
    },
  ) {
    const supabase = getSupabase()

    const { data: participant, error: participantError } = await supabase
      .from("AuctionParticipant")
      .select()
      .eq("auctionId", auctionId)
      .eq("dealerId", dealerId)
      .single()

    if (participantError || !participant) {
      throw new Error("Dealer not invited to this auction")
    }

    const now = new Date().toISOString()

    const { data: offer, error: offerError } = await supabase
      .from("AuctionOffer")
      .insert({
        id: crypto.randomUUID(),
        auctionId,
        auction_id: auctionId,
        participantId: dealerId,
        participant_id: dealerId,
        inventoryItemId: data.inventoryItemId,
        inventory_item_id: data.inventoryItemId,
        cashOtd: data.cashOtd,
        cash_otd: data.cashOtd,
        cashOtdCents: Math.round(data.cashOtd * 100),
        cash_otd_cents: Math.round(data.cashOtd * 100),
        taxAmount: data.taxAmount,
        tax_amount: data.taxAmount,
        taxAmountCents: Math.round(data.taxAmount * 100),
        tax_amount_cents: Math.round(data.taxAmount * 100),
        feeBreakdownJson: data.feesBreakdown || {},
        fee_breakdown_json: data.feesBreakdown || {},
        createdAt: now,
        created_at: now,
        updatedAt: now,
        updated_at: now,
      })
      .select()
      .single()

    if (offerError) throw new Error(`Failed to create offer: ${offerError.message}`)

    if (data.financingOptions && data.financingOptions.length > 0) {
      const financingOptions = data.financingOptions.map((opt) => ({
        id: crypto.randomUUID(),
        offerId: offer.id,
        offer_id: offer.id,
        lenderName: opt.lenderName,
        lender_name: opt.lenderName,
        apr: opt.apr,
        termMonths: opt.termMonths,
        term_months: opt.termMonths,
        downPayment: opt.downPayment,
        down_payment: opt.downPayment,
        downPaymentCents: Math.round(opt.downPayment * 100),
        down_payment_cents: Math.round(opt.downPayment * 100),
        monthlyPayment: opt.monthlyPayment,
        monthly_payment: opt.monthlyPayment,
        estMonthlyPaymentCents: Math.round(opt.monthlyPayment * 100),
        est_monthly_payment_cents: Math.round(opt.monthlyPayment * 100),
        createdAt: now,
        created_at: now,
        updatedAt: now,
        updated_at: now,
      }))

      const { error: financingError } = await supabase.from("AuctionOfferFinancingOption").insert(financingOptions)

      if (financingError) throw new Error(`Failed to create financing options: ${financingError.message}`)
    }

    return offer
  }

  // Get contracts with shield scan results
  async getContracts(dealerId: string) {
    const supabase = getSupabase()

    const { data } = await supabase
      .from("ContractDocument")
      .select(`
        *,
        scan:ShieldScan(
          fixItems:ShieldScanFixItem(*)
        ),
        deal:Deal(
          buyer:Buyer(
            profile:User(*)
          ),
          inventoryItem:InventoryItem(*)
        )
      `)
      .eq("dealerId", dealerId)
      .order("uploadedAt", { ascending: false })

    return data || []
  }

  // Upload contract
  async uploadContract(
    dealerId: string,
    dealId: string,
    data: {
      documentType: string
      fileUrl: string
      metaJson?: Record<string, any>
    },
  ) {
    const supabase = getSupabase()
    const now = new Date().toISOString()

    const { data: contract, error } = await supabase
      .from("ContractDocument")
      .insert({
        id: crypto.randomUUID(),
        dealerId,
        dealer_id: dealerId,
        dealId,
        deal_id: dealId,
        documentType: data.documentType,
        document_type: data.documentType,
        type: data.documentType,
        documentUrl: data.fileUrl,
        document_url: data.fileUrl,
        fileUrl: data.fileUrl,
        file_url: data.fileUrl,
        version: 1,
        metaJson: data.metaJson || {},
        meta_json: data.metaJson || {},
        createdAt: now,
        created_at: now,
        updatedAt: now,
        updated_at: now,
      })
      .select()
      .single()

    if (error) throw new Error(`Failed to upload contract: ${error.message}`)

    return contract
  }

  // Get pickups
  async getPickups(dealerId: string) {
    const supabase = getSupabase()

    const { data } = await supabase
      .from("PickupAppointment")
      .select(`
        *,
        deal:Deal(
          buyer:Buyer(
            profile:User(*)
          ),
          inventoryItem:InventoryItem(*)
        )
      `)
      .eq("dealerId", dealerId)
      .order("scheduledDate", { ascending: true })

    return data || []
  }

  // Validate pickup QR code
  async validatePickupQR(dealerId: string, qrCode: string) {
    const supabase = getSupabase()

    const { data: pickup, error } = await supabase
      .from("PickupAppointment")
      .select(`
        *,
        deal:Deal(
          buyer:Buyer(
            profile:User(*)
          ),
          inventoryItem:InventoryItem(*)
        )
      `)
      .eq("dealerId", dealerId)
      .eq("qrCodeValue", qrCode)
      .eq("status", PickupStatus.SCHEDULED)
      .single()

    if (error || !pickup) {
      throw new Error("Invalid QR code")
    }

    const { error: updateError } = await supabase
      .from("PickupAppointment")
      .update({
        status: PickupStatus.BUYER_ARRIVED,
        arrivedAt: new Date().toISOString(),
        arrived_at: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", pickup.id)

    if (updateError) throw new Error(`Failed to update pickup status: ${updateError.message}`)

    return pickup
  }

  // Complete pickup
  async completePickup(dealerId: string, pickupId: string) {
    const supabase = getSupabase()

    const { error } = await supabase
      .from("PickupAppointment")
      .update({
        status: PickupStatus.COMPLETED,
        completedAt: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", pickupId)
      .eq("dealerId", dealerId)

    if (error) throw new Error(`Failed to complete pickup: ${error.message}`)

    return { success: true }
  }

  // Get dealer settings
  async getDealerSettings(dealerId: string) {
    const supabase = getSupabase()

    const { data } = await supabase.from("Dealer").select().eq("id", dealerId).single()

    return data
  }

  // Update dealer settings
  async updateDealerSettings(
    dealerId: string,
    data: {
      businessName?: string
      phone?: string
      email?: string
      address?: string
      city?: string
      state?: string
      postalCode?: string
    },
  ) {
    const supabase = getSupabase()

    const updateData: any = {
      updatedAt: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (data.businessName !== undefined) {
      updateData.businessName = data.businessName
      updateData.business_name = data.businessName
      updateData.name = data.businessName
    }

    if (data.phone !== undefined) {
      updateData.phone = data.phone
    }

    if (data.email !== undefined) {
      updateData.email = data.email
    }

    if (data.address !== undefined) {
      updateData.address = data.address
    }

    if (data.city !== undefined) {
      updateData.city = data.city
    }

    if (data.state !== undefined) {
      updateData.state = data.state
    }

    if (data.postalCode !== undefined) {
      updateData.postalCode = data.postalCode
    }

    const { data: dealer, error } = await supabase
      .from("Dealer")
      .update(updateData)
      .eq("id", dealerId)
      .select()
      .single()

    if (error) throw new Error(`Failed to update dealer settings: ${error.message}`)

    return dealer
  }
}

export const dealerService = new DealerService()
