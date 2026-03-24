"use client"

import type React from "react"

import { csrfHeaders } from "@/lib/csrf-client"
import { useState, useEffect, useCallback } from "react"
import { ProtectedRoute } from "@/components/layout/protected-route"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { extractApiError } from "@/lib/utils/error-message"
import { User, Mail, Phone, MapPin, Briefcase } from "lucide-react"

export default function BuyerProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const { toast } = useToast()

  const loadProfile = useCallback(async () => {
    try {
      const response = await fetch("/api/buyer/profile")
      const data = await response.json()

      if (data.success) {
        setProfile(data.data.profile)
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load profile",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch("/api/buyer/profile", {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify(profile),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(extractApiError(data.error, "Failed to update profile"))
      }

      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully",
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <ProtectedRoute allowedRoles={["BUYER"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Profile</h1>
          <p className="text-muted-foreground">Manage your personal information and contact details</p>
        </div>

        <form onSubmit={handleSave}>
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your personal details and contact information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">
                    <User className="h-4 w-4 inline mr-2" />
                    First Name
                  </Label>
                  <Input
                    id="firstName"
                    value={profile?.firstName || ""}
                    onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={profile?.lastName || ""}
                    onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  <Mail className="h-4 w-4 inline mr-2" />
                  Email Address
                </Label>
                <Input id="email" type="email" value={profile?.user?.email || ""} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">
                  <Phone className="h-4 w-4 inline mr-2" />
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={profile?.phone || ""}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">
                  <MapPin className="h-4 w-4 inline mr-2" />
                  Street Address
                </Label>
                <Input
                  id="address"
                  value={profile?.address || ""}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  required
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={profile?.city || ""}
                    onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={profile?.state || ""}
                    onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                    maxLength={2}
                    placeholder="CA"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zipCode">ZIP Code</Label>
                  <Input
                    id="zipCode"
                    value={profile?.zipCode || ""}
                    onChange={(e) => setProfile({ ...profile, zipCode: e.target.value })}
                    maxLength={5}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="employer">
                  <Briefcase className="h-4 w-4 inline mr-2" />
                  Employer
                </Label>
                <Input
                  id="employer"
                  value={profile?.employer || ""}
                  onChange={(e) => setProfile({ ...profile, employer: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={loadProfile}>
                  Reset
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </ProtectedRoute>
  )
}
