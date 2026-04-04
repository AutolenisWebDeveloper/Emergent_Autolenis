"use client"

import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/layout/protected-route"
import { VehicleCardCompact, VehicleLoadingSkeleton } from "@/components/vehicles"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { Shield, CheckCircle2, ArrowRight, Upload, Info } from "lucide-react"

export default function DealInsuranceOverviewPage() {
  const [deal, setDeal] = useState<any>(null)
  const [insurance, setInsurance] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const loadData = async () => {
      try {
        const dealRes = await fetch("/api/buyer/deal")
        const dealData = await dealRes.json()
        if (!dealData.success) {
          toast({ title: "No active deal", description: "You need an active deal to manage insurance." })
          router.push("/buyer/dashboard")
          return
        }
        setDeal(dealData.data.deal)

        const insRes = await fetch(`/api/buyer/deals/${dealData.data.deal.id}/insurance`)
        const insData = await insRes.json()
      if (insData.success) {
        setInsurance(insData.data)
      }
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to load insurance information." })
    } finally {
      setLoading(false)
    }
    }
    loadData()
  }, [toast, router])

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["BUYER"]}>
        <div className="max-w-4xl w-full mx-auto space-y-6 p-4">
          <div>
            <div className="h-9 w-40 bg-muted rounded animate-pulse mb-2" />
            <div className="h-5 w-72 bg-muted rounded animate-pulse" />
          </div>
          <VehicleLoadingSkeleton variant="compact" count={1} />
          <div className="h-40 bg-muted rounded-xl animate-pulse" />
        </div>
      </ProtectedRoute>
    )
  }

  const policy = insurance?.policy
  const status = insurance?.status ?? "NONE"

  return (
    <ProtectedRoute allowedRoles={["BUYER"]}>
      <div className="max-w-4xl w-full mx-auto space-y-6 p-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Insurance</h1>
          <p className="text-muted-foreground">
            Upload proof of insurance coverage for your vehicle purchase.
          </p>
        </div>

        {/* Vehicle Context */}
        {deal?.vehicle && (
          <VehicleCardCompact
            year={deal.vehicle.year}
            make={deal.vehicle.make}
            model={deal.vehicle.model}
            trim={deal.vehicle.trim}
            mileage={deal.vehicle.mileage}
            price={deal.cashOtd || deal.otdPrice}
            priceLabel="Deal OTD"
          />
        )}

        {/* Status Badge */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <CardTitle>Insurance Status</CardTitle>
              </div>
              <Badge variant={status === "BOUND" || status === "ACTIVE" || status === "EXTERNAL_PROOF_UPLOADED" ? "default" : "secondary"}>
                {status}
              </Badge>
            </div>
            {deal && (
              <CardDescription>
                Deal #{deal.id?.slice(0, 8)} &mdash; {[deal.vehicle?.year, deal.vehicle?.make, deal.vehicle?.model].filter(Boolean).join(" ") || "Vehicle"}
              </CardDescription>
            )}
          </CardHeader>
        </Card>

        {/* Policy Summary */}
        {policy && (
          <Card className="border-green-500">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <CardTitle className="text-green-900">Policy Active</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Carrier:</span> <span className="font-medium">{policy.carrier}</span></div>
                <div><span className="text-muted-foreground">Policy #:</span> <span className="font-medium">{policy.policyNumber}</span></div>
                <div><span className="text-muted-foreground">Effective:</span> <span className="font-medium">{policy.effectiveDate}</span></div>
                <div><span className="text-muted-foreground">Expires:</span> <span className="font-medium">{policy.expirationDate}</span></div>
              </div>
              <Button variant="outline" className="mt-4" onClick={() => router.push("/buyer/deal/insurance/confirmed")}>
                View Details <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Upload Proof CTA */}
        {!policy && (
          <>
            <Card className="border-blue-200 bg-blue-50/50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-lg text-blue-900">How It Works</CardTitle>
                </div>
                <CardDescription>
                  To proceed with your deal, obtain an insurance policy from the carrier of your choice, then upload your proof of coverage below. Our team will verify your documentation.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push("/buyer/deal/insurance/proof")}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Upload Proof of Insurance</CardTitle>
                </div>
                <CardDescription>Upload your insurance declaration page or proof of coverage document</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-gradient-to-r from-[#7ED321] to-[#00D9FF] text-white">
                  Upload Proof <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </ProtectedRoute>
  )
}
