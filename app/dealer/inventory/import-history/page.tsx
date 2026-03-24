"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, FileText, CheckCircle2, XCircle, AlertCircle, Download } from "lucide-react"
import { format } from "date-fns"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function ImportHistoryPage() {
  const router = useRouter()
  const [selectedImport, setSelectedImport] = useState<any>(null)

  const { data, error, isLoading } = useSWR("/api/dealer/inventory/import-history", fetcher)

  const imports = data?.imports || []

  const handleViewDetails = (importLog: any) => {
    setSelectedImport(importLog)
  }

  const handleDownloadErrors = (importLog: any) => {
    const errors = importLog.errors || []
    const csv = ["Row,Field,Error", ...errors.map((e: any) => `${e.row},${e.field || ""},${e.message}`)].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `import-errors-${importLog.id}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-muted rounded mb-2" />
          <div className="h-4 w-64 bg-muted rounded" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Failed to load import history</h2>
        <p className="text-muted-foreground">Please try refreshing the page</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Import History</h1>
          <p className="text-muted-foreground mt-1">View all your inventory import logs</p>
        </div>
      </div>

      {/* Import List */}
      <div className="grid gap-4">
        {imports.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No imports yet</h3>
              <p className="text-muted-foreground mb-4">Your import history will appear here</p>
              <Button onClick={() => router.push("/dealer/inventory/bulk-upload")} variant="outline">
                Start an Import
              </Button>
            </CardContent>
          </Card>
        ) : (
          imports.map((importLog: any) => (
            <Card key={importLog.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{importLog.fileName}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(importLog.createdAt), "MMM dd, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                  <Badge
                    variant={
                      importLog.status === "completed"
                        ? "default"
                        : importLog.status === "partial"
                          ? "secondary"
                          : "destructive"
                    }
                    className={
                      importLog.status === "completed"
                        ? "bg-[#7ED321] hover:bg-[#7ED321]/90"
                        : importLog.status === "partial"
                          ? "bg-yellow-500 hover:bg-yellow-500/90"
                          : ""
                    }
                  >
                    {importLog.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Total</div>
                      <div className="text-lg font-semibold">{importLog.totalRows}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#7ED321]" />
                    <div>
                      <div className="text-sm text-muted-foreground">Success</div>
                      <div className="text-lg font-semibold">{importLog.successRows}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-destructive" />
                    <div>
                      <div className="text-sm text-muted-foreground">Failed</div>
                      <div className="text-lg font-semibold">{importLog.failedRows}</div>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-muted-foreground">File Size</div>
                    <div className="text-lg font-semibold">{(importLog.fileSize / 1024).toFixed(2)} KB</div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleViewDetails(importLog)}>
                    View Details
                  </Button>
                  {importLog.failedRows > 0 && (
                    <Button variant="outline" size="sm" onClick={() => handleDownloadErrors(importLog)}>
                      <Download className="h-4 w-4 mr-2" />
                      Download Errors
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Details Modal */}
      {selectedImport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-3xl w-full max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle>Import Details</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setSelectedImport(null)}>
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">File Name</div>
                  <div>{selectedImport.fileName}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Import Date</div>
                  <div>{format(new Date(selectedImport.createdAt), "MMM dd, yyyy 'at' h:mm a")}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Total Rows</div>
                  <div>{selectedImport.totalRows}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Status</div>
                  <Badge
                    variant={
                      selectedImport.status === "completed"
                        ? "default"
                        : selectedImport.status === "partial"
                          ? "secondary"
                          : "destructive"
                    }
                    className={selectedImport.status === "completed" ? "bg-[#7ED321] hover:bg-[#7ED321]/90" : ""}
                  >
                    {selectedImport.status}
                  </Badge>
                </div>
              </div>

              {selectedImport.errors && selectedImport.errors.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">Errors</div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {selectedImport.errors.map((error: any, idx: number) => (
                      <div key={idx} className="p-3 bg-destructive/10 text-destructive rounded text-sm">
                        <div className="font-medium">
                          Row {error.row}
                          {error.field && ` - Field: ${error.field}`}
                        </div>
                        <div>{error.message}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
