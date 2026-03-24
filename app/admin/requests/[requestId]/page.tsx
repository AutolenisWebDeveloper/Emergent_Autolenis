"use client"

import { use } from "react"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { AlertCircle, ArrowLeft, CheckCircle, Clock, DollarSign, MapPin, Car } from "lucide-react"
import Link from "next/link"
import { csrfHeaders } from "@/lib/csrf-client"
import { useToast } from "@/hooks/use-toast"

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then((res) => res.json())

export default function AdminRequestDetailPage({ params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = use(params)
  const { data, error, isLoading } = useSWR(`/api/admin/requests/${requestId}`, fetcher)
  const { toast } = useToast()

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-muted rounded" />
        <div className="h-48 bg-muted rounded" />
      </div>
    )
  }

  if (error || !data?.success) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold">Failed to load request</h2>
      </div>
    )
  }

  const request = data.data
  const statusColors: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    ACTIVE: "bg-blue-100 text-blue-800",
    MATCHED: "bg-green-100 text-green-800",
    COMPLETED: "bg-green-100 text-green-800",
    CANCELLED: "bg-muted text-gray-800",
  }

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/admin/dashboard">Dashboard</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href="/admin/requests">Requests</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>{requestId}</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Request #{requestId}</h1>
          <p className="text-muted-foreground">View and manage buyer request</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/requests"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Request Details</CardTitle>
              <Badge className={statusColors[request.status] || ""}>{request.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Buyer Name</p>
                <p className="font-medium">{request.buyerName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{request.buyerEmail}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vehicle</p>
                <p className="font-medium flex items-center gap-2"><Car className="h-4 w-4" />{request.vehicle}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Budget</p>
                <p className="font-medium flex items-center gap-2"><DollarSign className="h-4 w-4" />${request.budget.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="font-medium flex items-center gap-2"><MapPin className="h-4 w-4" />{request.location}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-medium">{new Date(request.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
            {request.tradeIn && (
              <div>
                <p className="text-sm text-muted-foreground">Trade-In</p>
                <p className="font-medium">{request.tradeIn}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              className="w-full"
              onClick={async () => {
                const res = await fetch(`/api/admin/requests/${requestId}`, {
                  method: "PATCH",
                  headers: csrfHeaders(),
                  body: JSON.stringify({ durationHours: 72 }),
                  credentials: "include",
                })
                if (res.ok) {
                  toast({ title: "Request activated", description: "Auction is now ACTIVE." })
                  window.location.reload()
                } else {
                  const err = await res.json().catch(() => ({}))
                  toast({ title: "Activation failed", description: err.error || "Unable to activate request", variant: "destructive" as any })
                }
              }}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Activate Auction
            </Button>

            <Button variant="outline" className="w-full" asChild>
              <Link href={`/admin/auctions/${requestId}`}>
                View Offers
              </Link>
            </Button>

            <Button variant="outline" className="w-full" asChild>
              <Link href={`/admin/buyers/${request.buyerId}`}>
                Contact Buyer
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {request.timeline?.map((event: any, i: number) => (
            <div key={i} className="flex gap-4 py-3 border-b last:border-0">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="font-medium">{event.event}</p>
                <p className="text-sm text-muted-foreground">
                  {event.user} • {new Date(event.date).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
