"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { extractApiError } from "@/lib/utils/error-message"
import { csrfHeaders } from "@/lib/csrf-client"
import { CheckCircle, XCircle, Clock, Building2, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type Application = {
  id: string
  dealer_id: string
  user_email: string
  business_name: string
  license_number: string
  phone: string
  city: string
  state: string
  business_type: string
  years_in_business: string
  average_inventory: string
  monthly_volume: string
  website: string | null
  additional_info: string | null
  created_at: string
}

export default function DealerApplicationsPage() {
  const { toast } = useToast()
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [selectedApp, setSelectedApp] = useState<Application | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")
  const [processing, setProcessing] = useState(false)

  const fetchApplications = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/dealers/applications")
      const data = await response.json()

      if (data.success) {
        setApplications(data.data)
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load applications",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchApplications()
  }, [fetchApplications])

  const handleApprove = async (appId: string) => {
    setProcessing(true)
    try {
      const response = await fetch(`/api/admin/dealers/applications/${appId}/approve`, {
        method: "POST",
        headers: csrfHeaders(),
      })

      const data = await response.json()

      if (data.error) {
        throw new Error(extractApiError(data.error, "Application review failed"))
      }

      toast({
        title: "Application Approved",
        description: "The dealer has been approved and notified via email.",
      })

      fetchApplications()
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Application review failed",
      })
    } finally {
      setProcessing(false)
    }
  }

  const handleRejectSubmit = async () => {
    if (!selectedApp || !rejectionReason.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please provide a reason for rejection",
      })
      return
    }

    setProcessing(true)
    try {
      const response = await fetch(`/api/admin/dealers/applications/${selectedApp.id}/reject`, {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({ reason: rejectionReason }),
      })

      const data = await response.json()

      if (data.error) {
        throw new Error(extractApiError(data.error, "Application review failed"))
      }

      toast({
        title: "Application Rejected",
        description: "The applicant has been notified via email.",
      })

      setRejectDialogOpen(false)
      setSelectedApp(null)
      setRejectionReason("")
      fetchApplications()
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Application review failed",
      })
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dealer Applications</h1>
        <p className="text-muted-foreground mt-2">Review and approve pending dealer applications</p>
      </div>

      {applications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No pending applications</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {applications.map((app) => (
            <Card key={app.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="w-5 h-5" />
                      {app.business_name}
                    </CardTitle>
                    <CardDescription>
                      {app.city}, {app.state} • {app.business_type}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                    <Clock className="w-3 h-3 mr-1" />
                    Pending
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">License:</span> {app.license_number}
                  </div>
                  <div>
                    <span className="font-medium">Experience:</span> {app.years_in_business} years
                  </div>
                  <div>
                    <span className="font-medium">Inventory:</span> {app.average_inventory} vehicles
                  </div>
                  <div>
                    <span className="font-medium">Monthly Volume:</span> {app.monthly_volume} sales
                  </div>
                  <div>
                    <span className="font-medium">Contact:</span> {app.user_email}
                  </div>
                  <div>
                    <span className="font-medium">Phone:</span> {app.phone}
                  </div>
                  {app.website && (
                    <div className="md:col-span-2">
                      <span className="font-medium">Website:</span>{" "}
                      <a
                        href={app.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {app.website}
                      </a>
                    </div>
                  )}
                  {app.additional_info && (
                    <div className="md:col-span-2">
                      <span className="font-medium">Additional Info:</span>
                      <p className="text-muted-foreground mt-1">{app.additional_info}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    onClick={() => handleApprove(app.id)}
                    disabled={processing}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve Dealer
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedApp(app)
                      setRejectDialogOpen(true)
                    }}
                    disabled={processing}
                    variant="outline"
                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this dealer application. This will be included in the notification
              email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Rejection Reason *</Label>
              <Textarea
                id="reason"
                placeholder="e.g., Incomplete documentation, unable to verify license..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false)
                setRejectionReason("")
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleRejectSubmit} disabled={processing || !rejectionReason.trim()} variant="destructive">
              {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
              Reject Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
