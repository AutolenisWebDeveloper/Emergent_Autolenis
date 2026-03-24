"use client"

import { useState } from "react"
import { CheckCircle2, XCircle, Loader2, RefreshCw, Globe } from "lucide-react"
import { csrfHeaders } from "@/lib/csrf-client"

interface PageAudit {
  path: string
  name: string
  title: string | null
  description: string | null
  ogImage: string | null
  noindex: boolean
  h1Count: number
  imgTotal: number
  imgWithAlt: number
  internalLinks: number
  brokenLinks: string[]
  pass: boolean
  issues: string[]
}

interface AuditReport {
  generatedAt: string
  baseUrl: string
  pages: PageAudit[]
  summary: {
    total: number
    passing: number
    failing: number
    missingTitle: number
    missingDescription: number
    missingOgImage: number
    noindexPages: number
    brokenLinksTotal: number
  }
}

export function SEOAuditDashboard() {
  const [report, setReport] = useState<AuditReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sitemapOk, setSitemapOk] = useState<boolean | null>(null)
  const [selected, setSelected] = useState<PageAudit | null>(null)

  async function runAudit() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/seo/audit", { method: "POST", headers: csrfHeaders() })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: AuditReport = await res.json()
      setReport(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  async function testSitemap() {
    try {
      const res = await fetch("/sitemap.xml")
      setSitemapOk(res.ok && res.headers.get("content-type")?.includes("xml") === true)
    } catch {
      setSitemapOk(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-semibold">Live SEO Audit</h2>
        <button
          onClick={runAudit}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {loading ? "Running…" : "Run SEO Audit Now"}
        </button>
        <button
          onClick={testSitemap}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md border text-sm font-medium hover:bg-accent"
        >
          <Globe className="w-4 h-4" />
          Test Sitemap
        </button>
        {sitemapOk !== null && (
          <span className={`text-sm font-medium ${sitemapOk ? "text-green-600" : "text-red-600"}`}>
            Sitemap: {sitemapOk ? "OK ✓" : "FAIL ✗"}
          </span>
        )}
      </div>

      {error && <p className="text-red-600 text-sm">Error: {error}</p>}

      {report && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            <SummaryCard label="Pages Scanned" value={report.summary.total} />
            <SummaryCard label="Passing" value={report.summary.passing} className="text-green-600" />
            <SummaryCard label="Failing" value={report.summary.failing} className="text-red-600" />
            <SummaryCard label="Missing Title" value={report.summary.missingTitle} className="text-orange-600" />
            <SummaryCard label="Missing Description" value={report.summary.missingDescription} className="text-orange-600" />
            <SummaryCard label="Missing OG Image" value={report.summary.missingOgImage} className="text-orange-600" />
            <SummaryCard label="Noindex Pages" value={report.summary.noindexPages} />
            <SummaryCard label="Broken Links" value={report.summary.brokenLinksTotal} className="text-red-600" />
          </div>

          {/* Pages table */}
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Page</th>
                  <th className="py-2 pr-4">Path</th>
                  <th className="py-2 pr-4">Issues</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {report.pages.map((page) => (
                  <tr key={page.path} className="border-b hover:bg-accent/50">
                    <td className="py-2 pr-4">
                      {page.pass ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                    </td>
                    <td className="py-2 pr-4 font-medium">{page.name}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{page.path}</td>
                    <td className="py-2 pr-4">{page.issues.length}</td>
                    <td className="py-2">
                      <button
                        onClick={() => setSelected(page)}
                        className="text-primary text-xs hover:underline"
                      >
                        View details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-muted-foreground">
            Generated: {new Date(report.generatedAt).toLocaleString()}
          </p>
        </>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSelected(null)}>
          <div
            className="bg-background border rounded-lg p-6 w-full max-w-lg max-h-[85vh] overflow-auto mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{selected.name}</h3>
              <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <dl className="space-y-2 text-sm">
              <DetailRow label="Path" value={selected.path} />
              <DetailRow label="Title" value={selected.title || "—"} warn={!selected.title} />
              <DetailRow label="Description" value={selected.description || "—"} warn={!selected.description} />
              <DetailRow label="OG Image" value={selected.ogImage || "—"} warn={!selected.ogImage} />
              <DetailRow label="H1 Count" value={String(selected.h1Count)} warn={selected.h1Count !== 1} />
              <DetailRow label="Images" value={`${selected.imgWithAlt}/${selected.imgTotal} with alt`} />
              <DetailRow label="Internal Links" value={String(selected.internalLinks)} />
              <DetailRow label="Noindex" value={selected.noindex ? "Yes" : "No"} warn={selected.noindex} />
            </dl>
            {selected.issues.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">Issues</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-red-600">
                  {selected.issues.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div className="border rounded-lg p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold ${className || ""}`}>{value}</p>
    </div>
  )
}

function DetailRow({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex gap-2">
      <dt className="font-medium w-28 shrink-0">{label}</dt>
      <dd className={`break-all ${warn ? "text-orange-600" : "text-muted-foreground"}`}>{value}</dd>
    </div>
  )
}
