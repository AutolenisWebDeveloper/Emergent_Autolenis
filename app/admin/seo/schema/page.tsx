export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/auth-server"
import Link from "next/link"
import { ArrowLeft, BarChart3 } from "lucide-react"

export default async function SEOSchemaPage() {
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
          <h1 className="text-3xl font-bold">Structured Data</h1>
          <p className="text-muted-foreground">
            Add and validate JSON-LD schema markup for rich search results
          </p>
        </div>
      </div>

      <div className="border rounded-lg p-6 bg-card">
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="w-6 h-6 text-purple-600" />
          <h3 className="font-semibold text-lg">Schema Markup</h3>
        </div>
        <p className="text-muted-foreground">
          No structured data schemas have been configured yet. Add JSON-LD schema markup
          to help search engines understand your content and display rich results.
        </p>
      </div>
    </div>
  )
}
