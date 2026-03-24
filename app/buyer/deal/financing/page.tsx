"use client"

import { csrfHeaders } from "@/lib/csrf-client"
import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/layout/protected-route"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { extractApiError } from "@/lib/utils/error-message"
import { DollarSign, CheckCircle2, Calculator, ArrowRight } from "lucide-react"

export default function DealFinancingPage() {
  const [deal, setDeal] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selecting, setSelecting] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const loadDeal = async () => {
      try {
        const response = await fetch("/api/buyer/deal")
        const data = await response.json()

        if (data.success && data.data.deal) {
          setDeal(data.data.deal)
        } else {
          router.push("/buyer/dashboard")
        }
      } catch (_error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load deal information",
        })
      } finally {
        setLoading(false)
      }
    }
    loadDeal()
  }, [router, toast])

  const handleSelectFinancing = async (input: { paymentType: "CASH" | "DEALER_FINANCING"; financingOptionId?: string }) => {
    if (!deal?.id) return

    setSelecting(true)
    try {
      const response = await fetch(`/api/buyer/deals/${deal.id}/financing`, {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({
          payment_type: input.paymentType,
          primary_financing_offer_id: input.financingOptionId,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(extractApiError(data.error, "Financing operation failed"))
      }

      toast({
        title: "Financing selected!",
        description: "Moving to fee payment",
      })

      router.push("/buyer/deal/fee")
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      })
    } finally {
      setSelecting(false)
    }
  }

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["BUYER"]}>
        <div className="space-y-6">
          <div>
            <Skeleton className="h-9 w-48 mb-2" />
            <Skeleton className="h-5 w-72" />
          </div>
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </ProtectedRoute>
    )
  }

  if (!deal) {
    return null
  }

  const financingOptions = deal.auctionOffer?.financingOptions || []

  return (
    <ProtectedRoute allowedRoles={["BUYER"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1">Select Financing</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Choose how you&rsquo;d like to finance your vehicle purchase
          </p>
        </div>

        {deal.financingType && (
          <Card className="border-[#7ED321]/30 bg-[#7ED321]/5 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#7ED321]/10 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-[#7ED321]" />
                </div>
                <div>
                  <p className="font-semibold">Financing Selected</p>
                  <p className="text-sm text-muted-foreground">
                    You selected: {deal.financingType === "CASH" ? "Cash / Own Financing" : "Dealer Financing"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              Purchase Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-muted-foreground">Out-the-Door Price</span>
              <span className="text-2xl font-bold tabular-nums text-[#0066FF]">
                ${deal.cashOtd?.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Calculator className="h-5 w-5 text-muted-foreground" />
            Available Options
          </h2>

          {financingOptions.map((option: any, index: number) => (
            <Card
              key={option?.id || index}
              className="group hover:border-[#0066FF]/50 hover:shadow-md transition-all duration-200 cursor-pointer"
              onClick={() => {
                if (selecting || deal.financingType) return
                if (!option?.id) {
                  toast({
                    variant: "destructive",
                    title: "Unavailable",
                    description:
                      "This financing option is missing an ID. Please select another option or contact support.",
                  })
                  return
                }
                handleSelectFinancing({ paymentType: "DEALER_FINANCING", financingOptionId: option.id })
              }}
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold tracking-tight">
                        {option.apr}% APR &bull; {option.termMonths} mo
                      </h3>
                      {index === 0 && (
                        <Badge className="bg-[#7ED321]/15 text-[#4a8a14] border-[#7ED321]/30 text-xs">
                          Recommended
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Down payment: ${option.downPayment?.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold tabular-nums text-[#0066FF]">${option.monthlyPayment}</p>
                    <p className="text-xs text-muted-foreground">/month</p>
                  </div>
                </div>
                {!deal.financingType && (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!option?.id) {
                        toast({
                          variant: "destructive",
                          title: "Unavailable",
                          description:
                            "This financing option is missing an ID. Please select another option or contact support.",
                        })
                        return
                      }
                      handleSelectFinancing({ paymentType: "DEALER_FINANCING", financingOptionId: option.id })
                    }}
                    disabled={selecting}
                    className="w-full bg-[#0066FF] hover:bg-[#0066FF]/90 shadow-sm"
                  >
                    Select This Option
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}

          <Card className="border-dashed hover:border-[#0066FF]/50 hover:shadow-md transition-all duration-200">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold tracking-tight">Pay Cash / Own Financing</h3>
                  <p className="text-sm text-muted-foreground">Use your own bank or pay in full</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold tabular-nums">${deal.cashOtd?.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">total</p>
                </div>
              </div>
              {!deal.financingType && (
                <Button
                  onClick={() => handleSelectFinancing({ paymentType: "CASH" })}
                  disabled={selecting}
                  variant="outline"
                  className="w-full"
                >
                  Select Cash Option
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {deal.financingType && (
          <Button
            onClick={() => router.push("/buyer/deal/fee")}
            size="lg"
            className="w-full bg-[#0066FF] hover:bg-[#0066FF]/90 shadow-sm"
          >
            Continue to Fee Payment
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </ProtectedRoute>
  )
}
