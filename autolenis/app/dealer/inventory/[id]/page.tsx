"use client"

import { use } from "react"
import useSWR from "swr"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { AlertCircle, ArrowLeft, Edit, Package, MapPin } from "lucide-react"
import Link from "next/link"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function InventoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { data, isLoading, error } = useSWR(`/api/dealer/inventory/${id}`, fetcher)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-64 bg-muted rounded" />
          <div className="h-10 w-80 bg-muted rounded" />
          <div className="grid gap-6 md:grid-cols-2">
            <div className="h-64 bg-muted rounded" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !data?.success) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Failed to load vehicle details</h2>
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
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dealer/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/dealer/inventory">Inventory</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{item.year} {item.make} {item.model}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Package className="h-8 w-8 text-primary" />
            {item.year} {item.make} {item.model}
          </h1>
          {item.trim && <p className="text-lg text-muted-foreground mt-1">{item.trim}</p>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/dealer/inventory")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button asChild>
            <Link href={`/dealer/inventory/${id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Vehicle
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Vehicle Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">VIN</p>
                <p className="font-mono text-sm">{item.vin || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Stock Number</p>
                <p className="font-medium">{item.stockNumber || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Body Style</p>
                <p className="font-medium">{item.bodyStyle || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mileage</p>
                <p className="font-medium">
                  {item.mileage != null ? `${Number(item.mileage).toLocaleString()} mi` : "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Condition</p>
                <p className="font-medium">{item.isNew ? "New" : "Used"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Source</p>
                <p className="font-medium">{item.source || "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pricing & Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Price</p>
                <p className="text-2xl font-bold text-[#7ED321]">
                  {item.priceCents != null
                    ? `$${(item.priceCents / 100).toLocaleString()}`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge className="mt-1">{item.status || "—"}</Badge>
              </div>
              {(item.locationCity || item.locationState) && (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Location
                  </p>
                  <p className="font-medium">
                    {[item.locationCity, item.locationState].filter(Boolean).join(", ")}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Specifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Exterior Color</p>
                <p className="font-medium">{item.exteriorColor || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Interior Color</p>
                <p className="font-medium">{item.interiorColor || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Transmission</p>
                <p className="font-medium">{item.transmission || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fuel Type</p>
                <p className="font-medium">{item.fuelType || "—"}</p>
              </div>
              {item.engine && (
                <div>
                  <p className="text-sm text-muted-foreground">Engine</p>
                  <p className="font-medium">{item.engine}</p>
                </div>
              )}
              {item.drivetrain && (
                <div>
                  <p className="text-sm text-muted-foreground">Drivetrain</p>
                  <p className="font-medium">{item.drivetrain}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Timestamps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Added</p>
              <p className="font-medium">{new Date(item.createdAt).toLocaleDateString()}</p>
            </div>
            {item.updatedAt && (
              <div>
                <p className="text-sm text-muted-foreground">Last Updated</p>
                <p className="font-medium">{new Date(item.updatedAt).toLocaleDateString()}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
