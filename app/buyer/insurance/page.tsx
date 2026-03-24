"use client"

import type React from "react"

import { csrfHeaders, getCsrfToken } from "@/lib/csrf-client"
import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/layout/protected-route"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { extractApiError } from "@/lib/utils/error-message"
import { useRouter } from "next/navigation"
import { Shield, Upload, CheckCircle2, Star } from "lucide-react"

export default function BuyerInsurancePage() {
  const [deal, setDeal] = useState<any>(null)
  const [quotes, setQuotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOption, setSelectedOption] = useState<"quotes" | "upload">("quotes")
  const [selectedQuote, setSelectedQuote] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const loadData = async () => {
      try {
        const dealRes = await fetch("/api/buyer/deal")
        const dealData = await dealRes.json()

        // Canonical deal insurance flow lives under /buyer/deal/insurance.
        // This page remains for legacy links and redirects when an active deal exists.
        if (dealData?.success && dealData?.data?.deal?.id) {
          router.replace("/buyer/deal/insurance")
          return
        }

        if (dealData?.success && dealData?.data?.deal) {
          setDeal(dealData.data.deal)

          const quotesRes = await fetch(`/api/insurance/quotes/${dealData.data.deal.id}`)
          const quotesData = await quotesRes.json()

          if (quotesData.success) {
            setQuotes(quotesData.data.quotes)
          }
        }
      } catch (_error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load insurance information",
        })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [toast, router])

  const handleSelectQuote = async () => {
    if (!selectedQuote) return

    try {
      const response = await fetch("/api/insurance/select", {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({ quoteId: selectedQuote }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(extractApiError(data.error, "Insurance operation failed"))
      }

      toast({
        title: "Insurance selected!",
        description: "Moving to contract review",
      })

      router.push("/buyer/contracts")
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      })
    }
  }

  const handleUploadProof = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setUploading(true)

    try {
      const formData = new FormData(e.currentTarget)
      if (deal?.id) formData.append("dealId", deal.id)

      const csrfToken = getCsrfToken()
      const headers: HeadersInit = csrfToken ? { "x-csrf-token": csrfToken } : {}

      const response = await fetch("/api/insurance/policy/upload", {
        method: "POST",
        headers,
        body: formData,
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(extractApiError(data.error, "Insurance operation failed"))
      }

      toast({
        title: "Insurance proof uploaded!",
        description: "Moving to contract review",
      })

      router.push("/buyer/contracts")
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      })
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["BUYER"]}>
        <div className="space-y-6">
          <div>
            <Skeleton className="h-9 w-64 mb-2" />
            <Skeleton className="h-5 w-96" />
          </div>
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={["BUYER"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1">Insurance Coverage Required</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Insurance is legally required to complete your vehicle purchase. Choose from our partner quotes or upload
            proof of existing coverage.
          </p>
        </div>

        <Card className="border-orange-200 bg-orange-50/50 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                <Shield className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold text-orange-900">Required Before Purchase</CardTitle>
                <CardDescription className="text-orange-700 text-xs">
                  You cannot finalize your deal or schedule pickup without valid insurance coverage.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How would you like to add insurance?</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup value={selectedOption} onValueChange={(value: any) => setSelectedOption(value)}>
              <div className="flex items-center space-x-2 mb-3">
                <RadioGroupItem value="quotes" id="quotes" />
                <Label htmlFor="quotes" className="cursor-pointer">
                  Get quotes from AutoLenis partners (recommended)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="upload" id="upload" />
                <Label htmlFor="upload" className="cursor-pointer">
                  I already have insurance - Upload proof
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {selectedOption === "quotes" && (
          <div className="space-y-4">
            {quotes.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Loading insurance quotes...</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              quotes.map((quote) => (
                <Card
                  key={quote.id}
                  className={`cursor-pointer transition-all ${
                    selectedQuote === quote.id ? "border-[#0066FF] border-2 bg-blue-50" : "hover:border-muted-foreground"
                  }`}
                  onClick={() => setSelectedQuote(quote.id)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{quote.carrier}</CardTitle>
                        <CardDescription>{quote.coverageType} Coverage</CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-[#0066FF]">${quote.monthlyPremium}</div>
                        <div className="text-xs text-muted-foreground">per month</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < quote.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-muted-foreground">{quote.rating}/5 rating</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Deductible:</span>
                        <span>${quote.deductible}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Coverage Limit:</span>
                        <span>${quote.coverageLimit?.toLocaleString()}</span>
                      </div>
                    </div>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedQuote(quote.id)
                        handleSelectQuote()
                      }}
                      className="w-full mt-4 bg-gradient-to-r from-[#7ED321] to-[#00D9FF]"
                      disabled={selectedQuote !== quote.id}
                    >
                      Select This Insurance
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {selectedOption === "upload" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Insurance Proof
              </CardTitle>
              <CardDescription>Upload your insurance declaration page or proof of coverage</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUploadProof} className="space-y-4">
                <div>
                  <Label htmlFor="policyNumber">Policy Number</Label>
                  <Input id="policyNumber" name="policyNumber" placeholder="Enter policy number" required />
                </div>
                <div>
                  <Label htmlFor="insuranceFile">Upload File</Label>
                  <Input id="insuranceFile" name="file" type="file" accept=".pdf,.jpg,.jpeg,.png" required />
                </div>
                <Button type="submit" disabled={uploading} className="w-full">
                  {uploading ? "Uploading..." : "Upload Proof"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {deal?.insurancePolicy && (
          <Card className="border-[#7ED321]/30 bg-[#7ED321]/5 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#7ED321]/10 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-[#7ED321]" />
                </div>
                <div>
                  <p className="font-semibold">Insurance Coverage Confirmed</p>
                  <p className="text-sm text-muted-foreground">You can proceed to finalize your deal.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedRoute>
  )
}
