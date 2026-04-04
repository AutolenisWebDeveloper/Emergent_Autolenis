"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { ProtectedRoute } from "@/components/layout/protected-route"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { Shield, ArrowLeft, ArrowRight } from "lucide-react"

export default function QuoteDetailPage() {
  const params = useParams()
  const quoteId = params.quoteId as string
  const [deal, setDeal] = useState<any>(null)
  const [quote, setQuote] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const loadData = async () => {
      try {
        const dealRes = await fetch("/api/buyer/deal")
        const dealData = await dealRes.json()
        if (!dealData.success) {
          router.push("/buyer/dashboard")
          return
        }
        setDeal(dealData.data.deal)

        const insRes = await fetch(`/api/buyer/deals/${dealData.data.deal.id}/insurance`)
        const insData = await insRes.json()
        if (insData.success) {
          const found = (insData.data?.quotes ?? []).find((q: any) => q.id === quoteId)
          if (found) {
            setQuote(found)
          } else {
            toast({ variant: "destructive", title: "Not Found", description: "Quote not found." })
            router.push("/buyer/deal/insurance/quotes")
          }
        }
      } catch {
        toast({ variant: "destructive", title: "Error", description: "Failed to load quote details." })
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [quoteId, router, toast])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!quote) return null

  let coverage: Record<string, unknown> | null = null
  try {
    coverage = typeof quote.coverage_json === "string"
      ? JSON.parse(quote.coverage_json)
      : quote.coverage_json
  } catch {
    // Invalid JSON in coverage_json - display without coverage details
  }

  return (
    <ProtectedRoute allowedRoles={["BUYER"]}>
      <div className="max-w-4xl w-full mx-auto space-y-6 p-4">
        <Button variant="ghost" onClick={() => router.push("/buyer/deal/insurance/quotes")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Quotes
        </Button>

        <div>
          <h1 className="text-3xl font-bold mb-2">Quote Details</h1>
          <p className="text-muted-foreground">{quote.carrier} &mdash; {quote.productName || "Auto Insurance"}</p>
        </div>

        {/* Premium Breakdown */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>Premium Breakdown</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-lg bg-muted">
                  <div className="text-sm text-muted-foreground mb-1">Monthly</div>
                  <div className="text-2xl font-bold text-primary">${Number(quote.monthlyPremium || 0).toFixed(2)}</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted">
                  <div className="text-sm text-muted-foreground mb-1">Semi-Annual</div>
                  <div className="text-2xl font-bold text-primary">${Number(quote.sixMonthPremium || 0).toFixed(2)}</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted">
                  <div className="text-sm text-muted-foreground mb-1">Annual</div>
                  <div className="text-2xl font-bold text-primary">${Number((quote.monthlyPremium || 0) * 12).toFixed(2)}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quote Info */}
        <Card>
          <CardHeader>
            <CardTitle>Quote Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Carrier:</span> <span className="font-medium">{quote.carrier}</span></div>
              <div><span className="text-muted-foreground">Product:</span> <span className="font-medium">{quote.productName || "Auto Insurance"}</span></div>
              {quote.expiresAt && (
                <div><span className="text-muted-foreground">Valid Until:</span> <span className="font-medium">{new Date(quote.expiresAt).toLocaleDateString()}</span></div>
              )}
              {quote.status && (
                <div><span className="text-muted-foreground">Status:</span> <Badge variant="secondary" className="ml-2">{quote.status}</Badge></div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Coverage Details */}
        {coverage && (
          <Card>
            <CardHeader>
              <CardTitle>Coverage Details</CardTitle>
              <CardDescription>Breakdown of what this policy covers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  {Object.entries(coverage).map(([key, value]) => (
                    <div key={key} className="flex justify-between p-2 rounded bg-muted">
                      <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}</span>
                      <span className="font-medium">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Proceed CTA */}
        <Button
          size="lg"
          className="w-full bg-gradient-to-r from-[#7ED321] to-[#00D9FF] text-white"
          onClick={() => router.push(`/buyer/deal/insurance/bind?quoteId=${quoteId}`)}
        >
          Proceed to Bind <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </ProtectedRoute>
  )
}
