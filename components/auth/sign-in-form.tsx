"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { extractApiError } from "@/lib/utils/error-message"

const RESEND_COOLDOWN_SECONDS = 60

export function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [requiresVerification, setRequiresVerification] = useState(false)
  const [verificationEmailSent, setVerificationEmailSent] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })

  const redirectUrl = searchParams.get("redirect")

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  const handleResendVerification = useCallback(async () => {
    if (resendLoading || resendCooldown > 0 || !formData.email) return
    setResendLoading(true)
    setResendMessage(null)
    try {
      await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email }),
      })
      setResendMessage("If that email exists, we sent a new verification link.")
      setResendCooldown(RESEND_COOLDOWN_SECONDS)
    } catch (err) {
      console.error("[SignInForm] Resend verification error:", err)
      setResendMessage("Unable to send verification email. Please check your connection and try again.")
    } finally {
      setResendLoading(false)
    }
  }, [formData.email, resendLoading, resendCooldown])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setRequiresVerification(false)
    setVerificationEmailSent(false)
    setResendMessage(null)

    if (!formData.email || !formData.password) {
      setError("Please fill in all fields")
      setLoading(false)
      return
    }

    try {
      let response: Response
      try {
        response = await fetch("/api/auth/signin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        })
      } catch (networkError: any) {
        console.error("[SignInForm] Network error:", networkError)
        throw new Error(
          "Unable to connect to server. Please check your internet connection."
        )
      }

      let data
      const contentType = response.headers.get("content-type")
      if (contentType && contentType.includes("application/json")) {
        try {
          data = await response.json()
        } catch (jsonError) {
          console.error("[SignInForm] JSON parse error:", jsonError)
          throw new Error("Server returned invalid response")
        }
      } else {
        const text = await response.text()
        console.error("[SignInForm] Non-JSON response:", text)
        throw new Error(text || `Server error (${response.status})`)
      }

      if (response.status === 429) {
        throw new Error("Too many requests. Please try again later.")
      }

      if (response.status === 503) {
        throw new Error("Our servers are momentarily busy. Please wait a moment and try again.")
      }

      if (!data.success) {
        if (data.requiresEmailVerification || data.error === "EMAIL_NOT_VERIFIED") {
          setRequiresVerification(true)
        }
        if (data.verificationEmailSent) {
          setVerificationEmailSent(true)
        }
        throw new Error(extractApiError(data.message || data.error, "Sign in failed"))
      }

      if (redirectUrl) {
        router.replace(redirectUrl)
      } else if (data.data.redirect) {
        router.replace(data.data.redirect)
      } else {
        const role = data.data.user.role
        if (role === "BUYER") {
          router.replace("/buyer/dashboard")
        } else if (role === "DEALER" || role === "DEALER_USER") {
          router.replace("/dealer/dashboard")
        } else if (role === "ADMIN" || role === "SUPER_ADMIN") {
          router.replace("/admin/dashboard")
        } else if (role === "AFFILIATE" || role === "AFFILIATE_ONLY") {
          router.replace("/affiliate/portal/dashboard")
        } else {
          router.replace("/")
        }
      }
    } catch (error: any) {
      console.error("[SignInForm] Error:", error.message)
      setError(error.message || "An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md border border-border bg-card shadow-xl">
      <CardHeader className="gap-1 pb-6">
        <CardTitle className="text-2xl font-bold text-foreground">
          Welcome Back
        </CardTitle>
        <CardDescription className="text-base text-muted-foreground">
          Sign in to continue your car buying journey
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {error}
            {requiresVerification && (
              <div className="mt-2">
                {verificationEmailSent && (
                  <p className="mb-2 text-green-700 text-xs font-medium">
                    A verification link was sent to your email. Check your inbox and spam folder.
                  </p>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResendVerification}
                  disabled={resendLoading || resendCooldown > 0}
                  className="text-[#3d2066] border-[#3d2066]/30 hover:bg-[#3d2066]/5"
                >
                  {resendLoading ? (
                    <>
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      Sending…
                    </>
                  ) : resendCooldown > 0 ? (
                    `Resend in ${resendCooldown}s`
                  ) : verificationEmailSent ? (
                    "Resend again"
                  ) : (
                    "Resend verification email"
                  )}
                </Button>
              </div>
            )}
            {resendMessage && (
              <p className={`mt-2 text-xs ${resendMessage.startsWith("Unable") ? "text-red-600" : "text-green-700"}`}>{resendMessage}</p>
            )}
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              required
              autoComplete="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              disabled={loading}
              className="h-11"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/auth/forgot-password"
                className="text-xs font-medium text-brand-purple hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              disabled={loading}
              className="h-11"
            />
          </div>

          <Button
            type="submit"
            className="w-full h-11 font-semibold text-primary-foreground mt-1"
            style={{
              background:
                "linear-gradient(135deg, var(--brand-purple), var(--brand-blue))",
            }}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col gap-3 pt-2">
        <p className="text-sm text-muted-foreground text-center">
          Don&apos;t have an account?{" "}
          <Link
            href="/auth/signup"
            className="font-medium text-brand-purple hover:underline"
          >
            Sign up for free
          </Link>
        </p>
        <Button asChild variant="outline" className="w-full">
          <Link href="/">Return to Homepage</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
