/**
 * AI Persistence Layer — writes conversations, messages, tool calls,
 * leads, SEO drafts, and contract extractions to the database.
 *
 * Uses Prisma client for writes. The `any` casts on Prisma model
 * access are intentional: the AI tables may not yet exist in all
 * environments (e.g. before migration runs), and we want the
 * persistence layer to fail gracefully rather than crash the app.
 */

import type { AIRole } from "./context-builder"

// ---------------------------------------------------------------------------
// Lazy Prisma import (avoids build failures when DB is not configured)
// ---------------------------------------------------------------------------

async function getPrisma() {
  try {
    const { prisma } = await import("@/lib/prisma")
    return prisma
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------

export interface CreateConversationInput {
  id: string
  userId: string | null
  role: string
  agent: string
  intent: string | null
  workspaceId: string | null
}

export async function persistConversation(input: CreateConversationInput): Promise<void> {
  try {
    const prisma = await getPrisma()
    if (!prisma) return
    await (prisma as any).aiConversation.create({
      data: {
        id: input.id,
        userId: input.userId,
        role: input.role,
        agent: input.agent,
        intent: input.intent,
        workspaceId: input.workspaceId,
      },
    })
  } catch (err) {
    console.error("[AI Persistence] Failed to persist conversation:", err instanceof Error ? err.message : err)
  }
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export interface CreateMessageInput {
  conversationId: string
  sender: "user" | "assistant" | "system" | "tool"
  content: string
  toolUsed?: string | null
  riskLevel?: string | null
}

export async function persistMessage(input: CreateMessageInput): Promise<void> {
  try {
    const prisma = await getPrisma()
    if (!prisma) return
    await (prisma as any).aiMessage.create({
      data: {
        conversationId: input.conversationId,
        sender: input.sender,
        content: input.content,
        toolUsed: input.toolUsed ?? null,
        riskLevel: input.riskLevel ?? null,
      },
    })
  } catch (err) {
    console.error("[AI Persistence] Failed to persist message:", err instanceof Error ? err.message : err)
  }
}

// ---------------------------------------------------------------------------
// Tool Calls
// ---------------------------------------------------------------------------

export interface CreateToolCallInput {
  conversationId: string
  toolName: string
  input: Record<string, unknown>
  output: unknown
  status: "success" | "error" | "denied"
  latencyMs: number
  error?: string | null
  userId?: string | null
  role?: string | null
  workspaceId?: string | null
}

export async function persistToolCall(input: CreateToolCallInput): Promise<void> {
  try {
    const prisma = await getPrisma()
    if (!prisma) return
    await (prisma as any).aiToolCall.create({
      data: {
        conversationId: input.conversationId,
        toolName: input.toolName,
        input: input.input,
        output: input.output ?? null,
        status: input.status,
        latencyMs: input.latencyMs,
        error: input.error ?? null,
        userId: input.userId ?? null,
        role: input.role ?? null,
        workspaceId: input.workspaceId ?? null,
      },
    })
  } catch (err) {
    console.error("[AI Persistence] Failed to persist tool call:", err instanceof Error ? err.message : err)
  }
}

// ---------------------------------------------------------------------------
// Admin Actions (Audit)
// ---------------------------------------------------------------------------

export interface CreateAdminActionInput {
  adminId: string
  actionType: string
  payload?: Record<string, unknown> | null
  workspaceId?: string | null
}

export async function persistAdminAction(input: CreateAdminActionInput): Promise<void> {
  try {
    const prisma = await getPrisma()
    if (!prisma) return
    await (prisma as any).aiAdminAction.create({
      data: {
        adminId: input.adminId,
        actionType: input.actionType,
        payload: input.payload ?? undefined,
        workspaceId: input.workspaceId ?? null,
      },
    })
  } catch (err) {
    console.error("[AI Persistence] Failed to persist admin action:", err instanceof Error ? err.message : err)
  }
}

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------

export interface CreateLeadInput {
  name: string
  email: string
  phone?: string | null
  intent?: string | null
  source?: string | null
  conversationId?: string | null
  workspaceId?: string | null
}

export async function persistLead(input: CreateLeadInput): Promise<string | null> {
  try {
    const prisma = await getPrisma()
    if (!prisma) return null
    const lead = await (prisma as any).aiLead.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone ?? null,
        intent: input.intent ?? null,
        source: input.source ?? "chat",
        conversationId: input.conversationId ?? null,
        workspaceId: input.workspaceId ?? null,
      },
    })
    return lead.id
  } catch (err) {
    console.error("[AI Persistence] Failed to persist lead:", err instanceof Error ? err.message : err)
    return null
  }
}

