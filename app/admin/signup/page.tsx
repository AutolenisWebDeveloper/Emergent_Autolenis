"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import {
  Shield,
  UserPlus,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle,
} from "lucide-react"
import { extractApiError } from "@/lib/utils/error-message"

export default function AdminSignUpPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters")
      setLoading(false)
      return
    }

    try {
      const response = await fetch("/api/admin/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(extractApiError(data.error, "Registration failed"))
      }

      setSuccess(true)
      toast({
        title: "Account Created",
        description:
          "Your admin account has been created. You can now sign in.",
      })

      setTimeout(() => {
        router.push("/admin/sign-in")
      }, 2000)
    } catch (error: unknown) {
      const message = (error instanceof Error ? error.message : "") || "Registration failed"
      setError(message)
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: message,
      })
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-footer-bg flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md border border-white/10 bg-white/5 backdrop-blur-sm shadow-2xl">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-brand-green/15 flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-brand-green" />
            </div>
            <h2 className="text-xl font-bold text-footer-foreground mb-2">
              Account Created!
            </h2>
            <p className="text-footer-muted mb-4">
              Your admin account has been successfully created.
            </p>
            <p className="text-sm text-footer-muted/60">
              Redirecting to sign-in page...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-footer-bg flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div
        className="pointer-events-none absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-[0.06]"
        style={{
          background:
            "radial-gradient(circle, var(--brand-purple), transparent 70%)",
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-32 -left-32 w-96 h-96 rounded-full opacity-[0.04]"
        style={{
          background:
            "radial-gradient(circle, var(--brand-cyan), transparent 70%)",
        }}
      />

      <div className="relative z-10 mb-8 flex items-center gap-3">
        <Image
          src="/images/auto-20lenis.png"
          alt="AutoLenis"
          width={44}
          height={44}
          className="rounded-xl"
        />
        <div>
          <h1 className="text-2xl font-bold text-footer-foreground">
            AutoLenis
          </h1>
          <p className="text-sm text-footer-muted">Admin Portal</p>
        </div>
      </div>

      <Card className="relative z-10 w-full max-w-md border border-white/10 bg-white/5 backdrop-blur-sm shadow-2xl">
        <CardHeader className="gap-1 text-center pb-6">
          <div className="mx-auto w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mb-2">
            <UserPlus className="w-7 h-7 text-brand-cyan" />
          </div>
          <CardTitle className="text-2xl font-bold text-footer-foreground">
            Create Admin Account
          </CardTitle>
          <CardDescription className="text-footer-muted">
            Register for administrator access
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4 bg-destructive/10 border-destructive/30">
              <AlertDescription className="text-destructive text-sm">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="firstName" className="text-footer-foreground">
                  First Name
                </Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="John"
                  required
                  className="bg-white/5 border-white/15 text-footer-foreground placeholder:text-footer-muted/60 focus:border-brand-cyan focus:ring-brand-cyan/20 h-11"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="lastName" className="text-footer-foreground">
                  Last Name
                </Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Doe"
                  required
                  className="bg-white/5 border-white/15 text-footer-foreground placeholder:text-footer-muted/60 focus:border-brand-cyan focus:ring-brand-cyan/20 h-11"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="text-footer-foreground">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                required
                autoComplete="email"
                className="bg-white/5 border-white/15 text-footer-foreground placeholder:text-footer-muted/60 focus:border-brand-cyan focus:ring-brand-cyan/20 h-11"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password" className="text-footer-foreground">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  required
                  autoComplete="new-password"
                  className="bg-white/5 border-white/15 text-footer-foreground placeholder:text-footer-muted/60 focus:border-brand-cyan focus:ring-brand-cyan/20 pr-10 h-11"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-footer-muted hover:text-footer-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-footer-muted/60">
                Minimum 6 characters
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label
                htmlFor="confirmPassword"
                className="text-footer-foreground"
              >
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                required
                autoComplete="new-password"
                className="bg-white/5 border-white/15 text-footer-foreground placeholder:text-footer-muted/60 focus:border-brand-cyan focus:ring-brand-cyan/20 h-11"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    confirmPassword: e.target.value,
                  })
                }
              />
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
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create Admin Account
                </>
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 border-t border-white/10 pt-6">
          <div className="text-center flex flex-col gap-2">
            <p className="text-sm text-footer-muted">
              Already have an account?{" "}
              <Link
                href="/admin/sign-in"
                className="text-brand-cyan hover:underline font-medium"
              >
                Sign In
              </Link>
            </p>
            <Link
              href="/"
              className="text-sm text-footer-muted/80 hover:text-footer-foreground transition-colors"
            >
              Return to Homepage
            </Link>
          </div>
        </CardFooter>
      </Card>

      <p className="relative z-10 mt-8 text-xs text-footer-muted/60">
        &copy; {new Date().getFullYear()} AutoLenis. Protected by enterprise
        security.
      </p>
    </div>
  )
}
