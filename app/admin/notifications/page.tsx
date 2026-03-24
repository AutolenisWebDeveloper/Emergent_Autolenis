"use client"

import { useState, useCallback, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import {
  Bell,
  Info,
  Loader2,
  DollarSign,
  Users,
  Handshake,
  FileText,
  Heart,
  Settings,
  ShieldCheck,
  RefreshCcw,
  Check,
  Archive,
  Filter,
  ExternalLink,
} from "lucide-react"
import useSWR from "swr"
import { csrfHeaders } from "@/lib/csrf-client"
import type {
  AdminNotification,
  NotificationPriority,
  NotificationCategory,
} from "@/lib/notifications/types"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const PRIORITIES: { value: NotificationPriority | ""; label: string }[] = [
  { value: "", label: "All Priorities" },
  { value: "P0", label: "P0 — Critical" },
  { value: "P1", label: "P1 — High" },
  { value: "P2", label: "P2 — Informational" },
]

const CATEGORIES: { value: NotificationCategory | ""; label: string }[] = [
  { value: "", label: "All Categories" },
  { value: "PAYMENT", label: "Payments" },
  { value: "USER", label: "Users" },
  { value: "DEAL", label: "Deals" },
  { value: "DOC", label: "Documents" },
  { value: "AFFILIATE", label: "Affiliates" },
  { value: "SYSTEM", label: "System" },
  { value: "SECURITY", label: "Security" },
  { value: "WEBHOOK", label: "Webhooks" },
]

const STATUSES: { value: string; label: string }[] = [
  { value: "", label: "All (excl. archived)" },
  { value: "unread", label: "Unread" },
  { value: "read", label: "Read" },
  { value: "archived", label: "Archived" },
]

const CATEGORY_ICON_MAP: Record<string, React.ElementType> = {
  PAYMENT: DollarSign,
  USER: Users,
  DEAL: Handshake,
  DOC: FileText,
  AFFILIATE: Heart,
  SYSTEM: Settings,
  SECURITY: ShieldCheck,
  WEBHOOK: RefreshCcw,
}

const PRIORITY_BADGE: Record<NotificationPriority, { bg: string; text: string }> = {
  P0: { bg: "bg-red-100", text: "text-red-700" },
  P1: { bg: "bg-amber-100", text: "text-amber-700" },
  P2: { bg: "bg-blue-100", text: "text-blue-600" },
}

function formatTimeAgo(dateStr: string): string {
  const diff = Math.max(0, Date.now() - new Date(dateStr).getTime())
  const min = Math.floor(diff / 60000)
  if (min < 1) return "just now"
  if (min < 60) return `${min}m ago`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(dateStr).toLocaleDateString()
}

export default function AdminNotificationsPage() {
  const [priority, setPriority] = useState("")
  const [category, setCategory] = useState("")
  const [status, setStatus] = useState("")
  const [cursor, setCursor] = useState<string | null>(null)
  const [selected, setSelected] = useState<AdminNotification | null>(null)

  // Build query string
  const params = new URLSearchParams()
  if (priority) params.set("priority", priority)
  if (category) params.set("category", category)
  if (status) params.set("status", status)
  if (cursor) params.set("cursor", cursor)
  params.set("limit", "30")

  const { data, error, isLoading, mutate } = useSWR(
    `/api/admin/notifications?${params.toString()}`,
    fetcher
  )

  const notifications: AdminNotification[] = data?.notifications || []
  const total = data?.total || 0

  const markAsRead = useCallback(
    async (id: string) => {
      try {
        await fetch(`/api/admin/notifications/${id}/read`, { method: "POST", headers: csrfHeaders() })
        mutate()
      } catch {
        // Non-critical
      }
    },
    [mutate]
  )

  const archiveNotification = useCallback(
    async (id: string) => {
      try {
        await fetch(`/api/admin/notifications/${id}/archive`, { method: "POST", headers: csrfHeaders() })
        if (selected?.id === id) setSelected(null)
        mutate()
      } catch {
        // Non-critical
      }
    },
    [mutate, selected]
  )

  const markAllRead = useCallback(async () => {
    try {
      await fetch("/api/admin/notifications/mark-all-read", { method: "POST", headers: csrfHeaders() })
      mutate()
    } catch {
      // Non-critical
    }
  }, [mutate])

  const loadMore = () => {
    if (notifications.length > 0) {
      setCursor(notifications[notifications.length - 1].createdAt)
    }
  }

  // Reset cursor when filters change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Legitimate reset when filters change
    setCursor(null)
  }, [priority, category, status])

  if (isLoading && !data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
          <p className="text-muted-foreground">System events and alerts</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
          <p className="text-muted-foreground">
            System events, alerts, and approvals · {total} total
          </p>
        </div>
        <button
          onClick={markAllRead}
          className="px-4 py-2 text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
        >
          Mark all as read
        </button>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600 text-sm">
              Failed to load notifications. Please try again.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-6">
        {/* Left Filters Panel */}
        <div className="hidden lg:block w-56 flex-shrink-0 space-y-5">
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
              <Filter className="h-3 w-3" /> Priority
            </h4>
            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                onClick={() => setPriority(p.value)}
                className={`block w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors ${
                  priority === p.value
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-accent"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Category</h4>
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className={`block w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors ${
                  category === c.value
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-accent"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Status</h4>
            {STATUSES.map((s) => (
              <button
                key={s.value}
                onClick={() => setStatus(s.value)}
                className={`block w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors ${
                  status === s.value
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-accent"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main List */}
        <div className="flex-1 min-w-0">
          {/* Mobile filter pills */}
          <div className="lg:hidden flex flex-wrap gap-2 mb-4">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="text-sm border rounded-lg px-3 py-1.5"
              aria-label="Filter by priority"
            >
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="text-sm border rounded-lg px-3 py-1.5"
              aria-label="Filter by category"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="text-sm border rounded-lg px-3 py-1.5"
              aria-label="Filter by status"
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {notifications.length === 0 && !error ? (
            <Card>
              <CardContent className="pt-6 pb-6">
                <div className="text-center py-8">
                  <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-1">
                    No notifications
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    You&apos;re all caught up! New alerts will appear here.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {notifications.map((n) => {
                const IconComp = CATEGORY_ICON_MAP[n.category] || Info
                const badge = PRIORITY_BADGE[n.priority]
                return (
                  <Card
                    key={n.id}
                    className={`transition-colors cursor-pointer ${
                      !n.isRead ? "bg-blue-50/50 border-blue-100" : "bg-white"
                    } ${selected?.id === n.id ? "ring-2 ring-primary/30" : ""}`}
                    onClick={() => setSelected(n)}
                  >
                    <CardContent className="pt-3 pb-3">
                      <div className="flex items-start gap-3">
                        <IconComp
                          className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                            n.priority === "P0"
                              ? "text-red-500"
                              : n.priority === "P1"
                              ? "text-amber-500"
                              : "text-blue-400"
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm text-foreground truncate">
                              {n.title}
                            </p>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${badge.bg} ${badge.text}`}
                            >
                              {n.priority}
                            </span>
                            {!n.isRead && (
                              <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {n.message}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <span
                              className="text-[10px] text-muted-foreground"
                              title={n.createdAt}
                            >
                              {formatTimeAgo(n.createdAt)}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {n.category}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {!n.isRead && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                markAsRead(n.id)
                              }}
                              className="p-1 hover:bg-muted rounded"
                              title="Mark as read"
                            >
                              <Check className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              archiveNotification(n.id)
                            }}
                            className="p-1 hover:bg-muted rounded"
                            title="Archive"
                          >
                            <Archive className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}

              {/* Load more */}
              {notifications.length >= 30 && (
                <div className="text-center pt-4">
                  <button
                    onClick={loadMore}
                    className="px-4 py-2 text-sm font-medium text-primary bg-primary/5 rounded-lg hover:bg-primary/10 transition-colors"
                  >
                    Load more
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Detail Panel */}
        {selected && (
          <div className="hidden xl:block w-80 flex-shrink-0">
            <Card className="sticky top-[80px]">
              <CardContent className="pt-5">
                <div className="flex items-center justify-between mb-4">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      PRIORITY_BADGE[selected.priority].bg
                    } ${PRIORITY_BADGE[selected.priority].text}`}
                  >
                    {selected.priority === "P0"
                      ? "Critical"
                      : selected.priority === "P1"
                      ? "High"
                      : "Informational"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {selected.category}
                  </span>
                </div>

                <h3 className="font-semibold text-foreground mb-1">
                  {selected.title}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">{selected.message}</p>

                <div className="space-y-2 text-xs text-muted-foreground mb-4">
                  <p>
                    <span className="font-medium text-gray-700">Type:</span>{" "}
                    {selected.type}
                  </p>
                  {selected.entityType && (
                    <p>
                      <span className="font-medium text-gray-700">Entity:</span>{" "}
                      {selected.entityType}
                      {selected.entityId ? ` #${selected.entityId.slice(0, 8)}` : ""}
                    </p>
                  )}
                  <p>
                    <span className="font-medium text-gray-700">Created:</span>{" "}
                    {new Date(selected.createdAt).toLocaleString()}
                  </p>
                  {selected.metadata && (
                    <div>
                      <span className="font-medium text-gray-700">Details:</span>
                      <pre className="mt-1 p-2 bg-muted/50 rounded text-[10px] overflow-x-auto max-h-32">
                        {JSON.stringify(selected.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>

                {selected.ctaPath && (
                  <Link
                    href={selected.ctaPath}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors w-full justify-center"
                  >
                    Go to record <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
