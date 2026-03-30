/**
 * Shared types for the AutoLenis five-copilot agentic system.
 * No `any` types. All boundaries strictly typed.
 */

// ---------------------------------------------------------------------------
// Variant & Role
// ---------------------------------------------------------------------------

export type CopilotVariant = "public" | "buyer" | "dealer" | "affiliate" | "admin"

export type UserRole = "anonymous" | "buyer" | "dealer" | "affiliate" | "admin"

// ---------------------------------------------------------------------------
// Deal Stage
// ---------------------------------------------------------------------------

export type DealStage =
  | "SELECTED"
  | "FINANCING_PENDING"
  | "FINANCING_APPROVED"
  | "FEE_PENDING"
  | "FEE_PAID"
  | "INSURANCE_PENDING"
  | "INSURANCE_COMPLETE"
  | "CONTRACT_PENDING"
  | "CONTRACT_REVIEW"
  | "CONTRACT_MANUAL_REVIEW_REQUIRED"
  | "CONTRACT_INTERNAL_FIX_IN_PROGRESS"
  | "CONTRACT_ADMIN_OVERRIDE_APPROVED"
  | "CONTRACT_APPROVED"
  | "SIGNING_PENDING"
  | "SIGNED"
  | "PICKUP_SCHEDULED"
  | "COMPLETED"
  | "CANCELLED"

export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  SELECTED: "Vehicle Selected",
  FINANCING_PENDING: "Financing in Progress",
  FINANCING_APPROVED: "Financing Approved",
  FEE_PENDING: "Concierge Fee Due",
  FEE_PAID: "Fee Paid",
  INSURANCE_PENDING: "Insurance Needed",
  INSURANCE_COMPLETE: "Insurance Complete",
  CONTRACT_PENDING: "Contract Being Prepared",
  CONTRACT_REVIEW: "Contract Under Review",
  CONTRACT_MANUAL_REVIEW_REQUIRED: "Manual Review Required",
  CONTRACT_INTERNAL_FIX_IN_PROGRESS: "Internal Fix in Progress",
  CONTRACT_ADMIN_OVERRIDE_APPROVED: "Override Approved",
  CONTRACT_APPROVED: "Contract Approved",
  SIGNING_PENDING: "Ready to Sign",
  SIGNED: "Signed",
  PICKUP_SCHEDULED: "Pickup Scheduled",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
}

// ---------------------------------------------------------------------------
// Conversation
// ---------------------------------------------------------------------------

export interface ConversationTurn {
  role: "user" | "assistant"
  content: string
  timestamp: number
}

export interface QuickAction {
  label: string
  /** Pre-fills the input — optional auto-submit flag */
  message: string
  autoSubmit?: boolean
}

export interface ConfirmationRequest {
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  /** The tool to call on confirmation */
  toolName: string
  toolArgs: Record<string, string | number | boolean>
}

export interface ActionResult {
  summary: string
  redirectTo?: string
  redirectLabel?: string
}

// ---------------------------------------------------------------------------
// Copilot context
// ---------------------------------------------------------------------------

export interface CopilotContext {
  variant: CopilotVariant
  role: UserRole
  route: string
  sessionId: string
  isTestWorkspace?: boolean
  /** Authenticated user ID (non-public variants) */
  userId?: string
  /** Active deal ID for buyer context */
  dealId?: string
  /** Current deal stage */
  dealStage?: DealStage
}

// ---------------------------------------------------------------------------
// Request / Response
// ---------------------------------------------------------------------------

export interface CopilotRequest {
  message: string
  context: CopilotContext
  history: ConversationTurn[]
  /** Confirmation acknowledgment from user */
  confirmedTool?: {
    toolName: string
    toolArgs: Record<string, string | number | boolean>
  }
}

export type CopilotRenderState =
  | "text_response"
  | "quick_actions"
  | "confirmation"
  | "action_result"
  | "loading"
  | "error"

export interface CopilotResponse {
  renderState: CopilotRenderState
  text?: string
  quickActions?: QuickAction[]
  confirmation?: ConfirmationRequest
  actionResult?: ActionResult
  errorMessage?: string
  /** Intent that was matched */
  intent?: string
}

// ---------------------------------------------------------------------------
// Tool definition
// ---------------------------------------------------------------------------

export interface CopilotTool {
  name: string
  description: string
  requiresConfirmation: boolean
  requiredDealStage?: DealStage[]
  requiredRole?: UserRole[]
  /** Execute the tool server-side; returns an ActionResult */
  execute: (
    args: Record<string, string | number | boolean>,
    context: CopilotContext,
    sessionToken: string,
  ) => Promise<ActionResult>
}
