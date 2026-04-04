"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const AUTOLENIS_FIELDS = [
  { value: "vin", label: "VIN *", required: true },
  { value: "year", label: "Year *", required: true },
  { value: "make", label: "Make *", required: true },
  { value: "model", label: "Model *", required: true },
  { value: "trim", label: "Trim", required: false },
  { value: "bodyStyle", label: "Body Style *", required: true },
  { value: "mileage", label: "Mileage *", required: true },
  { value: "exteriorColor", label: "Exterior Color", required: false },
  { value: "interiorColor", label: "Interior Color", required: false },
  { value: "transmission", label: "Transmission", required: false },
  { value: "fuelType", label: "Fuel Type", required: false },
  { value: "price", label: "Price *", required: true },
  { value: "stockNumber", label: "Stock Number", required: false },
  { value: "condition", label: "Condition", required: false },
  { value: "photoUrls", label: "Photo URLs (comma-separated)", required: false },
  { value: "location", label: "Location", required: false },
  { value: "action", label: "Action (add/update/sold/remove)", required: false },
]

export default function ColumnMappingPage() {
  const router = useRouter()
  // const _searchParams = useSearchParams()
  const { toast } = useToast()

  const [fileHeaders, setFileHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [fileName, setFileName] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // Headers are loaded from the uploaded file via the bulk-upload workflow
    // If no file has been uploaded, prompt the user to go back and upload one
    const storedHeaders = typeof window !== "undefined" ? localStorage.getItem("uploadedFileHeaders") : null
    if (storedHeaders) {
      try {
        const headers = JSON.parse(storedHeaders)
        setFileHeaders(headers)
        setFileName(localStorage.getItem("uploadedFileName") || "inventory.csv")

        // Auto-suggest mappings based on common patterns
        const autoMapping: Record<string, string> = {}

        headers.forEach((header: string) => {
          const lowerHeader = header.toLowerCase().replace(/[_\s]/g, "")

          if (lowerHeader.includes("vin")) autoMapping["vin"] = header
          else if (lowerHeader.includes("year")) autoMapping["year"] = header
          else if (lowerHeader.includes("make") || lowerHeader.includes("manufacturer")) autoMapping["make"] = header
          else if (lowerHeader.includes("model")) autoMapping["model"] = header
          else if (lowerHeader.includes("trim")) autoMapping["trim"] = header
          else if (lowerHeader.includes("body") || lowerHeader.includes("type") || lowerHeader.includes("style"))
            autoMapping["bodyStyle"] = header
          else if (lowerHeader.includes("mileage") || lowerHeader.includes("odometer")) autoMapping["mileage"] = header
          else if (lowerHeader.includes("exterior") || lowerHeader.includes("extcolor"))
            autoMapping["exteriorColor"] = header
          else if (lowerHeader.includes("interior") || lowerHeader.includes("intcolor"))
            autoMapping["interiorColor"] = header
          else if (lowerHeader.includes("trans")) autoMapping["transmission"] = header
          else if (lowerHeader.includes("fuel")) autoMapping["fuelType"] = header
          else if (lowerHeader.includes("price") || lowerHeader.includes("cost")) autoMapping["price"] = header
          else if (lowerHeader.includes("stock")) autoMapping["stockNumber"] = header
          else if (lowerHeader.includes("photo") || lowerHeader.includes("image")) autoMapping["photoUrls"] = header
          else if (lowerHeader.includes("location")) autoMapping["location"] = header
        })

        setMapping(autoMapping)
      } catch {
        // Invalid stored headers, ignore
      }
    }
  }, [])

  const handleMappingChange = (autolenisField: string, fileHeader: string) => {
    setMapping((prev) => ({
      ...prev,
      [autolenisField]: fileHeader,
    }))
  }

  const validateMapping = () => {
    const requiredFields = AUTOLENIS_FIELDS.filter((f) => f.required).map((f) => f.value)
    const missingFields = requiredFields.filter((field) => !mapping[field])

    return {
      isValid: missingFields.length === 0,
      missingFields,
    }
  }

  const handleSaveMapping = async () => {
    const validation = validateMapping()

    if (!validation.isValid) {
      toast({
        variant: "destructive",
        title: "Missing required fields",
        description: `Please map: ${validation.missingFields.join(", ")}`,
      })
      return
    }

    setSaving(true)

    try {
      // Save mapping to localStorage for reuse
      localStorage.setItem("columnMapping", JSON.stringify(mapping))

      toast({
        title: "Mapping saved",
        description: "Your column mapping has been saved and applied",
      })

      // In a real implementation, this would redirect to the upload page with the mapping applied
      router.push("/dealer/inventory/bulk-upload?mappingApplied=true")
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to save mapping",
      })
    } finally {
      setSaving(false)
    }
  }

  const validation = validateMapping()

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Column Mapping</h1>
          <p className="text-muted-foreground mt-1">Map your file columns to AutoLenis fields</p>
        </div>
      </div>

      {/* File Info */}
      {fileHeaders.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No file headers detected. Please <strong>upload a file first</strong> from the bulk upload page to map columns.
          </AlertDescription>
        </Alert>
      ) : (
      <>
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Mapping file: <strong>{fileName}</strong> ({fileHeaders.length} columns detected)
        </AlertDescription>
      </Alert>

      {/* Mapping Card */}
      <Card>
        <CardHeader>
          <CardTitle>Field Mapping</CardTitle>
          <CardDescription>
            Match your file columns to AutoLenis fields. Required fields are marked with *
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {AUTOLENIS_FIELDS.map((field) => (
            <div key={field.value} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div className="flex items-center gap-2">
                <Label htmlFor={field.value} className="font-medium">
                  {field.label}
                </Label>
                {mapping[field.value] && <CheckCircle2 className="h-4 w-4 text-[#7ED321]" />}
              </div>

              <Select
                value={mapping[field.value] || "none"}
                onValueChange={(value) => handleMappingChange(field.value, value)}
              >
                <SelectTrigger id={field.value}>
                  <SelectValue placeholder="Select column from your file" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Skip this field --</SelectItem>
                  {fileHeaders.map((header) => (
                    <SelectItem key={header} value={header}>
                      {header}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Validation Status */}
      {!validation.isValid && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Missing required fields: {validation.missingFields.join(", ")}</AlertDescription>
        </Alert>
      )}

      {validation.isValid && (
        <Alert className="border-[#7ED321] bg-[#7ED321]/10">
          <CheckCircle2 className="h-4 w-4 text-[#7ED321]" />
          <AlertDescription className="text-[#7ED321]">
            All required fields are mapped. Ready to proceed!
          </AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button onClick={handleSaveMapping} disabled={!validation.isValid || saving}>
          {saving ? "Saving..." : "Save Mapping & Continue"}
        </Button>
      </div>
      </>
      )}
    </div>
  )
}
