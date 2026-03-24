import { NextResponse } from "next/server"

export async function POST(_request: Request, { params: _params }: { params: Promise<{ dealId: string }> }) {
  return NextResponse.json(
    {
      success: false,
      error: "Insurance policy binding is not available. Please upload proof of your existing insurance coverage instead.",
    },
    { status: 410 },
  )
}
