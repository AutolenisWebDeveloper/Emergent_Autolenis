"use client"

import type React from "react"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
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
import { AuthNav } from "@/components/layout/auth-nav"
import { AuthFooter } from "@/components/layout/auth-footer"
import { useToast } from "@/hooks/use-toast"
import { extractApiError } from "@/lib/utils/error-message"
import { ArrowLeft, Lock, CheckCircle, XCircle, Eye, EyeOff } from "lucide-react"

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)
  const [tokenError, setTokenError] = useState("")
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  })

  const token = searchParams.get("token")

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setTokenError("Reset link is missing or invalid")
        setValidating(false)
        return
      }

      try {
        const response = await fetch(`/api/auth/reset-password?token=${token}`)
        const data = await response.json()

        if (data.valid) {
          setTokenValid(true)
        } else {
          setTokenError(data.message || "Invalid or expired reset link")
        }
      } catch {
        setTokenError("Unable to validate reset link")
      } finally {
        setValidating(false)
      }
    }

    validateToken()
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      toast({
        variant: "destructive",
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
      })
      return
    }

    if (formData.password.length < 8) {
      toast({
        variant: "destructive",
        title: "Password too short",
        description: "Password must be at least 8 characters.",
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: formData.password }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(extractApiError(data.error, "Password reset failed"))
      }

      setSuccess(true)
      toast({
        title: "Password Reset!",
        description: "Your password has been reset successfully.",
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Something went wrong. Please try again.",
      })
    } finally {
      setLoading(false)
    }
  }

  if (validating) {
    return (
      <Card className="w-full max-w-md border border-border bg-card shadow-xl">
        <CardContent className="p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-brand-purple border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Validating reset link...</p>
        </CardContent>
      </Card>
    )
  }

  if (!tokenValid && !success) {
    return (
      <Card className="w-full max-w-md border border-border bg-card shadow-xl">
        <CardHeader className="text-center gap-4">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
            <XCircle className="w-8 h-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            Link Invalid
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            {tokenError}
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col gap-3">
          <Link href="/auth/forgot-password" className="w-full">
            <Button
              className="w-full font-semibold text-primary-foreground"
              style={{
                background:
                  "linear-gradient(135deg, var(--brand-purple), var(--brand-blue))",
              }}
            >
              Request New Link
            </Button>
          </Link>
          <Link
            href="/auth/signin"
            className="text-sm font-medium text-brand-purple hover:underline"
          >
            <ArrowLeft className="inline w-4 h-4 mr-1" />
            Back to sign in
          </Link>
        </CardFooter>
      </Card>
    )
  }

  if (success) {
    return (
      <Card className="w-full max-w-md border border-border bg-card shadow-xl">
        <CardHeader className="text-center gap-4">
          <div className="mx-auto w-16 h-16 bg-brand-green/10 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-brand-green" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            Password Reset!
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            Your password has been reset successfully. You can now sign in with
            your new password.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link href="/auth/signin" className="w-full">
            <Button
              className="w-full font-semibold text-primary-foreground"
              style={{
                background:
                  "linear-gradient(135deg, var(--brand-purple), var(--brand-blue))",
              }}
            >
              Sign In Now
            </Button>
          </Link>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md border border-border bg-card shadow-xl">
      <CardHeader className="gap-1 pb-6">
        <CardTitle className="text-2xl font-bold text-foreground">
          Reset Password
        </CardTitle>
        <CardDescription className="text-base text-muted-foreground">
          Enter your new password below.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">New Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter new password"
                required
                minLength={8}
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="pl-10 pr-10 h-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Must be at least 8 characters
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Confirm new password"
                required
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    confirmPassword: e.target.value,
                  })
                }
                className="pl-10 h-11"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-11 font-semibold text-primary-foreground"
            style={{
              background:
                "linear-gradient(135deg, var(--brand-purple), var(--brand-blue))",
            }}
            disabled={loading}
          >
            {loading ? "Resetting..." : "Reset Password"}
          </Button>
        </form>
      </CardContent>
      <CardFooter>
        <Link
          href="/auth/signin"
          className="text-sm font-medium text-brand-purple hover:underline mx-auto"
        >
          <ArrowLeft className="inline w-4 h-4 mr-1" />
          Back to sign in
        </Link>
      </CardFooter>
    </Card>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AuthNav showSignIn={true} />

      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <Suspense
          fallback={
            <Card className="w-full max-w-md border border-border bg-card shadow-xl">
              <CardContent className="p-8 text-center">
                <div className="animate-spin w-8 h-8 border-2 border-brand-purple border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-muted-foreground">Loading...</p>
              </CardContent>
            </Card>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>

      <AuthFooter />
    </div>
  )
}
