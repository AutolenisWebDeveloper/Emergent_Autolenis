"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/layout/protected-route"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useUser } from "@/hooks/use-user"
import { csrfHeaders } from "@/lib/csrf-client"
import { ArrowRight, Users2, ShieldCheck } from "lucide-react"

export default function BuyerReferralsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, isLoading, mutate } = useUser()
  const [activating, setActivating] = useState(false)

  useEffect(() => {
    if (!isLoading && user?.role === "BUYER" && user?.is_affiliate === true) {
      router.replace("/affiliate/portal/dashboard")
    }
  }, [isLoading, router, user])

  const activate = async () => {
    setActivating(true)
    try {
      const res = await fetch("/api/buyer/referrals/activate", { method: "POST", headers: csrfHeaders() })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) {
        throw new Error((json && (json.error || json.message)) || "Failed to activate referrals")
      }

      // Ensure /api/auth/me reflects new affiliate flag
      await mutate()

      toast({
        title: "Referral link activated",
        description: "Redirecting you to your Referrals & Earnings dashboard.",
      })

      router.replace("/affiliate/portal/dashboard")
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Activation failed",
        description: err?.message || "Please try again.",
      })
    } finally {
      setActivating(false)
    }
  }

  return (
    <ProtectedRoute allowedRoles={["BUYER"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Referrals &amp; Earnings</h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-1">
            Share AutoLenis with friends and track your referral activity.
          </p>
        </div>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users2 className="h-5 w-5 text-[#0066FF]" />
              Activate your referral link
            </CardTitle>
            <CardDescription>
              To keep the program secure and compliant, you must activate your referral link before you can share it.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border p-4 bg-muted/20">
              <div className="w-9 h-9 rounded-full bg-[#7ED321]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <ShieldCheck className="h-4 w-4 text-[#7ED321]" />
              </div>
              <div className="text-sm">
                <p className="font-medium">Program terms apply</p>
                <p className="text-muted-foreground">
                  Rewards are subject to eligibility, verification, and program terms. AutoLenis may update the program
                  at any time.
                </p>
              </div>
            </div>

            <Button
              onClick={activate}
              disabled={activating}
              className="w-full bg-[#0066FF] hover:bg-[#0066FF]/90 shadow-sm"
              size="lg"
            >
              {activating ? "Activating\u2026" : "Activate Referral Link"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              By activating, you agree to use your referral link in accordance with AutoLenis policies and applicable
              laws.
            </p>

            <div className="text-sm text-center">
              <span className="text-muted-foreground">Already activated?</span>{" "}
              <Link className="text-[#0066FF] hover:underline font-medium" href="/affiliate/portal/dashboard">
                Go to Referrals Dashboard
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
}
