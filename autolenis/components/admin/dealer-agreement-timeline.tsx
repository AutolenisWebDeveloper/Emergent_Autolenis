"use client"

import { Badge } from "@/components/ui/badge"
import { Clock, Send, Eye, FileCheck, XCircle, AlertTriangle } from "lucide-react"

interface TimelineEvent {
  label: string
  timestamp: string | null
  icon: React.ReactNode
  status: "completed" | "pending" | "error"
}

interface DealerAgreementTimelineProps {
  agreement: {
    status: string
    sentAt: string | null
    deliveredAt: string | null
    viewedAt: string | null
    signedAt: string | null
    completedAt: string | null
    voidedAt: string | null
    expiredAt: string | null
    lastWebhookAt: string | null
    webhookStatus: string | null
  }
}

export function DealerAgreementTimeline({ agreement }: DealerAgreementTimelineProps) {
  const events: TimelineEvent[] = [
    {
      label: "Agreement Sent",
      timestamp: agreement.sentAt,
      icon: <Send className="h-4 w-4" />,
      status: agreement.sentAt ? "completed" : "pending",
    },
    {
      label: "Delivered",
      timestamp: agreement.deliveredAt,
      icon: <Clock className="h-4 w-4" />,
      status: agreement.deliveredAt ? "completed" : "pending",
    },
    {
      label: "Viewed by Dealer",
      timestamp: agreement.viewedAt,
      icon: <Eye className="h-4 w-4" />,
      status: agreement.viewedAt ? "completed" : "pending",
    },
    {
      label: "Signed",
      timestamp: agreement.signedAt,
      icon: <FileCheck className="h-4 w-4" />,
      status: agreement.signedAt ? "completed" : "pending",
    },
    {
      label: "Completed",
      timestamp: agreement.completedAt,
      icon: <FileCheck className="h-4 w-4" />,
      status: agreement.completedAt ? "completed" : "pending",
    },
  ]

  // Add voided/expired/declined if applicable
  if (agreement.voidedAt) {
    events.push({
      label: agreement.status === "DECLINED" ? "Declined" : "Voided",
      timestamp: agreement.voidedAt,
      icon: <XCircle className="h-4 w-4" />,
      status: "error",
    })
  }
  if (agreement.expiredAt) {
    events.push({
      label: "Expired",
      timestamp: agreement.expiredAt,
      icon: <AlertTriangle className="h-4 w-4" />,
      status: "error",
    })
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">Agreement Timeline</h4>
      <div className="space-y-2">
        {events.map((event, idx) => (
          <div key={idx} className="flex items-center gap-3 text-sm">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full ${
                event.status === "completed"
                  ? "bg-green-100 text-green-600"
                  : event.status === "error"
                    ? "bg-red-100 text-red-600"
                    : "bg-gray-100 text-gray-400"
              }`}
            >
              {event.icon}
            </div>
            <span className={event.status === "pending" ? "text-muted-foreground" : ""}>
              {event.label}
            </span>
            {event.timestamp && (
              <span className="ml-auto text-xs text-muted-foreground">
                {new Date(event.timestamp).toLocaleString()}
              </span>
            )}
            {!event.timestamp && event.status === "pending" && (
              <Badge variant="outline" className="ml-auto text-xs">
                Pending
              </Badge>
            )}
          </div>
        ))}
      </div>

      {agreement.lastWebhookAt && (
        <div className="mt-3 border-t pt-3">
          <p className="text-xs text-muted-foreground">
            Last webhook: {new Date(agreement.lastWebhookAt).toLocaleString()}
            {agreement.webhookStatus && ` (${agreement.webhookStatus})`}
          </p>
        </div>
      )}
    </div>
  )
}
