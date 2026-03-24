"use client"

import AffiliateIncomePlanner from "@/components/affiliate/income-planner"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function IncomeCalculatorPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/affiliate/portal/dashboard">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-[#3d2066]">Income Calculator</h1>
          <p className="text-muted-foreground mt-1">Estimate your earnings or plan your path to your income goals</p>
        </div>
      </div>

      {/* Calculator Component */}
      <AffiliateIncomePlanner />

      {/* Additional Info */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="p-6 rounded-xl border-2 border-[#7ED321]/20 bg-[#7ED321]/5">
          <h3 className="font-semibold text-[#3d2066] mb-2">Direct Referrals (15%)</h3>
          <p className="text-sm text-muted-foreground">
            Your personally referred customers. Highest commission rate for the strongest relationships.
          </p>
        </div>

        <div className="p-6 rounded-xl border-2 border-[#00D9FF]/20 bg-[#00D9FF]/5">
          <h3 className="font-semibold text-[#3d2066] mb-2">2nd Level (3%)</h3>
          <p className="text-sm text-muted-foreground">
            Customers referred by your direct referrals. Passive income from your network's growth.
          </p>
        </div>

        <div className="p-6 rounded-xl border-2 border-[#0066FF]/20 bg-[#0066FF]/5">
          <h3 className="font-semibold text-[#3d2066] mb-2">3rd Level (2%)</h3>
          <p className="text-sm text-muted-foreground">
            Customers from your extended network. Additional passive income layer.
          </p>
        </div>
      </div>
    </div>
  )
}
