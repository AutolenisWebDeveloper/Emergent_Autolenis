"use client"

import type React from "react"
import { csrfHeaders } from "@/lib/csrf-client"
import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/layout/protected-route"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { extractApiError } from "@/lib/utils/error-message"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { Calendar, MapPin, QrCode, CheckCircle2, Car } from "lucide-react"
import Image from "next/image"
import QRCode from "qrcode"

export default function DealPickupPage() {
  const [deal, setDeal] = useState<any>(null)
  const [pickup, setPickup] = useState<any>(null)
  const [qrCode, setQrCode] = useState("")
  const [loading, setLoading] = useState(true)
  const [scheduling, setScheduling] = useState(false)
  const [scheduledAt, setScheduledAt] = useState("")
  const [notes, setNotes] = useState("")
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const loadData = async () => {
      try {
        const dealRes = await fetch("/api/buyer/deal")
        const dealData = await dealRes.json()

        if (dealData.success && dealData.data.deal) {
          setDeal(dealData.data.deal)

          // Check for existing pickup
          if (dealData.data.deal.pickup) {
            setPickup(dealData.data.deal.pickup)

            // Generate QR code
            const qr = await QRCode.toDataURL(dealData.data.deal.pickup.pickupCode, { width: 300 })
            setQrCode(qr)
          }
        } else {
          router.push("/buyer/dashboard")
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load pickup information",
        })
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [router, toast])

  // Use a single dealer source for consistent display
  const pickupDealer = deal?.auctionOffer?.dealer ?? deal?.sourcedDealContext?.dealer ?? null

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault()
    setScheduling(true)

    try {
      const response = await fetch("/api/pickup/schedule", {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({
          dealId: deal.id,
          scheduledAt,
          notes,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(extractApiError(data.error, "Pickup scheduling failed"))
      }

      setPickup(data.data)

      // Generate QR code
      const qr = await QRCode.toDataURL(data.data.pickupCode, { width: 300 })
      setQrCode(qr)

      toast({
        title: "Pickup scheduled!",
        description: "Your appointment has been confirmed",
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      })
    } finally {
      setScheduling(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!deal) {
    return null
  }

  // Show pickup confirmation if already scheduled
  if (pickup) {
    return (
      <ProtectedRoute allowedRoles={["BUYER"]}>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Pickup Scheduled!</h1>
            <p className="text-muted-foreground">Your vehicle is ready for pickup</p>
          </div>

          {/* Confirmation Card */}
          <Card className="border-2 border-[#7ED321]">
            <CardHeader className="bg-gradient-to-r from-primary to-[#0066FF] text-white">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6" />
                Appointment Confirmed
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-center mb-6">
                <p className="text-sm text-muted-foreground mb-2">Scheduled for</p>
                <p className="text-2xl font-bold">
                  {new Date(pickup.scheduledAt).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* QR Code */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Your Pickup QR Code
              </CardTitle>
              <CardDescription>Show this to the dealer when you arrive</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center">
                {qrCode && (
                  <div className="bg-white p-4 rounded-lg border mb-4">
                    <Image src={qrCode} alt="Pickup QR Code" width={250} height={250} />
                  </div>
                )}
                <p className="font-mono text-lg font-bold">{pickup.pickupCode}</p>
                <p className="text-sm text-muted-foreground mt-2">Keep this code safe - you'll need it at pickup</p>
              </div>
            </CardContent>
          </Card>

          {/* Dealer Location */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Pickup Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="font-semibold">{pickupDealer?.businessName}</p>
                <p className="text-muted-foreground">
                  {pickupDealer?.address}
                  <br />
                  {pickupDealer?.city}, {pickupDealer?.state} {pickupDealer?.zip}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* What to Bring */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                What to Bring
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {[
                  "Valid driver's license",
                  "Proof of insurance",
                  "This QR code (on your phone or printed)",
                  "Payment method for any remaining balance",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-[#7ED321] flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    )
  }

  // Show scheduling form if not yet scheduled
  return (
    <ProtectedRoute allowedRoles={["BUYER"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Schedule Pickup</h1>
          <p className="text-muted-foreground">Choose a convenient time to pick up your vehicle</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Select Date & Time
            </CardTitle>
            <CardDescription>The dealer is available Monday-Saturday, 9 AM - 6 PM</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSchedule} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="scheduledAt">Pickup Date & Time</Label>
                <Input
                  id="scheduledAt"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  required
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Special Instructions (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special requests or notes for the dealer..."
                  rows={3}
                />
              </div>

              <Button
                type="submit"
                disabled={scheduling || !scheduledAt}
                size="lg"
                className="w-full bg-gradient-to-r from-[#7ED321] to-[#00D9FF]"
              >
                {scheduling ? "Scheduling..." : "Confirm Pickup Appointment"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Dealer Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Pickup Location
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="font-semibold">{pickupDealer?.businessName || "Dealer"}</p>
              <p className="text-muted-foreground">
                {pickupDealer?.city}, {pickupDealer?.state}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
}
