"use client"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Copy, Check, LinkIcon, Share2, QrCode, Loader2 } from "lucide-react"
import QRCodeLib from "qrcode"
import Image from "next/image"

export default function ReferralLinkPage() {
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [referralCode, setReferralCode] = useState("")
  const [referralLink, setReferralLink] = useState("")
  const [qrCode, setQrCode] = useState("")

  useEffect(() => {
    async function loadAffiliateData() {
      try {
        const res = await fetch("/api/affiliate/dashboard")
        const data = await res.json()

        if (data.affiliate?.refCode || data.affiliate?.referralCode) {
          const refCode = data.affiliate.refCode || data.affiliate.referralCode
          setReferralCode(refCode)
          const link = data.affiliate.referralLink || `https://autolenis.com/ref/${refCode}`
          setReferralLink(link)

          // Generate QR code
          const qr = await QRCodeLib.toDataURL(link, { width: 200 })
          setQrCode(qr)
        }
      } catch (err) {
        // Silent error handling
      } finally {
        setLoading(false)
      }
    }

    loadAffiliateData()
  }, [])

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareOnSocial = (platform: string) => {
    const text = "Check out AutoLenis — Car Buying. Reengineered. Use my referral link:"
    const encodedText = encodeURIComponent(text)
    const encodedUrl = encodeURIComponent(referralLink)

    let url = ""
    switch (platform) {
      case "facebook":
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`
        break
      case "twitter":
        url = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`
        break
      case "linkedin":
        url = `https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodedText}`
        break
      case "email":
        url = `mailto:?subject=Check out AutoLenis&body=${encodedText}%20${encodedUrl}`
        break
    }

    if (url) {
      window.open(url, "_blank", "width=600,height=400")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Referral Link</h1>
        <p className="text-muted-foreground mt-1">Share your unique referral link to earn commissions on every sale</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Your Unique Referral Link
          </CardTitle>
          <CardDescription>Share this link with friends, family, or your audience to earn commissions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input value={referralLink} readOnly className="font-mono" />
            <Button onClick={copyToClipboard} className="flex-shrink-0">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>

          <div className="pt-4">
            <Label>Referral Code</Label>
            <div className="mt-2 p-4 bg-muted rounded-lg text-center">
              <span className="text-2xl font-bold font-mono tracking-wider">{referralCode}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Share on Social
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start bg-transparent"
              onClick={() => shareOnSocial("facebook")}
            >
              Share on Facebook
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start bg-transparent"
              onClick={() => shareOnSocial("twitter")}
            >
              Share on Twitter
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start bg-transparent"
              onClick={() => shareOnSocial("linkedin")}
            >
              Share on LinkedIn
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start bg-transparent"
              onClick={() => shareOnSocial("email")}
            >
              Share via Email
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              QR Code
            </CardTitle>
            <CardDescription>Download your QR code for print materials</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="w-48 h-48 bg-white rounded-lg flex items-center justify-center mb-4 border">
              {qrCode ? (
                <Image src={qrCode} alt="QR Code" width={192} height={192} />
              ) : (
                <QrCode className="h-24 w-24 text-muted-foreground" />
              )}
            </div>
            <Button
              variant="outline"
              onClick={() => {
                if (qrCode) {
                  const link = document.createElement("a")
                  link.download = `autolenis-referral-${referralCode}.png`
                  link.href = qrCode
                  link.click()
                }
              }}
            >
              Download QR Code
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
