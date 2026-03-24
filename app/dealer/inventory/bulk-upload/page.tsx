"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, Download, FileText, Link2, Server, CheckCircle2, XCircle, AlertCircle, ArrowLeft } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { csrfHeaders, getCsrfToken } from "@/lib/csrf-client"

export default function BulkUploadPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<any>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState<"idle" | "uploading" | "processing" | "completed">("idle")

  const handleDownloadTemplate = () => {
    // Create CSV template — fields match the Add Vehicle form exactly
    const headers = [
      "vin",
      "year",
      "make",
      "model",
      "trim",
      "bodyStyle",
      "mileage",
      "exteriorColor",
      "interiorColor",
      "engine",
      "transmission",
      "drivetrain",
      "fuelType",
      "price",
      "stockNumber",
      "isNew",
      "locationCity",
      "locationState",
      "photoUrls",
      "action",
    ]

    const exampleRows = [
      [
        "1HGBH41JXMN109186",
        "2021",
        "Honda",
        "Accord",
        "EX-L",
        "Sedan",
        "35000",
        "Modern Steel Metallic",
        "Black",
        "2.0L Turbo 4-Cylinder",
        "Automatic",
        "FWD",
        "Gasoline",
        "24999",
        "STOCK-001",
        "false",
        "Los Angeles",
        "CA",
        "https://example.com/photo1.jpg,https://example.com/photo2.jpg",
        "add",
      ],
      [
        "2HGFC2F59NH123456",
        "2022",
        "Honda",
        "Civic",
        "Sport",
        "Sedan",
        "18000",
        "Aegean Blue Metallic",
        "Black",
        "1.5L Turbo 4-Cylinder",
        "Manual",
        "FWD",
        "Gasoline",
        "26500",
        "STOCK-002",
        "false",
        "San Francisco",
        "CA",
        "https://example.com/photo3.jpg",
        "add",
      ],
    ]

    const csv = [headers.join(","), ...exampleRows.map((row) => row.join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "autolenis-inventory-template.csv"
    link.click()
    URL.revokeObjectURL(url)

    toast({ title: "Template downloaded", description: "CSV template saved to your downloads folder" })
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validExtensions = [".csv", ".xlsx", ".xls", ".xml", ".tsv", ".txt", ".zip"]
    const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf("."))
    if (!validExtensions.includes(fileExtension)) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please upload CSV, XLSX, XML, TSV, TXT, or ZIP files only",
      })
      return
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Maximum file size is 50MB",
      })
      return
    }

    setSelectedFile(file)
    setUploadResult(null)
    setUploadProgress("idle")
  }

  const handleFileUpload = async () => {
    if (!selectedFile) return

    setUploading(true)
    setUploadResult(null)
    setUploadProgress("uploading")

    try {
      const formData = new FormData()
      formData.append("file", selectedFile)

      setUploadProgress("processing")

      const csrfToken = getCsrfToken()
      const uploadHeaders: Record<string, string> = {}
      if (csrfToken) uploadHeaders["x-csrf-token"] = csrfToken

      const res = await fetch("/api/dealer/inventory/bulk-upload", {
        method: "POST",
        headers: uploadHeaders,
        body: formData,
      })

      const result = await res.json()

      if (res.ok) {
        setUploadResult(result)
        setUploadProgress("completed")
        toast({
          title: "Upload complete",
          description: `Processed ${result.processed} rows. ${result.success} succeeded, ${result.failed} failed.`,
        })
      } else {
        setUploadProgress("idle")
        throw new Error(result.error || "Upload failed")
      }
    } catch (error: any) {
      setUploadProgress("idle")
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message,
      })
    } finally {
      setUploading(false)
    }
  }

  const handleUrlImport = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const url = formData.get("feedUrl") as string

    if (!url) {
      toast({ variant: "destructive", title: "Please enter a URL" })
      return
    }

    setUploading(true)
    setUploadResult(null)

    try {
      const res = await fetch("/api/dealer/inventory/url-import", {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({ url }),
      })

      const result = await res.json()

      if (res.ok) {
        setUploadResult(result)
        toast({
          title: "Import complete",
          description: `Processed ${result.processed} rows. ${result.success} succeeded, ${result.failed} failed.`,
        })
      } else {
        throw new Error(result.error || "Import failed")
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Import failed",
        description: error.message,
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Bulk Inventory Upload</h1>
          <p className="text-muted-foreground mt-1">Import multiple vehicles at once via file upload or URL feed</p>
        </div>
      </div>

      {/* Template Download Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Download Template
          </CardTitle>
          <CardDescription>Start with our CSV template to ensure proper formatting</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleDownloadTemplate} variant="outline" className="w-full sm:w-auto bg-transparent">
            <FileText className="h-4 w-4 mr-2" />
            Download AutoLenis CSV Template
          </Button>
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Template includes:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Required fields: VIN, year, make, model, bodyStyle, mileage, price</li>
              <li>• Optional fields: trim, colors, engine, transmission, drivetrain, fuelType, stockNumber, photos, location</li>
              <li>• isNew: true/false (new vs used vehicle)</li>
              <li>• Action column: add, update, sold, remove</li>
              <li>• Example rows with proper formatting</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Upload Interface */}
      <Card>
        <CardHeader>
          <CardTitle>Import Inventory</CardTitle>
          <CardDescription>Upload a file or import from a URL feed</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="file" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="file">
                <Upload className="h-4 w-4 mr-2" />
                File Upload
              </TabsTrigger>
              <TabsTrigger value="url">
                <Link2 className="h-4 w-4 mr-2" />
                URL Feed
              </TabsTrigger>
            </TabsList>

            <TabsContent value="file" className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Supported formats: CSV, XLSX, Excel, XML, TSV, TXT, ZIP (max 50MB)</AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="file-upload">Choose file</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".csv,.xlsx,.xls,.xml,.tsv,.txt,.zip"
                  onChange={handleFileSelect}
                  disabled={uploading}
                  className="cursor-pointer"
                />
              </div>

              {selectedFile && (
                <div className="p-4 border rounded-lg bg-muted/50 space-y-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{selectedFile.name}</span>
                    <span className="text-sm text-muted-foreground">
                      ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  {uploadProgress !== "idle" && uploadProgress !== "completed" && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                      {uploadProgress === "uploading" && "Uploading file..."}
                      {uploadProgress === "processing" && "Processing rows..."}
                    </div>
                  )}
                  {uploadProgress === "completed" && (
                    <div className="flex items-center gap-2 text-sm text-[#7ED321]">
                      <CheckCircle2 className="h-4 w-4" />
                      Import completed
                    </div>
                  )}
                </div>
              )}

              <Button
                onClick={handleFileUpload}
                disabled={!selectedFile || uploading}
                className="w-full sm:w-auto bg-gradient-to-r from-[#7ED321] to-[#00D9FF] text-primary font-semibold"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Inventory
                  </>
                )}
              </Button>
            </TabsContent>

            <TabsContent value="url" className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Enter a direct URL to your inventory feed (CSV, XML, or JSON format)
                </AlertDescription>
              </Alert>

              <form onSubmit={handleUrlImport} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="feedUrl">Feed URL</Label>
                  <Input
                    id="feedUrl"
                    name="feedUrl"
                    type="url"
                    placeholder="https://example.com/inventory-feed.csv"
                    required
                    disabled={uploading}
                  />
                </div>

                <Button type="submit" disabled={uploading} className="w-full sm:w-auto">
                  {uploading ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Server className="h-4 w-4 mr-2" />
                      Import from URL
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Upload Results */}
      {uploadResult && (
        <Card>
          <CardHeader>
            <CardTitle>Import Results</CardTitle>
            <CardDescription>Summary of processed vehicles</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-4 border rounded-lg">
                <CheckCircle2 className="h-8 w-8 text-[#7ED321]" />
                <div>
                  <div className="text-2xl font-bold">{uploadResult.success}</div>
                  <div className="text-sm text-muted-foreground">Successful</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 border rounded-lg">
                <XCircle className="h-8 w-8 text-destructive" />
                <div>
                  <div className="text-2xl font-bold">{uploadResult.failed}</div>
                  <div className="text-sm text-muted-foreground">Failed</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 border rounded-lg">
                <FileText className="h-8 w-8 text-muted-foreground" />
                <div>
                  <div className="text-2xl font-bold">{uploadResult.processed}</div>
                  <div className="text-sm text-muted-foreground">Total Rows</div>
                </div>
              </div>
            </div>

            {uploadResult.errors && uploadResult.errors.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Errors</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {uploadResult.errors.map((error: any, idx: number) => (
                    <div key={idx} className="p-3 bg-destructive/10 text-destructive rounded text-sm">
                      <div className="font-medium">Row {error.row}:</div>
                      <div>{error.message}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={() => router.push("/dealer/inventory")} variant="outline">
                View Inventory
              </Button>
              <Button
                onClick={() => {
                  setUploadResult(null)
                  setSelectedFile(null)
                  setUploadProgress("idle")
                  // Reset file input
                  const input = document.getElementById("file-upload") as HTMLInputElement
                  if (input) input.value = ""
                }}
              >
                Upload Another File
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
