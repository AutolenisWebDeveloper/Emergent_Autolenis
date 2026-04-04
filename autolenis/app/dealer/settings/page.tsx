"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Settings, Building2, Bell, Shield, AlertCircle, KeyRound, Smartphone, Trash2 } from "lucide-react"
import { DeleteAccountDialog } from "@/components/account/delete-account-dialog"
import { csrfHeaders } from "@/lib/csrf-client"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function DealerSettingsPage() {
  const { toast } = useToast()
  const { data, error, isLoading, mutate } = useSWR("/api/dealer/settings", fetcher)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    businessName: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    postalCode: "",
  })
  const [notifications, setNotifications] = useState({
    auctionInvites: true,
    offerSelected: true,
    contractIssues: true,
    pickupReminders: true,
  })

  // Password change state
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [changingPassword, setChangingPassword] = useState(false)

  // Delete account state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // 2FA state
  const [show2faModal, setShow2faModal] = useState(false)
  const [mfaStep, setMfaStep] = useState<"enroll" | "verify">("enroll")
  const [mfaQrCode, setMfaQrCode] = useState("")
  const [mfaSecret, setMfaSecret] = useState("")
  const [mfaCode, setMfaCode] = useState("")
  const [enrolling2fa, setEnrolling2fa] = useState(false)

  useEffect(() => {
    if (data?.settings) {
      setFormData({
        businessName: data.settings.businessName || "",
        phone: data.settings.phone || "",
        email: data.settings.email || "",
        address: data.settings.address || "",
        city: data.settings.city || "",
        state: data.settings.state || "",
        postalCode: data.settings.postalCode || "",
      })
      if (data.settings.notifications) {
        setNotifications({
          auctionInvites: data.settings.notifications.auctionInvites ?? true,
          offerSelected: data.settings.notifications.offerSelected ?? true,
          contractIssues: data.settings.notifications.contractIssues ?? true,
          pickupReminders: data.settings.notifications.pickupReminders ?? true,
        })
      }
    }
  }, [data])

  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/dealer/settings", {
        method: "PATCH",
        headers: csrfHeaders(),
        body: JSON.stringify({ ...formData, notifications }),
      })

      if (!res.ok) throw new Error("Failed to save")

      toast({ title: "Settings saved successfully" })
      mutate()
    } catch {
      toast({ variant: "destructive", title: "Failed to save settings" })
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({ variant: "destructive", title: "Passwords do not match" })
      return
    }
    setChangingPassword(true)
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const result = await res.json()
      if (result.success) {
        toast({ title: "Password changed successfully" })
        setShowPasswordModal(false)
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
      } else {
        toast({ variant: "destructive", title: result.error || "Failed to change password" })
      }
    } catch {
      toast({ variant: "destructive", title: "Failed to change password" })
    } finally {
      setChangingPassword(false)
    }
  }

  const handleEnroll2FA = async () => {
    setEnrolling2fa(true)
    try {
      const res = await fetch("/api/auth/mfa/enroll", { method: "POST", headers: csrfHeaders() })
      const result = await res.json()
      if (result.success) {
        setMfaQrCode(result.data.qrCodeUrl)
        setMfaSecret(result.data.secret)
        setMfaStep("verify")
      } else {
        toast({ variant: "destructive", title: result.error || "Failed to start 2FA enrollment" })
      }
    } catch {
      toast({ variant: "destructive", title: "Failed to start 2FA enrollment" })
    } finally {
      setEnrolling2fa(false)
    }
  }

  const handleVerify2FA = async () => {
    setEnrolling2fa(true)
    try {
      const res = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({ code: mfaCode }),
      })
      const result = await res.json()
      if (result.success) {
        toast({ title: "Two-factor authentication enabled" })
        setShow2faModal(false)
        setMfaCode("")
        setMfaStep("enroll")
      } else {
        toast({ variant: "destructive", title: result.error || "Invalid verification code" })
      }
    } catch {
      toast({ variant: "destructive", title: "Failed to verify 2FA code" })
    } finally {
      setEnrolling2fa(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl space-y-6">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-muted rounded mb-2" />
          <div className="h-4 w-64 bg-muted rounded" />
        </div>
        {[1, 2].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 w-32 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="h-10 bg-muted rounded" />
                <div className="h-10 bg-muted rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Failed to load settings</h2>
        <p className="text-muted-foreground">Please try refreshing the page</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="h-8 w-8 text-primary" />
          Dealer Settings
        </h1>
        <p className="text-muted-foreground mt-1">Manage your dealership account and preferences</p>
      </div>

      {/* Business Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-[#7ED321]" />
            Business Information
          </CardTitle>
          <CardDescription>Update your dealership details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="businessName">Business Name</Label>
            <Input
              id="businessName"
              value={formData.businessName}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              placeholder="ABC Auto Sales"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(555) 123-4567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contact@dealer.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="123 Main Street"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Los Angeles"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="CA"
                maxLength={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postalCode">ZIP Code</Label>
              <Input
                id="postalCode"
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                placeholder="90001"
              />
            </div>
          </div>

          <Button onClick={handleSaveSettings} disabled={saving} className="w-full bg-primary hover:bg-primary/90">
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-[#00D9FF]" />
            Notification Preferences
          </CardTitle>
          <CardDescription>Choose what notifications you want to receive</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Auction Invitations</div>
              <div className="text-sm text-muted-foreground">Get notified when invited to new auctions</div>
            </div>
            <Switch
              checked={notifications.auctionInvites}
              onCheckedChange={(v) => setNotifications({ ...notifications, auctionInvites: v })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Offer Selected</div>
              <div className="text-sm text-muted-foreground">Get notified when your offer is selected</div>
            </div>
            <Switch
              checked={notifications.offerSelected}
              onCheckedChange={(v) => setNotifications({ ...notifications, offerSelected: v })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Contract Issues</div>
              <div className="text-sm text-muted-foreground">Get notified when contracts need revision</div>
            </div>
            <Switch
              checked={notifications.contractIssues}
              onCheckedChange={(v) => setNotifications({ ...notifications, contractIssues: v })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Pickup Reminders</div>
              <div className="text-sm text-muted-foreground">Get reminded about upcoming vehicle pickups</div>
            </div>
            <Switch
              checked={notifications.pickupReminders}
              onCheckedChange={(v) => setNotifications({ ...notifications, pickupReminders: v })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#0066FF]" />
            Security
          </CardTitle>
          <CardDescription>Manage your account security</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" className="w-full bg-transparent" onClick={() => setShowPasswordModal(true)}>
            <KeyRound className="h-4 w-4 mr-2" />
            Change Password
          </Button>
          <Button variant="outline" className="w-full bg-transparent" onClick={() => { setShow2faModal(true); setMfaStep("enroll") }}>
            <Smartphone className="h-4 w-4 mr-2" />
            Enable Two-Factor Authentication
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
            Irreversible actions that permanently affect your dealer account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-md border border-destructive/30 bg-destructive/5 p-4">
            <div>
              <p className="font-medium text-sm">Delete dealer account</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Permanently remove your dealership profile, auction history, offers, and all associated records.
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
        accountType="dealer"
      />

      {/* Change Password Modal */}
      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>Enter your current password and choose a new one.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Must be at least 8 characters with uppercase, lowercase, and a number</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordModal(false)}>Cancel</Button>
            <Button
              onClick={handleChangePassword}
              disabled={
                !currentPassword ||
                !newPassword ||
                !confirmPassword ||
                newPassword.length < 8 ||
                !/[A-Z]/.test(newPassword) ||
                !/[a-z]/.test(newPassword) ||
                !/[0-9]/.test(newPassword) ||
                newPassword !== confirmPassword ||
                changingPassword
              }
              className="bg-primary hover:bg-primary/90"
            >
              {changingPassword ? "Changing..." : "Change Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2FA Enrollment Modal */}
      <Dialog open={show2faModal} onOpenChange={setShow2faModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              {mfaStep === "enroll"
                ? "Add an extra layer of security to your account."
                : "Scan the QR code with your authenticator app and enter the verification code."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {mfaStep === "enroll" ? (
              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  You'll need an authenticator app like Google Authenticator, Authy, or 1Password.
                </p>
                <Button onClick={handleEnroll2FA} disabled={enrolling2fa} className="bg-primary hover:bg-primary/90">
                  {enrolling2fa ? "Setting up..." : "Set Up 2FA"}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {mfaQrCode && (
                  <div className="flex justify-center">
                    <img src={mfaQrCode} alt="QR Code for 2FA" className="w-48 h-48" />
                  </div>
                )}
                {mfaSecret && (
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Or enter this code manually:</p>
                    <code className="text-sm bg-muted px-2 py-1 rounded">{mfaSecret}</code>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="mfaCode">Verification Code</Label>
                  <Input
                    id="mfaCode"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                  />
                </div>
              </div>
            )}
          </div>
          {mfaStep === "verify" && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setShow2faModal(false)}>Cancel</Button>
              <Button
                onClick={handleVerify2FA}
                disabled={!mfaCode || mfaCode.length < 6 || enrolling2fa}
                className="bg-primary hover:bg-primary/90"
              >
                {enrolling2fa ? "Verifying..." : "Verify & Enable"}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
