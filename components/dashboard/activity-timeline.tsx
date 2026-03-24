"use client"

import type { ReactNode } from "react"

interface TimelineItem {
  id: string
  title: string
  description?: string
  timestamp: string
  icon?: ReactNode
  type?: "default" | "success" | "warning" | "error" | "info"
}

interface ActivityTimelineProps {
  items: TimelineItem[]
  emptyMessage?: string
  className?: string
}

const typeColors = {
  default: "bg-gray-400",
  success: "bg-green-500",
  warning: "bg-yellow-500",
  error: "bg-red-500",
  info: "bg-blue-500",
}

export function ActivityTimeline({
  items,
  emptyMessage = "No activity yet",
  className = "",
}: ActivityTimelineProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {items.map((item, index) => (
        <div key={item.id} className="flex gap-4">
          {/* Timeline Indicator */}
          <div className="flex flex-col items-center">
            <div
              className={`w-3 h-3 rounded-full ${typeColors[item.type || "default"]}`}
            />
            {index < items.length - 1 && (
              <div className="w-px flex-1 bg-border mt-2" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 pb-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{item.title}</p>
                {item.description && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {item.description}
                  </p>
                )}
              </div>
              <time className="text-xs text-muted-foreground whitespace-nowrap">
                {item.timestamp}
              </time>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
