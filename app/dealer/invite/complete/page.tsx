"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Loader2, ArrowRight } from "lucide-react"

function CompleteContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const inviteId = searchParams.get("inviteId")
  const type = searchParams.get("type") || "network"

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")

  useEffect(() => {
    // If we arrived here, the invite was already claimed in the claim step.
    // This page serves as a success confirmation and redirection hub.
    if (!inviteId) {
      setStatus("error")
      return
    }
    // For sourcing invites, the dealer needs to be authenticated to complete
    // For network invites, just show success and redirect to signup
    setStatus("success")
  }, [inviteId])

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Card className="w-full max-w-md mx-4 shadow-lg">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Completing your invitation...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <Card className="w-full max-w-md mx-4 shadow-lg" data-testid="invite-complete-card">
        <CardContent className="p-8 text-center space-y-5">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground mb-2">Welcome to AutoLenis!</h2>
            <p className="text-muted-foreground">
              {type === "sourcing"
                ? "Your invitation has been processed. Sign in to complete the deal transaction."
                : "Your network invitation is confirmed. Set up your dealer account to start receiving leads."
              }
            </p>
          </div>
          <div className="pt-2 space-y-3">
            <Button
              onClick={() => router.push("/auth/signup?role=DEALER")}
              className="w-full"
              data-testid="signup-btn"
            >
              Create Dealer Account
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/auth/signin")}
              className="w-full"
              data-testid="signin-btn"
            >
              Already have an account? Sign In
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function DealerInviteCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
        </div>
      }
    >
      <CompleteContent />
    </Suspense>
  )
}
