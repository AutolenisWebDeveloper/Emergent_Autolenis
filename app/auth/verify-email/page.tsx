"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { Suspense, useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"
import { AuthNav } from "@/components/layout/auth-nav"
import { AuthFooter } from "@/components/layout/auth-footer"
import { CheckCircle, XCircle, Mail, Loader2, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { csrfHeaders } from "@/lib/csrf-client"

const RESEND_COOLDOWN_SECONDS = 60

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()
  const [resending, setResending] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [redirecting, setRedirecting] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)

  const success = searchParams.get("success") === "true"
  const error = searchParams.get("error")
  const pending = searchParams.get("pending") === "true"
  const token = searchParams.get("token")

  // Backward compatibility: if token param is present, redirect to API route
  useEffect(() => {
    if (token) {
      setRedirecting(true)
      window.location.href = `/api/auth/verify-email?token=${encodeURIComponent(token)}`
    }
  }, [token])

  // Fetch the authenticated user's email and role for the resend flow
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => { if (r.ok) return r.json(); return null })
      .then((d) => {
        if (d?.success) {
          setUserEmail(d.data.user.email)
          setUserRole(d.data.user.role)
        }
      })
      .catch(() => {})
  }, [])

  // On success, auto-redirect authenticated users to their dashboard
  useEffect(() => {
    if (success && userRole) {
      const timer = setTimeout(() => {
        const dashboardPath = getRoleDashboard(userRole)
        router.push(dashboardPath)
      }, 2000)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [success, userRole, router])

  // Cooldown timer for resend button
  useEffect(() => {
    if (cooldown <= 0) return
    const interval = setInterval(() => {
      setCooldown((c) => c - 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [cooldown])

  const handleResend = useCallback(async () => {
    if (!userEmail || cooldown > 0) return
    setResending(true)
    try {
      await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({ email: userEmail }),
      })

      toast({
        title: "Email Sent",
        description: "If that email exists, we sent a new verification link.",
      })
      setCooldown(RESEND_COOLDOWN_SECONDS)
    } catch {
      toast({
        title: "Request Failed",
        description: "Unable to send verification email. Please check your connection and try again.",
        variant: "destructive",
      })
    } finally {
      setResending(false)
    }
  }, [userEmail, cooldown, toast])

  // If redirecting to API for token processing, show loading state
  if (redirecting) {
    return (
      <Card className="w-full max-w-md border border-border bg-card shadow-xl">
        <CardContent className="p-8 flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-brand-purple" />
          <p className="text-muted-foreground">Verifying your email…</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md border border-border bg-card shadow-xl">
      <CardHeader className="gap-1 text-center pb-4">
        {success ? (
          <>
            <div className="mx-auto w-16 h-16 rounded-full bg-brand-green/10 flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-brand-green" />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">
              Email Verified!
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              Your email has been successfully verified. You now have full
              access to your account.
              {userRole && " Redirecting you to your dashboard…"}
            </CardDescription>
          </>
        ) : error ? (
          <>
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">
              Verification Failed
            </CardTitle>
            <CardDescription className="text-base text-destructive">
              {decodeURIComponent(error)}
            </CardDescription>
          </>
        ) : (
          <>
            <div className="mx-auto w-16 h-16 rounded-full bg-brand-purple/10 flex items-center justify-center mb-4">
              <Mail className="w-8 h-8 text-brand-purple" />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">
              Verify Your Email
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              {pending
                ? "We've sent a verification link to your email. Please check your inbox and click the link to verify your account."
                : "Please verify your email address to access all features."}
            </CardDescription>
          </>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {success ? (
          <Link href={userRole ? getRoleDashboard(userRole) : "/auth/signin"} className="block">
            <Button
              className="w-full h-11 font-semibold text-primary-foreground"
              style={{
                background:
                  "linear-gradient(135deg, var(--brand-purple), var(--brand-blue))",
              }}
            >
              {userRole ? "Continue to Dashboard" : "Continue to Sign In"}
            </Button>
          </Link>
        ) : (
          <>
            <div className="rounded-lg border border-border bg-muted/50 p-4 flex flex-col gap-2">
              <p className="text-sm font-medium text-foreground">
                Didn{"'"}t receive the email?
              </p>
              <ul className="text-sm text-muted-foreground flex flex-col gap-1">
                <li>Check your spam or junk folder</li>
                <li>Make sure you entered the correct email</li>
                <li>Allow a few minutes for the email to arrive</li>
              </ul>
            </div>
            <Button
              onClick={handleResend}
              disabled={resending || cooldown > 0}
              className="w-full h-11 font-semibold text-primary-foreground"
              style={{
                background:
                  "linear-gradient(135deg, var(--brand-purple), var(--brand-blue))",
              }}
            >
              {resending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : cooldown > 0 ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Resend in {cooldown}s
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Resend Verification Email
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
      <CardFooter className="justify-center">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-brand-purple transition-colors"
        >
          Return to Homepage
        </Link>
      </CardFooter>
    </Card>
  )
}

function getRoleDashboard(role: string): string {
  switch (role) {
    case "BUYER":
      return "/buyer/dashboard"
    case "DEALER":
    case "DEALER_USER":
      return "/dealer/dashboard"
    case "ADMIN":
    case "SUPER_ADMIN":
      return "/admin/dashboard"
    case "AFFILIATE":
    case "AFFILIATE_ONLY":
      return "/affiliate/portal/dashboard"
    default:
      return "/"
  }
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AuthNav />
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <Suspense
          fallback={
            <Card className="w-full max-w-md border border-border bg-card shadow-xl">
              <CardContent className="p-8 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-brand-purple" />
              </CardContent>
            </Card>
          }
        >
          <VerifyEmailContent />
        </Suspense>
      </div>
      <AuthFooter />
    </div>
  )
}
