"use client"

import { useState, useEffect, useCallback } from "react"
import { ProtectedRoute } from "@/components/layout/protected-route"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  RefreshCw,
  ExternalLink,
  UserPlus,
  Inbox,
  Phone,
  Clock,
  Gift,
  AlertTriangle,
  XCircle,
} from "lucide-react"
import { formatDate } from "@/lib/utils/format"
import { toast } from "sonner"
import Link from "next/link"
import { csrfHeaders } from "@/lib/csrf-client"

interface SourcingCase {
  id: string
  createdAt: string
  status: string
  adminSubStatus: string | null
  assignedAdminId: string | null
  assignedAdmin: { email: string; firstName?: string; lastName?: string } | null
  buyer: {
    firstName: string
    lastName: string
    email: string
  } | null
  marketZip: string | null
  marketRadiusMiles: number | null
  items: {
    year: number | null
    make: string | null
    modelName: string | null
    trim: string | null
  }[]
}

const TAB_CONFIG = [
  { key: "new", label: "New Requests", icon: Inbox },
  { key: "needs_outreach", label: "Needs Outreach", icon: Phone },
  { key: "waiting", label: "Waiting on Dealer", icon: Clock },
  { key: "offers_ready", label: "Offers Ready", icon: Gift },
  { key: "stale", label: "Stale", icon: AlertTriangle },
  { key: "closed", label: "Closed", icon: XCircle },
] as const

export default function SourcingQueuePage() {
  const [activeTab, setActiveTab] = useState("new")
  const [cases, setCases] = useState<SourcingCase[]>([])
  const [loading, setLoading] = useState(true)
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [assignEmail, setAssignEmail] = useState("")
  const [submittingAssign, setSubmittingAssign] = useState(false)

  const fetchCases = useCallback(async (tab: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/sourcing/cases?tab=${tab}`)
      if (!res.ok) throw new Error("Failed to fetch cases")
      const data = await res.json()
      setCases(data.data || [])
    } catch (err) {
      console.error("Error fetching sourcing cases:", err)
      toast.error("Failed to load sourcing cases")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCases(activeTab)
  }, [activeTab, fetchCases])

  const handleAssign = async (caseId: string) => {
    if (!assignEmail.trim()) {
      toast.error("Admin email is required")
      return
    }
    setSubmittingAssign(true)
    try {
      const res = await fetch(`/api/admin/sourcing/cases/${caseId}/assign`, {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({ adminUserId: assignEmail.trim() }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error?.message || "Failed to assign case")
      }
      toast.success("Case assigned successfully")
      setAssigningId(null)
      setAssignEmail("")
      await fetchCases(activeTab)
    } catch (err) {
      console.error("Error assigning case:", err)
      toast.error(err instanceof Error ? err.message : "Failed to assign case")
    } finally {
      setSubmittingAssign(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      SUBMITTED: "secondary",
      SOURCING: "default",
      OFFERS_READY: "default",
      OFFER_SELECTED: "default",
      CLOSED: "outline",
      CANCELLED: "destructive",
    }
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>
  }

  const getSubStatusBadge = (subStatus: string | null) => {
    if (!subStatus) return <span className="text-muted-foreground">—</span>
    return <Badge variant="outline">{subStatus}</Badge>
  }

  const buildRequestSummary = (items: SourcingCase["items"]) => {
    if (!items || items.length === 0) return "No items"
    return items
      .map((item) =>
        [item.year, item.make, item.modelName, item.trim].filter(Boolean).join(" ") || "Any vehicle"
      )
      .join("; ")
  }

  return (
    <ProtectedRoute allowedRoles={["ADMIN"]}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Sourcing Queue</h1>
            <p className="text-muted-foreground">
              Manage vehicle sourcing requests from buyers
            </p>
          </div>
          <Button variant="outline" onClick={() => fetchCases(activeTab)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap">
            {TAB_CONFIG.map(({ key, label, icon: Icon }) => (
              <TabsTrigger key={key} value={key} className="flex items-center gap-1.5">
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{label.split(" ")[0]}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {TAB_CONFIG.map(({ key }) => (
            <TabsContent key={key} value={key}>
              <Card>
                <CardContent className="p-0">
                  {loading ? (
                    <div className="p-8 text-center">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                      <p className="text-muted-foreground">Loading cases…</p>
                    </div>
                  ) : cases.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      No cases in this queue
                    </div>
                  ) : (
                    <div className="w-full overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Created</TableHead>
                            <TableHead>Buyer</TableHead>
                            <TableHead>Market</TableHead>
                            <TableHead>Request Summary</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Admin Sub-Status</TableHead>
                            <TableHead>Assigned Admin</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cases.map((sc) => (
                            <TableRow key={sc.id}>
                              <TableCell className="whitespace-nowrap">
                                {formatDate(sc.createdAt)}
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium">
                                    {sc.buyer
                                      ? `${sc.buyer.firstName} ${sc.buyer.lastName}`
                                      : "N/A"}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {sc.buyer?.email || "—"}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                {sc.marketZip
                                  ? `${sc.marketZip} (${sc.marketRadiusMiles ?? "—"} mi)`
                                  : "—"}
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate">
                                {buildRequestSummary(sc.items)}
                              </TableCell>
                              <TableCell>{getStatusBadge(sc.status)}</TableCell>
                              <TableCell>{getSubStatusBadge(sc.adminSubStatus)}</TableCell>
                              <TableCell>
                                {sc.assignedAdmin ? (
                                  <span className="text-sm">
                                    {sc.assignedAdmin.firstName || sc.assignedAdmin.email}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">Unassigned</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Link href={`/admin/sourcing/${sc.id}`}>
                                    <Button variant="ghost" size="sm">
                                      <ExternalLink className="h-4 w-4 mr-1" />
                                      Open
                                    </Button>
                                  </Link>
                                  {assigningId === sc.id ? (
                                    <div className="flex items-center gap-1">
                                      <Input
                                        placeholder="Admin user ID"
                                        value={assignEmail}
                                        onChange={(e) => setAssignEmail(e.target.value)}
                                        className="h-8 w-40 text-sm"
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") handleAssign(sc.id)
                                          if (e.key === "Escape") {
                                            setAssigningId(null)
                                            setAssignEmail("")
                                          }
                                        }}
                                      />
                                      <Button
                                        size="sm"
                                        onClick={() => handleAssign(sc.id)}
                                        disabled={submittingAssign}
                                      >
                                        {submittingAssign ? "…" : "Go"}
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          setAssigningId(null)
                                          setAssignEmail("")
                                        }}
                                      >
                                        ✕
                                      </Button>
                                    </div>
                                  ) : (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setAssigningId(sc.id)
                                        setAssignEmail("")
                                      }}
                                    >
                                      <UserPlus className="h-4 w-4 mr-1" />
                                      Assign
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </ProtectedRoute>
  )
}
