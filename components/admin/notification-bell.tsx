"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import {
  Bell,
  DollarSign,
  Users,
  Handshake,
  FileText,
  Heart,
  Settings,
  ShieldCheck,
  RefreshCcw,
  Check,
} from "lucide-react"
import type { AdminNotification, NotificationCategory, NotificationPriority } from "@/lib/notifications/types"

const CATEGORY_ICON_MAP: Record<NotificationCategory, React.ElementType> = {
  PAYMENT: DollarSign,
  USER: Users,
  DEAL: Handshake,
  DOC: FileText,
  AFFILIATE: Heart,
  SYSTEM: Settings,
  SECURITY: ShieldCheck,
  WEBHOOK: RefreshCcw,
}

const PRIORITY_COLORS: Record<NotificationPriority, string> = {
  P0: "text-red-600",
  P1: "text-amber-600",
  P2: "text-blue-500",
}

type FilterType = "ALL" | "P0" | "P1" | "P2"

function formatTimeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.max(0, now - then)
  const minutes = Math.floor(diff / 60000)

  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [filter, setFilter] = useState<FilterType>("ALL")
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ limit: "20" })
      // Default: P0+P1 unless user selects a specific filter
      if (filter !== "ALL") {
        params.set("priority", filter)
      }
      const res = await fetch(`/api/admin/notifications?${params}`)
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
      }
    } catch {
      // Non-critical
    } finally {
      setLoading(false)
    }
  }, [filter])

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications/unread-count")
      if (res.ok) {
        const data = await res.json()
        setUnreadCount(data.unreadCount ?? 0)
      }
    } catch {
      // Non-critical
    }
  }, [])

  // Load on open
  useEffect(() => {
    if (open) {
      fetchNotifications()
    }
  }, [open, fetchNotifications])

  // Poll unread count every 30s
  useEffect(() => {
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [fetchUnreadCount])

  // SSE for realtime updates
  useEffect(() => {
    let eventSource: EventSource | null = null
    try {
      eventSource = new EventSource("/api/admin/notifications/stream")
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === "unread-count") {
            setUnreadCount(data.count)
          }
        } catch {
          // Ignore parse errors
        }
      }
      eventSource.onerror = () => {
        eventSource?.close()
      }
    } catch {
      // SSE not supported, rely on polling
    }
    return () => {
      eventSource?.close()
    }
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/admin/notifications/${id}/read`, { method: "POST" })
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
      )
      setUnreadCount((c) => Math.max(0, c - 1))
    } catch {
      // Non-critical
    }
  }

  const markAllRead = async () => {
    try {
      await fetch("/api/admin/notifications/mark-all-read", { method: "POST" })
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
      )
      setUnreadCount(0)
    } catch {
      // Non-critical
    }
  }

  // Filter P2 out by default in dropdown view
  const displayedNotifications = notifications.filter((n) => {
    if (filter === "ALL") return n.priority === "P0" || n.priority === "P1"
    return n.priority === filter
  })

  const displayCount = unreadCount > 99 ? "99+" : unreadCount

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 hover:bg-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/30"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell className="h-5 w-5 text-white" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full leading-none">
            {displayCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-[380px] bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden"
          role="menu"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-foreground text-sm">Notifications</h3>
            <div className="flex items-center gap-1">
              {(["ALL", "P0", "P1", "P2"] as FilterType[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
                    filter === f
                      ? "bg-primary text-white"
                      : "bg-muted text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {f === "ALL" ? "All" : f === "P0" ? "Critical" : f === "P1" ? "High" : "System"}
                </button>
              ))}
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>
            ) : displayedNotifications.length === 0 ? (
              <div className="p-6 text-center">
                <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No critical activity right now.</p>
              </div>
            ) : (
              displayedNotifications.map((n) => {
                const IconComponent = CATEGORY_ICON_MAP[n.category] || Bell
                return (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 hover:bg-accent transition-colors ${
                      !n.isRead ? "bg-blue-50/40" : ""
                    }`}
                  >
                    <div className={`mt-0.5 flex-shrink-0 ${PRIORITY_COLORS[n.priority]}`}>
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-foreground truncate">{n.title}</p>
                        {!n.isRead && (
                          <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground" title={n.createdAt}>
                          {formatTimeAgo(n.createdAt)}
                        </span>
                        {n.ctaPath && (
                          <Link
                            href={n.ctaPath}
                            onClick={() => {
                              markAsRead(n.id)
                              setOpen(false)
                            }}
                            className="text-[10px] text-primary hover:underline font-medium"
                          >
                            View →
                          </Link>
                        )}
                      </div>
                    </div>
                    {!n.isRead && (
                      <button
                        onClick={() => markAsRead(n.id)}
                        className="p-1 hover:bg-muted rounded flex-shrink-0"
                        aria-label="Mark as read"
                      >
                        <Check className="h-3 w-3 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-gray-100 flex items-center justify-between bg-muted/50/50">
            <button
              onClick={markAllRead}
              className="text-xs text-muted-foreground hover:text-gray-800 transition-colors"
              disabled={unreadCount === 0}
            >
              Mark all as read
            </button>
            <Link
              href="/admin/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-primary hover:underline"
            >
              View all
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
