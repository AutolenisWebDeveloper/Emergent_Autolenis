"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function RefinanceLeadsPage() {
  const router = useRouter()
  const { data, isLoading } = useSWR("/api/admin/refinance/leads", fetcher)
  const leads = data?.leads || []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Refinance Leads</h1>
          <p className="text-muted-foreground">All refinance leads</p>
        </div>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : leads.length === 0 ? (
        <Card><CardContent className="pt-6 text-center py-8 text-muted-foreground">No refinance leads found.</CardContent></Card>
      ) : (
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">{leads.length} leads found.</p></CardContent></Card>
      )}
    </div>
  )
}
