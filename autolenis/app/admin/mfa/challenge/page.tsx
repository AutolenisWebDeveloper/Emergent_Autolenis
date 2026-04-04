"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { extractApiError } from "@/lib/utils/error-message"
import { Shield, Smartphone, Loader2, AlertTriangle, ArrowLeft } from "lucide-react"

export default function MfaChallengePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null)
  const [verificationCode, setVerificationCode] = useState("")

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/admin/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: verificationCode,
          isEnrollment: false,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.attemptsRemaining !== undefined) {
          setAttemptsRemaining(data.attemptsRemaining)
        }
        throw new Error(extractApiError(data.error, "Verification failed"))
      }

      toast({
        title: "Verified",
        description: "Redirecting to dashboard...",
      })

      router.push("/admin/dashboard")
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Verification failed")
      setVerificationCode("")
    } finally {
      setLoading(false)
    }
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
          <CardTitle className="text-2xl font-bold text-white">Two-Factor Authentication</CardTitle>
          <CardDescription className="text-slate-400">Enter the code from your authenticator app</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert className="bg-red-500/10 border-red-500/30">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <AlertDescription className="text-red-200 text-sm">
                {error}
                {attemptsRemaining !== null && attemptsRemaining > 0 && (
                  <span className="block mt-1">
                    {attemptsRemaining} attempt{attemptsRemaining !== 1 ? "s" : ""} remaining.
                  </span>
                )}
              </AlertDescription>
            </Alert>
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
                autoFocus
                className="bg-slate-900/50 border-slate-600 text-white text-center text-2xl tracking-widest placeholder:text-slate-500 focus:border-[#00D9FF] focus:ring-[#00D9FF]/20"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              />
              <p className="text-xs text-slate-500 text-center">Enter the 6-digit code from your authenticator app</p>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-[#7ED321] to-[#00D9FF] text-slate-900 hover:opacity-90 font-semibold h-11"
              disabled={loading || verificationCode.length !== 6}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 border-t border-slate-700 pt-6">
          <Link href="/admin/sign-in" className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-300">
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>
        </CardFooter>
      </Card>

      <div className="mt-8 max-w-md w-full">
        <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/50">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Having trouble?</h3>
          <ul className="text-xs text-slate-400 space-y-1">
            <li>• Make sure your device time is synchronized</li>
            <li>• Use the latest code from your authenticator app</li>
            <li>• Contact IT support if you lost access to your authenticator</li>
          </ul>
        </div>
      </div>

      <p className="mt-8 text-xs text-slate-500">
        © {new Date().getFullYear()} AutoLenis. Protected by enterprise security.
      </p>
    </div>
  )
}
