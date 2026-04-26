"use client"

import { useState } from "react"
import useSWR, { mutate } from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, CheckCheck, Clock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { csrfHeaders } from "@/lib/csrf-client"
import { formatDistanceToNow } from "date-fns"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const NOTIF_KEY = "/api/dealer/notifications"

interface Notification {
  id: string
  title: string
  message: string
  type: string
  priority: string
  isRead: boolean
  createdAt: string
  ctaPath?: string
  entityType?: string
}

export default function DealerNotificationsPage() {
  const { toast } = useToast()
  const [markingAll, setMarkingAll] = useState(false)

  const { data, isLoading } = useSWR<{
    success: boolean
    notifications: Notification[]
    unreadCount: number
  }>(NOTIF_KEY, fetcher, { refreshInterval: 30000 })

  const notifications = data?.notifications ?? []
  const unreadCount = data?.unreadCount ?? 0

  const handleMarkAllRead = async () => {
    setMarkingAll(true)
    try {
      const res = await fetch("/api/dealer/notifications/read-all", {
        method: "POST",
        headers: csrfHeaders(),
      })
      if (!res.ok) throw new Error(`Failed to mark notifications as read: ${res.status} ${res.statusText}`)
      await mutate(NOTIF_KEY)
      toast({ title: "All notifications marked as read" })
    } catch {
      toast({ title: "Error", description: "Could not mark notifications as read", variant: "destructive" })
    } finally {
      setMarkingAll(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs">
                {unreadCount}
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Stay up to date with auction activity, deal updates, and contract alerts.
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={markingAll}
            className="flex items-center gap-1"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>

      {isLoading && (
        <p className="text-muted-foreground text-sm">Loading notifications…</p>
      )}

      {!isLoading && notifications.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
            <Bell className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground text-sm">No notifications yet.</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {notifications.map((n) => (
          <Card
            key={n.id}
            className={n.isRead ? "opacity-70" : "border-primary/40 shadow-sm"}
          >
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="flex items-start justify-between text-sm font-semibold gap-2">
                <span>{n.title}</span>
                <div className="flex items-center gap-2 shrink-0">
                  {!n.isRead && (
                    <Badge variant="default" className="text-xs">New</Badge>
                  )}
                  <Badge variant="outline" className="text-xs capitalize">
                    {n.priority.toLowerCase()}
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-4 space-y-2">
              <p className="text-sm text-muted-foreground">{n.message}</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
              </div>
              {n.ctaPath && (
                <a
                  href={n.ctaPath}
                  className="text-xs text-primary underline-offset-2 hover:underline"
                >
                  View details →
                </a>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
