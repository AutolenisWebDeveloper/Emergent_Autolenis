"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, FileText, Calendar, DollarSign, Car, Building2, Download, Clock } from "lucide-react"
import { ProtectedRoute } from "@/components/layout/protected-route"

interface ContractDetail {
  id: string
  status: string
  vehicleYear: number | null
  vehicleMake: string | null
  vehicleModel: string | null
  vehicleTrim: string | null
  vin: string | null
  dealerName: string | null
  priceCents: number | null
  createdAt: string
  signedAt: string | null
  documents: Array<{ id: string; name: string; type: string; url?: string }>
}

export default function BuyerContractDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [contract, setContract] = useState<ContractDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchContract = useCallback(async () => {
    try {
      const res = await fetch(`/api/buyer/contracts/${params.contractId}`)
      if (!res.ok) { setError("Contract not found"); return }
      const data = await res.json()
      setContract(data?.data || data)
    } catch { setError("Failed to load contract") } finally { setLoading(false) }
  }, [params.contractId])

  useEffect(() => { fetchContract() }, [fetchContract])

  if (loading) {
    return (
      <div className="space-y-6" data-testid="contract-detail-loading">
        <div className="h-8 w-48 bg-muted/50 animate-pulse rounded" />
        <div className="h-64 rounded-xl bg-muted/50 animate-pulse" />
      </div>
    )
  }

  if (error || !contract) {
    return (
      <div className="space-y-6" data-testid="contract-detail-error">
        <Button variant="ghost" onClick={() => router.back()} className="gap-2"><ArrowLeft className="h-4 w-4" />Back</Button>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-1">Contract not found</h3>
            <p className="text-sm text-muted-foreground">{error || "This contract may have been removed or you may not have access."}</p>
            <Button variant="outline" className="mt-4" onClick={() => router.push("/buyer/contracts")}>View All Contracts</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const vehicle = [contract.vehicleYear, contract.vehicleMake, contract.vehicleModel, contract.vehicleTrim].filter(Boolean).join(" ")

  return (
    <ProtectedRoute allowedRoles={["BUYER"]}>
    <div className="space-y-6" data-testid="contract-detail-page">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{vehicle || "Contract Details"}</h1>
          <p className="text-sm text-muted-foreground">Contract #{contract.id.slice(0, 8)}</p>
        </div>
        <Badge className="ml-auto" variant={contract.status === "SIGNED" ? "default" : "secondary"}>
          {contract.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Car className="h-4 w-4" />Vehicle</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Vehicle:</span> {vehicle || "N/A"}</p>
            <p><span className="text-muted-foreground">VIN:</span> {contract.vin || "N/A"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" />Dealer</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Dealer:</span> {contract.dealerName || "N/A"}</p>
            {contract.priceCents && <p><span className="text-muted-foreground">Price:</span> ${(contract.priceCents / 100).toLocaleString()}</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" />Timeline</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><span className="text-muted-foreground">Created:</span> {new Date(contract.createdAt).toLocaleDateString()}</p>
          {contract.signedAt && <p><span className="text-muted-foreground">Signed:</span> {new Date(contract.signedAt).toLocaleDateString()}</p>}
        </CardContent>
      </Card>

      {contract.documents && contract.documents.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" />Documents</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {contract.documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{doc.name}</span>
                  </div>
                  {doc.url && <Button variant="ghost" size="sm"><Download className="h-4 w-4" /></Button>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
    </ProtectedRoute>
  )
}
