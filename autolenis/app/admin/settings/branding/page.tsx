"use client"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Save, Loader2 } from "lucide-react"
import { csrfHeaders } from "@/lib/csrf-client"

export default function BrandingPage() {
  const [siteName, setSiteName] = useState("AutoLenis")
  const [tagline, setTagline] = useState("Car Buying. Reengineered.")
  const [description, setDescription] = useState("AutoLenis connects car buyers with verified dealers...")
  const [primaryColor, setPrimaryColor] = useState("#2D1B69")
  const [accentColor, setAccentColor] = useState("#0066FF")
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)

  const saveBranding = async () => {
    setSaving(true)
    setFeedback(null)
    try {
      const brandingData = { siteName, tagline, description, primaryColor, accentColor }
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({ key: "branding", value: brandingData }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error?.message || "Failed to save branding")
      }
      setFeedback({ type: "success", message: "Branding saved successfully." })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save branding"
      setFeedback({ type: "error", message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/admin/dashboard">Dashboard</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href="/admin/settings">Settings</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>Branding</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <h1 className="text-3xl font-bold">Branding & Metadata</h1>

      {feedback && (
        <div
          role="alert"
          className={`p-4 rounded-lg text-sm ${
            feedback.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {feedback.message}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Site Information</CardTitle>
          <CardDescription>Configure your site branding and metadata</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="siteName">Site Name</Label>
            <Input id="siteName" value={siteName} onChange={(e) => setSiteName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="tagline">Tagline</Label>
            <Input id="tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="primaryColor">Primary Color</Label>
              <Input id="primaryColor" type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="accentColor">Accent Color</Label>
              <Input id="accentColor" type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} />
            </div>
          </div>
          <Button className="w-full" onClick={saveBranding} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
