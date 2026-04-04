// Admin Notification Types & Enums

export type NotificationPriority = "P0" | "P1" | "P2"

export type NotificationCategory =
  | "PAYMENT"
  | "USER"
  | "DEAL"
  | "DOC"
  | "AFFILIATE"
  | "SYSTEM"
  | "SECURITY"
  | "WEBHOOK"

export type NotificationEntityType =
  | "Buyer"
  | "Dealer"
  | "Deal"
  | "Auction"
  | "Affiliate"
  | "Payment"
  | "Document"
  | "User"
  | "Webhook"
  | "System"

export interface AdminNotification {
  id: string
  workspaceId: string
  priority: NotificationPriority
  category: NotificationCategory
  type: string
  title: string
  message: string
  entityType: NotificationEntityType | null
  entityId: string | null
  ctaPath: string | null
  metadata: Record<string, unknown> | null
  isRead: boolean
  readAt: string | null
  isArchived: boolean
  createdAt: string
  dedupeKey: string | null
}

export interface CreateNotificationInput {
  workspaceId: string
  priority: NotificationPriority
  category: NotificationCategory
  type: string
  title: string
  message: string
  entityType?: NotificationEntityType
  entityId?: string
  ctaPath?: string
  metadata?: Record<string, unknown>
  dedupeKey?: string
}

export interface NotificationFilters {
  priority?: NotificationPriority
  category?: NotificationCategory
  status?: "unread" | "read" | "archived"
  cursor?: string
  limit?: number
}

// Priority labels for UI
export const PRIORITY_LABELS: Record<NotificationPriority, string> = {
  P0: "Critical",
  P1: "High",
  P2: "Informational",
}

// Category icon mapping keys for UI
export const CATEGORY_ICONS: Record<NotificationCategory, string> = {
  PAYMENT: "DollarSign",
  USER: "Users",
  DEAL: "Handshake",
  DOC: "FileText",
  AFFILIATE: "Heart",
  SYSTEM: "Settings",
  SECURITY: "ShieldCheck",
  WEBHOOK: "RefreshCcw",
}
