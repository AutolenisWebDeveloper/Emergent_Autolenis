"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2 } from "lucide-react"
import {
  REFERRAL_WINDOW_MS,
  type ReferralAttribution,
} from "@/components/affiliate/referral-capture"
import { extractApiError } from "@/lib/utils/error-message"
import { PackageSelector } from "@/components/auth/package-selector"
import {
  BuyerPackageTier,
  PACKAGE_DISPLAY,
} from "@/lib/constants/buyer-packages"

export function SignUpForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const roleFromUrl = searchParams.get("role")
  const redirectUrl = searchParams.get("redirect")

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phone: "",
    role: (
      roleFromUrl === "affiliate"
        ? "AFFILIATE"
        : roleFromUrl === "dealer"
          ? "DEALER"
          : "BUYER"
    ) as "BUYER" | "DEALER" | "AFFILIATE",
    marketingConsent: false,
  })

  const [packageTier, setPackageTier] = useState<BuyerPackageTier | null>(null)

  const [refCode, setRefCode] = useState<string | null>(null)
  const [referralMeta, setReferralMeta] =
    useState<ReferralAttribution | null>(null)

  useEffect(() => {
    const getCookieValue = (name: string) => {
      return document.cookie
        .split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith(`${name}=`))
        ?.split("=")[1]
    }

    const storedMeta = localStorage.getItem("affiliate_referral")
    if (storedMeta) {
      try {
        const parsed: ReferralAttribution = JSON.parse(storedMeta)
        if (
          parsed.capturedAt &&
          Date.now() - new Date(parsed.capturedAt).getTime() <
            REFERRAL_WINDOW_MS
        ) {
          if (parsed.refCode) {
            setRefCode(parsed.refCode)
          }
          setReferralMeta(parsed)
          return
        }
        localStorage.removeItem("affiliate_referral")
      } catch {
        localStorage.removeItem("affiliate_referral")
      }
    }

    const storedRefCode = localStorage.getItem("ref_code")
    const timestamp = localStorage.getItem("ref_code_timestamp")

    if (storedRefCode && timestamp) {
      if (Date.now() - Number.parseInt(timestamp) < REFERRAL_WINDOW_MS) {
        setRefCode(storedRefCode)
      } else {
        localStorage.removeItem("ref_code")
        localStorage.removeItem("ref_code_timestamp")
      }
    }

    if (!storedRefCode) {
      const cookieRefCode = getCookieValue("autolenis_ref_code")
      if (cookieRefCode) {
        setRefCode(decodeURIComponent(cookieRefCode))
      }
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (
      !formData.firstName ||
      !formData.lastName ||
      !formData.email ||
      !formData.password
    ) {
      setError("Please fill in all required fields")
      setLoading(false)
      return
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters")
      setLoading(false)
      return
    }

    if (formData.role === "BUYER" && !packageTier) {
      setError("Please select a package plan")
      setLoading(false)
      return
    }

    try {
      let response: Response
      try {
        response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formData,
            packageTier: formData.role === "BUYER" ? packageTier : undefined,
            marketingSmsConsent: formData.marketingConsent,
            marketingEmailConsent: formData.marketingConsent,
            refCode: refCode,
            contactConsent: true,
            consentTextVersion: "2025-01-tcpa-consent-v1",
            consentTimestamp: new Date().toISOString(),
            formSource: "signup",
          }),
        })
      } catch (networkError: any) {
        console.error("[SignUpForm] Network error:", networkError)
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
          console.error("[SignUpForm] JSON parse error:", jsonError)
          throw new Error("Server returned invalid response")
        }
      } else {
        const text = await response.text()
        console.error("[SignUpForm] Non-JSON response:", text)
        throw new Error(text || `Server error (${response.status})`)
      }

      if (!data.success) {
        throw new Error(extractApiError(data.error, "Sign up failed"))
      }

      if (formData.role === "BUYER") {
        try {
          await fetch("/api/affiliate/process-referral", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refCode, meta: referralMeta }),
          })
          localStorage.removeItem("ref_code")
          localStorage.removeItem("ref_code_timestamp")
          localStorage.removeItem("affiliate_referral")
        } catch (err) {
          console.error("[SignUpForm] Failed to process referral:", err)
        }
      }

      if (redirectUrl) {
        router.replace(redirectUrl)
      } else if (data.data.redirect) {
        router.replace(data.data.redirect)
      } else {
        if (formData.role === "BUYER") {
          router.replace("/buyer/onboarding")
        } else if (formData.role === "DEALER") {
          router.replace("/dealer/onboarding")
        } else if (formData.role === "AFFILIATE") {
          router.replace("/affiliate/portal/onboarding")
        } else {
          router.replace("/")
        }
      }
    } catch (error: any) {
      console.error("[SignUpForm] Error:", error.message)
      setError(error.message || "An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md border border-border bg-card shadow-xl">
      <CardHeader className="gap-1 pb-4">
        <CardTitle className="text-2xl font-bold text-foreground">
          Get Started
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground leading-relaxed">
          Create your AutoLenis account to access pre-qualification, compare
          dealer offers, and manage your car-buying journey.
        </CardDescription>
        {refCode && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-green/10 text-brand-green text-sm font-medium w-fit">
            Referred by a friend
          </div>
        )}
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-destructive/5 border border-destructive/20 rounded-lg text-destructive text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                placeholder="John"
                required
                autoComplete="given-name"
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
                disabled={loading}
                className="h-11"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                placeholder="Doe"
                required
                autoComplete="family-name"
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
                disabled={loading}
                className="h-11"
              />
            </div>
          </div>

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
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="(555) 123-4567"
              autoComplete="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              disabled={loading}
              className="h-11"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Create a strong password"
              required
              minLength={8}
              autoComplete="new-password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              disabled={loading}
              className="h-11"
            />
            <p className="text-xs text-muted-foreground">
              Must be at least 8 characters
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="role">I want to</Label>
            <select
              id="role"
              className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              value={formData.role}
              onChange={(e) =>
                setFormData({ ...formData, role: e.target.value as any })
              }
              disabled={loading}
            >
              <option value="BUYER">Buy a car</option>
              <option value="DEALER">Sell cars as a dealer</option>
              <option value="AFFILIATE">Refer buyers and earn</option>
            </select>
          </div>

          {formData.role === "BUYER" && (
            <PackageSelector
              value={packageTier}
              onChange={setPackageTier}
              disabled={loading}
            />
          )}

          <div className="flex items-start gap-3 pt-1">
            <Checkbox
              id="marketingConsent"
              checked={formData.marketingConsent}
              onCheckedChange={(checked) =>
                setFormData({
                  ...formData,
                  marketingConsent: checked as boolean,
                })
              }
              className="mt-0.5"
              disabled={loading}
            />
            <Label
              htmlFor="marketingConsent"
              className="text-xs text-muted-foreground leading-relaxed cursor-pointer font-normal"
            >
              I agree to receive marketing texts and emails from AutoLenis.
            </Label>
          </div>

          <div className="rounded-lg border border-border bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              AutoLenis may contact me at the phone number and email I
              provided with marketing messages (including by automated text).
              Consent is not a condition of purchase. Message/data rates may
              apply. Reply STOP to cancel or HELP for help. See{" "}
              <Link
                href="/legal/privacy"
                className="font-medium text-brand-purple underline hover:no-underline"
              >
                Privacy Policy
              </Link>{" "}
              and{" "}
              <Link
                href="/legal/terms"
                className="font-medium text-brand-purple underline hover:no-underline"
              >
                Terms of Service
              </Link>
              .
            </p>
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
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : formData.role === "BUYER" && packageTier ? (
              PACKAGE_DISPLAY[packageTier].cta
            ) : (
              "Create Account"
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col gap-2 pt-2">
        <p className="text-sm text-muted-foreground text-center">
          Already have an account?{" "}
          <Link
            href="/auth/signin"
            className="font-medium text-brand-purple hover:underline"
          >
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
