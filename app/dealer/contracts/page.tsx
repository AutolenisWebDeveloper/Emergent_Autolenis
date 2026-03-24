"use client"

import type React from "react"
import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { FileText, Upload, CheckCircle, AlertTriangle, Clock, AlertCircle, Eye, Shield, Info } from "lucide-react"
import { csrfHeaders } from "@/lib/csrf-client"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const DOCUMENT_TYPES = [
  { value: "BUYERS_ORDER", label: "Buyer's Order" },
  { value: "FINANCE_CONTRACT", label: "Finance Contract" },
  { value: "ADDENDUM", label: "Addendum" },
  { value: "WARRANTY_FORM", label: "Warranty Form" },
  { value: "GAP_FORM", label: "GAP Form" },
  { value: "ITEMIZED_FEES", label: "Itemized Fees" },
  { value: "OTHER", label: "Other Document" },
]

export default function DealerContractsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [uploading, setUploading] = useState(false)
  const [selectedType, setSelectedType] = useState<string>("BUYERS_ORDER")
  const [selectedDealId, setSelectedDealId] = useState<string>("")

  const { data, error, isLoading, mutate } = useSWR("/api/dealer/contracts", fetcher, {
    refreshInterval: 30000,
  })

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return

    setUploading(true)
    const file = e.target.files[0]
    if (!file) return

    try {
      // Upload contract via API
      const formData = new FormData()
      formData.append("file", file)
      formData.append("documentType", selectedType)
      formData.append("dealId", selectedDealId)

      const res = await fetch("/api/dealer/contracts", {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({
          dealId: selectedDealId,
          documentType: selectedType,
          fileUrl: `/uploads/${file.name}`, // Placeholder
          metaJson: { originalName: file.name, size: file.size },
        }),
      })

      const result = await res.json()

      if (result.success) {
        toast({ title: "Contract uploaded successfully!" })
        mutate()

        // Trigger scan
        if (result.contract?.id) {
          await fetch("/api/contract/scan", {
            method: "POST",
            headers: csrfHeaders(),
            body: JSON.stringify({ contractId: result.contract.id }),
          })
        }
      } else {
        toast({ variant: "destructive", title: result.error || "Upload failed" })
      }
    } catch {
      toast({ variant: "destructive", title: "Failed to upload contract" })
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  const contracts = data?.contracts || []
  const passedContracts = contracts.filter((c: any) => c.deal?.contractShieldScan?.status === "PASS")
  const issueContracts = contracts.filter(
    (c: any) => c.deal?.contractShieldScan?.status === "FAIL" || c.deal?.contractShieldScan?.status === "IN_REVIEW",
  )
  const pendingContracts = contracts.filter(
    (c: any) => !c.deal?.contractShieldScan || c.deal?.contractShieldScan?.status === "PENDING",
  )

  // Get unique deals for selection
  const uniqueDeals = Array.from(
    new Map(
      contracts
        .filter((c: any) => c.deal)
        .map((c: any) => [
          c.deal.id,
          {
            id: c.deal.id,
            buyerName: `${c.deal.buyer?.profile?.firstName || ""} ${c.deal.buyer?.profile?.lastName || ""}`.trim(),
            vehicle: c.deal.inventoryItem
              ? `${c.deal.inventoryItem.year} ${c.deal.inventoryItem.make} ${c.deal.inventoryItem.model}`
              : "Unknown",
          },
        ]),
    ).values(),
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-muted rounded mb-2" />
          <div className="h-4 w-64 bg-muted rounded" />
        </div>
        <Card className="animate-pulse">
          <CardContent className="p-12">
            <div className="h-24 bg-muted rounded" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Failed to load contracts</h2>
        <p className="text-muted-foreground">Please try refreshing the page</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8 text-primary" />
          Contract Shield™ Review
        </h1>
        <p className="text-muted-foreground mt-1">
          Upload deal contracts for automated review. Contract Shield compares documents to the accepted offer and
          typical fee ranges.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-[#7ED321]/10">
                <CheckCircle className="h-6 w-6 text-[#7ED321]" />
              </div>
              <div>
                <div className="text-2xl font-bold">{passedContracts.length}</div>
                <div className="text-sm text-muted-foreground">Review Complete</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-amber-500/10">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{issueContracts.length}</div>
                <div className="text-sm text-muted-foreground">Items to Review</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-yellow-500/10">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{pendingContracts.length}</div>
                <div className="text-sm text-muted-foreground">Pending Review</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Disclaimer Card */}
      <Card className="bg-muted/50 border-gray-200">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p>
                Contract Shield is a review assistant that compares uploaded documents to the buyer's accepted offer and
                reference data. It does not determine legal compliance or replace your own compliance obligations. Final
                responsibility for document accuracy remains with the dealer and buyer.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-[#00D9FF]" />
            Upload Contract Document
          </CardTitle>
          <CardDescription>Upload contracts for automated review</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select Deal</label>
              <Select value={selectedDealId} onValueChange={setSelectedDealId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a deal" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueDeals.map((deal: any) => (
                    <SelectItem key={deal.id} value={deal.id}>
                      {deal.buyerName} - {deal.vehicle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Document Type</label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileUpload}
              disabled={uploading || !selectedDealId}
              className="hidden"
              id="contract-upload"
            />
            <label htmlFor="contract-upload" className={`cursor-pointer ${!selectedDealId ? "opacity-50" : ""}`}>
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <div className="text-foreground font-medium mb-2">
                {uploading
                  ? "Uploading..."
                  : !selectedDealId
                    ? "Select a deal first"
                    : "Click to upload or drag and drop"}
              </div>
              <div className="text-sm text-muted-foreground">PDF, DOC, or DOCX files accepted (max 10MB)</div>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Issues Found - Priority */}
      {issueContracts.length > 0 && (
        <Card className="border-amber-500/50 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900">
              <AlertTriangle className="h-5 w-5" />
              Contracts with Items to Review ({issueContracts.length})
            </CardTitle>
            <CardDescription>
              These contracts have flagged items that may need clarification before the buyer signs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {issueContracts.map((contract: any) => (
                <div key={contract.id} className="p-4 bg-white rounded-lg border border-amber-200">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium">{contract.documentType?.replace(/_/g, " ")}</div>
                      <div className="text-sm text-muted-foreground">
                        {contract.deal?.buyer?.profile?.firstName} {contract.deal?.buyer?.profile?.lastName} -{" "}
                        {contract.deal?.inventoryItem?.year} {contract.deal?.inventoryItem?.make}{" "}
                        {contract.deal?.inventoryItem?.model}
                      </div>
                      {contract.deal?.contractShieldScan?.issuesCount > 0 && (
                        <div className="mt-2">
                          <span className="text-sm text-amber-700 font-medium">
                            {contract.deal.contractShieldScan.issuesCount} item
                            {contract.deal.contractShieldScan.issuesCount !== 1 ? "s" : ""} flagged for review
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/dealer/contracts/${contract.deal?.contractShieldScan?.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Review
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Contracts */}
      <Card>
        <CardHeader>
          <CardTitle>All Contracts</CardTitle>
        </CardHeader>
        <CardContent>
          {contracts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No contracts uploaded yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {contracts.map((contract: any) => {
                const scanStatus = contract.deal?.contractShieldScan?.status
                return (
                  <div
                    key={contract.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-2 rounded-full ${
                          scanStatus === "PASS"
                            ? "bg-[#7ED321]/10"
                            : scanStatus === "FAIL" || scanStatus === "IN_REVIEW"
                              ? "bg-destructive/10"
                              : "bg-yellow-500/10"
                        }`}
                      >
                        {scanStatus === "PASS" ? (
                          <CheckCircle className="h-5 w-5 text-[#7ED321]" />
                        ) : scanStatus === "FAIL" || scanStatus === "IN_REVIEW" ? (
                          <AlertTriangle className="h-5 w-5 text-destructive" />
                        ) : (
                          <Clock className="h-5 w-5 text-yellow-600" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{contract.documentType?.replace(/_/g, " ")}</div>
                        <div className="text-sm text-muted-foreground">
                          {contract.deal?.buyer?.profile?.firstName} {contract.deal?.buyer?.profile?.lastName} • Version{" "}
                          {contract.version} • {new Date(contract.uploadedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          scanStatus === "PASS"
                            ? "bg-[#7ED321]/10 text-[#7ED321]"
                            : scanStatus === "FAIL" || scanStatus === "IN_REVIEW"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-yellow-500/10 text-yellow-600"
                        }`}
                      >
                        {scanStatus || "Pending"}
                      </span>
                      {contract.deal?.contractShieldScan && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/dealer/contracts/${contract.deal.contractShieldScan.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
