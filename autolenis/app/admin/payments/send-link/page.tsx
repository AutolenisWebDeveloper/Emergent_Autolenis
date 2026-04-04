"use client"
import { useState } from "react"
import { csrfHeaders } from "@/lib/csrf-client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Send, Copy } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function SendPaymentLinkPage() {
  const [email, setEmail] = useState("")
  const [type, setType] = useState("")
  const [amount, setAmount] = useState("")
  const [memo, setMemo] = useState("")
  const [generatedLink, setGeneratedLink] = useState("")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleGenerate = async () => {
    if (!email || !type || !amount) {
      toast({ variant: "destructive", title: "Please fill all required fields" })
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/admin/payments/send-link", {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({ email, type, amount: parseFloat(amount) * 100, memo }),
      })
      const data = await res.json()
      if (data.success) {
        setGeneratedLink(data.data.url)
        toast({ title: "Payment link generated and sent!" })
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to generate link" })
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/admin/dashboard">Dashboard</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href="/admin/payments">Payments</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>Send Link</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card>
        <CardHeader>
          <CardTitle>Send Payment Link</CardTitle>
          <CardDescription>Generate and send a payment link to a user</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="email">User Email *</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" />
          </div>
          <div>
            <Label htmlFor="type">Payment Type *</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="DEPOSIT">Deposit</SelectItem>
                <SelectItem value="SERVICE_FEE">Service Fee</SelectItem>
                <SelectItem value="DEALER_FEE">Dealer Fee</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="amount">Amount (USD) *</Label>
            <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="500.00" />
          </div>
          <div>
            <Label htmlFor="memo">Memo (Optional)</Label>
            <Textarea id="memo" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="Payment for..." />
          </div>
          <Button className="w-full" onClick={handleGenerate} disabled={loading}>
            <Send className="h-4 w-4 mr-2" />Generate & Send Link
          </Button>

          {generatedLink && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <p className="text-sm font-medium">Generated Link:</p>
              <div className="flex gap-2">
                <Input value={generatedLink} readOnly />
                <Button size="icon" variant="outline" onClick={() => { navigator.clipboard.writeText(generatedLink); toast({ title: "Copied!" }) }}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
