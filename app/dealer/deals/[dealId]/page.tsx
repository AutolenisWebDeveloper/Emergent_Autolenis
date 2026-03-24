"use client"
import { use } from "react"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { AlertCircle, FileText, MessageSquare } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function DealerDealDetailPage({ params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = use(params)
  const { data, isLoading } = useSWR(`/api/dealer/deals/${dealId}`, fetcher)

  if (isLoading) return <div className="animate-pulse"><div className="h-96 bg-muted rounded" /></div>
  if (!data?.success) return <div className="flex flex-col items-center py-12"><AlertCircle className="h-12 w-12 text-destructive mb-4" /></div>

  const deal = data.data

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/dealer/dashboard">Dashboard</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href="/dealer/deals">Deals</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>{dealId}</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Deal #{dealId}</h1>
        <Badge>{deal?.status || "—"}</Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Deal Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><p className="text-sm text-muted-foreground">Vehicle</p><p className="font-medium">{deal?.vehicle || "—"}</p></div>
            <div><p className="text-sm text-muted-foreground">Amount</p><p className="font-medium">{deal?.amount ? `$${deal.amount.toLocaleString()}` : "—"}</p></div>
            <div><p className="text-sm text-muted-foreground">Buyer</p><p className="font-medium">{deal?.buyerName || "—"}</p></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full"><FileText className="h-4 w-4 mr-2" />View Documents</Button>
            <Button variant="outline" className="w-full"><MessageSquare className="h-4 w-4 mr-2" />Message Buyer</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
