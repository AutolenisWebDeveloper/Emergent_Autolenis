import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { ADMIN_ROLES } from "@/lib/authz/roles"
import { consentArtifactService } from "@/lib/services/prequal/consent-artifact.service"
import { z } from "zod"

export const dynamic = "force-dynamic"

const createVersionSchema = z.object({
  version: z.string().min(1),
  label: z.string().min(1),
  bodyText: z.string().min(1),
  effectiveAt: z.string().datetime(),
})

// GET /api/admin/compliance/consent-versions
// Lists all consent versions (UX version registry)
export async function GET() {
  const correlationId = crypto.randomUUID()

  try {
    await requireAuth([...ADMIN_ROLES])

    const versions = await consentArtifactService.listConsentVersions()

    return NextResponse.json({
      success: true,
      data: { versions },
      correlationId,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : ""
    if (message === "Unauthorized") {
      return NextResponse.json(
        { error: { code: "UNAUTHENTICATED", message: "Authentication required" }, correlationId },
        { status: 401 },
      )
    }
    if (message === "Forbidden") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Insufficient permissions" }, correlationId },
        { status: 403 },
      )
    }
    return NextResponse.json(
      {
        error: { code: "INTERNAL_ERROR", message: "Failed to retrieve consent versions" },
        correlationId,
      },
      { status: 500 },
    )
  }
}

// POST /api/admin/compliance/consent-versions
// Creates a new consent version
export async function POST(request: Request) {
  const correlationId = crypto.randomUUID()

  try {
    await requireAuth([...ADMIN_ROLES])

    const body = await request.json()
    const parsed = createVersionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues.map((i) => i.message).join(", "),
          },
          correlationId,
        },
        { status: 400 },
      )
    }

    const version = await consentArtifactService.createConsentVersion({
      version: parsed.data.version,
      label: parsed.data.label,
      bodyText: parsed.data.bodyText,
      effectiveAt: new Date(parsed.data.effectiveAt),
    })

    return NextResponse.json({
      success: true,
      data: { version },
      correlationId,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : ""
    if (message === "Unauthorized") {
      return NextResponse.json(
        { error: { code: "UNAUTHENTICATED", message: "Authentication required" }, correlationId },
        { status: 401 },
      )
    }
    if (message === "Forbidden") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Insufficient permissions" }, correlationId },
        { status: 403 },
      )
    }
    return NextResponse.json(
      {
        error: { code: "INTERNAL_ERROR", message: "Failed to create consent version" },
        correlationId,
      },
      { status: 500 },
    )
  }
}
