"use client"

import { csrfHeaders } from "@/lib/csrf-client"
import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/layout/protected-route"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
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
import { Shield, ArrowLeft, ArrowRight } from "lucide-react"

export default function InsuranceQuoteRequestPage() {
  const [deal, setDeal] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [liabilityLimit, setLiabilityLimit] = useState("100000")
  const [collisionDeductible, setCollisionDeductible] = useState("500")
  const [comprehensiveDeductible, setComprehensiveDeductible] = useState("500")
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const loadDeal = async () => {
      try {
        const res = await fetch("/api/buyer/deal")
        const data = await res.json()
        if (data.success) {
          setDeal(data.data.deal)
        } else {
          toast({ title: "No active deal", description: "You need an active deal to request quotes." })
          router.push("/buyer/dashboard")
        }
      } catch {
        toast({ variant: "destructive", title: "Error", description: "Failed to load deal." })
      } finally {
        setLoading(false)
      }
    }
    loadDeal()
  }, [router, toast])

  const handleSubmit = async () => {
    if (!deal) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/buyer/deals/${deal.id}/insurance/request-quotes`, {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({
          liability_limit: Number(liabilityLimit),
          collision_deductible: Number(collisionDeductible),
          comprehensive_deductible: Number(comprehensiveDeductible),
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(extractApiError(data.error, "Failed to request quotes"))

      toast({ title: "Quotes Requested", description: "Your insurance quotes are being generated." })
      router.push("/buyer/deal/insurance/quotes")
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message })
    } finally {
      setSubmitting(false)
    }
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

        <div>
          <h1 className="text-3xl font-bold mb-2">Request Insurance Quotes</h1>
          <p className="text-muted-foreground">Choose your coverage preferences to get personalized quotes.</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>Coverage Preferences</CardTitle>
            </div>
            <CardDescription>Select your desired coverage limits and deductibles.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="liability">Liability Limit</Label>
                <Select value={liabilityLimit} onValueChange={setLiabilityLimit}>
                  <SelectTrigger id="liability">
                    <SelectValue placeholder="Select limit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50000">$50,000</SelectItem>
                    <SelectItem value="100000">$100,000</SelectItem>
                    <SelectItem value="250000">$250,000</SelectItem>
                    <SelectItem value="500000">$500,000</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="collision">Collision Deductible</Label>
                <Select value={collisionDeductible} onValueChange={setCollisionDeductible}>
                  <SelectTrigger id="collision">
                    <SelectValue placeholder="Select deductible" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="250">$250</SelectItem>
                    <SelectItem value="500">$500</SelectItem>
                    <SelectItem value="1000">$1,000</SelectItem>
                    <SelectItem value="2000">$2,000</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comprehensive">Comprehensive Deductible</Label>
                <Select value={comprehensiveDeductible} onValueChange={setComprehensiveDeductible}>
                  <SelectTrigger id="comprehensive">
                    <SelectValue placeholder="Select deductible" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="250">$250</SelectItem>
                    <SelectItem value="500">$500</SelectItem>
                    <SelectItem value="1000">$1,000</SelectItem>
                    <SelectItem value="2000">$2,000</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              size="lg"
              className="w-full bg-gradient-to-r from-[#7ED321] to-[#00D9FF] text-white"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Requesting Quotes...
                </>
              ) : (
                <>
                  Get Quotes <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
}
