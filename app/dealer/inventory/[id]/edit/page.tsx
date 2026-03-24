"use client"

import type React from "react"

import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, AlertCircle } from "lucide-react"
import { extractApiError } from "@/lib/utils/error-message"
import { csrfHeaders } from "@/lib/csrf-client"
import Link from "next/link"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function EditInventoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)

  const { data, isLoading, error } = useSWR(`/api/dealer/inventory/${id}`, fetcher)

  const [formData, setFormData] = useState({
    stockNumber: "",
    price: 0,
    status: "AVAILABLE",
  })

  useEffect(() => {
    if (data?.success && data.inventoryItem) {
      const item = data.inventoryItem
      setFormData({
        stockNumber: item.stockNumber || "",
        price: item.priceCents != null ? item.priceCents / 100 : 0,
        status: item.status || "AVAILABLE",
      })
    }
  }, [data])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch(`/api/dealer/inventory/${id}`, {
        method: "PATCH",
        headers: csrfHeaders(),
        body: JSON.stringify({
          stockNumber: formData.stockNumber,
          priceCents: Math.round(formData.price * 100),
          status: formData.status,
        }),
      })

      const result = await res.json()

      if (!res.ok || !result.success) {
        throw new Error(extractApiError(result.error, "Failed to update vehicle"))
      }

      toast({ title: "Vehicle updated successfully" })
      router.push(`/dealer/inventory/${id}`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update vehicle"
      toast({ variant: "destructive", title: message })
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    )
  }

  if (error || !data?.success) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Failed to load vehicle</h2>
        <p className="text-muted-foreground mb-4">The vehicle may have been removed or you may not have access.</p>
        <Button variant="outline" onClick={() => router.push("/dealer/inventory")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Inventory
        </Button>
      </div>
    )
  }

  const item = data.inventoryItem

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dealer/inventory/${id}`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            Edit: {item.year} {item.make} {item.model}
          </h1>
          {item.trim && <p className="text-muted-foreground">{item.trim}</p>}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Read-only Vehicle Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Vehicle Information</CardTitle>
            <CardDescription>Core vehicle details (read-only)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>VIN</Label>
                <Input value={item.vin || ""} disabled className="font-mono" />
              </div>
              <div>
                <Label>Year / Make / Model</Label>
                <Input value={`${item.year} ${item.make} ${item.model}`} disabled />
              </div>
              <div>
                <Label>Body Style</Label>
                <Input value={item.bodyStyle || ""} disabled />
              </div>
              <div>
                <Label>Mileage</Label>
                <Input value={item.mileage != null ? `${Number(item.mileage).toLocaleString()} mi` : ""} disabled />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Editable Fields */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Editable Details</CardTitle>
            <CardDescription>Update pricing, stock number, and status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="stockNumber">Stock Number</Label>
                <Input
                  id="stockNumber"
                  value={formData.stockNumber}
                  onChange={(e) => setFormData({ ...formData, stockNumber: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price ($)</Label>
                <Input
                  id="price"
                  type="number"
                  min={0}
                  step={0.01}
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AVAILABLE">Available</SelectItem>
                    <SelectItem value="HOLD">Hold</SelectItem>
                    <SelectItem value="SOLD">Sold</SelectItem>
                    <SelectItem value="REMOVED">Removed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.push(`/dealer/inventory/${id}`)}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="bg-gradient-to-r from-[#7ED321] to-[#00D9FF] text-primary font-semibold"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  )
}
