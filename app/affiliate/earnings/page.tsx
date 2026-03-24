"use client"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { DollarSign, Users} from "lucide-react"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function AffiliateEarningsPage() {
  const { data: referralsData } = useSWR("/api/affiliate/referrals", fetcher)
  const { data: commissionsData } = useSWR("/api/affiliate/commissions", fetcher)

  const referrals = referralsData?.data || []
  const commissions = commissionsData?.data || []

  const totalEarnings = commissions.reduce((sum: number, c: any) => sum + c.amount, 0)
  const pendingEarnings = commissions.filter((c: any) => c.status === "PENDING").reduce((sum: number, c: any) => sum + c.amount, 0)
  const paidEarnings = commissions.filter((c: any) => c.status === "PAID").reduce((sum: number, c: any) => sum + c.amount, 0)

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/affiliate/portal/dashboard">Dashboard</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>Earnings</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <h1 className="text-3xl font-bold">Earnings Summary</h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-[#7ED321]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold flex items-center gap-1">
              <DollarSign className="h-6 w-6" />
              {(totalEarnings / 100).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">All-time total</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-[#00D9FF]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Paid Out</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold flex items-center gap-1">
              <DollarSign className="h-6 w-6" />
              {(paidEarnings / 100).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Successfully paid</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-[#0066FF]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold flex items-center gap-1">
              <DollarSign className="h-6 w-6" />
              {(pendingEarnings / 100).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting payout</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Referrals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold flex items-center gap-1">
              <Users className="h-6 w-6" />
              {referrals.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total referred</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Recent Commissions</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {commissions.slice(0, 5).map((commission: any) => (
              <div key={commission.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                <div>
                  <p className="font-medium">{commission.referralName}</p>
                  <p className="text-sm text-muted-foreground">{new Date(commission.earnedAt).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">${(commission.amount / 100).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{commission.status}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
