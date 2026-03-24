"use client"

import type React from "react"

import { csrfHeaders } from "@/lib/csrf-client"
import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/layout/protected-route"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { extractApiError } from "@/lib/utils/error-message"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { Upload, ArrowLeft } from "lucide-react"

export default function InsuranceProofPage() {
  const [deal, setDeal] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [carrierName, setCarrierName] = useState("")
  const [policyNumber, setPolicyNumber] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [documentUrl, setDocumentUrl] = useState("")
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
          toast({ title: "No active deal", description: "You need an active deal." })
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!deal) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/buyer/deals/${deal.id}/insurance/external-proof`, {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({
          carrier_name: carrierName,
          policy_number: policyNumber,
          start_date: startDate,
          end_date: endDate || undefined,
          document_url: documentUrl,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(extractApiError(data.error, "Failed to upload proof"))

      toast({ title: "Proof Uploaded", description: "Your insurance proof has been submitted." })
      router.push("/buyer/deal/insurance/confirmed")
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
          <h1 className="text-3xl font-bold mb-2">Upload Insurance Proof</h1>
          <p className="text-muted-foreground">Already have insurance? Provide your policy details below.</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              <CardTitle>Policy Information</CardTitle>
            </div>
            <CardDescription>Enter your existing insurance policy details.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="carrierName">Carrier Name *</Label>
                  <Input
                    id="carrierName"
                    placeholder="e.g., State Farm"
                    value={carrierName}
                    onChange={(e) => setCarrierName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="policyNumber">Policy Number *</Label>
                  <Input
                    id="policyNumber"
                    placeholder="Enter policy number"
                    value={policyNumber}
                    onChange={(e) => setPolicyNumber(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date (optional)</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="documentUrl">Document URL *</Label>
                <Input
                  id="documentUrl"
                  type="url"
                  placeholder="https://example.com/my-policy.pdf"
                  value={documentUrl}
                  onChange={(e) => setDocumentUrl(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Provide a link to your insurance declaration page or policy document.
                </p>
              </div>
              <Button
                type="submit"
                size="lg"
                className="w-full bg-gradient-to-r from-[#7ED321] to-[#00D9FF] text-white"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" /> Submit Proof
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
}
