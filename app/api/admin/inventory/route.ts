import { type NextRequest, NextResponse } from "next/server"
import { requireAuth, isAdminRole } from "@/lib/auth-server"
import { InventoryService } from "@/lib/services/inventory.service"

export const dynamic = "force-dynamic"

// GET /api/admin/inventory - Admin inventory oversight
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth()
    if (!isAdminRole(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)

    const filters = {
      dealerId: searchParams.get("dealerId") || undefined,
      status: searchParams.get("status") || undefined,
      makes: searchParams.get("makes")?.split(",").filter(Boolean),
      models: searchParams.get("models")?.split(",").filter(Boolean),
      minYear: searchParams.get("minYear") ? Number.parseInt(searchParams.get("minYear")!, 10) : undefined,
      maxYear: searchParams.get("maxYear") ? Number.parseInt(searchParams.get("maxYear")!, 10) : undefined,
      search: searchParams.get("search") || undefined,
      page: searchParams.get("page") ? Number.parseInt(searchParams.get("page")!, 10) : 1,
      pageSize: searchParams.get("pageSize") ? Number.parseInt(searchParams.get("pageSize")!, 10) : 50,
      sortBy: searchParams.get("sortBy") as any,
    }

    const result = await InventoryService.search(filters)

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error: any) {
    console.error("[v0] Admin inventory error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
