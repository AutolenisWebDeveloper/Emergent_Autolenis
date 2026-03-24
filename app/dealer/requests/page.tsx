"use client"
import useSWR from "swr"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, MapPin, DollarSign, TrendingUp } from "lucide-react"
import Link from "next/link"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function DealerRequestsPage() {
  const { data, isLoading } = useSWR("/api/dealer/requests", fetcher)
  const [search, setSearch] = useState("")

  if (isLoading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-32 bg-muted rounded animate-pulse" />)}</div>

  const requests = data?.data || []
  const filtered = requests.filter((r: any) => r.vehicle.toLowerCase().includes(search.toLowerCase()) || r.buyerName.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Buyer Requests Marketplace</h1>
        <p className="text-muted-foreground">Browse and submit offers on buyer requests</p>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search requests..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <div className="grid gap-4">
        {filtered.map((request: any) => (
          <Card key={request.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    {request.vehicle}
                    <Badge className="bg-[#7ED321] text-white">Match: {request.matchScore}%</Badge>
                  </CardTitle>
                  <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{request.location}</span>
                    <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />Budget: ${request.budget.toLocaleString()}</span>
                  </div>
                </div>
                <Button asChild><Link href={`/dealer/requests/${request.id}`}>View & Offer</Link></Button>
              </div>
            </CardHeader>
            {request.tradeIn && (
              <CardContent>
                <p className="text-sm"><strong>Trade-in:</strong> {request.tradeIn}</p>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <Card className="p-12">
          <div className="text-center">
            <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No requests found</h3>
            <p className="text-muted-foreground">Try adjusting your search or check back later</p>
          </div>
        </Card>
      )}
    </div>
  )
}
