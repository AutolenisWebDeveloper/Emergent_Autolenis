"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DollarSign, Loader2, Plus } from "lucide-react"
import useSWR from "swr"
import Link from "next/link"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function AdminPayoutsPage() {
  const { data, error, isLoading } = useSWR("/api/admin/payouts", fetcher)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Payouts</h1>
            <p className="text-muted-foreground">Manage affiliate payouts</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  const payouts = data?.payouts || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Payouts</h1>
          <p className="text-muted-foreground">Manage affiliate payouts</p>
        </div>
        <Link href="/admin/payouts/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" /> Initiate Payout
          </Button>
        </Link>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600 text-sm">Failed to load payouts.</p>
          </CardContent>
        </Card>
      )}

      {payouts.length === 0 && !error ? (
        <Card>
          <CardContent className="pt-6 pb-6">
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-1">No payouts</h3>
              <p className="text-sm text-muted-foreground">Initiate a payout to get started.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Payout ID</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Affiliate</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Amount</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((p: any) => (
                    <tr key={p.id} className="border-b hover:bg-accent">
                      <td className="py-3 px-2 font-mono text-xs">{p.id}</td>
                      <td className="py-3 px-2">{p.affiliateName || p.affiliateId}</td>
                      <td className="py-3 px-2">${(p.amount / 100).toFixed(2)}</td>
                      <td className="py-3 px-2">{p.status}</td>
                      <td className="py-3 px-2">{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
