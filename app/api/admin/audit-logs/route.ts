import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

const ENTITY_TYPE_MAP: Record<string, string> = {
  LOGIN: "AUTH",
  LOGOUT: "AUTH",
  LOGIN_FAILED: "AUTH",
  CREATE: "SYSTEM",
  UPDATE: "SYSTEM",
  DELETE: "SYSTEM",
  APPROVE: "DEALER",
  REJECT: "DEALER",
  REFUND: "PAYMENT",
  PAYOUT: "PAYMENT",
  EXPORT: "REPORT",
  VIEW: "SYSTEM",
}

function resolveEntityType(action: string): string {
  return ENTITY_TYPE_MAP[action] || action.split("_")[0] || "SYSTEM"
}

export async function GET(request: NextRequest) {
  const user = await getSessionUser()
  if (!user || !isAdminRole(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action")
    const search = searchParams.get("search")
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)))

    const where: any = {}

    if (action) {
      where.action = action
    }

    if (search) {
      where.action = { contains: search }
    }

    const [logs, total] = await Promise.all([
      prisma.adminAuditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.adminAuditLog.count({ where }),
    ])

    return NextResponse.json({
      logs: logs.map((log: any) => ({
        id: log.id,
        action: log.action,
        entityType: resolveEntityType(log.action),
        userId: log.userId,
        adminId: log.userId,
        details: log.details,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        createdAt: log.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Failed to fetch audit logs:", error)
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    )
  }
}
