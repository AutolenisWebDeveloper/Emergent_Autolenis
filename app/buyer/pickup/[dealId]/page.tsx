"use client"

import type React from "react"

import { csrfHeaders } from "@/lib/csrf-client"
import { useState } from "react"
import { useParams } from "next/navigation"
import { ProtectedRoute } from "@/components/layout/protected-route"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar, MapPin } from "lucide-react"
import Image from "next/image"

export default function PickupSchedulePage() {
  const params = useParams()
  const [pickup, setPickup] = useState<any>(null)
  const [qrCode, setQrCode] = useState("")
  const [scheduledAt, setScheduledAt] = useState("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)

  async function schedulePickup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch("/api/pickup/schedule", {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({
          dealId: params['dealId'],
          scheduledAt,
          notes,
        }),
      })

      if (!res.ok) throw new Error("Failed to schedule pickup")

      const data = await res.json()
      setPickup(data)

      // Get QR code
      const qrRes = await fetch(`/api/pickup/${data.id}/qr`)
      const qrData = await qrRes.json()
      setQrCode(qrData.qrCode)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (pickup && qrCode) {
    return (
      <ProtectedRoute allowedRoles={["BUYER"]}>
        <div className="container mx-auto py-8 max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-6 w-6" />
                Pickup Scheduled
              </CardTitle>
              <CardDescription>Your appointment is confirmed</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-primary/10 p-6 rounded-lg text-center">
                <p className="text-sm font-medium text-muted-foreground mb-2">Scheduled for</p>
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

              <div className="space-y-4">
                <h3 className="font-semibold">Your Pickup QR Code</h3>
                <p className="text-sm text-muted-foreground">
                  Show this QR code to the dealer when you arrive to pick up your vehicle.
                </p>
                <div className="flex justify-center">
                  <div className="bg-white p-4 rounded-lg border">
                    <Image src={qrCode} alt="Pickup QR Code" width={300} height={300} />
                  </div>
                </div>
                <p className="text-center text-sm font-mono text-muted-foreground">{pickup.pickupCode}</p>
              </div>

              <div className="bg-muted p-4 rounded-lg space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Pickup Location
                </h4>
                <p className="text-sm">Dealer Location Details</p>
                <p className="text-sm text-muted-foreground">The dealer will provide specific instructions</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={["BUYER"]}>
      <div className="container mx-auto py-8 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>Schedule Your Pickup</CardTitle>
            <CardDescription>Choose a convenient time to pick up your vehicle</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={schedulePickup} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="scheduledAt">Pickup Date &amp; Time</Label>
                <Input
                  id="scheduledAt"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  required
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

              <Button type="submit" disabled={loading} size="lg" className="w-full">
                {loading ? "Scheduling..." : "Confirm Pickup Appointment"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
}
