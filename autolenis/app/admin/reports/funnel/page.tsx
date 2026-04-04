"use client"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"


const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function FunnelReportPage() {
  const { data, isLoading } = useSWR("/api/admin/reports/funnel", fetcher)

  if (isLoading) return <div className="animate-pulse"><div className="h-96 bg-muted rounded" /></div>

  const report = data?.data || { stages: [], conversionRates: {} }

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/admin/dashboard">Dashboard</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href="/admin/reports">Reports</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>Funnel</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <h1 className="text-3xl font-bold">Buyer Funnel Analysis</h1>

      <Card>
        <CardHeader><CardTitle>Conversion Funnel</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {report.stages?.map((stage: any, i: number) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{stage.stage}</p>
                  <p className="text-sm text-muted-foreground">{stage.percentage}%</p>
                </div>
                <div className="h-8 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-[#0066FF]" style={{ width: `${stage.percentage}%` }} />
                </div>
                <p className="text-sm text-muted-foreground">{stage.count.toLocaleString()} users</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
