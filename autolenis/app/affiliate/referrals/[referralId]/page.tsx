"use client"
import { use } from "react"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { AlertCircle, DollarSign, Calendar, CheckCircle } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function AffiliateReferralDetailPage({ params }: { params: Promise<{ referralId: string }> }) {
  const { referralId } = use(params)
  const { data, isLoading } = useSWR("/api/affiliate/referrals", fetcher)

  if (isLoading) return <div className="animate-pulse"><div className="h-64 bg-muted rounded" /></div>

  const referral = data?.data?.find((r: any) => r.id === referralId)
  
  if (!referral) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Referral not found</h2>
        <p className="text-muted-foreground">This referral does not exist or you don't have access to it.</p>
      </div>
    )
  }

  const statusColors: Record<string, string> = {
    CONVERTED: "bg-green-100 text-green-800",
    ACTIVE: "bg-blue-100 text-blue-800",
    IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  }

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/affiliate/portal/dashboard">Dashboard</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href="/affiliate/portal/referrals">Referrals</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>{referralId}</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{referral.name}</h1>
          <p className="text-muted-foreground">{referral.email}</p>
        </div>
        <Badge className={statusColors[referral.status]}>{referral.status}</Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Referral Information</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><p className="text-sm text-muted-foreground">Referral ID</p><p className="font-medium">{referral.id}</p></div>
            <div><p className="text-sm text-muted-foreground">Name</p><p className="font-medium">{referral.name}</p></div>
            <div><p className="text-sm text-muted-foreground">Email</p><p className="font-medium">{referral.email}</p></div>
            <div><p className="text-sm text-muted-foreground">Referred On</p><p className="font-medium flex items-center gap-1"><Calendar className="h-4 w-4" />{new Date(referral.createdAt).toLocaleDateString()}</p></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Commission Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><p className="text-sm text-muted-foreground">Deal Value</p><p className="font-medium flex items-center gap-1"><DollarSign className="h-4 w-4" />${referral.dealValue.toLocaleString()}</p></div>
            <div><p className="text-sm text-muted-foreground">Commission Earned</p><p className="font-medium text-green-600 flex items-center gap-1"><DollarSign className="h-4 w-4" />${referral.commission.toLocaleString()}</p></div>
            {referral.convertedAt && (
              <div><p className="text-sm text-muted-foreground">Converted On</p><p className="font-medium flex items-center gap-1"><CheckCircle className="h-4 w-4" />{new Date(referral.convertedAt).toLocaleDateString()}</p></div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex gap-3 pb-3 border-b">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center"><Calendar className="h-4 w-4 text-blue-600" /></div>
              <div><p className="font-medium">Referral Created</p><p className="text-sm text-muted-foreground">{new Date(referral.createdAt).toLocaleString()}</p></div>
            </div>
            {referral.convertedAt && (
              <div className="flex gap-3 pb-3 border-b">
                <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center"><CheckCircle className="h-4 w-4 text-green-600" /></div>
                <div><p className="font-medium">Deal Converted</p><p className="text-sm text-muted-foreground">{new Date(referral.convertedAt).toLocaleString()}</p></div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
