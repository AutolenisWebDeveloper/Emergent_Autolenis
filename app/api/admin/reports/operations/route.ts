import { NextResponse } from "next/server"
import { isTestWorkspace } from "@/lib/app-mode"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { mockSelectors } from "@/lib/mocks/mockStore"

export async function GET() {
  const user = await getSessionUser()
  if (!user || !isAdminRole(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (isTestWorkspace(user)) {
    return NextResponse.json({ success: true, data: mockSelectors.operationsReport() })
  }

  return NextResponse.json({ success: true, data: { summary: {}, lifecycle: [] } })
}
