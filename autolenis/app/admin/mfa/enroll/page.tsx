"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { extractApiError } from "@/lib/utils/error-message"
import { Shield, Smartphone, Loader2, CheckCircle, Copy, AlertTriangle } from "lucide-react"

export default function MfaEnrollPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [verificationCode, setVerificationCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const startEnrollment = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch("/api/admin/auth/mfa/enroll", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(extractApiError(data.error, "Failed to start MFA enrollment"))
        }

        setQrCode(data.qrCode)
        setSecret(data.secret)
        setFactorId(data.factorId)
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "MFA enrollment failed"
        setError(msg)
        toast({
          variant: "destructive",
          title: "Enrollment Failed",
          description: msg,
        })
      } finally {
        setLoading(false)
      }
    }
    startEnrollment()
  }, [toast])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setVerifying(true)
    setError(null)

    try {
      const response = await fetch("/api/admin/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          factorId,
          code: verificationCode,
          isEnrollment: true,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(extractApiError(data.error, "Verification failed"))
      }

      toast({
        title: "MFA Enabled",
        description: "Your account is now protected with two-factor authentication.",
      })

      router.push("/admin/dashboard")
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Verification failed"
      setError(msg)
      toast({
        variant: "destructive",
        title: "Verification Failed",
        description: msg,
      })
    } finally {
      setVerifying(false)
    }
  }

  const copySecret = () => {
    if (secret) {
      navigator.clipboard.writeText(secret)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast({
        title: "Copied",
        description: "Secret key copied to clipboard",
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#00D9FF] mx-auto mb-4" />
          <p className="text-slate-400">Setting up MFA...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-4">
      <div className="absolute inset-0 bg-[url('/abstract-grid.png')] opacity-5" />

      <div className="mb-8 flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#7ED321] to-[#00D9FF] flex items-center justify-center">
          <Shield className="w-7 h-7 text-slate-900" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">AutoLenis</h1>
          <p className="text-sm text-slate-400">Admin Portal</p>
        </div>
      </div>

      <Card className="w-full max-w-md bg-slate-800/50 border-slate-700 backdrop-blur-sm shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-slate-700/50 flex items-center justify-center mb-2">
            <Smartphone className="w-7 h-7 text-[#00D9FF]" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">Set Up MFA</CardTitle>
          <CardDescription className="text-slate-400">Scan the QR code with your authenticator app</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert className="bg-blue-500/10 border-blue-500/30">
            <Shield className="h-4 w-4 text-blue-400" />
            <AlertDescription className="text-blue-200 text-sm">
              Multi-factor authentication is required for all admin accounts.
            </AlertDescription>
          </Alert>

          {error && (
            <Alert className="bg-red-500/10 border-red-500/30">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <AlertDescription className="text-red-200 text-sm">{error}</AlertDescription>
            </Alert>
          )}

          {qrCode && (
            <div className="flex flex-col items-center space-y-4">
              <div className="bg-white p-4 rounded-lg">
                <img src={qrCode} alt="MFA QR Code" className="w-48 h-48" />
              </div>

              <div className="w-full">
                <Label className="text-slate-300 text-sm">Manual Entry Key</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 bg-slate-900/50 text-slate-300 px-3 py-2 rounded text-xs font-mono break-all">
                    {secret}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={copySecret}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
                  >
                    {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code" className="text-slate-200">
                Verification Code
              </Label>
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                required
                autoComplete="one-time-code"
                className="bg-slate-900/50 border-slate-600 text-white text-center text-2xl tracking-widest placeholder:text-slate-500 focus:border-[#00D9FF] focus:ring-[#00D9FF]/20"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              />
              <p className="text-xs text-slate-500 text-center">Enter the 6-digit code from your authenticator app</p>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-[#7ED321] to-[#00D9FF] text-slate-900 hover:opacity-90 font-semibold h-11"
              disabled={verifying || verificationCode.length !== 6}
            >
              {verifying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Verify & Enable MFA
                </>
              )}
            </Button>
          </form>

          <div className="text-center">
            <p className="text-xs text-slate-500">Recommended apps: Google Authenticator, Authy, 1Password</p>
          </div>
        </CardContent>
      </Card>

      <p className="mt-8 text-xs text-slate-500">
        © {new Date().getFullYear()} AutoLenis. Protected by enterprise security.
      </p>
    </div>
  )
}
