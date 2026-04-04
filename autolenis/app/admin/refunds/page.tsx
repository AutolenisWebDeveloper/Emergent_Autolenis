"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Loader2, RotateCcw } from "lucide-react"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function AdminRefundsPage() {
  const { data, error, isLoading } = useSWR("/api/admin/payments/refunds", fetcher)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Refunds</h1>
          <p className="text-muted-foreground">Manage payment refunds</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  const refunds = data?.refunds || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Refunds</h1>
        <p className="text-muted-foreground">View and manage all refunds</p>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600 text-sm">Failed to load refunds.</p>
          </CardContent>
        </Card>
      )}

      {refunds.length === 0 && !error ? (
        <Card>
          <CardContent className="pt-6 pb-6">
            <div className="text-center py-8">
              <RotateCcw className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-1">No refunds</h3>
              <p className="text-sm text-muted-foreground">No refunds have been processed yet.</p>
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
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Refund ID</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Deal</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Amount</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {refunds.map((r: any) => (
                    <tr key={r.id} className="border-b hover:bg-accent">
                      <td className="py-3 px-2 font-mono text-xs">{r.id}</td>
                      <td className="py-3 px-2">{r.dealId || "—"}</td>
                      <td className="py-3 px-2">${((r.amount || 0) / 100).toFixed(2)}</td>
                      <td className="py-3 px-2">{r.status}</td>
                      <td className="py-3 px-2">{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ""}</td>
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
