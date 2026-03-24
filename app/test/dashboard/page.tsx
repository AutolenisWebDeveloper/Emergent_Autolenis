"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Users, Building2, ShieldCheck, UserCircle, ArrowRight } from "lucide-react"

export default function TestDashboardPage() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Test Workspace Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Browse mock pages and seeded data across all dashboard roles
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/test/buyer" className="block">
          <Card className="hover:border-[#0066FF] transition-colors h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCircle className="h-5 w-5 text-[#0066FF]" />
                Buyer Dashboard
              </CardTitle>
              <CardDescription>
                View the golden deal walkthrough from the buyer perspective
              </CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-sm text-[#0066FF] flex items-center gap-1">
                Open <ArrowRight className="h-4 w-4" />
              </span>
            </CardContent>
          </Card>
        </Link>

        <Link href="/test/dealer" className="block">
          <Card className="hover:border-[#7ED321] transition-colors h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-[#7ED321]" />
                Dealer Dashboard
              </CardTitle>
              <CardDescription>
                View dealer stats, inventory, and deals from the test dealer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-sm text-[#7ED321] flex items-center gap-1">
                Open <ArrowRight className="h-4 w-4" />
              </span>
            </CardContent>
          </Card>
        </Link>

        <Link href="/test/admin" className="block">
          <Card className="hover:border-[#2D1B69] transition-colors h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-[#2D1B69]" />
                Admin Dashboard
              </CardTitle>
              <CardDescription>
                View platform metrics and golden deal detail from admin
              </CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-sm text-[#2D1B69] flex items-center gap-1">
                Open <ArrowRight className="h-4 w-4" />
              </span>
            </CardContent>
          </Card>
        </Link>

        <Link href="/test/affiliate" className="block">
          <Card className="hover:border-purple-500 transition-colors h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-500" />
                Affiliate Dashboard
              </CardTitle>
              <CardDescription>
                View affiliate referrals, commissions, and payout data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-sm text-purple-500 flex items-center gap-1">
                Open <ArrowRight className="h-4 w-4" />
              </span>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
