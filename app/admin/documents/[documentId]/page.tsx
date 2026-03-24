"use client"
import { use, useState } from "react"
import { csrfHeaders } from "@/lib/csrf-client"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { AlertCircle, CheckCircle, XCircle, Download, Eye } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function AdminDocumentDetailPage({ params }: { params: Promise<{ documentId: string }> }) {
  const { documentId } = use(params)
  const { data, error, isLoading, mutate } = useSWR(`/api/admin/documents/${documentId}`, fetcher)
  const [reason, setReason] = useState("")
  const [processing, setProcessing] = useState(false)
  const { toast } = useToast()

  const handleAction = async (action: "approve" | "reject") => {
    if (action === "reject" && !reason.trim()) {
      toast({ variant: "destructive", title: "Please provide a reason for rejection" })
      return
    }
    setProcessing(true)
    try {
      const res = await fetch(`/api/admin/documents/${documentId}`, {
        method: "PATCH",
        headers: csrfHeaders(),
        body: JSON.stringify({
          status: action === "approve" ? "APPROVED" : "REJECTED",
          rejectionReason: action === "reject" ? reason : undefined,
        }),
      })
      const result = await res.json()
      if (result.success) {
        toast({ title: `Document ${action}d successfully` })
        mutate()
      } else {
        toast({ variant: "destructive", title: result.error || "Failed to update document" })
      }
    } catch {
      toast({ variant: "destructive", title: "Failed to update document" })
    }
    setProcessing(false)
  }

  if (isLoading) return <div className="animate-pulse space-y-4"><div className="h-8 w-64 bg-muted rounded" /></div>
  if (error || !data?.success) return <div className="flex flex-col items-center py-12"><AlertCircle className="h-12 w-12 text-destructive mb-4" /><p className="text-muted-foreground">Document not found</p></div>

  const doc = data.data

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/admin/dashboard">Dashboard</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href="/admin/documents">Documents</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>{documentId}</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Document Review</h1>
        <Badge>{doc.status}</Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader><CardTitle>Document Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-sm text-muted-foreground">File Name</p><p className="font-medium">{doc.fileName}</p></div>
              <div><p className="text-sm text-muted-foreground">Type</p><p className="font-medium">{doc.type}</p></div>
              <div><p className="text-sm text-muted-foreground">Owner ID</p><p className="font-medium">{doc.ownerUserId}</p></div>
              <div><p className="text-sm text-muted-foreground">Uploaded</p><p className="font-medium">{new Date(doc.createdAt).toLocaleString()}</p></div>
              {doc.mimeType && (
                <div><p className="text-sm text-muted-foreground">MIME Type</p><p className="font-medium">{doc.mimeType}</p></div>
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
                  <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"><Eye className="h-4 w-4 mr-2" />View Document</a>
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

        <Card>
          <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="rejectionReason">Rejection Reason (if applicable)</Label>
              <Textarea id="rejectionReason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Provide reason..." className="mt-1" />
            </div>
            <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => handleAction("approve")} disabled={processing}>
              <CheckCircle className="h-4 w-4 mr-2" />Approve
            </Button>
            <Button variant="destructive" className="w-full" onClick={() => handleAction("reject")} disabled={processing}>
              <XCircle className="h-4 w-4 mr-2" />Reject
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
