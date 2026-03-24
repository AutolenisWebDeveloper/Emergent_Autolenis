"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import useSWR from "swr"
import { CheckCircle2, Clock, ExternalLink } from "lucide-react"
import { useRouter } from "next/navigation"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function ContractShieldOverridesPage() {
  const router = useRouter()
  const { data } = useSWR("/api/admin/contract-shield/overrides", fetcher)

  const overrides = data?.data || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Override Audit Ledger</h1>
        <p className="text-muted-foreground">Track all manual contract review interventions</p>
      </div>

      <div className="grid gap-4">
        {overrides.map((override: any) => (
          <Card key={override.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {override.action === "FORCE_PASS" ? "Forced Pass" : "Forced Fail"}
                  </CardTitle>
                  <CardDescription>
                    By {override.admin.firstName} {override.admin.lastName} •{" "}
                    {new Date(override.createdAt).toLocaleDateString()}
                  </CardDescription>
                </div>
                <Badge variant={override.buyerAcknowledged ? "default" : "secondary"}>
                  {override.buyerAcknowledged ? (
                    <>
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Acknowledged
                    </>
                  ) : (
                    <>
                      <Clock className="h-3 w-3 mr-1" />
                      Pending
                    </>
                  )}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-1">Reason:</p>
                <p className="text-sm text-muted-foreground">{override.reason}</p>
              </div>

              {override.buyerAcknowledged && override.buyerAckComment && (
                <div>
                  <p className="text-sm font-medium mb-1">Buyer Comment:</p>
                  <p className="text-sm text-muted-foreground">{override.buyerAckComment}</p>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {override.previousStatus} → {override.newStatus}
                </Badge>
                {override.scan.selectedDeal && (
                  <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/contracts/${override.scanId}`)}>
                    View Contract
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {overrides.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No overrides recorded yet</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
