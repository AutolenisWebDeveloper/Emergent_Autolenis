import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      )
    }

    if (user.role !== "BUYER") {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      )
    }

    // Fee options require a deal context — return empty options for now
    return NextResponse.json({
      success: true,
      data: { options: [] },
    })
  } catch (error: any) {
    console.error("[buyer/fee-options] Error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch fee options" },
      { status: 500 },
    )
  }
}
