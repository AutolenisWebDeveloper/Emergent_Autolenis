"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle2, ArrowRight, Home, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function SignOutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(true)
  const [userRole, setUserRole] = useState<string>("BUYER")
  const [error, setError] = useState<string | null>(null)

  const customRedirect = searchParams.get("redirect")

  useEffect(() => {
    const handleLogout = async () => {
      try {
        setIsLoading(true)
        const response = await fetch("/api/auth/signout", {
          method: "POST",
          credentials: "include",
          headers: { "Accept": "application/json" },
        })

        if (!response.ok) {
          throw new Error("Signout failed")
        }

        const data = await response.json()

        if (data.success) {
          setUserRole(data.role || "BUYER")

          setTimeout(() => {
            const redirectUrl =
              customRedirect || getRoleRedirectUrl(data.role || "BUYER")
            router.push(redirectUrl)
          }, 2000)
        }
      } catch {
        setError("There was an issue signing you out. Please try again.")
        setIsLoading(false)
      }
    }

    handleLogout()
  }, [router, customRedirect])

  function getRoleRedirectUrl(_role: string): string {
    return "/auth/signin"
  }

  function getRoleDisplayName(role: string): string {
    switch (role) {
      case "AFFILIATE":
        return "affiliate"
      case "DEALER":
      case "DEALER_USER":
        return "dealer"
      case "ADMIN":
        return "administrator"
      case "BUYER":
      default:
        return "AutoLenis"
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center border border-border bg-card shadow-xl">
          <CardHeader className="gap-4">
            <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
              <span className="text-2xl" role="img" aria-label="Warning">
                !
              </span>
            </div>
            <CardTitle className="text-2xl text-foreground">
              Logout Error
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button
              asChild
              className="w-full font-semibold text-primary-foreground"
              style={{
                background:
                  "linear-gradient(135deg, var(--brand-purple), var(--brand-blue))",
              }}
            >
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Return to Homepage
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center border border-border bg-card shadow-xl">
        <CardHeader className="gap-4">
          <div className="mx-auto w-16 h-16 bg-brand-green/10 rounded-full flex items-center justify-center">
            {isLoading ? (
              <Loader2 className="h-8 w-8 text-brand-green animate-spin" />
            ) : (
              <CheckCircle2 className="h-8 w-8 text-brand-green" />
            )}
          </div>
          <CardTitle className="text-2xl text-foreground">
            {isLoading ? "Signing out..." : "Successfully Signed Out"}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {isLoading
              ? `Securely logging you out of your ${getRoleDisplayName(userRole)} account...`
              : `You have been securely logged out of your ${getRoleDisplayName(userRole)} account.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Redirecting...</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Redirecting to sign in...
              </p>

              <div className="flex flex-col gap-3">
                <Button
                  asChild
                  className="w-full font-semibold text-primary-foreground"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--brand-purple), var(--brand-blue))",
                  }}
                >
                  <Link href="/auth/signin">
                    Sign In Again
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>

              <div className="pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Thank you for using AutoLenis. Your session has been securely
                  terminated.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
