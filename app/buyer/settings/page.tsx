"use client"

import { useState, useEffect, useCallback } from "react"
import { ProtectedRoute } from "@/components/layout/protected-route"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { extractApiError } from "@/lib/utils/error-message"
import { User, Mail, Phone, Lock, Bell, Shield, Eye, EyeOff, Trash2 } from "lucide-react"
import { DeleteAccountDialog } from "@/components/account/delete-account-dialog"
import { Switch } from "@/components/ui/switch"
import { csrfHeaders } from "@/lib/csrf-client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function BuyerSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  })
  const [notifications, setNotifications] = useState({
    email: true,
    sms: true,
    marketing: false,
  })

  // Change password state
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [changingPassword, setChangingPassword] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  // 2FA state
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [showMfaEnrollDialog, setShowMfaEnrollDialog] = useState(false)
  const [showMfaDisableDialog, setShowMfaDisableDialog] = useState(false)
  const [mfaEnrollData, setMfaEnrollData] = useState<{ secret: string; qrCodeUrl: string } | null>(null)
  const [mfaCode, setMfaCode] = useState("")
  const [mfaDisablePassword, setMfaDisablePassword] = useState("")
  const [mfaDisableCode, setMfaDisableCode] = useState("")
  const [mfaProcessing, setMfaProcessing] = useState(false)

  // Delete account state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const { toast } = useToast()

  const loadUser = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me")
      const data = await response.json()

      const user = data.data?.user
      if (data.success && user) {
        setFormData({
          firstName: user.buyerProfile?.firstName || user.firstName || "",
          lastName: user.buyerProfile?.lastName || user.lastName || "",
          email: user.email || "",
          phone: user.buyerProfile?.phone || user.phone || "",
        })
        setMfaEnabled(!!user.mfa_enrolled)
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load user information",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch("/api/buyer/profile", {
        method: "PATCH",
        headers: csrfHeaders(),
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(extractApiError(data.error, "Failed to update settings"))
      }

      toast({
        title: "Settings saved",
        description: "Your profile has been updated",
      })
      await loadUser()
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

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ variant: "destructive", title: "Error", description: "New passwords do not match" })
      return
    }

    setChangingPassword(true)
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(extractApiError(data.error, "Failed to update settings"))
      }

      toast({ title: "Password changed", description: "Your password has been updated successfully" })
      setShowPasswordDialog(false)
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    } finally {
      setChangingPassword(false)
    }
  }

  const handleMfaEnroll = async () => {
    setMfaProcessing(true)
    try {
      const response = await fetch("/api/auth/mfa/enroll", { method: "POST", headers: csrfHeaders() })
      const data = await response.json()

      if (!data.success) {
        throw new Error(extractApiError(data.error, "Failed to update settings"))
      }

      setMfaEnrollData(data.data)
      setShowMfaEnrollDialog(true)
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    } finally {
      setMfaProcessing(false)
    }
  }

  const handleMfaVerify = async () => {
    setMfaProcessing(true)
    try {
      const response = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({ code: mfaCode }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(extractApiError(data.error, "Failed to update settings"))
      }

      toast({ title: "2FA Enabled", description: "Two-factor authentication has been enabled" })
      setShowMfaEnrollDialog(false)
      setMfaCode("")
      setMfaEnrollData(null)
      setMfaEnabled(true)
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    } finally {
      setMfaProcessing(false)
    }
  }

  const handleMfaDisable = async () => {
    setMfaProcessing(true)
    try {
      const response = await fetch("/api/auth/mfa/disable", {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({ password: mfaDisablePassword, code: mfaDisableCode }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(extractApiError(data.error, "Failed to update settings"))
      }

      toast({ title: "2FA Disabled", description: "Two-factor authentication has been disabled" })
      setShowMfaDisableDialog(false)
      setMfaDisablePassword("")
      setMfaDisableCode("")
      setMfaEnabled(false)
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    } finally {
      setMfaProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <ProtectedRoute allowedRoles={["BUYER"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Account & Settings</h1>
          <p className="text-muted-foreground">Manage your profile and preferences</p>
        </div>

        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>Update your personal details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Preferences
            </CardTitle>
            <CardDescription>Choose how you want to be notified</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">Receive updates about your deals via email</p>
              </div>
              <Switch
                checked={notifications.email}
                onCheckedChange={(checked) => setNotifications({ ...notifications, email: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">SMS Notifications</p>
                <p className="text-sm text-muted-foreground">Get text messages for important updates</p>
              </div>
              <Switch
                checked={notifications.sms}
                onCheckedChange={(checked) => setNotifications({ ...notifications, sms: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Marketing Communications</p>
                <p className="text-sm text-muted-foreground">Receive promotional offers and news</p>
              </div>
              <Switch
                checked={notifications.marketing}
                onCheckedChange={(checked) => setNotifications({ ...notifications, marketing: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Security
            </CardTitle>
            <CardDescription>Manage your password and security settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" onClick={() => setShowPasswordDialog(true)}>
              Change Password
            </Button>
            <div className="flex items-center justify-between pt-4 border-t">
              <div>
                <p className="font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Two-Factor Authentication
                </p>
                <p className="text-sm text-muted-foreground">
                  {mfaEnabled ? "2FA is enabled on your account" : "Add an extra layer of security"}
                </p>
              </div>
              {mfaEnabled ? (
                <Button variant="outline" size="sm" onClick={() => setShowMfaDisableDialog(true)}>
                  Disable
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={handleMfaEnroll} disabled={mfaProcessing}>
                  {mfaProcessing ? "Setting up..." : "Enable"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>Irreversible actions</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Once you delete your account, all of your data will be permanently removed. This action cannot be undone.
            </p>
            <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>Delete Account</Button>
          </CardContent>
        </Card>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>Enter your current password and choose a new one</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                At least 8 characters with uppercase, lowercase, and number
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={changingPassword || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
            >
              {changingPassword ? "Changing..." : "Change Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MFA Enrollment Dialog */}
      <Dialog open={showMfaEnrollDialog} onOpenChange={setShowMfaEnrollDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Up Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Scan the QR code with your authenticator app (e.g., Google Authenticator, Authy)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {mfaEnrollData && (
              <>
                <div className="flex justify-center">
                  <img
                    src={mfaEnrollData.qrCodeUrl}
                    alt="QR Code for 2FA setup"
                    className="w-48 h-48 border rounded"
                  />
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Or enter this secret manually:</p>
                  <code className="text-xs bg-muted px-2 py-1 rounded select-all">{mfaEnrollData.secret}</code>
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="mfaCode">Enter the 6-digit code from your app</Label>
              <Input
                id="mfaCode"
                placeholder="000000"
                maxLength={6}
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMfaEnrollDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleMfaVerify} disabled={mfaProcessing || mfaCode.length !== 6}>
              {mfaProcessing ? "Verifying..." : "Verify & Enable"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MFA Disable Dialog */}
      <Dialog open={showMfaDisableDialog} onOpenChange={setShowMfaDisableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Enter your password and a code from your authenticator app to disable 2FA
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="mfaDisablePassword">Password</Label>
              <Input
                id="mfaDisablePassword"
                type="password"
                value={mfaDisablePassword}
                onChange={(e) => setMfaDisablePassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mfaDisableCode">Authenticator Code</Label>
              <Input
                id="mfaDisableCode"
                placeholder="000000"
                maxLength={6}
                value={mfaDisableCode}
                onChange={(e) => setMfaDisableCode(e.target.value.replace(/\D/g, ""))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMfaDisableDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleMfaDisable}
              disabled={mfaProcessing || !mfaDisablePassword || mfaDisableCode.length !== 6}
            >
              {mfaProcessing ? "Disabling..." : "Disable 2FA"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteAccountDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        accountType="buyer"
      />
    </ProtectedRoute>
  )
}
