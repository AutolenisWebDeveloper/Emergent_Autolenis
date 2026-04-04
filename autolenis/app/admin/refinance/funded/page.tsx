"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function RefinanceFundedPage() {
  const router = useRouter()
  const { data, isLoading } = useSWR("/api/admin/refinance/funded-loans", fetcher)
  const items = data?.fundedLoans || []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Funded Refinance</h1>
          <p className="text-muted-foreground">Funded refinance applications</p>
        </div>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <Card><CardContent className="pt-6 text-center py-8 text-muted-foreground">No funded applications found.</CardContent></Card>
      ) : (
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">{items.length} applications found.</p></CardContent></Card>
      )}
    </div>
  )
}
