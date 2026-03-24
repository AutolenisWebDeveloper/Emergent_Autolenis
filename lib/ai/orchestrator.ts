/**
 * Orchestrator – central AI coordination layer for AutoLenis.
 *
 * Responsibilities:
 *  1. Build viewer context (role, userId, permissions).
 *  2. Classify intent & risk level (Gemini-first, deterministic fallback).
 *  3. Route to the correct specialist agent.
 *  4. Inject conversation memory.
 *  5. Restrict tools per agent + role.
 *  6. Execute tool calls with validation & RBAC.
 *  7. Log every interaction for audit.
 *  8. Persist conversations/messages to database.
 */

import { buildViewerContext, type AIRole, type SessionLike, type ViewerContext } from "./context-builder"
import { routeToAgent, routeToAgentSync, type RoutingResult, type ClassificationSchema } from "./router"
import { getToolsForAgent, validateToolAccess, getTool, type ToolDefinition } from "./tools/registry"
import { sessionStore, type ChatMessage } from "./memory/session-store"
import { isAIDisabled, isAIDisabledForUser } from "./gemini-client"
import { retrieveKnowledge, formatRetrievalContext, getCorpusBuildId } from "./knowledge"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OrchestratorInput {
  conversationId: string
  message: string
  session: SessionLike | null
}

export interface ToolCall {
  name: string
  arguments: Record<string, unknown>
}

export interface OrchestratorResult {
  conversationId: string
  agent: string
  intent: string
  riskLevel: string
  role: AIRole
  systemPrompt: string
  availableTools: ToolDefinition[]
  memoryContext: { summary: string | null; messages: ChatMessage[] }
  disclosure: string | null
  viewer: ViewerContext
  classificationSchema: ClassificationSchema
  /** Retrieved knowledge context injected into the system prompt. */
  retrievalContext: string | null
  /** Corpus build ID / git SHA for traceability. */
  buildId: string
}

export interface AuditEntry {
  conversationId: string
  userId: string | null
  role: AIRole
  agent: string
  intent: string
  riskLevel: string
  toolUsed: string | null
  timestamp: number
  /** IDs of knowledge documents retrieved for this interaction. */
  sourceIds?: string[]
  /** Corpus build ID / git SHA. */
  buildId?: string
  /** Calculator tool call inputs (PII-safe). */
  toolInputs?: Record<string, unknown>
  /** Calculator tool call outputs. */
  toolOutputs?: unknown
}

// ---------------------------------------------------------------------------
// Audit log (in-memory; can be wired to Supabase ai_admin_actions table)
// ---------------------------------------------------------------------------

const auditLog: AuditEntry[] = []

export function logAudit(entry: AuditEntry): void {
  auditLog.push(entry)
}

export function getAuditLog(): readonly AuditEntry[] {
  return auditLog
}

// ---------------------------------------------------------------------------
// DB Persistence helpers (lazy – only used when Prisma is available)
// ---------------------------------------------------------------------------

async function persistConversation(
  conversationId: string,
  viewer: ViewerContext,
  agent: string,
  intent: string,
): Promise<void> {
  try {
    const { prisma } = await import("@/lib/prisma")
    if (!prisma) return
    await prisma.aiConversation.upsert({
      where: { id: conversationId },
      update: { agent, intent },
      create: {
        id: conversationId,
        userId: viewer.userId,
        role: viewer.role,
        agent,
        intent,
        workspaceId: viewer.workspaceId,
      },
    })
  } catch {
    // DB unavailable – continue without persistence
  }
}

/** Maximum characters stored per message in the database. */
const MAX_MESSAGE_CONTENT_LENGTH = 10_000

async function persistMessage(
  conversationId: string,
  sender: string,
  content: string,
  toolUsed: string | null,
  riskLevel: string | null,
): Promise<void> {
  try {
    const { prisma } = await import("@/lib/prisma")
    if (!prisma) return
    await prisma.aiMessage.create({
      data: {
        conversationId,
        sender,
        content: content.slice(0, MAX_MESSAGE_CONTENT_LENGTH),
        toolUsed,
        riskLevel,
      },
    })
  } catch {
    // DB unavailable – continue without persistence
  }
}

// ---------------------------------------------------------------------------
// Orchestrate (async – Gemini classification)
// ---------------------------------------------------------------------------

/**
 * Main orchestration entry point (async – uses Gemini classification).
 */
