"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { VehicleRow, VehicleEmptyState, VehicleLoadingSkeleton } from "@/components/vehicles"
import { Package, Plus, Search, MoreVertical, Edit, Trash2, Eye, AlertCircle, Upload, Sparkles, CheckCircle2, XCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { csrfHeaders } from "@/lib/csrf-client"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function DealerInventoryPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [search, setSearch] = useState("")
  const [deleting, setDeleting] = useState<string | null>(null)

  const { data, error, isLoading, mutate } = useSWR("/api/dealer/inventory", fetcher, {
    refreshInterval: 30000,
  })

  // Fetch suggested inventory from market intelligence
  const { data: suggestedData, mutate: mutateSuggested } = useSWR("/api/dealer/inventory/suggested", fetcher, {
    refreshInterval: 60000,
  })

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this vehicle from inventory?")) return

    setDeleting(id)
    try {
      const res = await fetch(`/api/dealer/inventory/${id}`, { method: "DELETE", headers: csrfHeaders() })
      if (res.ok) {
        toast({ title: "Vehicle removed from inventory" })
        mutate()
      } else {
        throw new Error("Failed to delete")
      }
    } catch {
      toast({ variant: "destructive", title: "Failed to remove vehicle" })
    } finally {
      setDeleting(null)
    }
  }

  const handleConfirmSuggested = async (vehicleId: string) => {
    try {
      const res = await fetch(`/api/dealer/inventory/suggested/${vehicleId}/confirm`, {
        method: "POST",
        headers: csrfHeaders(),
      })
      if (res.ok) {
        toast({ title: "Vehicle confirmed and added to inventory" })
        mutate()
        mutateSuggested()
      } else {
        throw new Error("Failed to confirm")
      }
    } catch {
      toast({ variant: "destructive", title: "Failed to confirm vehicle" })
    }
  }

  const handleRejectSuggested = async (vehicleId: string) => {
    try {
      const res = await fetch(`/api/dealer/inventory/suggested/${vehicleId}/reject`, {
        method: "POST",
        headers: csrfHeaders(),
      })
      if (res.ok) {
        toast({ title: "Suggestion dismissed" })
        mutateSuggested()
      } else {
        throw new Error("Failed to reject")
      }
    } catch {
      toast({ variant: "destructive", title: "Failed to dismiss suggestion" })
    }
  }

  const inventory = data?.inventory || []
  const suggestedVehicles = suggestedData?.success ? (suggestedData?.data?.vehicles || suggestedData?.vehicles || []) : []

  const filteredInventory = inventory.filter((item: any) => {
    const searchLower = search.toLowerCase()
    return (
      item.make?.toLowerCase().includes(searchLower) ||
      item.model?.toLowerCase().includes(searchLower) ||
      item.vin?.toLowerCase().includes(searchLower) ||
      item.stockNumber?.toLowerCase().includes(searchLower)
    )
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <div className="h-9 w-52 bg-muted rounded animate-pulse mb-2" />
            <div className="h-5 w-36 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <VehicleLoadingSkeleton variant="row" count={5} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Failed to load inventory</h2>
        <p className="text-muted-foreground">Please try refreshing the page</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Package className="h-8 w-8 text-primary" />
            Inventory Management
          </h1>
          <p className="text-muted-foreground mt-1">
            {inventory.length} vehicle{inventory.length !== 1 ? "s" : ""} in stock
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => router.push("/dealer/inventory/bulk-upload")}
            variant="outline"
            className="border-primary text-primary"
          >
            <Upload className="h-4 w-4 mr-2" />
            Bulk Upload
          </Button>
          <Button
            onClick={() => router.push("/dealer/inventory/add")}
            className="bg-gradient-to-r from-[#7ED321] to-[#00D9FF] text-primary font-semibold"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Vehicle
          </Button>
        </div>
      </div>

      {/* Suggested Inventory from Market Intelligence */}
      {suggestedVehicles.length > 0 && (
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/10">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              Suggested Inventory
              <Badge variant="secondary">{suggestedVehicles.length}</Badge>
            </CardTitle>
            <CardDescription>
              These vehicles were discovered from market sources and may match your dealership. Confirm to add them to your verified inventory.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {suggestedVehicles.slice(0, 5).map((v: any) => (
                <div key={v.id} className="flex items-center justify-between p-3 bg-white dark:bg-background rounded-lg border">
                  <div className="flex-1">
                    <p className="font-medium">
                      {v.year} {v.make} {v.model} {v.trim || ""}
                    </p>
                    <div className="flex gap-3 text-sm text-muted-foreground">
                      {v.vin && <span className="font-mono">{v.vin}</span>}
                      {v.mileage && <span>{Number(v.mileage).toLocaleString()} mi</span>}
                      {v.priceCents && <span>${(v.priceCents / 100).toLocaleString()}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-700 border-green-300 hover:bg-green-50"
                      onClick={() => handleConfirmSuggested(v.id)}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Confirm
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground"
                      onClick={() => handleRejectSuggested(v.id)}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by make, model, VIN, or stock number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your Vehicles</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredInventory.length === 0 ? (
            <VehicleEmptyState
              title={search ? "No vehicles match your search" : "No vehicles in inventory"}
              description={search ? "Try a different search term." : "Add your first vehicle to get started."}
              icon={<Package className="h-8 w-8 text-muted-foreground/50" />}
              primaryAction={
                !search
                  ? { label: "Add Vehicle", href: "/dealer/inventory/add" }
                  : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-sm">Vehicle</th>
                    <th className="text-left py-3 px-4 font-medium text-sm">VIN</th>
                    <th className="text-left py-3 px-4 font-medium text-sm">Stock #</th>
                    <th className="text-left py-3 px-4 font-medium text-sm">Price</th>
                    <th className="text-left py-3 px-4 font-medium text-sm">Status</th>
                    <th className="text-right py-3 px-4 font-medium text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.map((item: any) => (
                    <VehicleRow
                      key={item.id}
                      year={item.year}
                      make={item.make}
                      model={item.model}
                      trim={item.trim}
                      vin={item.vin}
                      stockNumber={item.stockNumber}
                      priceCents={item.priceCents}
                      status={item.status}
                      actions={
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/dealer/inventory/${item.id}`)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/dealer/inventory/${item.id}/edit`)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(item.id)}
                              disabled={deleting === item.id}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {deleting === item.id ? "Removing..." : "Remove"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      }
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
