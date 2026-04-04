"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { AlertTriangle, CheckCircle2 } from "lucide-react"

interface OverrideAcknowledgmentModalProps {
  override: {
    id: string
    action: string
    reason: string
  }
  open: boolean
  onClose: () => void
  onAcknowledge: () => void
}

export function OverrideAcknowledgmentModal({
  override,
  open,
  onClose,
  onAcknowledge,
}: OverrideAcknowledgmentModalProps) {
  const { toast } = useToast()
  const [comment, setComment] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleAcknowledge = async () => {
    setSubmitting(true)
    try {
      const response = await fetch("/api/buyer/contracts/acknowledge-override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          overrideId: override.id,
          comment: comment || undefined,
        }),
      })

      if (!response.ok) throw new Error("Failed to acknowledge override")

      toast({
        title: "Acknowledged",
        description: "Your acknowledgment has been recorded.",
      })

      onAcknowledge()
      onClose()
    } catch (error) {
      toast({
        title: "Failed",
        description: error instanceof Error ? error.message : "Failed to acknowledge override",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Admin Override Requires Acknowledgment
          </DialogTitle>
          <DialogDescription>
            An administrator has manually updated your contract review status. Please review and acknowledge this
            change.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Action Taken</Label>
            <p className="text-sm font-medium">
              {override.action === "FORCE_PASS" ? "Contract Approved" : "Contract Flagged"}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Admin Reason</Label>
            <p className="text-sm text-muted-foreground">{override.reason}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Your Comments (Optional)</Label>
            <Textarea
              id="comment"
              placeholder="Add any questions or concerns..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>

          <div className="bg-muted p-3 rounded-lg text-sm">
            <p className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                By acknowledging, you confirm you've reviewed this status change. You can still contact support if you
                have questions.
              </span>
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleAcknowledge} disabled={submitting}>
            {submitting ? "Acknowledging..." : "Acknowledge & Continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
