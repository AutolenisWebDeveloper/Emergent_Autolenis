"use client"

import { Badge } from "@/components/ui/badge"

type StatusType =
  | "pending"
  | "active"
  | "approved"
  | "rejected"
  | "paid"
  | "refunded"
  | "completed"
  | "cancelled"
  | "expired"
  | "processing"
  | "failed"
  | "draft"

interface StatusPillProps {
  status: StatusType | string
  className?: string
}

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  pending: {
    label: "Pending",
    className: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  active: {
    label: "Active",
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  approved: {
    label: "Approved",
    className: "bg-green-100 text-green-800 border-green-200",
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-100 text-red-800 border-red-200",
  },
  paid: {
    label: "Paid",
    className: "bg-green-100 text-green-800 border-green-200",
  },
  refunded: {
    label: "Refunded",
    className: "bg-purple-100 text-purple-800 border-purple-200",
  },
  completed: {
    label: "Completed",
    className: "bg-green-100 text-green-800 border-green-200",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-muted text-gray-800 border-gray-200",
  },
  expired: {
    label: "Expired",
    className: "bg-muted text-gray-800 border-gray-200",
  },
  processing: {
    label: "Processing",
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  failed: {
    label: "Failed",
    className: "bg-red-100 text-red-800 border-red-200",
  },
  draft: {
    label: "Draft",
    className: "bg-muted text-muted-foreground border-gray-200",
  },
}

export function StatusPill({ status, className = "" }: StatusPillProps) {
  const normalizedStatus = status.toLowerCase() as StatusType
  const config = statusConfig[normalizedStatus] || {
    label: status,
    className: "bg-muted text-gray-800 border-gray-200",
  }

  return (
    <Badge variant="outline" className={`${config.className} ${className}`}>
      {config.label}
    </Badge>
  )
}
