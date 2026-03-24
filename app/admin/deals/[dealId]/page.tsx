"use client"
import { use } from "react"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { AlertCircle, ArrowLeft } from "lucide-react"
import Link from "next/link"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function AdminDealDetailPage({ params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = use(params)
  const { data, error, isLoading } = useSWR(`/api/admin/deals/${dealId}`, fetcher)

  if (isLoading) return <div className="animate-pulse space-y-4"><div className="h-8 w-64 bg-muted rounded" /><div className="h-48 bg-muted rounded" /></div>
  if (error || !data?.success) return <div className="flex flex-col items-center py-12"><AlertCircle className="h-12 w-12 text-destructive mb-4" /><h2 className="text-xl font-semibold">Failed to load deal</h2></div>

  const deal = data.deal

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/admin/dashboard">Dashboard</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href="/admin/deals">Deals</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>{dealId}</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Deal #{dealId}</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/admin/deals/${dealId}/billing`}>Billing</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/admin/deals/${dealId}/refunds`}>Refunds</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/deals">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Deal Information</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><p className="text-sm text-muted-foreground">Status</p><Badge>{deal?.status || "—"}</Badge></div>
            <div><p className="text-sm text-muted-foreground">Vehicle</p><p className="font-medium">{deal?.vehicle || "—"}</p></div>
            <div><p className="text-sm text-muted-foreground">Amount</p><p className="font-medium">{deal?.amount ? `$${deal.amount.toLocaleString()}` : "—"}</p></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Parties</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><p className="text-sm text-muted-foreground">Buyer</p><p className="font-medium">{deal?.buyerName || "—"}</p></div>
            <div><p className="text-sm text-muted-foreground">Dealer</p><p className="font-medium">{deal?.dealerName || "—"}</p></div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
