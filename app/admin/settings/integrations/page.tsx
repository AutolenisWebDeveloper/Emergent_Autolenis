"use client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { CheckCircle, XCircle, Settings2 } from "lucide-react"

export default function IntegrationsPage() {
  const integrations = [
    { name: "Stripe", description: "Payment processing", status: "connected", icon: "💳" },
    { name: "Resend", description: "Email delivery", status: "connected", icon: "📧" },
    { name: "Supabase", description: "Database & Auth", status: "connected", icon: "🗄️" },
    { name: "DocuSign", description: "E-signatures", status: "disconnected", icon: "✍️" },
  ]

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/admin/dashboard">Dashboard</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href="/admin/settings">Settings</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>Integrations</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <h1 className="text-3xl font-bold">Integrations</h1>

      <div className="grid gap-4 md:grid-cols-2">
        {integrations.map((integration) => (
          <Card key={integration.name}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{integration.icon}</div>
                  <div>
                    <CardTitle>{integration.name}</CardTitle>
                    <CardDescription>{integration.description}</CardDescription>
                  </div>
                </div>
                {integration.status === "connected" ? (
                  <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Connected</Badge>
                ) : (
                  <Badge variant="outline"><XCircle className="h-3 w-3 mr-1" />Disconnected</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" className="w-full">
                <Settings2 className="h-4 w-4 mr-2" />Configure
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
