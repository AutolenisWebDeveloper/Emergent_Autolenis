export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/auth-server"
import Link from "next/link"
import { ArrowLeft, Shield, CheckCircle, AlertTriangle, XCircle } from "lucide-react"

export default async function SEOHealthPage() {
  const user = await getSessionUser()

  if (!user || user.role !== "ADMIN") {
    redirect("/auth/signin")
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/seo" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold">SEO Health</h1>
          <p className="text-muted-foreground">
            Monitor page scores, identify issues, and track improvements
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="border rounded-lg p-6 bg-card">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <h3 className="font-semibold">Healthy Pages</h3>
          </div>
          <p className="text-3xl font-bold text-green-600">—</p>
          <p className="text-sm text-muted-foreground mt-1">All checks passing</p>
        </div>

        <div className="border rounded-lg p-6 bg-card">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-6 h-6 text-yellow-600" />
            <h3 className="font-semibold">Warnings</h3>
          </div>
          <p className="text-3xl font-bold text-yellow-600">—</p>
          <p className="text-sm text-muted-foreground mt-1">Minor issues detected</p>
        </div>

        <div className="border rounded-lg p-6 bg-card">
          <div className="flex items-center gap-3 mb-2">
            <XCircle className="w-6 h-6 text-red-600" />
            <h3 className="font-semibold">Errors</h3>
          </div>
          <p className="text-3xl font-bold text-red-600">—</p>
          <p className="text-sm text-muted-foreground mt-1">Critical issues to fix</p>
        </div>
      </div>

      <div className="border rounded-lg p-6 bg-card">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-6 h-6 text-primary" />
          <h3 className="font-semibold text-lg">Health Check Results</h3>
        </div>
        <p className="text-muted-foreground">
          SEO health monitoring data will appear here once pages have been audited.
          Run the audit from the SEO dashboard to generate health scores.
        </p>
      </div>
    </div>
  )
}
