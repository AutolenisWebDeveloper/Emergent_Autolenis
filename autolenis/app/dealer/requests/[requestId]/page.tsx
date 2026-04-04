"use client"
import { use } from "react"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { AlertCircle, Send, ArrowLeft, MapPin, DollarSign, Calendar, Users } from "lucide-react"
import Link from "next/link"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function DealerRequestDetailPage({ params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = use(params)
  const { data, isLoading } = useSWR(`/api/dealer/requests/${requestId}`, fetcher)

  if (isLoading) return <div className="animate-pulse space-y-4"><div className="h-8 w-64 bg-muted rounded" /><div className="h-64 bg-muted rounded" /></div>
  if (!data?.success) return <div className="flex flex-col items-center py-12"><AlertCircle className="h-12 w-12 text-destructive mb-4" /><h2 className="text-xl font-semibold">Failed to load request</h2></div>

  const request = data.data

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/dealer/dashboard">Dashboard</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href="/dealer/requests">Requests</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>{requestId}</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{request.vehicle}</h1>
          <p className="text-muted-foreground">Request #{requestId}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link href="/dealer/requests"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link></Button>
          <Button asChild><Link href="/dealer/offers/new"><Send className="h-4 w-4 mr-2" />Submit Offer</Link></Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader><CardTitle>Request Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-sm text-muted-foreground">Buyer</p><p className="font-medium">{request.buyerName}</p></div>
              <div><p className="text-sm text-muted-foreground">Match Score</p><Badge className="bg-[#7ED321] text-white">{request.matchScore}%</Badge></div>
              <div><p className="text-sm text-muted-foreground">Budget</p><p className="font-medium flex items-center gap-1"><DollarSign className="h-4 w-4" />${request.budget?.toLocaleString()}</p></div>
              <div><p className="text-sm text-muted-foreground">Location</p><p className="font-medium flex items-center gap-1"><MapPin className="h-4 w-4" />{request.location}</p></div>
              <div><p className="text-sm text-muted-foreground">Distance</p><p className="font-medium">{request.distance}</p></div>
              <div><p className="text-sm text-muted-foreground">Competing Offers</p><p className="font-medium flex items-center gap-1"><Users className="h-4 w-4" />{request.competingOffers || 0}</p></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Trade-In</CardTitle></CardHeader>
          <CardContent>
            {request.tradeIn ? (
              <div className="space-y-2">
                <p className="font-medium">{request.tradeInDetails?.year} {request.tradeInDetails?.make} {request.tradeInDetails?.model}</p>
                <p className="text-sm text-muted-foreground">Mileage: {request.tradeInDetails?.mileage?.toLocaleString()} mi</p>
                <p className="text-sm text-muted-foreground">Condition: {request.tradeInDetails?.condition}</p>
                <p className="font-semibold mt-2">Est. Value: ${request.tradeInDetails?.estimatedValue?.toLocaleString()}</p>
              </div>
            ) : (
              <p className="text-muted-foreground">No trade-in</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Buyer Preferences</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Preferred Colors</p>
            <div className="flex flex-wrap gap-2">
              {request.buyerProfile?.preferences?.color?.map((c: string) => <Badge key={c} variant="outline">{c}</Badge>)}
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-2">Required Features</p>
            <div className="flex flex-wrap gap-2">
              {request.buyerProfile?.preferences?.features?.map((f: string) => <Badge key={f} variant="outline">{f}</Badge>)}
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-2">Timeline</p>
            <p className="font-medium flex items-center gap-1"><Calendar className="h-4 w-4" />{request.buyerProfile?.timeline}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
