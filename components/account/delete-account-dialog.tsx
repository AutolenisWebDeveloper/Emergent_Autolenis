"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Eye, EyeOff, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { csrfHeaders } from "@/lib/csrf-client"

interface DeleteAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Role label shown in the warning copy, e.g. "affiliate", "dealer", "buyer" */
  accountType?: string
}

export function DeleteAccountDialog({
  open,
  onOpenChange,
  accountType = "account",
}: DeleteAccountDialogProps) {
  const router = useRouter()
  const { toast } = useToast()

  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [confirmText, setConfirmText] = useState("")
  const [deleting, setDeleting] = useState(false)

  const resetState = () => {
    setPassword("")
    setShowPassword(false)
    setConfirmText("")
    setDeleting(false)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) resetState()
    onOpenChange(nextOpen)
  }

  const handleDelete = async () => {
    if (confirmText !== "DELETE") return

    setDeleting(true)
    try {
      const response = await fetch("/api/account/delete-account", {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({ password }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to delete account")
      }

      toast({
        title: "Account deleted",
        description: "Your account has been permanently deleted.",
      })

      onOpenChange(false)
      // Hard redirect — session is cleared server-side
      router.push("/")
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Deletion failed",
        description: error instanceof Error ? error.message : "Unable to delete account. Please try again.",
      })
    } finally {
      setDeleting(false)
    }
  }

  const canSubmit = password.length > 0 && confirmText === "DELETE" && !deleting

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5 shrink-0" />
            Delete {accountType.charAt(0).toUpperCase() + accountType.slice(1)} Account
          </DialogTitle>
          <DialogDescription>
            This action is <strong>permanent and cannot be undone.</strong> All data associated
            with your {accountType} account — including history, settings, and linked records — will
            be permanently removed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            Make sure you have saved any important records before proceeding.
          </div>

          <div className="space-y-2">
            <Label htmlFor="delete-password">Enter your password to confirm</Label>
            <div className="relative">
              <Input
                id="delete-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your current password"
                autoComplete="current-password"
                className="pr-10"
                disabled={deleting}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="delete-confirm">
              Type <span className="font-mono font-bold tracking-widest">DELETE</span> to confirm
            </Label>
            <Input
              id="delete-confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
              placeholder="DELETE"
              autoComplete="off"
              disabled={deleting}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!canSubmit}
          >
            {deleting ? "Deleting account..." : "Permanently Delete Account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
