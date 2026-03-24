import { NextResponse } from "next/server"
import { isTestWorkspace } from "@/lib/app-mode"
import { getSessionUser } from "@/lib/auth-server"
import { mockDb } from "@/lib/mocks/mockStore"

export const dynamic = "force-dynamic"

export async function GET() {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (isTestWorkspace(user)) {
    return NextResponse.json({ flags: mockDb.contractFlags })
  }
  return NextResponse.json({ flags: [] })
}
