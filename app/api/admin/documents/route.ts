import { type NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { supabase } from "@/lib/db"
import { requireDatabase } from "@/lib/require-database"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dbUnavailable = requireDatabase()
    if (dbUnavailable) return dbUnavailable

    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get("type")
    const status = searchParams.get("status")
    const search = searchParams.get("search")

    let query = supabase
      .from("DealDocument")
      .select("*")
      .order("createdAt", { ascending: false })

    if (type && type !== "all") {
      query = query.eq("type", type)
    }
    if (status && status !== "all") {
      query = query.eq("status", status)
    }
    if (search) {
      query = query.ilike("fileName", `%${search}%`)
    }

    const { data: documents, error } = await query

    if (error) {
      const correlationId = randomUUID()
      console.error("[Admin Documents Error]", { correlationId, error })
      return NextResponse.json({ error: "Failed to load documents", correlationId }, { status: 500 })
    }

    return NextResponse.json({ documents: documents || [] })
  } catch (error) {
    const correlationId = randomUUID()
    console.error("[Admin Documents Error]", { correlationId, error })
    return NextResponse.json({ error: "Internal server error", correlationId }, { status: 500 })
  }
}
