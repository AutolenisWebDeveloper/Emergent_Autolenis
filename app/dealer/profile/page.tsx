"use client"

import { useState, useEffect } from "react"
import { PageHeader } from "@/components/dashboard/page-header"
import { KeyValueGrid } from "@/components/dashboard/key-value-grid"
import { StatusPill } from "@/components/dashboard/status-pill"
import { LoadingSkeleton } from "@/components/dashboard/loading-skeleton"
import { ErrorState } from "@/components/dashboard/error-state"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Building2, MapPin, Phone, Mail, Globe, Edit, Save } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { csrfHeaders } from "@/lib/csrf-client"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function DealerProfilePage() {
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const { data, error, isLoading, mutate } = useSWR("/api/dealer/profile", fetcher)

  const profile = data?.dealer

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    website: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
  })

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name || "",
        phone: profile.phone || "",
        email: profile.email || "",
        website: profile.website || "",
        address: profile.address || "",
        city: profile.city || "",
        state: profile.state || "",
        zipCode: profile.zipCode || "",
      })
    }
  }, [profile])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/dealer/profile", {
        method: "PATCH",
        headers: csrfHeaders(),
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to save profile")
      }

      toast({ title: "Profile updated", description: "Your dealership profile has been saved." })
      setIsEditing(false)
      mutate()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save profile"
      toast({ variant: "destructive", title: "Save failed", description: message })
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dealership Profile" subtitle="Manage your dealership information" />
        <LoadingSkeleton variant="detail" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dealership Profile" subtitle="Manage your dealership information" />
        <ErrorState message="Failed to load profile" onRetry={() => mutate()} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dealership Profile"
        subtitle="Manage your dealership information"
        primaryAction={{
          label: isEditing ? (saving ? "Saving…" : "Save Changes") : "Edit Profile",
          onClick: () => {
            if (isEditing) {
              handleSave()
            } else {
              setIsEditing(true)
            }
          },
          icon: isEditing ? <Save className="h-4 w-4 mr-2" /> : <Edit className="h-4 w-4 mr-2" />,
        }}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-10 w-10 text-primary" />
              </div>
              <h2 className="text-xl font-bold">{profile?.name || "Your Dealership"}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {profile?.city}, {profile?.state}
              </p>
              <div className="mt-3">
                <StatusPill status={profile?.status?.toLowerCase() || "active"} />
              </div>
            </div>

            <Separator className="my-6" />

            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{profile?.address || "Address not set"}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{profile?.phone || "Phone not set"}</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{profile?.email || "Email not set"}</span>
              </div>
              <div className="flex items-center gap-3">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span>{profile?.website || "Website not set"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Dealership Details</CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="profile-name">Dealership Name</Label>
                    <Input
                      id="profile-name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-phone">Phone</Label>
                    <Input
                      id="profile-phone"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-email">Email</Label>
                    <Input
                      id="profile-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-website">Website</Label>
                    <Input
                      id="profile-website"
                      value={form.website}
                      onChange={(e) => setForm({ ...form, website: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-address">Address</Label>
                  <Input
                    id="profile-address"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="profile-city">City</Label>
                    <Input
                      id="profile-city"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-state">State</Label>
                    <Input
                      id="profile-state"
                      value={form.state}
                      onChange={(e) => setForm({ ...form, state: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-zip">ZIP Code</Label>
                    <Input
                      id="profile-zip"
                      value={form.zipCode}
                      onChange={(e) => setForm({ ...form, zipCode: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsEditing(false)} className="bg-transparent">
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? "Saving…" : "Save Changes"}
                  </Button>
                </div>
              </div>
            ) : (
              <KeyValueGrid
                items={[
                  { label: "Dealership Name", value: profile?.name || "—" },
                  { label: "Phone", value: profile?.phone || "—" },
                  { label: "Email", value: profile?.email || "—" },
                  { label: "Website", value: profile?.website || "—" },
                  { label: "Address", value: profile?.address || "—" },
                  { label: "City", value: profile?.city || "—" },
                  { label: "State", value: profile?.state || "—" },
                  { label: "ZIP Code", value: profile?.zipCode || "—" },
                ]}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
