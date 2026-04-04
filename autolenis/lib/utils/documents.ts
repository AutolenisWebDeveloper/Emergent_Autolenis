/**
 * Document type labels for display
 */
export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  ID: "Government ID",
  INSURANCE_PROOF: "Insurance Proof",
  PAY_STUB: "Pay Stub",
  BANK_STATEMENT: "Bank Statement",
  TRADE_IN_TITLE: "Trade-In Title",
  PRE_APPROVAL_LETTER: "Pre-Approval Letter",
  OTHER: "Other",
}

/**
 * Valid document types
 */
export const VALID_DOCUMENT_TYPES = [
  "ID",
  "INSURANCE_PROOF",
  "PAY_STUB",
  "BANK_STATEMENT",
  "TRADE_IN_TITLE",
  "PRE_APPROVAL_LETTER",
  "OTHER",
] as const

export type DocumentType = (typeof VALID_DOCUMENT_TYPES)[number]

export function isDocumentType(value: string): value is DocumentType {
  return VALID_DOCUMENT_TYPES.includes(value as DocumentType)
}

export const ACCEPTED_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const

export const ACCEPTED_DOCUMENT_MIME_TYPES_INPUT = ACCEPTED_DOCUMENT_MIME_TYPES.join(",")

/** Maximum allowed file size for document uploads (25 MB) */
export const MAX_DOCUMENT_FILE_SIZE = 25 * 1024 * 1024

export function isAcceptedDocumentMimeType(mimeType?: string | null): boolean {
  if (!mimeType) return false
  return (ACCEPTED_DOCUMENT_MIME_TYPES as readonly string[]).includes(mimeType)
}

/**
 * Format a document type for display in messages
 */
export function formatDocumentType(type: string): string {
  return DOCUMENT_TYPE_LABELS[type] || type.replace(/_/g, " ").toLowerCase()
}
