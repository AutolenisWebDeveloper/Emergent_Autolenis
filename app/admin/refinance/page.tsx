"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, CheckCircle, ExternalLink, DollarSign, TrendingUp, Calendar, Loader2, Shield } from "lucide-react"
import useSWR, { mutate } from "swr"
import Link from "next/link"
import { csrfHeaders } from "@/lib/csrf-client"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

// Reason code to human-readable labels
const reasonLabels: Record<string, string> = {
  lender_vehicle_too_old: "Vehicle too old",
  lender_mileage_too_high: "Mileage too high",
  lender_income_too_low: "Income too low",
  lender_state_not_allowed: "State not eligible",
  internal_loan_balance_too_low: "Loan balance too low",
  internal_vehicle_condition_poor: "Poor condition",
}

export default function AdminRefinancePage() {
  const [activeTab, setActiveTab] = useState("overview")
  const [dateRange, setDateRange] = useState({ start: "", end: "" })
  const [filters, setFilters] = useState({
    status: "",
    funded: "",
    state: "",
  })
  const [fundDialog, setFundDialog] = useState<{ open: boolean; leadId: string | null }>({
    open: false,
    leadId: null,
  })
  const [fundForm, setFundForm] = useState({
    fundedAt: "",
    fundedAmount: "",
    rawPartnerReference: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Build query strings
  const statsQuery = dateRange.start || dateRange.end ? `?startDate=${dateRange.start}&endDate=${dateRange.end}` : ""

  const leadsQuery = new URLSearchParams()
  if (filters.status) leadsQuery.set("status", filters.status)
  if (filters.funded) leadsQuery.set("funded", filters.funded)
  if (filters.state) leadsQuery.set("state", filters.state)
  if (dateRange.start) leadsQuery.set("startDate", dateRange.start)
  if (dateRange.end) leadsQuery.set("endDate", dateRange.end)

  const { data: stats, isLoading: statsLoading } = useSWR(`/api/admin/refinance/stats${statsQuery}`, fetcher, {
    refreshInterval: 30000,
  })

  const { data: leadsData, isLoading: leadsLoading } = useSWR(
    `/api/admin/refinance/leads?${leadsQuery.toString()}`,
    fetcher,
  )

  const { data: fundedData, isLoading: fundedLoading } = useSWR(
    `/api/admin/refinance/funded-loans${statsQuery}`,
    fetcher,
  )

  const { data: complianceData, isLoading: complianceLoading } = useSWR(`/api/admin/refinance/compliance`, fetcher)

  const handleMarkAsFunded = async () => {
    if (!fundDialog.leadId || !fundForm.fundedAt || !fundForm.fundedAmount) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/admin/refinance/leads/${fundDialog.leadId}/fund`, {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify(fundForm),
      })

      if (response.ok) {
        // Refresh data
        mutate(`/api/admin/refinance/stats${statsQuery}`)
        mutate(`/api/admin/refinance/leads?${leadsQuery.toString()}`)
        mutate(`/api/admin/refinance/funded-loans${statsQuery}`)
        mutate(`/api/admin/refinance/compliance`)
        setFundDialog({ open: false, leadId: null })
        setFundForm({ fundedAt: "", fundedAmount: "", rawPartnerReference: "" })
      }
    } catch (error) {
      console.error("Failed to mark as funded:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Refinance</h1>
          <p className="text-muted-foreground">OpenRoad partnership lead management</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <Input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
              className="w-40"
            />
            <span className="text-muted-foreground">to</span>
            <Input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
              className="w-40"
            />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Link href="/admin/refinance/leads">
          <Card className="border-l-4 border-l-primary hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Leads</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsLoading ? "..." : stats?.totalLeads || 0}</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/refinance/qualified">
          <Card className="border-l-4 border-l-[#7ED321] hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Qualified</CardTitle>
              <CheckCircle className="h-4 w-4 text-[#7ED321]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsLoading ? "..." : stats?.qualifiedLeads || 0}</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/refinance/redirected">
          <Card className="border-l-4 border-l-[#00D9FF] hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Redirected</CardTitle>
              <ExternalLink className="h-4 w-4 text-[#00D9FF]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsLoading ? "..." : stats?.redirectedLeads || 0}</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/refinance/funded">
          <Card className="border-l-4 border-l-green-500 hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Funded</CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsLoading ? "..." : stats?.fundedLeads || 0}</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/refinance/analytics">
          <Card className="border-l-4 border-l-purple-500 hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Funding Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsLoading ? "..." : `${stats?.fundingRate || 0}%`}</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/refinance/revenue">
          <Card className="border-l-4 border-l-yellow-500 hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsLoading ? "..." : formatCurrency(stats?.totalRevenue || 0)}</div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">All Leads</TabsTrigger>
          <TabsTrigger value="funded">Funded Loans</TabsTrigger>
          <TabsTrigger value="compliance">Non-Solicitation</TabsTrigger>
        </TabsList>

        {/* All Leads Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4">
                <Select
                  value={filters.status}
                  onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="QUALIFIED">Qualified</SelectItem>
                    <SelectItem value="DISQUALIFIED">Disqualified</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={filters.funded}
                  onValueChange={(value) => setFilters((prev) => ({ ...prev, funded: value }))}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Funded Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="true">Funded</SelectItem>
                    <SelectItem value="false">Not Funded</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  placeholder="State (e.g., CA)"
                  value={filters.state}
                  onChange={(e) => setFilters((prev) => ({ ...prev, state: e.target.value.toUpperCase() }))}
                  className="w-32"
                />

                <Button variant="outline" onClick={() => setFilters({ status: "", funded: "", state: "" })}>
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Leads Table */}
          <Card>
            <CardContent className="pt-6">
              {leadsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : leadsData?.leads?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2">Date</th>
                        <th className="text-left py-3 px-2">Lead ID</th>
                        <th className="text-left py-3 px-2">Name</th>
                        <th className="text-left py-3 px-2">Contact</th>
                        <th className="text-left py-3 px-2">State</th>
                        <th className="text-left py-3 px-2">Vehicle</th>
                        <th className="text-left py-3 px-2">Loan</th>
                        <th className="text-left py-3 px-2">Status</th>
                        <th className="text-left py-3 px-2">Reasons</th>
                        <th className="text-left py-3 px-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leadsData.leads.map((lead: any) => (
                        <tr key={lead.id} className="border-b hover:bg-accent">
                          <td className="py-3 px-2 text-muted-foreground">{formatDate(lead.createdAt)}</td>
                          <td className="py-3 px-2 font-mono text-xs">{lead.id.slice(0, 8)}...</td>
                          <td className="py-3 px-2">
                            {lead.firstName} {lead.lastName}
                          </td>
                          <td className="py-3 px-2">
                            <div>{lead.email}</div>
                            <div className="text-muted-foreground">{lead.phone}</div>
                          </td>
                          <td className="py-3 px-2">{lead.state}</td>
                          <td className="py-3 px-2">
                            <div>
                              {lead.vehicleYear} {lead.vehicleMake} {lead.vehicleModel}
                            </div>
                            <div className="text-muted-foreground">{lead.mileage.toLocaleString()} mi</div>
                          </td>
                          <td className="py-3 px-2">{formatCurrency(lead.loanBalance)}</td>
                          <td className="py-3 px-2">
                            <Badge
                              variant={
                                lead.qualificationStatus === "QUALIFIED"
                                  ? "default"
                                  : lead.qualificationStatus === "DISQUALIFIED"
                                    ? "destructive"
                                    : "secondary"
                              }
                            >
                              {lead.qualificationStatus}
                            </Badge>
                            {lead.openroadFunded && (
                              <Badge variant="outline" className="ml-1 border-green-500 text-green-600">
                                Funded
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex flex-wrap gap-1">
                              {(lead.qualificationReasons as string[])?.map((reason: string) => (
                                <Badge key={reason} variant="outline" className="text-xs">
                                  {reasonLabels[reason] || reason}
                                </Badge>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            {!lead.openroadFunded && lead.qualificationStatus === "QUALIFIED" && (
                              <Button size="sm" onClick={() => setFundDialog({ open: true, leadId: lead.id })}>
                                Mark Funded
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">No refinance leads found</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Funded Loans Tab */}
        <TabsContent value="funded" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Funded Loans & Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              {fundedLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : fundedData?.fundedLoans?.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-2">Funded Date</th>
                          <th className="text-left py-3 px-2">Lead ID</th>
                          <th className="text-left py-3 px-2">Name</th>
                          <th className="text-left py-3 px-2">Vehicle</th>
                          <th className="text-right py-3 px-2">Funded Amount</th>
                          <th className="text-right py-3 px-2">Commission</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fundedData.fundedLoans.map((loan: any) => (
                          <tr key={loan.id} className="border-b hover:bg-accent">
                            <td className="py-3 px-2">{formatDate(loan.fundedAt)}</td>
                            <td className="py-3 px-2 font-mono text-xs">{loan.leadId.slice(0, 8)}...</td>
                            <td className="py-3 px-2">
                              {loan.lead?.firstName} {loan.lead?.lastName}
                            </td>
                            <td className="py-3 px-2">
                              {loan.lead?.vehicleYear} {loan.lead?.vehicleMake} {loan.lead?.vehicleModel}
                            </td>
                            <td className="py-3 px-2 text-right">{formatCurrency(loan.fundedAmount)}</td>
                            <td className="py-3 px-2 text-right text-green-600 font-medium">
                              {formatCurrency(loan.commissionAmount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-muted/50 font-semibold">
                          <td colSpan={4} className="py-3 px-2 text-right">
                            Totals:
                          </td>
                          <td className="py-3 px-2 text-right">
                            {formatCurrency(fundedData.totals?.fundedAmount || 0)}
                          </td>
                          <td className="py-3 px-2 text-right text-green-600">
                            {formatCurrency(fundedData.totals?.commissionAmount || 0)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">No funded loans found</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Non-Solicitation Compliance Tab */}
        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-yellow-500" />
                <CardTitle className="text-lg">Non-Solicitation List</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">
                These customers must not receive refinance or loan promotional messaging per partner agreement.
              </p>
            </CardHeader>
            <CardContent>
              {complianceLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : complianceData?.leads?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2">Name</th>
                        <th className="text-left py-3 px-2">Email</th>
                        <th className="text-left py-3 px-2">Phone</th>
                        <th className="text-left py-3 px-2">State</th>
                        <th className="text-left py-3 px-2">Funded Date</th>
                        <th className="text-left py-3 px-2">Partner</th>
                        <th className="text-left py-3 px-2">Restriction</th>
                      </tr>
                    </thead>
                    <tbody>
                      {complianceData.leads.map((lead: any) => (
                        <tr key={lead.id} className="border-b hover:bg-accent">
                          <td className="py-3 px-2">
                            {lead.firstName} {lead.lastName}
                          </td>
                          <td className="py-3 px-2">{lead.email}</td>
                          <td className="py-3 px-2">{lead.phone}</td>
                          <td className="py-3 px-2">{lead.state}</td>
                          <td className="py-3 px-2">{lead.fundedAt ? formatDate(lead.fundedAt) : "-"}</td>
                          <td className="py-3 px-2">{lead.partner}</td>
                          <td className="py-3 px-2">
                            <Badge variant="destructive" className="bg-yellow-500">
                              {lead.marketingRestriction === "NO_CREDIT_SOLICITATION"
                                ? "No Credit Solicitation"
                                : lead.marketingRestriction}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">No restricted customers found</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Mark as Funded Dialog */}
      <Dialog
        open={fundDialog.open}
        onOpenChange={(open) => setFundDialog({ open, leadId: open ? fundDialog.leadId : null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Lead as Funded</DialogTitle>
            <DialogDescription>
              Enter the funding details from the OpenRoad report. This will set the commission amount to $300 and add
              the customer to the non-solicitation list.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fundedAt">Funded Date</Label>
              <Input
                id="fundedAt"
                type="date"
                value={fundForm.fundedAt}
                onChange={(e) => setFundForm((prev) => ({ ...prev, fundedAt: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fundedAmount">Funded Amount ($)</Label>
              <Input
                id="fundedAmount"
                type="number"
                value={fundForm.fundedAmount}
                onChange={(e) => setFundForm((prev) => ({ ...prev, fundedAmount: e.target.value }))}
                placeholder="15000"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rawPartnerReference">Partner Reference (optional)</Label>
              <Input
                id="rawPartnerReference"
                value={fundForm.rawPartnerReference}
                onChange={(e) => setFundForm((prev) => ({ ...prev, rawPartnerReference: e.target.value }))}
                placeholder="OpenRoad loan ID"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFundDialog({ open: false, leadId: null })}>
              Cancel
            </Button>
            <Button
              onClick={handleMarkAsFunded}
              disabled={isSubmitting || !fundForm.fundedAt || !fundForm.fundedAmount}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Mark as Funded
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
