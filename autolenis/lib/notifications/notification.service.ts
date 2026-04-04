// Admin Notification Service
// Central emitter for all admin notification events.
// All critical workflows call notifyAdmin() to create in-app notifications.
// Server-side only — do not import from client components.

import { createClient } from "@/lib/supabase/server"
import { logger } from "@/lib/logger"
import type { CreateNotificationInput, NotificationFilters, AdminNotification } from "./types"

const MAX_TITLE_LENGTH = 60

/**
 * Create an admin notification.
 * Enforces workspace isolation, dedupe, and title length.
 */
export async function notifyAdmin(input: CreateNotificationInput): Promise<AdminNotification | null> {
  try {
    if (!input.workspaceId) {
      logger.warn("notifyAdmin called without workspaceId — skipping")
      return null
    }

    // Enforce title length
    const title = input.title.length > MAX_TITLE_LENGTH
      ? input.title.slice(0, MAX_TITLE_LENGTH - 1) + "…"
      : input.title

    const supabase = await createClient()

    // Dedupe: if a dedupeKey is provided, check for existing unarchived notification
    if (input.dedupeKey) {
      const { data: existing } = await supabase
        .from("AdminNotification")
        .select("id")
        .eq("dedupeKey", input.dedupeKey)
        .eq("workspaceId", input.workspaceId)
        .eq("isArchived", false)
        .limit(1)
        .maybeSingle()

      if (existing) {
        logger.debug("Duplicate notification skipped", { dedupeKey: input.dedupeKey })
        return null
      }
    }

    const row = {
      workspaceId: input.workspaceId,
      priority: input.priority,
      category: input.category,
      type: input.type,
      title,
      message: input.message,
      entityType: input.entityType || null,
      entityId: input.entityId || null,
      ctaPath: input.ctaPath || null,
      metadata: input.metadata || null,
      dedupeKey: input.dedupeKey || null,
      isRead: false,
      isArchived: false,
    }

    const { data, error } = await supabase
      .from("AdminNotification")
      .insert(row)
      .select()
      .single()

    if (error) {
      logger.error("Failed to create admin notification", { error: error.message, type: input.type })
      return null
    }

    return data as AdminNotification
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error("notifyAdmin unexpected error", { error: message })
    return null
  }
}

/**
 * List notifications for a workspace with filters and cursor pagination.
 */
export async function listNotifications(
  workspaceId: string,
  filters: NotificationFilters = {}
): Promise<{ notifications: AdminNotification[]; total: number }> {
  const supabase = await createClient()
  const limit = Math.min(filters.limit || 30, 100)

  let query = supabase
    .from("AdminNotification")
    .select("*", { count: "exact" })
    .eq("workspaceId", workspaceId)
    .order("createdAt", { ascending: false })
    .limit(limit)

  // Priority filter
  if (filters.priority) {
    query = query.eq("priority", filters.priority)
  }

  // Category filter
  if (filters.category) {
    query = query.eq("category", filters.category)
  }

  // Status filter
  if (filters.status === "unread") {
    query = query.eq("isRead", false).eq("isArchived", false)
  } else if (filters.status === "read") {
    query = query.eq("isRead", true).eq("isArchived", false)
  } else if (filters.status === "archived") {
    query = query.eq("isArchived", true)
  } else {
    // Default: exclude archived
    query = query.eq("isArchived", false)
  }

  // Cursor pagination (createdAt-based)
  if (filters.cursor) {
    query = query.lt("createdAt", filters.cursor)
  }

  const { data, error, count } = await query

  if (error) {
    logger.error("Failed to list notifications", { error: error.message, workspaceId })
    return { notifications: [], total: 0 }
  }

  return {
    notifications: (data || []) as AdminNotification[],
    total: count ?? 0,
  }
}

/**
 * Get unread count for a workspace (P0 + P1 only for bell badge).
 */
export async function getUnreadCount(workspaceId: string): Promise<number> {
  const supabase = await createClient()

  const { count, error } = await supabase
    .from("AdminNotification")
    .select("id", { count: "exact", head: true })
    .eq("workspaceId", workspaceId)
    .eq("isRead", false)
    .eq("isArchived", false)
    .in("priority", ["P0", "P1"])

  if (error) {
    logger.error("Failed to get unread count", { error: error.message, workspaceId })
    return 0
  }

  return count ?? 0
}

/**
 * Mark a single notification as read.
 */
export async function markAsRead(notificationId: string, workspaceId: string): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from("AdminNotification")
    .update({ isRead: true, readAt: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("workspaceId", workspaceId)

  if (error) {
    logger.error("Failed to mark notification as read", { error: error.message, notificationId })
    return false
  }

  return true
}

/**
 * Mark all notifications as read for a workspace.
 */
export async function markAllAsRead(workspaceId: string): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from("AdminNotification")
    .update({ isRead: true, readAt: new Date().toISOString() })
    .eq("workspaceId", workspaceId)
    .eq("isRead", false)
    .eq("isArchived", false)

  if (error) {
    logger.error("Failed to mark all notifications as read", { error: error.message, workspaceId })
    return false
  }

  return true
}

/**
 * Archive a single notification.
 */
export async function archiveNotification(notificationId: string, workspaceId: string): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from("AdminNotification")
    .update({ isArchived: true })
    .eq("id", notificationId)
    .eq("workspaceId", workspaceId)

  if (error) {
    logger.error("Failed to archive notification", { error: error.message, notificationId })
    return false
  }

  return true
}
