"use client"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Send } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { csrfHeaders } from "@/lib/csrf-client"

export default function NewOfferPage() {
  const [vehiclePrice, setVehiclePrice] = useState("")
  const [tradeInOffer, setTradeInOffer] = useState("")
  const [fees, setFees] = useState("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleSubmit = async () => {
    if (!vehiclePrice) {
      toast({ variant: "destructive", title: "Please enter vehicle price" })
      return
    }
    setLoading(true)
    try {
      const requestId = new URLSearchParams(window.location.search).get("requestId") || "req_001"
      const res = await fetch("/api/dealer/offers", {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({
          requestId,
          vehiclePrice: parseFloat(vehiclePrice),
          tradeInOffer: parseFloat(tradeInOffer || "0"),
          additionalFees: parseFloat(fees || "0"),
          notes,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: "Offer submitted successfully!" })
        router.push("/dealer/offers")
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to submit offer" })
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/dealer/dashboard">Dashboard</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href="/dealer/offers">Offers</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>New</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card>
        <CardHeader>
          <CardTitle>Submit New Offer</CardTitle>
          <CardDescription>Create an offer for a buyer request</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="vehiclePrice">Vehicle Price *</Label>
            <Input id="vehiclePrice" type="number" value={vehiclePrice} onChange={(e) => setVehiclePrice(e.target.value)} placeholder="45000" />
          </div>
          <div>
            <Label htmlFor="tradeInOffer">Trade-In Offer</Label>
            <Input id="tradeInOffer" type="number" value={tradeInOffer} onChange={(e) => setTradeInOffer(e.target.value)} placeholder="18000" />
          </div>
          <div>
            <Label htmlFor="fees">Additional Fees</Label>
            <Input id="fees" type="number" value={fees} onChange={(e) => setFees(e.target.value)} placeholder="500" />
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional information..." />
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-2">Offer Summary</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span>Vehicle Price:</span><span>${parseFloat(vehiclePrice || "0").toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Trade-In Credit:</span><span>-${parseFloat(tradeInOffer || "0").toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Additional Fees:</span><span>${parseFloat(fees || "0").toLocaleString()}</span></div>
              <div className="flex justify-between font-bold border-t pt-1 mt-1"><span>Total:</span><span>${(parseFloat(vehiclePrice || "0") - parseFloat(tradeInOffer || "0") + parseFloat(fees || "0")).toLocaleString()}</span></div>
            </div>
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={loading}>
            <Send className="h-4 w-4 mr-2" />Submit Offer
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
