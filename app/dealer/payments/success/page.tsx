import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle } from "lucide-react"

export default function PaymentSuccessPage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <CheckCircle className="h-16 w-16 text-[#7ED321] mx-auto" />
          <h1 className="text-2xl font-bold">Payment Successful</h1>
          <p className="text-muted-foreground">
            Your payment has been processed successfully. Your account has been updated.
          </p>
          <Button asChild className="bg-primary hover:bg-primary/90">
            <Link href="/dealer/payments">Back to Payments</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
