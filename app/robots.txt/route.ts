import { NextResponse } from "next/server"
import { seoService } from "@/lib/services/seo.service"

export async function GET() {
  try {
    const robotsTxt = seoService.generateRobotsTxt()

    return new NextResponse(robotsTxt, {
      headers: {
        "Content-Type": "text/plain",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    })
  } catch (error) {
    // Return a safe fallback — never 500
    console.warn("[SEO] Unexpected error in robots.txt route:", error)
    const fallback = "User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\n"
    return new NextResponse(fallback, {
      headers: {
        "Content-Type": "text/plain",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    })
  }
}
