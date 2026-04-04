export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/auth-server"
import Link from "next/link"
import { ArrowRight, BarChart3, FileText, Search, Shield } from "lucide-react"
import { SEOAuditDashboard } from "./audit-dashboard"

export default async function SEOPage() {
  const user = await getSessionUser()

  if (!user || user.role !== "ADMIN") {
    redirect("/auth/signin")
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">SEO & Content Manager</h1>
        <p className="text-muted-foreground">
          Manage metadata, structured data, and monitor SEO health across the entire site.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <Link href="/admin/seo/pages" className="block p-6 rounded-lg border bg-card hover:shadow-lg transition-shadow">
          <FileText className="w-8 h-8 text-primary mb-3" />
          <h3 className="font-semibold mb-2">Page Metadata</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Edit titles, descriptions, and Open Graph tags for all pages
          </p>
          <span className="text-sm text-primary flex items-center gap-1">
            Manage Pages <ArrowRight className="w-4 h-4" />
          </span>
        </Link>

        <Link
          href="/admin/seo/health"
          className="block p-6 rounded-lg border bg-card hover:shadow-lg transition-shadow"
        >
          <Shield className="w-8 h-8 text-green-600 mb-3" />
          <h3 className="font-semibold mb-2">SEO Health</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Monitor page scores, identify issues, and track improvements
          </p>
          <span className="text-sm text-primary flex items-center gap-1">
            View Dashboard <ArrowRight className="w-4 h-4" />
          </span>
        </Link>

        <Link
          href="/admin/seo/keywords"
          className="block p-6 rounded-lg border bg-card hover:shadow-lg transition-shadow"
        >
          <Search className="w-8 h-8 text-blue-600 mb-3" />
          <h3 className="font-semibold mb-2">Keywords</h3>
          <p className="text-sm text-muted-foreground mb-3">Set target keywords and monitor usage across pages</p>
          <span className="text-sm text-primary flex items-center gap-1">
            Manage Keywords <ArrowRight className="w-4 h-4" />
          </span>
        </Link>

        <Link
          href="/admin/seo/schema"
          className="block p-6 rounded-lg border bg-card hover:shadow-lg transition-shadow"
        >
          <BarChart3 className="w-8 h-8 text-purple-600 mb-3" />
          <h3 className="font-semibold mb-2">Structured Data</h3>
          <p className="text-sm text-muted-foreground mb-3">Add and validate JSON-LD schema for rich results</p>
          <span className="text-sm text-primary flex items-center gap-1">
            Edit Schema <ArrowRight className="w-4 h-4" />
          </span>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div className="border rounded-lg p-6">
          <h3 className="font-semibold mb-4">Technical SEO Tools</h3>
          <div className="space-y-3">
            <Link href="/sitemap.xml" target="_blank" className="block text-sm text-blue-600 hover:underline">
              → View Sitemap
            </Link>
            <Link href="/robots.txt" target="_blank" className="block text-sm text-blue-600 hover:underline">
              → View Robots.txt
            </Link>
          </div>
        </div>

        <div className="border rounded-lg p-6">
          <h3 className="font-semibold mb-4">Quick Stats</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Pages</span>
              <span className="font-semibold">6</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Avg SEO Score</span>
              <span className="font-semibold text-green-600">85</span>
            </div>
          </div>
        </div>
      </div>

      {/* Live SEO Audit Section */}
      <SEOAuditDashboard />
    </div>
  )
}
