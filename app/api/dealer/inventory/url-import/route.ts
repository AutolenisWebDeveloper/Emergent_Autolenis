import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { requireDatabase } from "@/lib/require-database"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || !["DEALER", "DEALER_USER"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dbUnavailable = requireDatabase()
    if (dbUnavailable) return dbUnavailable

    const { url } = await req.json()

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    // Validate URL
    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 })
    }

    // Fetch content from URL
    const response = await fetch(url)

    if (!response.ok) {
      return NextResponse.json({ error: `Failed to fetch from URL: ${response.statusText}` }, { status: 400 })
    }

    const content = await response.text()

    // Create a pseudo-file for processing
    const file = new File([content], url.split("/").pop() || "feed.csv", { type: "text/csv" })

    // Reuse the bulk upload logic
    const formData = new FormData()
    formData.append("file", file)

    // Forward to bulk upload endpoint
    const uploadRequest = new Request(new URL("/api/dealer/inventory/bulk-upload", req.url).toString(), {
      method: "POST",
      body: formData,
    })

    // Add headers from original request
    uploadRequest.headers.set("cookie", req.headers.get("cookie") || "")

    return await fetch(uploadRequest)
  } catch (error) {
    console.error("[URL Import] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
