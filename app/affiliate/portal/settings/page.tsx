"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { extractApiError } from "@/lib/utils/error-message"
import { User, Bell, Shield, Save, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { DeleteAccountDialog } from "@/components/account/delete-account-dialog"
import { csrfHeaders } from "@/lib/csrf-client"

export default function AffiliateSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  })
  const [notifications, setNotifications] = useState({
    emailNewReferral: true,
    emailCommission: true,
    emailPayout: true,
    emailWeeklyReport: false,
  })
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState("")
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch("/api/affiliate/settings")
        const data = await response.json()
        if (data.success && data.data?.profile) {
          setFormData({
            firstName: data.data.profile.firstName || "",
            lastName: data.data.profile.lastName || "",
            email: data.data.profile.email || "",
            phone: data.data.profile.phone || "",
          })
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load affiliate settings",
        })
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [toast])

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch("/api/affiliate/settings", {
        method: "PATCH",
        headers: csrfHeaders(),
        body: JSON.stringify(formData),
      })
      const data = await response.json()
      if (!data.success) {
        throw new Error(extractApiError(data.error, "Failed to save settings"))
      }
      toast({
        title: "Settings saved",
        description: "Your affiliate profile has been updated.",
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Save failed",
        description: error.message || "Unable to save settings.",
      })
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async () => {
    setPasswordError("")
    if (!passwordData.currentPassword) {
      setPasswordError("Current password is required")
      return
    }
    if (passwordData.newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters")
      return
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("New passwords do not match")
      return
    }

    setChangingPassword(true)
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(extractApiError(data.error, "Failed to change password"))
      }
      toast({ title: "Password changed", description: "Your password has been updated successfully." })
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" })
    } catch (error: any) {
      setPasswordError(error.message || "Failed to change password")
    } finally {
      setChangingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Account & Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your affiliate account settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>First Name</Label>
              <Input
                placeholder="John"
                className="mt-1"
                value={formData.firstName}
                onChange={(event) => setFormData({ ...formData, firstName: event.target.value })}
              />
            </div>
            <div>
              <Label>Last Name</Label>
              <Input
                placeholder="Smith"
                className="mt-1"
                value={formData.lastName}
                onChange={(event) => setFormData({ ...formData, lastName: event.target.value })}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="john@example.com"
                className="mt-1"
                value={formData.email}
                onChange={(event) => setFormData({ ...formData, email: event.target.value })}
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                placeholder="(555) 123-4567"
                className="mt-1"
                value={formData.phone}
                onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
              />
            </div>
          </div>
          <Button className="bg-primary hover:bg-primary/90" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Profile"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>Choose which emails you'd like to receive</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">New Referral</p>
              <p className="text-sm text-muted-foreground">Get notified when someone signs up using your link</p>
            </div>
            <Switch
              checked={notifications.emailNewReferral}
              onCheckedChange={(checked) => setNotifications((prev) => ({ ...prev, emailNewReferral: checked }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Commission Earned</p>
              <p className="text-sm text-muted-foreground">Get notified when you earn a new commission</p>
            </div>
            <Switch
              checked={notifications.emailCommission}
              onCheckedChange={(checked) => setNotifications((prev) => ({ ...prev, emailCommission: checked }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Payout Processed</p>
              <p className="text-sm text-muted-foreground">Get notified when your payout is sent</p>
            </div>
            <Switch
              checked={notifications.emailPayout}
              onCheckedChange={(checked) => setNotifications((prev) => ({ ...prev, emailPayout: checked }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Weekly Performance Report</p>
              <p className="text-sm text-muted-foreground">Receive a weekly summary of your referral performance</p>
            </div>
            <Switch
              checked={notifications.emailWeeklyReport}
              onCheckedChange={(checked) => setNotifications((prev) => ({ ...prev, emailWeeklyReport: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Current Password</Label>
            <Input
              type="password"
              className="mt-1"
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
            />
          </div>
          <div>
            <Label>New Password</Label>
            <Input
              type="password"
              className="mt-1"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
            />
          </div>
          <div>
            <Label>Confirm New Password</Label>
            <Input
              type="password"
              className="mt-1"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
            />
          </div>
          {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
          <Button variant="outline" onClick={handlePasswordChange} disabled={changingPassword}>
            {changingPassword ? "Changing..." : "Change Password"}
          </Button>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible actions that permanently affect your affiliate account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-md border border-destructive/30 bg-destructive/5 p-4">
            <div>
              <p className="font-medium text-sm">Delete affiliate account</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Permanently remove your affiliate profile, referral history, and all associated commission records.
              </p>
            </div>
            <Button
              variant="destructive"
              className="shrink-0"
              onClick={() => setShowDeleteDialog(true)}
            >
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      <DeleteAccountDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        accountType="affiliate"
      />
    </div>
  )
}
