"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Gift, Users, Copy, CheckCircle2, DollarSign, Share2 } from "lucide-react"

interface Referral {
  id: string
  referredName: string | null
  referredEmail: string | null
  status: string
  rewardCents: number | null
  createdAt: string
}

export default function ReferralPage() {
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [loading, setLoading] = useState(true)
  const [referralCode, setReferralCode] = useState("")
  const [copied, setCopied] = useState(false)

  const fetchReferrals = useCallback(async () => {
    try {
      const res = await fetch("/api/buyer/referrals")
      const data = await res.json()
      setReferrals(data?.data?.referrals || data?.referrals || [])
      setReferralCode(data?.data?.referralCode || data?.referralCode || "")
    } catch {
      // Empty state
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchReferrals() }, [fetchReferrals])

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode || window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="space-y-6" data-testid="referral-loading">
        <h1 className="text-2xl font-semibold tracking-tight">Referral Program</h1>
        <div className="h-48 rounded-xl bg-muted/50 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6" data-testid="referral-page">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Referral Program</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Earn rewards by referring friends and family to AutoLenis.
        </p>
      </div>

      <Card data-testid="referral-code-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Your Referral Link
          </CardTitle>
          <CardDescription>Share this link with friends. When they complete a purchase, you both earn rewards.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input value={referralCode || "Your referral code will appear here"} readOnly className="font-mono text-sm" data-testid="referral-code-input" />
            <Button variant="outline" onClick={copyCode} data-testid="copy-referral-btn">
              {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-muted p-2.5"><Users className="h-5 w-5 text-muted-foreground" /></div>
              <div>
                <p className="text-2xl font-bold">{referrals.length}</p>
                <p className="text-xs text-muted-foreground">Total Referrals</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-muted p-2.5"><CheckCircle2 className="h-5 w-5 text-muted-foreground" /></div>
              <div>
                <p className="text-2xl font-bold">{referrals.filter((r) => r.status === "COMPLETED").length}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-muted p-2.5"><DollarSign className="h-5 w-5 text-muted-foreground" /></div>
              <div>
                <p className="text-2xl font-bold">
                  ${referrals.reduce((sum, r) => sum + (r.rewardCents || 0), 0) / 100}
                </p>
                <p className="text-xs text-muted-foreground">Total Earned</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {referrals.length === 0 ? (
        <Card className="border-dashed" data-testid="no-referrals-empty">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Gift className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-1">No referrals yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Share your referral link above. When someone signs up and completes a vehicle purchase through AutoLenis, you&apos;ll both earn rewards.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Referrals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {referrals.map((ref) => (
                <div key={ref.id} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{ref.referredName || ref.referredEmail || "Invited User"}</p>
                    <p className="text-xs text-muted-foreground">{new Date(ref.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {ref.rewardCents && ref.rewardCents > 0 && (
                      <span className="text-sm font-medium text-green-600">${(ref.rewardCents / 100).toLocaleString()}</span>
                    )}
                    <Badge variant={ref.status === "COMPLETED" ? "default" : "secondary"}>
                      {ref.status === "COMPLETED" ? "Completed" : ref.status === "SIGNED_UP" ? "Signed Up" : "Pending"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
