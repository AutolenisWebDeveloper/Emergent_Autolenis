"use client"
import { use, useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Download, Eye, FileText, RefreshCw, AlertCircle } from "lucide-react"

interface DocumentData {
  id: string
  fileName: string
  type: string
  status: string
  mimeType: string | null
  fileSize: number | null
  fileUrl: string
  ownerUserId: string
  createdAt: string
  rejectionReason: string | null
}

const typeLabels: Record<string, string> = {
  ID: "Government ID",
  INSURANCE_PROOF: "Insurance Proof",
  PAY_STUB: "Pay Stub",
  BANK_STATEMENT: "Bank Statement",
  TRADE_IN_TITLE: "Trade-In Title",
  PRE_APPROVAL_LETTER: "Pre-Approval Letter",
  OTHER: "Other",
}

const statusColors: Record<string, string> = {
  UPLOADED: "bg-blue-100 text-blue-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  PENDING_REVIEW: "bg-yellow-100 text-yellow-800",
}

export default function DealerDocumentPage({ params }: { params: Promise<{ documentId: string }> }) {
  const { documentId } = use(params)
  const [doc, setDoc] = useState<DocumentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const fetchDoc = async () => {
      try {
        const res = await fetch(`/api/documents/${documentId}`)
        const data = await res.json()
        if (data.document) {
          setDoc(data.document)
        } else {
          setError(true)
        }
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    fetchDoc()
  }, [documentId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !doc) {
    return (
      <div className="flex flex-col items-center py-12">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-muted-foreground">Document not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/dealer/dashboard">Dashboard</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href="/dealer/documents">Documents</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>{doc.fileName}</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />{doc.fileName}</CardTitle>
            <Badge className={statusColors[doc.status] || ""}>{doc.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-sm text-muted-foreground">Type</p><p className="font-medium">{typeLabels[doc.type] || doc.type}</p></div>
            <div><p className="text-sm text-muted-foreground">Uploaded</p><p className="font-medium">{new Date(doc.createdAt).toLocaleDateString()}</p></div>
            {doc.mimeType && (
              <div><p className="text-sm text-muted-foreground">Format</p><p className="font-medium">{doc.mimeType}</p></div>
            )}
            {doc.fileSize && (
              <div><p className="text-sm text-muted-foreground">Size</p><p className="font-medium">{doc.fileSize >= 1024 * 1024 ? `${(doc.fileSize / (1024 * 1024)).toFixed(1)} MB` : `${(doc.fileSize / 1024).toFixed(1)} KB`}</p></div>
            )}
            {doc.rejectionReason && (
              <div className="col-span-2"><p className="text-sm text-muted-foreground">Rejection Reason</p><p className="font-medium text-red-600">{doc.rejectionReason}</p></div>
            )}
          </div>
          <div className="flex gap-2">
            {doc.fileUrl && (
              <Button variant="outline" className="flex-1" asChild>
                <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"><Eye className="h-4 w-4 mr-2" />View</a>
              </Button>
            )}
            {doc.fileUrl && (
              <Button variant="outline" className="flex-1" asChild>
                <a href={doc.fileUrl} download><Download className="h-4 w-4 mr-2" />Download</a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
