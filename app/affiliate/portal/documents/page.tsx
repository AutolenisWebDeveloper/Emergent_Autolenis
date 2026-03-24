"use client"
import { useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { FileText, Upload, Loader2, AlertCircle, CheckCircle, Clock } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import useSWR from "swr"
import { getCsrfToken } from "@/lib/csrf-client"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const DOC_TYPES = [
  { value: "W9", label: "W-9 Tax Form" },
  { value: "ID", label: "Government ID" },
  { value: "BANK", label: "Bank Statement" },
  { value: "VOIDED_CHECK", label: "Voided Check" },
  { value: "OTHER", label: "Other" },
]

export default function AffiliateDocumentsPage() {
  const { toast } = useToast()
  const { data, isLoading, mutate } = useSWR("/api/affiliate/documents", fetcher)
  const [docType, setDocType] = useState("W9")
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"]
    if (!allowedTypes.includes(file.type)) {
      toast({ variant: "destructive", title: "Invalid file type", description: "Please upload a PDF, JPG, or PNG file." })
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ variant: "destructive", title: "File too large", description: "Maximum file size is 10 MB." })
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("type", docType)

      const csrfToken = getCsrfToken()
      const res = await fetch("/api/affiliate/documents", {
        method: "POST",
        body: formData,
        ...(csrfToken ? { headers: { "x-csrf-token": csrfToken } } : {}),
      })
      const result = await res.json()

      if (!res.ok || !result.success) {
        throw new Error(result.error || "Upload failed")
      }

      toast({ title: "Document uploaded", description: `Your ${DOC_TYPES.find((d) => d.value === docType)?.label || docType} has been uploaded successfully.` })
      mutate()
    } catch (err: any) {
      toast({ variant: "destructive", title: "Upload failed", description: err.message || "Unable to upload document." })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>
      case "REJECTED":
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Rejected</Badge>
      default:
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending Review</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const documents = data?.documents || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Documents</h1>
        <p className="text-muted-foreground mt-1">Upload and manage your affiliate documents</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Document
          </CardTitle>
          <CardDescription>Upload W-9, voided checks, government ID, or other required documents</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Document Type</label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">File</label>
              <div className="mt-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleUpload}
                  disabled={uploading}
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90 disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {uploading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading document...
            </div>
          )}

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Accepted formats: PDF, JPG, PNG. Maximum file size: 10 MB. Documents are stored securely and only accessible by you and authorized administrators.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Your Documents
          </CardTitle>
          <CardDescription>Documents you have uploaded</CardDescription>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>No documents uploaded yet</p>
              <p className="text-sm mt-1">Upload your W-9 or other required documents above</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc: any) => (
                <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{doc.fileName}</p>
                      <p className="text-sm text-muted-foreground">
                        {DOC_TYPES.find((t) => t.value === doc.type)?.label || doc.type}
                        {" · "}
                        {new Date(doc.createdAt).toLocaleDateString()}
                        {doc.fileSize ? ` · ${(doc.fileSize / 1024).toFixed(0)} KB` : ""}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(doc.status)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
