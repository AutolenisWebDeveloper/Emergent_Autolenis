"use client"

import { useEffect, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertCircle, CheckCircle2, ExternalLink } from "lucide-react"
import Link from "next/link"

interface SessionStatusBannerProps {
  /**
   * Portal type to determine correct sign-in route
   */
  portal: "buyer" | "dealer" | "affiliate" | "admin"
}

export function SessionStatusBanner({ portal }: SessionStatusBannerProps) {
  const [sessionStatus, setSessionStatus] = useState<
    "loading" | "authenticated" | "unauthenticated"
  >("loading")
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    // Check session via API
    fetch("/api/auth/me")
      .then((res) => {
        if (res.ok) {
          return res.json()
        }
        throw new Error("Not authenticated")
      })
      .then((data) => {
        setSessionStatus("authenticated")
        setUserEmail(data.data?.user?.email || data.user?.email || null)
      })
      .catch(() => {
        setSessionStatus("unauthenticated")
      })
  }, [])

  // Don't show anything while loading
  if (sessionStatus === "loading") {
    return null
  }

  // Show warning if unauthenticated
  if (sessionStatus === "unauthenticated") {
    const signInRoute = getSignInRoute(portal)

    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between gap-4">
          <div>
            <strong>Your session isn't active on this domain.</strong>
            <p className="text-sm mt-1">
              Sessions don't transfer between preview links and autolenis.com. Please sign in again.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button size="sm" asChild>
              <Link href={signInRoute}>Sign in again</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <a href="https://autolenis.com" target="_blank" rel="noopener noreferrer">
                Open AutoLenis.com
                <ExternalLink className="ml-2 h-3 w-3" />
              </a>
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  // Show subtle authenticated status
  return (
    <Alert className="mb-4 bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900">
      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
      <AlertDescription className="text-green-800 dark:text-green-200">
        {userEmail ? (
          <>Signed in as <strong>{userEmail}</strong></>
        ) : (
          "You're signed in"
        )}
      </AlertDescription>
    </Alert>
  )
}

function getSignInRoute(portal: "buyer" | "dealer" | "affiliate" | "admin"): string {
  switch (portal) {
    case "admin":
      return "/admin/sign-in"
    case "buyer":
    case "dealer":
    case "affiliate":
    default:
      return "/auth/signin"
  }
}