// ---------------------------------------------------------------------------
// SEO Drafts
// ---------------------------------------------------------------------------

export interface CreateSeoDraftInput {
  title: string
  keywords: string
  content: string
  metaTitle?: string | null
  metaDescription?: string | null
  slug?: string | null
  status?: string
  createdBy?: string | null
  workspaceId?: string | null
}

export async function persistSeoDraft(input: CreateSeoDraftInput): Promise<string | null> {
  try {
    const prisma = await getPrisma()
    if (!prisma) return null
    const draft = await (prisma as any).aiSeoDraft.create({
      data: {
        title: input.title,
        keywords: input.keywords,
        content: input.content,
        metaTitle: input.metaTitle ?? null,
        metaDescription: input.metaDescription ?? null,
        slug: input.slug ?? null,
        status: input.status ?? "draft",
        createdBy: input.createdBy ?? null,
        workspaceId: input.workspaceId ?? null,
      },
    })
    return draft.id
  } catch (err) {
    console.error("[AI Persistence] Failed to persist SEO draft:", err instanceof Error ? err.message : err)
    return null
  }
}

// ---------------------------------------------------------------------------
// Contract Extractions
// ---------------------------------------------------------------------------

export interface CreateContractExtractionInput {
  dealId?: string | null
  documentId?: string | null
  parties: unknown
  vehicle: unknown
  pricing: unknown
  fees: unknown
  terms: unknown
  redFlags: unknown
  rawText?: string | null
  status?: string
  disclaimer: string
  workspaceId?: string | null
}

export async function persistContractExtraction(input: CreateContractExtractionInput): Promise<string | null> {
  try {
    const prisma = await getPrisma()
    if (!prisma) return null
    const extraction = await (prisma as any).aiContractExtraction.create({
      data: {
        dealId: input.dealId ?? null,
        documentId: input.documentId ?? null,
        parties: input.parties,
        vehicle: input.vehicle,
        pricing: input.pricing,
        fees: input.fees,
        terms: input.terms,
        redFlags: input.redFlags,
        rawText: input.rawText ?? null,
        status: input.status ?? "completed",
        disclaimer: input.disclaimer,
        workspaceId: input.workspaceId ?? null,
      },
    })
    return extraction.id
  } catch (err) {
    console.error("[AI Persistence] Failed to persist contract extraction:", err instanceof Error ? err.message : err)
    return null
  }
}

// ---------------------------------------------------------------------------
// Admin Confirmation Gate
// ---------------------------------------------------------------------------

export interface PendingConfirmation {
  token: string
  toolName: string
  arguments: Record<string, unknown>
  adminId: string
  workspaceId: string | null
  createdAt: number
  expiresAt: number
}

/**
 * In-memory store for pending admin confirmations. Each token expires
 * after 5 minutes. The source of truth for completed actions is always
 * the database; this store only gates the confirmation flow.
 */
const pendingConfirmations = new Map<string, PendingConfirmation>()

const CONFIRMATION_TTL_MS = 5 * 60 * 1000

export function createPendingConfirmation(
  toolName: string,
  args: Record<string, unknown>,
  adminId: string,
  workspaceId: string | null,
): PendingConfirmation {
  const token = `confirm_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
  const now = Date.now()
  const pending: PendingConfirmation = {
    token,
    toolName,
    arguments: args,
    adminId,
    workspaceId,
    createdAt: now,
    expiresAt: now + CONFIRMATION_TTL_MS,
  }
  pendingConfirmations.set(token, pending)
  return pending
}

export function getPendingConfirmation(token: string): PendingConfirmation | null {
  const pending = pendingConfirmations.get(token)
  if (!pending) return null
  if (Date.now() > pending.expiresAt) {
    pendingConfirmations.delete(token)
    return null
  }
  return pending
}

export function consumePendingConfirmation(token: string): PendingConfirmation | null {
  const pending = getPendingConfirmation(token)
  if (pending) {
    pendingConfirmations.delete(token)
  }
  return pending
}

export function cleanupExpiredConfirmations(): void {
  const now = Date.now()
  for (const [token, pending] of pendingConfirmations) {
    if (now > pending.expiresAt) {
      pendingConfirmations.delete(token)
    }
  }
}
