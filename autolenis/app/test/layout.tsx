import type React from "react"

export default function TestLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      {/* TEST workspace banner - only visible under /test/* routes which are gated by middleware */}
      <div className="bg-amber-500 text-white text-center py-2 px-4 text-sm font-semibold">
        ⚠️ TEST WORKSPACE — All data on this page is mock/test data and isolated from production
      </div>
      {children}
    </div>
  )
}
