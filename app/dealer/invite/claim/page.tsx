"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  CheckCircle,
  Loader2,
  AlertTriangle,
  Building2,
  Mail,
  Shield,
  ArrowRight,
  XCircle,
} from "lucide-react"
import { csrfHeaders } from "@/lib/csrf-client"

type InviteState =
  | { status: "loading" }
  | { status: "valid"; type: "sourcing" | "network"; inviteId: string; dealerEmail: string | null; dealerName: string | null; caseId?: string }
  | { status: "claimed"; type: "sourcing" | "network"; dealerName: string | null }
  | { status: "error"; message: string }

function ClaimContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token")

  const [state, setState] = useState<InviteState>({ status: "loading" })
  const [claiming, setClaiming] = useState(false)

  const validate = useCallback(async () => {
    if (!token) {
      setState({ status: "error", message: "No invitation token provided. Please check your invite link." })
      return
    }
    try {
      const res = await fetch(`/api/dealer/invite/claim?token=${encodeURIComponent(token)}`)
      const data = await res.json()
      if (!res.ok || !data.success) {
        const msg = data.error || "This invitation is invalid or has expired."
        setState({ status: "error", message: msg })
        return
      }
      setState({
        status: "valid",
        type: data.data.type,
        inviteId: data.data.inviteId,
        dealerEmail: data.data.dealerEmail,
        dealerName: data.data.dealerName,
        caseId: data.data.caseId,
      })
    } catch {
      setState({ status: "error", message: "Unable to validate your invitation. Please try again." })
    }
  }, [token])

  useEffect(() => {
    validate()
  }, [validate])

  const handleClaim = async () => {
    setClaiming(true)
    try {
      const res = await fetch("/api/dealer/invite/claim", {
        method: "POST",
        headers: { ...csrfHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setState({ status: "error", message: data.error || "Failed to accept invitation." })
        return
      }
      setState({
        status: "claimed",
        type: data.data.type,
        dealerName: data.data.dealerName,
      })
    } catch {
      setState({ status: "error", message: "Failed to accept invitation. Please try again." })
    } finally {
      setClaiming(false)
    }
  }

  // Loading state
  if (state.status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Card className="w-full max-w-md mx-4 shadow-lg">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">Validating your invitation...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state
  if (state.status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Card className="w-full max-w-md mx-4 shadow-lg" data-testid="invite-error-card">
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
              <XCircle className="h-7 w-7 text-red-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">Invitation Unavailable</h2>
              <p className="text-muted-foreground">{state.message}</p>
            </div>
            <div className="pt-2 space-y-2">
              <Button variant="outline" onClick={() => router.push("/")} className="w-full">
                Go to Homepage
              </Button>
              <p className="text-xs text-muted-foreground">
                Need help? Contact{" "}
                <a href="mailto:support@autolenis.com" className="text-primary underline">
                  support@autolenis.com
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Claimed / success state
  if (state.status === "claimed") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Card className="w-full max-w-md mx-4 shadow-lg" data-testid="invite-success-card">
          <CardContent className="p-8 text-center space-y-5">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">Invitation Accepted!</h2>
              <p className="text-muted-foreground">
                {state.dealerName ? (
                  <>Welcome, <span className="font-medium text-foreground">{state.dealerName}</span>.</>
                ) : (
                  "Welcome to AutoLenis."
                )}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {state.type === "sourcing"
                  ? "Your dealer account setup will continue. Sign in or create your account to complete the process."
                  : "You've been added to our dealer network. Create your dealer account to start receiving buyer leads."
                }
              </p>
            </div>
            <div className="pt-2 space-y-3">
              <Button
                onClick={() => router.push("/auth/signup?role=DEALER")}
                className="w-full"
                data-testid="create-account-btn"
              >
                Create Dealer Account
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/auth/login")}
                className="w-full"
                data-testid="login-btn"
              >
                Already have an account? Sign In
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Valid invite — ready to claim
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <Card className="w-full max-w-lg mx-4 shadow-lg" data-testid="invite-claim-card">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl">
            {state.type === "sourcing"
              ? "You're Invited to Complete a Deal"
              : "Join the AutoLenis Dealer Network"
            }
          </CardTitle>
          <CardDescription>
            {state.type === "sourcing"
              ? "A buyer has accepted your offer. Claim this invitation to continue the transaction on AutoLenis."
              : "You've been invited to join our network of trusted dealerships."
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Invite details */}
          <div className="bg-muted/50 rounded-xl p-5 space-y-3 border border-border/40">
            <div className="flex items-center gap-3">
              <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Dealer</p>
                <p className="font-medium">{state.dealerName || "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="font-medium">{state.dealerEmail || "—"}</p>
              </div>
            </div>
            {state.type === "sourcing" && state.caseId && (
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Transaction</p>
                  <Badge variant="secondary" className="mt-0.5">Sourcing Case</Badge>
                </div>
              </div>
            )}
            {state.type === "network" && (
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Invitation Type</p>
                  <Badge variant="secondary" className="mt-0.5">Network Membership</Badge>
                </div>
              </div>
            )}
          </div>

          {/* Trust indicators */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200/50">
            <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-200">Secure Invitation</p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                This invitation was sent by an AutoLenis administrator. By accepting, you&apos;ll be guided through our dealer onboarding process.
              </p>
            </div>
          </div>

          {/* CTA */}
          <Button
            onClick={handleClaim}
            disabled={claiming}
            className="w-full h-12 text-base font-semibold"
            data-testid="accept-invite-btn"
          >
            {claiming ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Accepting...
              </>
            ) : (
              <>
                Accept Invitation
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Questions? Contact{" "}
            <a href="mailto:support@autolenis.com" className="text-primary underline">
              support@autolenis.com
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function DealerInviteClaimPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
          <Card className="w-full max-w-md mx-4 shadow-lg">
            <CardContent className="p-8 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground font-medium">Loading...</p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <ClaimContent />
    </Suspense>
  )
}
