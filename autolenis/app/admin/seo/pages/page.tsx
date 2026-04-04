"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Edit, ExternalLink } from "lucide-react"

interface SEOPage {
  pageKey: string
  title: string | null
  description: string | null
  indexable: boolean
  updatedAt: string
}

export default function SEOPagesPage() {
  const [pages, setPages] = useState<SEOPage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/seo/pages")
      .then((res) => res.json())
      .then((data) => {
        setPages(data.pages || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="p-6">Loading...</div>
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Page Metadata</h1>
          <p className="text-muted-foreground">Manage SEO metadata for all public pages</p>
        </div>
        <Link href="/admin/seo" className="px-4 py-2 rounded-lg border hover:bg-accent">
          ← Back to SEO
        </Link>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-4 font-semibold">Page</th>
                <th className="text-left p-4 font-semibold">Title</th>
                <th className="text-left p-4 font-semibold">Status</th>
                <th className="text-right p-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => (
                <tr key={page.pageKey} className="border-t hover:bg-muted/50">
                  <td className="p-4">
                    <div className="font-medium capitalize">{page.pageKey}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm truncate max-w-md">{page.title || "No title set"}</div>
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        page.indexable ? "bg-green-100 text-green-700" : "bg-muted text-gray-700"
                      }`}
                    >
                      {page.indexable ? "Indexable" : "No Index"}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/seo/pages/${page.pageKey}`}
                        className="p-2 hover:bg-accent rounded"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      <Link
                        href={`/${page.pageKey === "home" ? "" : page.pageKey}`}
                        target="_blank"
                        className="p-2 hover:bg-accent rounded"
                        title="View Page"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
