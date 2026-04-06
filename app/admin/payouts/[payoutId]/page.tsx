"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import {
  ArrowLeft,
  DollarSign,
  Users,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  ExternalLink,
  Hash,
} from "lucide-react"
import Link from "next/link"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PENDING: { label: "Pending", variant: "secondary" },
  PROCESSING: { label: "Processing", variant: "secondary" },
  COMPLETED: { label: "Completed", variant: "default" },
  PAID: { label: "Paid", variant: "default" },
  FAILED: { label: "Failed", variant: "destructive" },
  CANCELLED: { label: "Cancelled", variant: "outline" },
}

function fmt(cents: number | null | undefined): string {
  if (!cents && cents !== 0) return "—"
  return `$${(Number(cents) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function AdminPayoutDetailPage({ params }: { params: Promise<{ payoutId: string }> }) {
  const { payoutId } = use(params)
  const router = useRouter()
  const { data, error, isLoading } = useSWR(`/api/admin/payouts/${payoutId}`, fetcher)

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="admin-payout-detail-loading">
        <div className="h-6 w-64 bg-muted rounded animate-pulse" />
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          <div className="h-6 w-24 bg-muted rounded-full animate-pulse" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => <div key={i} className="h-44 bg-muted rounded-xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  if (error || !data?.payout) {
    return (
      <div className="space-y-6" data-testid="admin-payout-detail-error">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink href="/admin/dashboard">Dashboard</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbLink href="/admin/payouts">Payouts</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>{payoutId.slice(0, 8)}</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="h-10 w-10 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Payout not found</h2>
            <p className="text-sm text-muted-foreground mb-4">This payout record could not be located or may have been archived.</p>
            <Button variant="outline" onClick={() => router.push("/admin/payouts")} data-testid="back-to-payouts-btn">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Payouts
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const payout = data.payout
  const status = String(payout.status || "PENDING").toUpperCase()
  const statusConfig = STATUS_CONFIG[status] || { label: payout.status || "Unknown", variant: "outline" as const }

  return (
    <div className="space-y-6" data-testid="admin-payout-detail-page">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/admin/dashboard">Dashboard</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href="/admin/payouts">Payouts</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>{payoutId.slice(0, 8)}</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Payout Details</h1>
          <p className="text-sm text-muted-foreground mt-0.5 font-mono">#{payoutId.slice(0, 12)}</p>
        </div>
        <Badge variant={statusConfig.variant} className="text-sm px-3 py-1" data-testid="payout-status-badge">{statusConfig.label}</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Amount Card */}
        <Card data-testid="payout-amount-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-4 w-4" /> Payout Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <p className="text-4xl font-bold tracking-tight">{fmt(payout.amount || payout.amountCents)}</p>
              <p className="text-sm text-muted-foreground mt-2">
                {status === "COMPLETED" || status === "PAID" ? "Amount disbursed" : "Amount to be disbursed"}
              </p>
            </div>
            <Separator className="my-4" />
            <div className="space-y-2 text-sm">
              {payout.method && (
                <div className="flex justify-between"><span className="text-muted-foreground">Method</span><span className="font-medium">{payout.method}</span></div>
              )}
              {payout.reference && (
                <div className="flex justify-between"><span className="text-muted-foreground">Reference</span><span className="font-mono text-xs">{payout.reference}</span></div>
              )}
              {payout.stripePayoutId && (
                <div className="flex justify-between"><span className="text-muted-foreground">Stripe ID</span><span className="font-mono text-xs">{payout.stripePayoutId}</span></div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Affiliate Info */}
        <Card data-testid="payout-affiliate-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Affiliate</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Affiliate ID</span>
              <span className="font-mono text-xs">{payout.affiliateId || "—"}</span>
            </div>
            {payout.affiliateName && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{payout.affiliateName}</span>
              </div>
            )}
            {payout.affiliateEmail && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email</span>
                <span className="truncate ml-2">{payout.affiliateEmail}</span>
              </div>
            )}
            {payout.affiliateId && (
              <Button variant="link" size="sm" className="p-0 h-auto" asChild data-testid="view-affiliate-link">
                <Link href={`/admin/affiliates/${payout.affiliateId}`}>View Affiliate <ExternalLink className="h-3 w-3 ml-1" /></Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Commissions */}
      {payout.commissions && payout.commissions.length > 0 && (
        <Card data-testid="payout-commissions-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4" /> Included Commissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {payout.commissions.map((c: any, idx: number) => (
                <div key={c.id || idx} className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
                  <div>
                    <p className="font-medium">{c.description || c.type || "Commission"}</p>
                    {c.referralId && <p className="text-xs text-muted-foreground">Referral: {c.referralId.slice(0, 8)}</p>}
                  </div>
                  <span className="font-medium">{fmt(c.amountCents || c.amount)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <Card data-testid="payout-timeline-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4" /> Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {payout.createdAt && <div><p className="text-muted-foreground">Created</p><p className="font-medium">{new Date(payout.createdAt).toLocaleDateString()}</p></div>}
            {payout.processedAt && <div><p className="text-muted-foreground">Processed</p><p className="font-medium">{new Date(payout.processedAt).toLocaleDateString()}</p></div>}
            {payout.completedAt && <div><p className="text-muted-foreground">Completed</p><p className="font-medium">{new Date(payout.completedAt).toLocaleDateString()}</p></div>}
            {payout.updatedAt && <div><p className="text-muted-foreground">Updated</p><p className="font-medium">{new Date(payout.updatedAt).toLocaleDateString()}</p></div>}
          </div>
        </CardContent>
      </Card>

      {payout.notes && (
        <Card data-testid="payout-notes-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{payout.notes}</p>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-start pt-2">
        <Button variant="ghost" onClick={() => router.push("/admin/payouts")} data-testid="back-to-payouts-btn">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Payouts
        </Button>
      </div>
    </div>
  )
}
