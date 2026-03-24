"use client"
import { useSearchParams } from "next/navigation"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Eye, ShieldAlert } from "lucide-react"
import Link from "next/link"

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (res.status === 403) {
    return { deals: [], _rlsDenied: true }
  }
  if (!res.ok) {
    throw new Error(`Request failed with status ${res.status}`)
  }
  return res.json()
}

export default function DealerDealsPage() {
  const searchParams = useSearchParams()
  const status = searchParams.get("status")
  const apiUrl = status ? `/api/dealer/deals?status=${status}` : "/api/dealer/deals"
  const { data, isLoading, error } = useSWR(apiUrl, fetcher)

  if (isLoading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-24 bg-muted rounded animate-pulse" />)}</div>

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">My Deals</h1>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-4 py-6">
            <ShieldAlert className="h-8 w-8 text-red-500 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-900">Unable to load deals</h3>
              <p className="text-sm text-red-700">Please try refreshing the page.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const deals = data?.deals || []

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">
        {status === "COMPLETED" ? "Completed Deals" : "My Deals"}
      </h1>

      {data?._rlsDenied && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-center gap-3 py-4">
            <ShieldAlert className="h-5 w-5 text-amber-500 flex-shrink-0" />
            <p className="text-sm text-amber-800">Some deals may not be visible due to access restrictions.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {deals.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-lg font-semibold mb-2">No Deals Found</h3>
              <p className="text-muted-foreground">
                {status
                  ? `No deals with status "${status}" are currently available.`
                  : "You don't have any active deals. Deals will appear here when buyers accept your auction offers."}
              </p>
            </CardContent>
          </Card>
        ) : (
          deals.map((deal: any) => (
            <Card key={deal.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{deal.vehicle}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge>{deal.status}</Badge>
                    <Button size="sm" asChild><Link href={`/dealer/deals/${deal.id}`}><Eye className="h-4 w-4 mr-1" />View</Link></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div><p className="text-muted-foreground">Buyer</p><p className="font-medium">{deal.buyerName}</p></div>
                  <div><p className="text-muted-foreground">Amount</p><p className="font-medium">${deal.amount?.toLocaleString()}</p></div>
                  <div><p className="text-muted-foreground">Date</p><p className="font-medium">{new Date(deal.createdAt).toLocaleDateString()}</p></div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
