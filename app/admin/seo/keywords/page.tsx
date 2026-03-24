export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/auth-server"
import Link from "next/link"
import { ArrowLeft, Search, Plus } from "lucide-react"

export default async function SEOKeywordsPage() {
  const user = await getSessionUser()

  if (!user || user.role !== "ADMIN") {
    redirect("/auth/signin")
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/seo" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Keywords</h1>
            <p className="text-muted-foreground">
              Set target keywords and monitor usage across pages
            </p>
          </div>
        </div>
      </div>

      <div className="border rounded-lg p-6 bg-card">
        <div className="flex items-center gap-3 mb-4">
          <Search className="w-6 h-6 text-blue-600" />
          <h3 className="font-semibold text-lg">Keyword Tracking</h3>
        </div>
        <p className="text-muted-foreground">
          No keywords have been configured yet. Add target keywords to track their usage
          across your site&apos;s pages and monitor SEO performance.
        </p>
      </div>
    </div>
  )
}
