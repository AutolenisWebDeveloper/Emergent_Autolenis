"use client"

import { useState } from "react"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Calendar, QrCode, CheckCircle, Clock, AlertCircle, User, Car } from "lucide-react"
import { extractApiError } from "@/lib/utils/error-message"
import { csrfHeaders } from "@/lib/csrf-client"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function DealerPickupsPage() {
  const { toast } = useToast()
  const [qrCode, setQrCode] = useState("")
  const [scanning, setScanning] = useState(false)

  const { data, error, isLoading, mutate } = useSWR("/api/dealer/pickups", fetcher, {
    refreshInterval: 30000,
  })

  const handleQRScan = async () => {
    if (!qrCode.trim()) return

    setScanning(true)
    try {
      const res = await fetch("/api/dealer/pickups", {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({ qrCode }),
      })

      const data = await res.json()

      if (data.success) {
        toast({
          title: "Buyer Checked In!",
          description: `${data.pickup.deal?.buyer?.profile?.firstName} ${data.pickup.deal?.buyer?.profile?.lastName} has arrived.`,
        })
        setQrCode("")
        mutate()
      } else {
        throw new Error(extractApiError(data.error, "Failed to process QR code"))
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: error.message || "Invalid QR code" })
    } finally {
      setScanning(false)
    }
  }

  const pickups = data?.pickups || []
  const upcomingPickups = pickups.filter((p: any) => p.status === "SCHEDULED")
  const arrivedPickups = pickups.filter((p: any) => p.status === "BUYER_ARRIVED")
  const completedPickups = pickups.filter((p: any) => p.status === "COMPLETED")

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-muted rounded mb-2" />
          <div className="h-4 w-64 bg-muted rounded" />
        </div>
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-12 bg-muted rounded" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Failed to load pickups</h2>
        <p className="text-muted-foreground">Please try refreshing the page</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Calendar className="h-8 w-8 text-primary" />
          Pickup Management
        </h1>
        <p className="text-muted-foreground mt-1">Manage vehicle pickups and check in buyers</p>
      </div>

      {/* QR Scanner */}
      <Card className="border-2 border-[#7ED321]/20 bg-[#7ED321]/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-[#7ED321]" />
            QR Code Scanner
          </CardTitle>
          <CardDescription>Scan or enter the buyer's pickup QR code to check them in</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              value={qrCode}
              onChange={(e) => setQrCode(e.target.value)}
              placeholder="Scan or enter QR code..."
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && handleQRScan()}
            />
            <Button
              onClick={handleQRScan}
              disabled={scanning || !qrCode.trim()}
              className="bg-[#7ED321] hover:bg-[#7ED321]/90 text-white"
            >
              {scanning ? "Validating..." : "Check In"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-[#00D9FF]/10">
                <Clock className="h-6 w-6 text-[#00D9FF]" />
              </div>
              <div>
                <div className="text-2xl font-bold">{upcomingPickups.length}</div>
                <div className="text-sm text-muted-foreground">Upcoming</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-yellow-500/10">
                <User className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{arrivedPickups.length}</div>
                <div className="text-sm text-muted-foreground">Arrived</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-[#7ED321]/10">
                <CheckCircle className="h-6 w-6 text-[#7ED321]" />
              </div>
              <div>
                <div className="text-2xl font-bold">{completedPickups.length}</div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Arrived Buyers - Priority */}
      {arrivedPickups.length > 0 && (
        <Card className="border-yellow-500/50 bg-yellow-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-700">
              <User className="h-5 w-5" />
              Buyers Waiting ({arrivedPickups.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {arrivedPickups.map((pickup: any) => (
                <div
                  key={pickup.id}
                  className="flex items-center justify-between p-4 bg-white rounded-lg border border-yellow-200"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-full bg-yellow-100">
                      <User className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <div className="font-medium">
                        {pickup.deal?.buyer?.profile?.firstName} {pickup.deal?.buyer?.profile?.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <Car className="h-3 w-3" />
                        {pickup.deal?.inventoryItem?.year} {pickup.deal?.inventoryItem?.make}{" "}
                        {pickup.deal?.inventoryItem?.model}
                      </div>
                      <div className="text-xs text-yellow-600 mt-1">
                        Arrived {new Date(pickup.arrivedAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  <Button className="bg-[#7ED321] hover:bg-[#7ED321]/90">Complete Pickup</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Pickups */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[#00D9FF]" />
            Upcoming Pickups
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingPickups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No upcoming pickups scheduled</div>
          ) : (
            <div className="space-y-4">
              {upcomingPickups.map((pickup: any) => (
                <div
                  key={pickup.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-full bg-[#00D9FF]/10">
                      <Clock className="h-5 w-5 text-[#00D9FF]" />
                    </div>
                    <div>
                      <div className="font-medium">
                        {pickup.deal?.buyer?.profile?.firstName} {pickup.deal?.buyer?.profile?.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <Car className="h-3 w-3" />
                        {pickup.deal?.inventoryItem?.year} {pickup.deal?.inventoryItem?.make}{" "}
                        {pickup.deal?.inventoryItem?.model}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {pickup.scheduledDate ? new Date(pickup.scheduledDate).toLocaleDateString() : "TBD"}
                    </div>
                    <div className="text-sm text-muted-foreground">{pickup.scheduledTime || "Time TBD"}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completed Today */}
      {completedPickups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-[#7ED321]" />
              Completed Pickups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {completedPickups.slice(0, 5).map((pickup: any) => (
                <div key={pickup.id} className="flex items-center justify-between p-4 border rounded-lg bg-[#7ED321]/5">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-full bg-[#7ED321]/10">
                      <CheckCircle className="h-5 w-5 text-[#7ED321]" />
                    </div>
                    <div>
                      <div className="font-medium">
                        {pickup.deal?.buyer?.profile?.firstName} {pickup.deal?.buyer?.profile?.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {pickup.deal?.inventoryItem?.year} {pickup.deal?.inventoryItem?.make}{" "}
                        {pickup.deal?.inventoryItem?.model}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-[#7ED321]">
                    Completed {pickup.completedAt ? new Date(pickup.completedAt).toLocaleDateString() : ""}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
