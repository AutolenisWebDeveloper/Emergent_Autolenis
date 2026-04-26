import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CreditCard, ExternalLink } from "lucide-react"
import Link from "next/link"

/**
 * Dealer Financing page.
 * AutoLenis is a lead provider only — not a lender, broker, creditor, or
 * loan decision-maker.  Financing is handled by OpenRoad Lending.
 * This page shows the dealer's financing-related deals and routes to
 * the relevant deal pages for details.
 */
export default function DealerFinancingPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Financing</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Financing details are managed per deal. AutoLenis partners with OpenRoad
          Lending to provide buyer financing options.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4" />
            Financing Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Financing offers submitted with your auction bids appear on each deal&apos;s
            detail page. To review or update financing terms for an active deal, navigate
            to <strong>My Deals</strong>.
          </p>

          <div className="flex gap-3">
            <Button asChild variant="default" size="sm">
              <Link href="/dealer/deals">
                View My Deals
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a
                href="https://www.openroadlending.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1"
              >
                OpenRoad Lending
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
