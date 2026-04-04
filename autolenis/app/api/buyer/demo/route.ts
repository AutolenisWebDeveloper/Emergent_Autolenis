import { NextResponse } from "next/server"
import { isTestWorkspace } from "@/lib/app-mode"
import { getSessionUser } from "@/lib/auth-server"

export const dynamic = "force-dynamic"

export async function GET() {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!isTestWorkspace(user)) {
    return NextResponse.json({ error: "Not available" }, { status: 404 })
  }

  // Demo walkthrough only available in test workspace — delegates to test data
  return NextResponse.json({
    dealId: null,
    history: [],
    message: "Demo walkthrough is only available in test workspace",
  })
}

export async function POST() {
  const user = await getSessionUser()
  if (!user || !isTestWorkspace(user)) {
    return NextResponse.json(
      { error: "Not available" },
      { status: 404 }
    )
  }

  return NextResponse.json({ success: false, error: "Demo actions are not available" }, { status: 400 })
}
