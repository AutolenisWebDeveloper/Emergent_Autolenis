"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState, Suspense } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import Link from "next/link"

interface InviteDetails {
  dealerName: string
  caseInfo: string
}

function ClaimContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const initialStatus = token ? "loading" as const : "error" as const
  const [status, setStatus] = useState<"loading" | "valid" | "error">(initialStatus)
  const [invite, setInvite] = useState<InviteDetails | null>(null)
  const [errorMessage, setErrorMessage] = useState(
    token ? "" : "No invitation token provided."
  )

  useEffect(() => {
    if (!token) return

    fetch(`/api/dealer/invite/claim?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setStatus("error")
          setErrorMessage(data.error.message || "This invitation is invalid or has expired.")
        } else {
          setInvite({ dealerName: data.dealerName, caseInfo: data.caseInfo })
          setStatus("valid")
        }
      })
      .catch(() => {
        setStatus("error")
        setErrorMessage("Failed to validate invitation. Please try again.")
      })
  }, [token])

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 space-y-6">
          <h1 className="text-2xl font-bold text-center">Dealer Invitation</h1>

          {status === "loading" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Validating invitation…</p>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center gap-3 py-4">
              <AlertCircle className="h-10 w-10 text-destructive" />
              <p className="text-center text-sm text-destructive">{errorMessage}</p>
              <Button variant="outline" asChild>
                <Link href="/">Return Home</Link>
              </Button>
            </div>
          )}

          {status === "valid" && invite && (
            <>
              <div className="flex flex-col items-center gap-2">
                <CheckCircle2 className="h-10 w-10 text-[#7ED321]" />
                <p className="text-center text-sm text-muted-foreground">
                  You&apos;ve been invited to join AutoLenis.
                </p>
              </div>

              <div className="rounded-lg border bg-muted/50 p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dealer</span>
                  <span className="font-medium">{invite.dealerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Case</span>
                  <span className="font-medium">{invite.caseInfo}</span>
                </div>
              </div>

              <div className="space-y-3">
                <Button className="w-full" asChild>
                  <Link href={`/auth/signup?role=DEALER&invite=${token}`}>
                    Create Account
                  </Link>
                </Button>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/dealer/sign-in">
                    Sign In to Complete
                  </Link>
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function DealerInviteClaimPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <ClaimContent />
    </Suspense>
  )
}
