import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { prequalSessionService } from "@/lib/services/prequal-session.service"
import { encryptSsn } from "@/lib/prequal/encryption"

// POST /api/buyer/prequal/session/run - Run provider-backed prequalification
export async function POST(request: Request) {
  try {
    const session = await requireAuth(["BUYER"])
    const body = await request.json()

    if (!body.sessionId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "sessionId is required" } },
        { status: 400 },
      )
    }

    // Validate required profile fields
    const requiredFields = ["firstName", "lastName", "dateOfBirth", "addressLine1", "city", "state", "postalCode", "monthlyIncomeCents", "monthlyHousingCents"]
    const missing = requiredFields.filter((f) => !body[f] && body[f] !== 0)

    if (missing.length > 0) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: `Missing required fields: ${missing.join(", ")}` } },
        { status: 400 },
      )
    }

    // Handle SSN: accept raw SSN and encrypt server-side, or accept pre-encrypted
    let ssnEncrypted: string | undefined = body.ssnEncrypted
    if (!ssnEncrypted && body.ssn) {
      try {
        ssnEncrypted = encryptSsn(body.ssn)
      } catch {
        return NextResponse.json(
          { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid SSN format. Must be 9 digits." } },
          { status: 400 },
        )
      }
    }

    const result = await prequalSessionService.runPrequal(
      body.sessionId,
      session.userId,
      {
        firstName: body.firstName,
        lastName: body.lastName,
        dateOfBirth: body.dateOfBirth,
        addressLine1: body.addressLine1,
        city: body.city,
        state: body.state,
        postalCode: body.postalCode,
        ssnLast4: body.ssnLast4 || (body.ssn ? body.ssn.slice(-4) : undefined),
        ssnEncrypted,
        phone: body.phone,
        employerName: body.employerName,
        monthlyIncomeCents: body.monthlyIncomeCents,
        monthlyHousingCents: body.monthlyHousingCents,
      },
      session.workspace_mode,
    )

    return NextResponse.json({ success: true, data: { prequalResult: result } })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error"

    if (message.includes("not found")) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Session not found" } },
        { status: 404 },
      )
    }

    if (message.includes("consent must be captured")) {
      return NextResponse.json(
        { success: false, error: { code: "CONSENT_REQUIRED", message } },
        { status: 400 },
      )
    }

    if (message.includes("Forwarding authorization")) {
      return NextResponse.json(
        { success: false, error: { code: "AUTHORIZATION_REQUIRED", message } },
        { status: 400 },
      )
    }

    if (message.includes("COMPLIANCE_VIOLATION")) {
      return NextResponse.json(
        { success: false, error: { code: "COMPLIANCE_VIOLATION", message } },
        { status: 403 },
      )
    }

    if (message.includes("Debt-to-income") || message.includes("threshold")) {
      return NextResponse.json(
        { success: false, error: { code: "SCORING_FAILURE", message } },
        { status: 422 },
      )
    }

    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json(
      { success: false, error: { code: status === 401 ? "UNAUTHENTICATED" : "INTERNAL_ERROR", message: status === 401 ? "Unauthorized" : "Failed to run prequalification" } },
      { status },
    )
  }
}
