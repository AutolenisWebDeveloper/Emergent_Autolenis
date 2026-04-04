"use client"

import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/layout/protected-route"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Copy, DollarSign, Link2, TrendingUp, Users, Check, Loader2 } from "lucide-react"
import QRCode from "qrcode"
import Image from "next/image"

export default function BuyerAffiliatePage() {
  const [affiliate, setAffiliate] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [qrCode, setQrCode] = useState("")
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    try {
      const res = await fetch("/api/affiliate/dashboard")
      const data = await res.json()
      setAffiliate(data.affiliate)
      setStats(data.stats)

      if (data.stats?.referralLink) {
        const qr = await QRCode.toDataURL(data.stats.referralLink, { width: 200 })
        setQrCode(qr)
      }
    } catch (err) {
    } finally {
      setLoading(false)
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!affiliate || !stats) {
    return <div className="container mx-auto py-8">Error loading affiliate data</div>
  }

  const affiliateLink = stats.referralLink || `https://autolenis.com/ref/${stats.referralCode}`

  return (
    <ProtectedRoute allowedRoles={["BUYER"]}>
    <div className="container mx-auto py-8 max-w-6xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Share & Earn</h1>
        <p className="text-muted-foreground">Refer friends and earn commission on every completed deal</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Clicks</CardTitle>
            <Link2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.clicks}</div>
            <p className="text-xs text-muted-foreground">Link visits</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.referrals}</div>
            <p className="text-xs text-muted-foreground">Sign-ups</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${stats.totalCommissions?.toFixed(2) || "0.00"}</div>
            <p className="text-xs text-muted-foreground">Lifetime commissions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Paid Out</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${stats.totalPaidOut?.toFixed(2) || "0.00"}</div>
            <p className="text-xs text-muted-foreground">Total received</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Referral Link</CardTitle>
          <CardDescription>Share this link or QR code to earn commissions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-2">
            <Input value={affiliateLink} readOnly className="font-mono" />
            <Button onClick={() => copyToClipboard(affiliateLink)}>
              {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>

          <div className="p-4 bg-muted rounded-lg text-center">
            <p className="text-sm text-muted-foreground mb-1">Your Referral Code</p>
            <p className="text-2xl font-bold font-mono tracking-wider">{stats.referralCode}</p>
          </div>

          <div className="flex gap-4 items-start">
            <div className="bg-white p-4 rounded-lg border">
              {qrCode && <Image src={qrCode} alt="QR Code" width={200} height={200} />}
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <h4 className="font-semibold mb-2">3-Level Commission Structure</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Level 1 (Direct Referrals):</span>
                    <span className="font-semibold">15%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Level 2:</span>
                    <span className="font-semibold">3%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Level 3:</span>
                    <span className="font-semibold">2%</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Commissions are calculated on the concierge fee ($499 Premium plan) when your referrals complete their deals.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Commission Breakdown by Level</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.commissionsByLevel?.length > 0 ? (
              stats.commissionsByLevel.map((level: any) => (
                <div key={level.level} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">Level {level.level}</p>
                    <p className="text-sm text-muted-foreground">{level._count} commissions</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">${level._sum?.commissionAmount?.toFixed(2) || "0.00"}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">
                No commissions yet. Share your link to start earning!
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
    </ProtectedRoute>
  )
}
