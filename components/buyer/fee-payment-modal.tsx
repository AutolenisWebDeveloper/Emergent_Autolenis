"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { InfoIcon, ArrowLeft } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { extractApiError } from "@/lib/utils/error-message"
import { StripeEmbeddedCheckout } from "@/components/payments/stripe-embedded-checkout"

interface FeePaymentModalProps {
  open: boolean
  onClose: () => void
  dealId: string
  onComplete: () => void
}

export function FeePaymentModal({ open, onClose, dealId, onComplete }: FeePaymentModalProps) {
  const [step, setStep] = useState<"options" | "checkout" | "loan-impact">("options")
  const [feeOptions, setFeeOptions] = useState<any>(null)
  const [loanImpact, setLoanImpact] = useState<any>(null)
  const [consent1, setConsent1] = useState(false)
  const [consent2, setConsent2] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const loadFeeOptions = async () => {
      try {
        const response = await fetch(`/api/payments/fee/options/${dealId}`)
        const data = await response.json()

        if (data.success) {
          setFeeOptions(data.data)
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load fee options",
        })
      }
    }
    if (open && dealId) {
      loadFeeOptions()
      setStep("options")
    }
  }, [open, dealId, toast])

  const loadLoanImpact = async () => {
    try {
      const response = await fetch(`/api/payments/fee/loan-impact/${dealId}`)
      const data = await response.json()

      if (data.success) {
        setLoanImpact(data.data)
        setStep("loan-impact")
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      })
    }
  }

  const handlePayDirectly = () => {
    setStep("checkout")
  }

  const handleCheckoutComplete = () => {
    toast({
      title: "Payment successful!",
      description: "Your concierge fee has been paid.",
    })
    onComplete()
    onClose()
  }

  const handleLoanInclusion = async () => {
    if (!consent1 || !consent2) {
      toast({
        variant: "destructive",
        title: "Consent required",
        description: "Please check both consent boxes",
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/payments/fee/loan-agree", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(extractApiError(data.error, "Payment failed"))
      }

      toast({
        title: "Fee added to loan",
        description: "Your lender will disburse the fee",
      })

      onComplete()
      onClose()
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      })
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(amount)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {step === "options" && feeOptions && (
          <>
            <DialogHeader>
              <DialogTitle>AutoLenis concierge fee</DialogTitle>
              <DialogDescription>Choose how you'd like to pay for our service</DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <div className="rounded-lg border p-4 bg-muted/30">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Base fee</div>
                    <div className="font-semibold">{formatCurrency(feeOptions.baseFee)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Deposit credit</div>
                    <div className="font-semibold text-green-600">-{formatCurrency(feeOptions.depositCredit)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Final amount</div>
                    <div className="text-xl font-bold">{formatCurrency(feeOptions.finalAmount)}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-lg border p-6 hover:border-primary transition-colors cursor-pointer">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg mb-1">Pay AutoLenis directly</h3>
                      <p className="text-sm text-muted-foreground">Recommended</p>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                      No loan impact
                    </div>
                  </div>
                  <Alert className="mb-4">
                    <InfoIcon className="h-4 w-4" />
                    <AlertDescription>Does not change your loan amount or monthly payment</AlertDescription>
                  </Alert>
                  <Button onClick={handlePayDirectly} className="w-full">
                    Pay with card
                  </Button>
                </div>

                <div className="rounded-lg border p-6 hover:border-primary transition-colors cursor-pointer">
                  <h3 className="font-semibold text-lg mb-1">Include in my loan</h3>
                  <p className="text-sm text-muted-foreground mb-4">Adds a small amount to your monthly payment</p>
                  <Button onClick={loadLoanImpact} variant="outline" className="w-full bg-transparent">
                    See impact on my loan
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}

        {step === "checkout" && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setStep("options")}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <DialogTitle>Complete Payment</DialogTitle>
                  <DialogDescription>Secure payment powered by Stripe</DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <StripeEmbeddedCheckout type="service_fee" dealId={dealId} onComplete={handleCheckoutComplete} />
          </>
        )}

        {step === "loan-impact" && loanImpact && (
          <>
            <DialogHeader>
              <DialogTitle>Loan impact calculator</DialogTitle>
              <DialogDescription>Here's how including the fee affects your loan</DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <div className="rounded-lg border p-6 bg-muted/30">
                <div className="text-center mb-4">
                  <div className="text-sm text-muted-foreground mb-1">Adding to your loan</div>
                  <div className="text-3xl font-bold">{formatCurrency(loanImpact.feeAmount)}</div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">APR</div>
                    <div className="text-lg font-semibold">{loanImpact.apr}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Loan term</div>
                    <div className="text-lg font-semibold">{loanImpact.termMonths} months</div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-6">
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">This will increase your monthly payment by</div>
                    <div className="text-3xl font-bold text-primary">
                      {formatCurrency(loanImpact.monthlyIncrease)}/mo
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="text-sm text-muted-foreground mb-1">
                      Total cost of this service over the life of the loan
                    </div>
                    <div className="text-xl font-bold">{formatCurrency(loanImpact.totalExtraCost)}</div>
                  </div>
                </div>
              </div>

              <Alert>
                <InfoIcon className="h-4 w-4" />
                <AlertDescription>
                  Your choice today does not affect the dealership contract or car price. This is a separate AutoLenis
                  service agreement.
                </AlertDescription>
              </Alert>

              <div className="space-y-4 rounded-lg border p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="consent1"
                    checked={consent1}
                    onCheckedChange={(checked) => setConsent1(checked as boolean)}
                  />
                  <Label htmlFor="consent1" className="text-sm font-normal cursor-pointer">
                    I understand the monthly increase and total cost
                  </Label>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="consent2"
                    checked={consent2}
                    onCheckedChange={(checked) => setConsent2(checked as boolean)}
                  />
                  <Label htmlFor="consent2" className="text-sm font-normal cursor-pointer">
                    I authorize the lender to disburse {formatCurrency(loanImpact.feeAmount)} directly to AutoLenis for
                    concierge services
                  </Label>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("options")} className="flex-1">
                  Back
                </Button>
                <Button onClick={handleLoanInclusion} disabled={!consent1 || !consent2 || loading} className="flex-1">
                  {loading ? "Processing..." : "Add AutoLenis fee to my loan"}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
