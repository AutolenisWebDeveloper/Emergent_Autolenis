"use client"

import { csrfHeaders } from "@/lib/csrf-client"
import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { ProtectedRoute } from "@/components/layout/protected-route"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { extractApiError } from "@/lib/utils/error-message"
import { useRouter } from "next/navigation"
import { Shield, ArrowLeft, CheckCircle2 } from "lucide-react"

export default function InsuranceBindPage() {
  const searchParams = useSearchParams()
  const quoteId = searchParams.get("quoteId")
  const [deal, setDeal] = useState<any>(null)
  const [quote, setQuote] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [binding, setBinding] = useState(false)
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split("T")[0])
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!quoteId) {
          toast({ variant: "destructive", title: "Error", description: "No quote selected." })
          router.push("/buyer/deal/insurance/quotes")
          return
        }

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
        toast({ variant: "destructive", title: "Error", description: "Failed to load data." })
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [quoteId, router, toast])

  const handleBind = async () => {
    if (!deal || !quoteId) return
    setBinding(true)
    try {
      const res = await fetch(`/api/buyer/deals/${deal.id}/insurance/bind-policy`, {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({
          quoteId,
          effective_date: effectiveDate,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(extractApiError(data.error, "Failed to bind policy"))

      toast({ title: "Policy Bound!", description: "Your insurance policy has been activated." })
      router.push("/buyer/deal/insurance/confirmed")
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message })
    } finally {
      setBinding(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!quote) return null

  return (
    <ProtectedRoute allowedRoles={["BUYER"]}>
      <div className="max-w-4xl w-full mx-auto space-y-6 p-4">
        <Button variant="ghost" onClick={() => router.push(`/buyer/deal/insurance/quotes/${quoteId}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Quote Details
        </Button>

        <div>
          <h1 className="text-3xl font-bold mb-2">Bind Insurance Policy</h1>
          <p className="text-muted-foreground">Review and confirm your insurance selection.</p>
        </div>

        {/* Quote Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>Selected Quote Summary</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Carrier:</span> <span className="font-medium">{quote.carrier}</span></div>
              <div><span className="text-muted-foreground">Product:</span> <span className="font-medium">{quote.productName || "Auto Insurance"}</span></div>
              <div><span className="text-muted-foreground">Monthly Premium:</span> <span className="font-medium">${Number(quote.monthlyPremium || 0).toFixed(2)}</span></div>
              <div><span className="text-muted-foreground">Annual Premium:</span> <span className="font-medium">${Number((quote.monthlyPremium || 0) * 12).toFixed(2)}</span></div>
            </div>
          </CardContent>
        </Card>

        {/* Effective Date */}
        <Card>
          <CardHeader>
            <CardTitle>Effective Date</CardTitle>
            <CardDescription>When should your coverage begin?</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-xs">
              <Label htmlFor="effectiveDate">Start Date</Label>
              <Input
                id="effectiveDate"
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
          </CardContent>
        </Card>

        {/* Bind Button */}
        <Button
          size="lg"
          className="w-full bg-gradient-to-r from-[#7ED321] to-[#00D9FF] text-white"
          onClick={handleBind}
          disabled={binding}
        >
          {binding ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Binding Policy...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-5 w-5 mr-2" />
              Bind Policy
            </>
          )}
        </Button>
      </div>
    </ProtectedRoute>
  )
}
