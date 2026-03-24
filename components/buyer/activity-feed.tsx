"use client"

import { DollarSign, Gavel, CreditCard, Car, FileText, Calendar, Clock } from "lucide-react"

interface Activity {
  type: string
  title: string
  description: string
  timestamp: string | Date
  icon?: string
}

interface ActivityFeedProps {
  activities: Activity[]
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case "offer":
        return <DollarSign className="h-4 w-4 text-[#7ED321]" />
      case "auction":
        return <Gavel className="h-4 w-4 text-[#0066FF]" />
      case "payment":
        return <CreditCard className="h-4 w-4 text-[#00D9FF]" />
      case "vehicle":
        return <Car className="h-4 w-4 text-primary" />
      case "document":
        return <FileText className="h-4 w-4 text-orange-500" />
      case "appointment":
        return <Calendar className="h-4 w-4 text-purple-500" />
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getIconBackground = (type: string) => {
    switch (type) {
      case "offer":
        return "bg-[#7ED321]/10"
      case "auction":
        return "bg-[#0066FF]/10"
      case "payment":
        return "bg-[#00D9FF]/10"
      case "vehicle":
        return "bg-primary/10"
      case "document":
        return "bg-orange-100"
      case "appointment":
        return "bg-purple-100"
      default:
        return "bg-muted"
    }
  }

  const formatTimeAgo = (timestamp: string | Date): string => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No recent activity</p>
        <p className="text-sm">Start by getting pre-qualified!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {activities.map((activity, index) => (
        <div key={index} className="flex items-start gap-4 pb-4 border-b last:border-0 last:pb-0">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getIconBackground(activity.type)}`}>
            {getIcon(activity.type)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{activity.title}</p>
            <p className="text-sm text-muted-foreground truncate">{activity.description}</p>
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">{formatTimeAgo(activity.timestamp)}</span>
        </div>
      ))}
    </div>
  )
}
