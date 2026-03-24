"use client"

import { csrfHeaders } from "@/lib/csrf-client"
import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/layout/protected-route"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { extractApiError } from "@/lib/utils/error-message"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { Shield, ArrowLeft, ArrowRight, RefreshCw } from "lucide-react"

type PaymentFrequency = "monthly" | "semi_annual" | "annual"

export default function InsuranceQuotesListPage() {
  const [deal, setDeal] = useState<any>(null)
  const [quotes, setQuotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selecting, setSelecting] = useState<string | null>(null)
  const [frequency, setFrequency] = useState<PaymentFrequency>("monthly")
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const loadData = async () => {
      try {
        const dealRes = await fetch("/api/buyer/deal")
        const dealData = await dealRes.json()
        if (!dealData.success) {
          toast({ title: "No active deal", description: "You need an active deal." })
          router.push("/buyer/dashboard")
          return
        }
        setDeal(dealData.data.deal)

        const insRes = await fetch(`/api/buyer/deals/${dealData.data.deal.id}/insurance`)
      const insData = await insRes.json()
      if (insData.success) {
        setQuotes(insData.data?.quotes ?? [])
      }
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to load quotes." })
    } finally {
      setLoading(false)
    }
    }
    loadData()
  }, [router, toast])

  const handleSelect = async (quoteId: string) => {
    if (!deal) return
    setSelecting(quoteId)
    try {
      const res = await fetch(`/api/buyer/deals/${deal.id}/insurance/select-quote`, {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({ quoteId }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(extractApiError(data.error, "Failed to select quote"))

      toast({ title: "Quote Selected", description: "Proceeding to quote details." })
      router.push(`/buyer/deal/insurance/quotes/${quoteId}`)
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message })
    } finally {
      setSelecting(null)
    }
  }

  const getPremium = (quote: any): string => {
    switch (frequency) {
      case "monthly": return `$${Number(quote.monthlyPremium || 0).toFixed(2)}`
      case "semi_annual": return `$${Number(quote.sixMonthPremium || 0).toFixed(2)}`
      case "annual": return `$${Number((quote.monthlyPremium || 0) * 12).toFixed(2)}`
      default: return `$${Number(quote.monthlyPremium || 0).toFixed(2)}`
    }
  }

  const frequencyLabel: Record<PaymentFrequency, string> = {
    monthly: "/mo",
    semi_annual: "/6mo",
    annual: "/yr",
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <ProtectedRoute allowedRoles={["BUYER"]}>
      <div className="max-w-4xl w-full mx-auto space-y-6 p-4">
        <Button variant="ghost" onClick={() => router.push("/buyer/deal/insurance")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Insurance
        </Button>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Insurance Quotes</h1>
            <p className="text-muted-foreground">{quotes.length} quote{quotes.length !== 1 && "s"} available</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={frequency} onValueChange={(v) => setFrequency(v as PaymentFrequency)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="semi_annual">Semi-Annual</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {quotes.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No quotes available yet.</p>
                <Button onClick={() => router.push("/buyer/deal/insurance/quote")}>
                  <RefreshCw className="h-4 w-4 mr-2" /> Request New Quotes
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {quotes.map((quote) => (
              <Card key={quote.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                    <div>
                      <CardTitle>{quote.carrier}</CardTitle>
                      <CardDescription>{quote.productName || "Auto Insurance"}</CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">{getPremium(quote)}</div>
                      <div className="text-xs text-muted-foreground">{frequencyLabel[frequency]}</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex flex-wrap gap-2">
                      {quote.status && <Badge variant="secondary">{quote.status}</Badge>}
                      {quote.expiresAt && (
                        <span className="text-xs text-muted-foreground">
                          Valid until {new Date(quote.expiresAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <Button
                      className="bg-gradient-to-r from-[#7ED321] to-[#00D9FF] text-white"
                      onClick={() => handleSelect(quote.id)}
                      disabled={selecting === quote.id}
                    >
                      {selecting === quote.id ? "Selecting..." : "Select"} <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            <div className="text-center pt-2">
              <Button variant="outline" onClick={() => router.push("/buyer/deal/insurance/quote")}>
                <RefreshCw className="h-4 w-4 mr-2" /> Request New Quotes
              </Button>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
