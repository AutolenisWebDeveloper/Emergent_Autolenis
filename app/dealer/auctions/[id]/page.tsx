"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { extractApiError } from "@/lib/utils/error-message"
import { csrfHeaders } from "@/lib/csrf-client"
import {
  ArrowLeft,
  Clock,
  MapPin,
  DollarSign,
  Car,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ImageIcon,
} from "lucide-react"

const RESERVED_SEGMENTS = ["offers", "invited", "loading", "settings", "undefined"]

export default function DealerAuctionDetailPage() {
  const params = useParams()
  const auctionId = params['id'] as string
  const router = useRouter()
  const { toast } = useToast()

  const [auction, setAuction] = useState<any>(null)
  const [dealerInventory, setDealerInventory] = useState<any[]>([])
  const [existingOffer, setExistingOffer] = useState<any>(null)
  const [tradeIn, setTradeIn] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null)
  const [cashOtd, setCashOtd] = useState<string>("")
  const [taxAmount, setTaxAmount] = useState<string>("")
  const [docFee, setDocFee] = useState<string>("299")
  const [dealerFee, setDealerFee] = useState<string>("0")
  const [financingOptions, setFinancingOptions] = useState<any[]>([
    { apr: "", termMonths: "60", downPayment: "", monthlyPayment: "" },
  ])

  useEffect(() => {
    const loadAuctionDetail = async () => {
      if (!auctionId || RESERVED_SEGMENTS.includes(auctionId)) {
        setLoading(false)
        return
      }

      try {
        const [auctionRes, tradeInRes] = await Promise.all([
          fetch(`/api/dealer/auctions/${auctionId}`),
          fetch(`/api/dealer/auctions/${auctionId}/trade-in`),
        ])

        if (!auctionRes.ok) {
          const errorText = await auctionRes.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: errorText || "Failed to load auction" }
        }
        throw new Error(errorData.error || "Failed to load auction")
      }

      const auctionData = await auctionRes.json()

      if (auctionData.success) {
        setAuction(auctionData.auction)
        setDealerInventory(auctionData.dealerInventory || [])
        setExistingOffer(auctionData.existingOffer)

        if (auctionData.existingOffer) {
          setSelectedVehicle(auctionData.existingOffer.inventoryItemId)
          setCashOtd(String(auctionData.existingOffer.cashOtd))
          setTaxAmount(String(auctionData.existingOffer.taxAmount))
          if (auctionData.existingOffer.feesBreakdown) {
            setDocFee(String(auctionData.existingOffer.feesBreakdown.docFee || 299))
            setDealerFee(String(auctionData.existingOffer.feesBreakdown.dealerFee || 0))
          }
          if (auctionData.existingOffer.financingOptions?.length > 0) {
            setFinancingOptions(
              auctionData.existingOffer.financingOptions.map((opt: any) => ({
                apr: String(opt.apr),
                termMonths: String(opt.termMonths),
                downPayment: String(opt.downPayment || 0),
                monthlyPayment: String(opt.monthlyPayment),
              })),
            )
          }
        }
      } else {
        throw new Error(auctionData.error || "Failed to load auction")
      }

      // Handle trade-in response
      if (tradeInRes.ok) {
        const tradeInData = await tradeInRes.json()
        if (tradeInData.success && tradeInData.data?.tradeIn) {
          setTradeIn(tradeInData.data.tradeIn)
        }
      }
    } catch (err: unknown) {
      console.error("Error fetching auction:", (err instanceof Error ? err.message : String(err)))
      toast({
        title: "Error",
        description: (err instanceof Error ? err.message : String(err)) || "Failed to load auction details",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
    }
    loadAuctionDetail()
  }, [auctionId, toast])

  const calculateMonthlyPayment = (index: number) => {
    const opt = financingOptions[index]
    const principal = Number(cashOtd) - Number(opt.downPayment || 0)
    const monthlyRate = Number(opt.apr) / 100 / 12
    const months = Number(opt.termMonths)

    if (principal > 0 && monthlyRate > 0 && months > 0) {
      const payment =
        (principal * (monthlyRate * Math.pow(1 + monthlyRate, months))) / (Math.pow(1 + monthlyRate, months) - 1)
      const newOptions = [...financingOptions]
      newOptions[index].monthlyPayment = payment.toFixed(2)
      setFinancingOptions(newOptions)
    }
  }

  const addFinancingOption = () => {
    setFinancingOptions([...financingOptions, { apr: "", termMonths: "60", downPayment: "", monthlyPayment: "" }])
  }

  const removeFinancingOption = (index: number) => {
    setFinancingOptions(financingOptions.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedVehicle) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a vehicle",
      })
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch(`/api/dealer/auction/${auctionId}/offer`, {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({
          inventoryItemId: selectedVehicle,
          cashOtd: Number(cashOtd),
          taxAmount: Number(taxAmount || 0),
          feesBreakdown: {
            docFee: Number(docFee || 0),
            dealerFee: Number(dealerFee || 0),
          },
          financingOptions: financingOptions
            .filter((opt) => opt.apr && opt.monthlyPayment)
            .map((opt) => ({
              apr: Number(opt.apr),
              termMonths: Number(opt.termMonths),
              downPayment: Number(opt.downPayment || 0),
              monthlyPayment: Number(opt.monthlyPayment),
            })),
        }),
      })

      const data = await res.json()

      if (data.success) {
        toast({
          title: "Offer submitted!",
          description: "Your offer has been submitted to the buyer",
        })
        router.push("/dealer/auctions")
      } else {
        throw new Error(extractApiError(data.error, "Auction operation failed"))
      }
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: (err instanceof Error ? err.message : String(err)) || "Failed to submit offer",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const getTimeRemaining = () => {
    if (!auction?.endsAt) return null
    const now = new Date()
    const end = new Date(auction.endsAt)
    const diff = end.getTime() - now.getTime()

    if (diff <= 0) return "Ended"

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    return `${hours}h ${minutes}m`
  }

  const formatCondition = (condition: string) => {
    return condition.charAt(0).toUpperCase() + condition.slice(1)
  }

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    )
  }

  if (!auction) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Auction not found</p>
      </div>
    )
  }

  const isAuctionActive = auction.status === "OPEN" && new Date() < new Date(auction.endsAt)

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Auctions
      </Button>

      <Card className="bg-gradient-to-r from-primary to-[#0066FF] text-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white text-2xl">Auction #{auction.id.slice(0, 8)}</CardTitle>
              <CardDescription className="text-white/80">
                {auction.shortlist?.items?.length || 0} vehicle(s) in buyer's shortlist
              </CardDescription>
            </div>
            <div className="text-right">
              <Badge className={isAuctionActive ? "bg-green-500" : "bg-gray-500"}>{auction.status}</Badge>
              <div className="text-sm mt-2 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {getTimeRemaining()}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Buyer Information</CardTitle>
          <CardDescription>Limited details for privacy</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <span>
                {auction.buyer?.city}, {auction.buyer?.state}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <span>
                Budget: ${auction.buyer?.preQualification?.budgetMin?.toLocaleString()} - $
                {auction.buyer?.preQualification?.budgetMax?.toLocaleString()}
              </span>
            </div>
            <div>
              <Badge variant="outline">Credit: {auction.buyer?.preQualification?.creditTier || "Not specified"}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {tradeIn && tradeIn.hasTrade && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader>
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <CardTitle className="text-lg">Buyer-Provided Trade-In Information (Unverified)</CardTitle>
                <CardDescription className="text-amber-700">
                  This information was entered by the buyer and has not been inspected or verified by AutoLenis. Please
                  confirm all trade details directly with the customer before finalizing your offer.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {tradeIn.vin && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">VIN:</span>
                  <span className="font-mono">{tradeIn.vin}</span>
                </div>
              )}
              {tradeIn.mileage && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Mileage:</span>
                  <span>{tradeIn.mileage.toLocaleString()}</span>
                </div>
              )}
              {tradeIn.condition && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Condition:</span>
                  <span>{formatCondition(tradeIn.condition)} (self-reported)</span>
                </div>
              )}
              {tradeIn.hasLoan !== null && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Owes money?:</span>
                  <span>{tradeIn.hasLoan ? "Yes" : "No"}</span>
                </div>
              )}
              {tradeIn.estimatedPayoffCents && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Est. payoff:</span>
                  <span>${(tradeIn.estimatedPayoffCents / 100).toLocaleString()} (buyer estimate)</span>
                </div>
              )}
              {tradeIn.photoUrls && tradeIn.photoUrls.length > 0 && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Photos:</span>
                  <Button variant="outline" size="sm">
                    <ImageIcon className="h-4 w-4 mr-1" />
                    View {tradeIn.photoUrls.length} photo(s)
                  </Button>
                </div>
              )}
            </div>

            <div className="mt-4 p-3 bg-amber-100 rounded-lg text-sm text-amber-800">
              <strong>Note:</strong> Final trade value and payoff responsibility are solely determined by your
              dealership.
            </div>
          </CardContent>
        </Card>
      )}

      {tradeIn && !tradeIn.hasTrade && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Car className="h-5 w-5" />
              <span>Buyer indicated no trade-in for this request</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Car className="h-5 w-5" />
            Buyer's Shortlist
          </CardTitle>
          <CardDescription>Vehicles the buyer is interested in</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {auction.shortlist?.items?.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">
                    {item.inventoryItem?.year} {item.inventoryItem?.make}{" "}
                    {item.inventoryItem?.model}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {item.inventoryItem?.trim} • {item.inventoryItem?.mileage?.toLocaleString()} miles
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">${item.inventoryItem?.priceCents ? (item.inventoryItem.priceCents / 100).toLocaleString() : "N/A"}</p>
                  <p className="text-xs text-muted-foreground">Listed price</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {isAuctionActive ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              {existingOffer ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Update Your Offer
                </>
              ) : (
                "Submit Your Best Offer"
              )}
            </CardTitle>
            <CardDescription>
              {existingOffer
                ? "You can update your offer until the auction ends"
                : "Submit one best offer - make it competitive!"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label>Select Vehicle from Your Inventory</Label>
                <select
                  value={selectedVehicle}
                  onChange={(e) => setSelectedVehicle(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                >
                  <option value="">Choose a vehicle...</option>
                  {dealerInventory.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.vehicle?.year} {item.vehicle?.make} {item.vehicle?.model} - ${item.price?.toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cash Out-the-Door Price ($)</Label>
                  <Input
                    type="number"
                    value={cashOtd}
                    onChange={(e) => setCashOtd(e.target.value)}
                    placeholder="35000"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tax Amount ($)</Label>
                  <Input
                    type="number"
                    value={taxAmount}
                    onChange={(e) => setTaxAmount(e.target.value)}
                    placeholder="2500"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Doc Fee ($)</Label>
                  <Input type="number" value={docFee} onChange={(e) => setDocFee(e.target.value)} placeholder="299" />
                </div>
                <div className="space-y-2">
                  <Label>Dealer Fee ($)</Label>
                  <Input
                    type="number"
                    value={dealerFee}
                    onChange={(e) => setDealerFee(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">Financing Options</h3>
                    <p className="text-sm text-muted-foreground">Offer financing to increase your chances</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addFinancingOption}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Option
                  </Button>
                </div>

                {financingOptions.map((opt, index) => (
                  <div key={index} className="p-4 border rounded-lg mb-4 relative">
                    {financingOptions.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 text-red-600"
                        onClick={() => removeFinancingOption(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                    <div className="grid md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>APR (%)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={opt.apr}
                          onChange={(e) => {
                            const newOptions = [...financingOptions]
                            newOptions[index].apr = e.target.value
                            setFinancingOptions(newOptions)
                          }}
                          onBlur={() => calculateMonthlyPayment(index)}
                          placeholder="5.99"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Term (months)</Label>
                        <select
                          value={opt.termMonths}
                          onChange={(e) => {
                            const newOptions = [...financingOptions]
                            newOptions[index].termMonths = e.target.value
                            setFinancingOptions(newOptions)
                          }}
                          onBlur={() => calculateMonthlyPayment(index)}
                          className="w-full px-3 py-2 border rounded-lg"
                        >
                          <option value="36">36 months</option>
                          <option value="48">48 months</option>
                          <option value="60">60 months</option>
                          <option value="72">72 months</option>
                          <option value="84">84 months</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>Down Payment ($)</Label>
                        <Input
                          type="number"
                          value={opt.downPayment}
                          onChange={(e) => {
                            const newOptions = [...financingOptions]
                            newOptions[index].downPayment = e.target.value
                            setFinancingOptions(newOptions)
                          }}
                          onBlur={() => calculateMonthlyPayment(index)}
                          placeholder="5000"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Monthly Payment ($)</Label>
                        <Input
                          type="number"
                          value={opt.monthlyPayment}
                          onChange={(e) => {
                            const newOptions = [...financingOptions]
                            newOptions[index].monthlyPayment = e.target.value
                            setFinancingOptions(newOptions)
                          }}
                          placeholder="625"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-[#7ED321] to-[#00D9FF] hover:opacity-90"
                size="lg"
              >
                {submitting ? "Submitting..." : existingOffer ? "Update Offer" : "Submit Offer"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-900">
              <AlertCircle className="h-5 w-5" />
              Auction {auction.status === "OPEN" ? "Ended" : auction.status}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-yellow-800">This auction is no longer accepting offers.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
