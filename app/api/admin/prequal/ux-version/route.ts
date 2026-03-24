import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { prisma } from "@/lib/db"
import { z } from "zod"

export const dynamic = "force-dynamic"

// GET /api/admin/prequal/ux-version — List consent UX versions
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const activeOnly = searchParams.get("activeOnly") === "true"

    // If activeOnly, filter to versions that haven't been retired
    const where = activeOnly
      ? { retiredAt: null }
      : {}

    const versions = await prisma.prequalConsentVersion.findMany({
      where,
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      success: true,
      data: { versions },
    })
  } catch (error) {
    console.error("[Admin UX Version] GET Error:", error)
    return NextResponse.json({ error: "Failed to load UX versions" }, { status: 500 })
  }
}

const uxVersionSchema = z.object({
  version: z.string().min(1, "Version identifier is required"),
  bodyText: z.string().min(10, "Consent body text is required"),
  effectiveAt: z.string().optional(),
})

// POST /api/admin/prequal/ux-version — Create a new consent UX version
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = uxVersionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message || "Invalid input" } },
        { status: 400 },
      )
    }

    const { version, bodyText, effectiveAt } = parsed.data

    const consentVersion = await prisma.prequalConsentVersion.create({
      data: {
        version,
        bodyText,
        effectiveAt: effectiveAt ? new Date(effectiveAt) : new Date(),
        createdBy: user.userId,
        createdAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      data: { consentVersion },
    })
  } catch (error) {
    console.error("[Admin UX Version] POST Error:", error)
    return NextResponse.json({ error: "Failed to create UX version" }, { status: 500 })
  }
}
