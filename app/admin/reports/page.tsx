"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TrendingUp, DollarSign, BarChart3 } from "lucide-react"
import Link from "next/link"

export default function AdminReportsPage() {
  const reports = [
    { title: "Financial Reports", description: "Revenue, fees, and payment analytics", href: "/admin/reports/finance", icon: DollarSign, color: "bg-green-100 text-green-800" },
    { title: "Buyer Funnel", description: "Conversion rates and drop-off analysis", href: "/admin/reports/funnel", icon: TrendingUp, color: "bg-blue-100 text-blue-800" },
    { title: "Operations Report", description: "Deal lifecycle and operational health", href: "/admin/reports/operations", icon: BarChart3, color: "bg-purple-100 text-purple-800" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-muted-foreground">Analytics and insights dashboard</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => {
          const Icon = report.icon
          return (
            <Card key={report.href} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className={`w-12 h-12 rounded-lg ${report.color} flex items-center justify-center mb-2`}>
                  <Icon className="h-6 w-6" />
                </div>
                <CardTitle>{report.title}</CardTitle>
                <CardDescription>{report.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" asChild>
                  <Link href={report.href}>View Report</Link>
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
