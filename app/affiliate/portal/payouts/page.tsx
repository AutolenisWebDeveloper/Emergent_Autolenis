"use client"
import { useRef, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { CreditCard, Building2, DollarSign, AlertCircle, CheckCircle, Clock, Loader2, Upload } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import useSWR from "swr"
import { getCsrfToken } from "@/lib/csrf-client"
import { PayoutListItem } from "@/components/payout/payout-list-item"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function PayoutSettingsPage() {
  const { toast } = useToast()
  const { data, isLoading, mutate } = useSWR("/api/affiliate/payouts", fetcher, {
    refreshInterval: 30000,
  })

  const [payoutMethod, setPayoutMethod] = useState("bank")
  const [requesting, setRequesting] = useState(false)
  const [bankDetails, setBankDetails] = useState({
    accountHolder: "",
    accountType: "checking",
    routingNumber: "",
    accountNumber: "",
  })
  const [paypalEmail, setPaypalEmail] = useState("")
  const [uploadingCheck, setUploadingCheck] = useState(false)
  const [voidedCheckFile, setVoidedCheckFile] = useState<string | null>(null)
  const checkFileRef = useRef<HTMLInputElement>(null)

  const handleVoidedCheckUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"]
    if (!allowedTypes.includes(file.type)) {
      toast({ variant: "destructive", title: "Invalid file type", description: "Please upload a PDF, JPG, or PNG file." })
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ variant: "destructive", title: "File too large", description: "Maximum file size is 10 MB." })
      return
    }

    setUploadingCheck(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("type", "VOIDED_CHECK")

      const csrfToken = getCsrfToken()
      const headers: Record<string, string> = {}
      if (csrfToken) headers["x-csrf-token"] = csrfToken

      const res = await fetch("/api/affiliate/documents", { method: "POST", body: formData, headers })
      const result = await res.json()

      if (!res.ok || !result.success) {
        throw new Error(result.error || "Upload failed")
      }

      setVoidedCheckFile(file.name)
      toast({ title: "Voided check uploaded", description: "Your voided check has been uploaded successfully." })
    } catch (err: any) {
      toast({ variant: "destructive", title: "Upload failed", description: err.message || "Unable to upload voided check." })
    } finally {
      setUploadingCheck(false)
      if (checkFileRef.current) checkFileRef.current.value = ""
    }
  }

  const handleRequestPayout = async () => {
    if (!data?.availableBalance || data.availableBalance < (data?.minimumPayout || 50)) {
      toast({
        variant: "destructive",
        title: "Insufficient balance",
        description: `Minimum payout is $${data?.minimumPayout || 50}`,
      })
      return
    }

    setRequesting(true)
    try {
      const response = await fetch("/api/affiliate/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: payoutMethod.toUpperCase(),
          details: payoutMethod === "bank" ? bankDetails : { email: paypalEmail },
        }),
      })

      const result = await response.json()
      if (result.error) {
        throw new Error(result.error)
      }

      toast({
        title: "Payout requested",
        description: "Your payout has been submitted for processing.",
      })
      mutate()
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Payout failed",
        description: error.message,
      })
    } finally {
      setRequesting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const { payouts = [], stats = {}, availableBalance = 0, minimumPayout = 50 } = data || {}

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Payout Settings</h1>
        <p className="text-muted-foreground mt-1">Configure how you receive your commission payouts</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="border-[#7ED321]/20 bg-gradient-to-br from-[#7ED321]/5 to-[#7ED321]/10">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-[#7ED321]">${availableBalance.toFixed(2)}</div>
            <p className="text-sm text-muted-foreground">Available for Payout</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">${minimumPayout}</div>
            <p className="text-sm text-muted-foreground">Minimum Payout</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">${(stats.completed || 0).toFixed(2)}</div>
            <p className="text-sm text-muted-foreground">Total Paid Out</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payout Method</CardTitle>
          <CardDescription>Choose how you'd like to receive your commissions</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={payoutMethod} onValueChange={setPayoutMethod} className="space-y-4">
            <div className="flex items-center space-x-4 p-4 border rounded-lg">
              <RadioGroupItem value="bank" id="bank" />
              <Label htmlFor="bank" className="flex items-center gap-3 cursor-pointer flex-1">
                <Building2 className="h-5 w-5" />
                <div>
                  <p className="font-semibold">Bank Transfer (ACH)</p>
                  <p className="text-sm text-muted-foreground">Direct deposit to your bank account</p>
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-4 p-4 border rounded-lg">
              <RadioGroupItem value="paypal" id="paypal" />
              <Label htmlFor="paypal" className="flex items-center gap-3 cursor-pointer flex-1">
                <CreditCard className="h-5 w-5" />
                <div>
                  <p className="font-semibold">PayPal</p>
                  <p className="text-sm text-muted-foreground">Transfer to your PayPal account</p>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {payoutMethod === "bank" && (
        <Card>
          <CardHeader>
            <CardTitle>Bank Account Details</CardTitle>
            <CardDescription>Enter your bank account information for direct deposits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Account Holder Name</Label>
                <Input
                  placeholder="Full Name"
                  className="mt-1"
                  value={bankDetails.accountHolder}
                  onChange={(e) => setBankDetails({ ...bankDetails, accountHolder: e.target.value })}
                />
              </div>
              <div>
                <Label>Account Type</Label>
                <Input
                  placeholder="Checking"
                  className="mt-1"
                  value={bankDetails.accountType}
                  onChange={(e) => setBankDetails({ ...bankDetails, accountType: e.target.value })}
                />
              </div>
              <div>
                <Label>Routing Number</Label>
                <Input
                  placeholder="123456789"
                  className="mt-1"
                  value={bankDetails.routingNumber}
                  onChange={(e) => setBankDetails({ ...bankDetails, routingNumber: e.target.value })}
                />
              </div>
              <div>
                <Label>Account Number</Label>
                <Input
                  placeholder="••••••••1234"
                  type="password"
                  className="mt-1"
                  value={bankDetails.accountNumber}
                  onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                />
              </div>
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Your bank information is encrypted and securely stored. We will never share your financial details.
              </AlertDescription>
            </Alert>

            <div className="pt-4 border-t">
              <Label className="font-semibold">Upload Voided Check</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Required for bank transfer verification. Accepted formats: PDF, JPG, PNG (max 10 MB).
              </p>
              {voidedCheckFile && (
                <div className="flex items-center gap-2 mb-3 p-2 bg-green-50 border border-green-200 rounded-lg text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-green-800">{voidedCheckFile}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <input
                  ref={checkFileRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleVoidedCheckUpload}
                  disabled={uploadingCheck}
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90 disabled:opacity-50"
                />
                {uploadingCheck && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {payoutMethod === "paypal" && (
        <Card>
          <CardHeader>
            <CardTitle>PayPal Details</CardTitle>
            <CardDescription>Enter your PayPal email address</CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              <Label>PayPal Email</Label>
              <Input
                type="email"
                placeholder="your@email.com"
                className="mt-1"
                value={paypalEmail}
                onChange={(e) => setPaypalEmail(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Request Payout</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="font-medium">Available Balance</p>
              <p className="text-sm text-muted-foreground">Minimum payout: ${minimumPayout}</p>
            </div>
            <p className="text-2xl font-bold text-[#7ED321]">${availableBalance.toFixed(2)}</p>
          </div>
          <Button
            className="w-full bg-primary hover:bg-primary/90"
            disabled={availableBalance < minimumPayout || requesting}
            onClick={handleRequestPayout}
          >
            {requesting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <DollarSign className="h-4 w-4 mr-2" />
                Request Payout (${availableBalance.toFixed(2)})
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Payout History */}
      {payouts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payout History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {payouts.map((payout: any) => (
                <PayoutListItem key={payout.id} payout={payout} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
