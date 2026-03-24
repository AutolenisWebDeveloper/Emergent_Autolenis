"use client"

import type React from "react"

import { useState } from "react"
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
import { ArrowLeft, Mail, CheckCircle } from "lucide-react"

export default function ForgotPasswordPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [email, setEmail] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(extractApiError(data.error, "Request failed"))
      }

      setSubmitted(true)
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

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AuthNav showSignIn={true} />

      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <Card className="w-full max-w-md border border-border bg-card shadow-xl">
          {submitted ? (
            <>
              <CardHeader className="text-center gap-4 pb-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-brand-green/10 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-brand-green" />
                </div>
                <CardTitle className="text-2xl font-bold text-foreground">
                  Check Your Email
                </CardTitle>
                <CardDescription className="text-base text-muted-foreground">
                  If an account exists for <strong>{email}</strong>, we{"'"}ve
                  sent password reset instructions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg p-4 text-sm text-muted-foreground border border-border bg-muted/50">
                  <p>
                    The link will expire in 1 hour. If you don{"'"}t see the
                    email, check your spam folder.
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setSubmitted(false)}
                >
                  Try a different email
                </Button>
                <Link
                  href="/auth/signin"
                  className="text-sm font-medium text-brand-purple hover:underline"
                >
                  <ArrowLeft className="inline w-4 h-4 mr-1" />
                  Back to sign in
                </Link>
              </CardFooter>
            </>
          ) : (
            <>
              <CardHeader className="gap-1 pb-6">
                <CardTitle className="text-2xl font-bold text-foreground">
                  Forgot Password?
                </CardTitle>
                <CardDescription className="text-base text-muted-foreground">
                  No worries! Enter your email and we{"'"}ll send you reset
                  instructions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
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
                    {loading ? "Sending..." : "Send Reset Link"}
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
            </>
          )}
        </Card>
      </div>

      <AuthFooter />
    </div>
  )
}
