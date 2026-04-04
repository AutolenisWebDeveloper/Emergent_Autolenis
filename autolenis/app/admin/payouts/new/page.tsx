"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Loader2 } from "lucide-react"
import { extractApiError } from "@/lib/utils/error-message"
import { csrfHeaders } from "@/lib/csrf-client"

export default function AdminInitiatePayoutPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    affiliateId: "",
    amount: "",
    reference: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/payouts", {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({
          affiliateId: form.affiliateId,
          amount: Math.round(parseFloat(form.amount) * 100),
          reference: form.reference,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(extractApiError(data.error, "Failed to initiate payout"))
      router.push("/admin/payouts")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to initiate payout")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <h1 className="text-2xl font-bold">Initiate Payout</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Payout</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="affiliateId">Affiliate ID</Label>
              <Input id="affiliateId" required value={form.affiliateId} onChange={(e) => setForm({ ...form, affiliateId: e.target.value })} placeholder="Enter affiliate ID" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (USD)</Label>
              <Input id="amount" type="number" step="0.01" min="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reference">Reference (optional)</Label>
              <Input id="reference" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Payment reference" />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Initiate Payout
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
