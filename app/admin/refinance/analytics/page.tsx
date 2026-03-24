"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function RefinanceAnalyticsPage() {
  const router = useRouter()
  const { isLoading } = useSWR("/api/admin/refinance/stats", fetcher)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Refinance Analytics</h1>
          <p className="text-muted-foreground">Funding rates and analytics</p>
        </div>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Card><CardContent className="pt-6 text-center py-8 text-muted-foreground">Analytics data will appear here.</CardContent></Card>
      )}
    </div>
  )
}