export async function orchestrate(input: OrchestratorInput): Promise<OrchestratorResult> {
  const { conversationId, message, session } = input

  // 1. Context
  const viewer = buildViewerContext(session)

  // Check per-user kill switch
  if (isAIDisabledForUser(viewer.userId)) {
    const fallbackResult = orchestrateSync(input)
    return { ...fallbackResult, disclosure: "AI has been disabled for your account by an administrator." }
  }

  // 2. Route (async – tries Gemini first)
  const routing: RoutingResult = await routeToAgent(viewer.role, message)

  // 3. Memory
  sessionStore.addMessage(conversationId, {
    sender: "user",
    content: message,
    timestamp: Date.now(),
  })
  const memoryContext = sessionStore.getContext(conversationId)

  // 4. Tool gating
  const availableTools = getToolsForAgent(routing.agent.allowedTools, viewer.role)

  // 4b. Knowledge retrieval (RAG)
  const retrieval = retrieveKnowledge(message, viewer.role)
  const retrievalContext = formatRetrievalContext(retrieval)
  const buildId = getCorpusBuildId()

  // Augment system prompt with retrieved knowledge
  const augmentedSystemPrompt = retrievalContext
    ? `${routing.agent.systemPrompt}\n\n${retrievalContext}`
    : routing.agent.systemPrompt

  // 5. Audit
  logAudit({
    conversationId,
    userId: viewer.userId,
    role: viewer.role,
    agent: routing.agent.name,
    intent: routing.classified.intent,
    riskLevel: routing.classified.riskLevel,
    toolUsed: null,
    timestamp: Date.now(),
    sourceIds: retrieval.documents.map((d) => d.id),
    buildId,
  })

  // 6. Persist to DB (fire and forget)
  void persistConversation(conversationId, viewer, routing.agent.name, routing.classified.intent)
  void persistMessage(conversationId, "user", message, null, null)

  return {
    conversationId,
    agent: routing.agent.name,
    intent: routing.classified.intent,
    riskLevel: routing.classified.riskLevel,
    role: viewer.role,
    systemPrompt: augmentedSystemPrompt,
    availableTools,
    memoryContext,
    disclosure: routing.disclosure,
    viewer,
    classificationSchema: routing.classificationSchema,
    retrievalContext,
    buildId,
  }
}

/**
 * Synchronous orchestration (deterministic fallback, no Gemini).
 * Used by tests and when Gemini is unavailable.
 */
export function orchestrateSync(input: OrchestratorInput): OrchestratorResult {
  const { conversationId, message, session } = input
  const viewer = buildViewerContext(session)
  const routing = routeToAgentSync(viewer.role, message)

  sessionStore.addMessage(conversationId, {
    sender: "user",
    content: message,
    timestamp: Date.now(),
  })
  const memoryContext = sessionStore.getContext(conversationId)
  const availableTools = getToolsForAgent(routing.agent.allowedTools, viewer.role)

  // Knowledge retrieval
  const retrieval = retrieveKnowledge(message, viewer.role)
  const retrievalContext = formatRetrievalContext(retrieval)
  const buildId = getCorpusBuildId()

  const augmentedSystemPrompt = retrievalContext
    ? `${routing.agent.systemPrompt}\n\n${retrievalContext}`
    : routing.agent.systemPrompt

  logAudit({
    conversationId,
    userId: viewer.userId,
    role: viewer.role,
    agent: routing.agent.name,
    intent: routing.classified.intent,
    riskLevel: routing.classified.riskLevel,
    toolUsed: null,
    timestamp: Date.now(),
    sourceIds: retrieval.documents.map((d) => d.id),
    buildId,
  })

  return {
    conversationId,
    agent: routing.agent.name,
    intent: routing.classified.intent,
    riskLevel: routing.classified.riskLevel,
    role: viewer.role,
    systemPrompt: augmentedSystemPrompt,
    availableTools,
    memoryContext,
    disclosure: routing.disclosure,
    viewer,
    classificationSchema: routing.classificationSchema,
    retrievalContext,
    buildId,
  }
}

// ---------------------------------------------------------------------------
// Tool execution
// ---------------------------------------------------------------------------

export interface ToolExecutionResult {
  success: boolean
  data?: unknown
  error?: string
}

/** High-risk admin tools that require 2-step confirmation. */
const HIGH_RISK_ADMIN_TOOLS = new Set([
  "reconcileAffiliatePayout",
  "generateReport",
])

/**
 * Execute a tool call after validating role permissions.
 * High-risk admin tools require confirmation (confirmed flag must be true).
 */
export async function executeTool(
  toolCall: ToolCall,
  role: AIRole,
  conversationId: string,
  userId: string | null,
  confirmed?: boolean,
): Promise<ToolExecutionResult> {
  // Global kill switch
  if (isAIDisabled()) {
    return { success: false, error: "AI actions are currently disabled." }
  }

  // Per-user kill switch
  if (isAIDisabledForUser(userId)) {
    return { success: false, error: "AI has been disabled for your account by an administrator." }
  }

  // Validate access
  const access = validateToolAccess(toolCall.name, role)
  if (!access.allowed) {
    return { success: false, error: access.reason }
  }

  const tool = getTool(toolCall.name)
  if (!tool) {
    return { success: false, error: `Tool "${toolCall.name}" not found.` }
  }

  // 2-step confirmation gate for high-risk admin tools
  if (HIGH_RISK_ADMIN_TOOLS.has(toolCall.name) && role === "admin" && !confirmed) {
    return {
      success: false,
      error: `Tool "${toolCall.name}" is a high-risk action. Please confirm execution by re-sending with confirmed: true.`,
    }
  }

  // Execute
  try {
    const data = await tool.handler(toolCall.arguments)

    // Record in memory
    sessionStore.addMessage(conversationId, {
      sender: "tool",
      content: JSON.stringify(data),
      toolUsed: toolCall.name,
      timestamp: Date.now(),
    })

    // Persist tool message
    void persistMessage(conversationId, "tool", JSON.stringify(data), toolCall.name, "low")

    // Audit
    if (tool.auditRequired) {
      logAudit({
        conversationId,
        userId,
        role,
        agent: "tool_execution",
        intent: toolCall.name,
        riskLevel: "low",
        toolUsed: toolCall.name,
        timestamp: Date.now(),
        toolInputs: toolCall.arguments,
        toolOutputs: data,
      })
    }

    return { success: true, data }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return { success: false, error: message }
  }
}
