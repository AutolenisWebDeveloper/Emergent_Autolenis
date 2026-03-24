/**
 * Knowledge Retrieval – keyword-based search with role-scoped visibility.
 *
 * Provides the retrieval layer for Lenis Concierge RAG.
 * Queries the static corpus and returns matching documents filtered by
 * the user's role visibility.
 */

import type { AIRole } from "../context-builder"
import type { KnowledgeDocument } from "./types"
import { knowledgeCorpus } from "./corpus"

// ---------------------------------------------------------------------------
// Visibility rules – which roles can access which visibility levels
// ---------------------------------------------------------------------------

const VISIBILITY_ACCESS: Record<AIRole, KnowledgeDocument["visibility"][]> = {
  public: ["public"],
  buyer: ["public", "buyer"],
  dealer: ["public", "dealer"],
  affiliate: ["public", "affiliate"],
  admin: ["public", "buyer", "dealer", "affiliate", "admin"],
}

// ---------------------------------------------------------------------------
// Search result type
// ---------------------------------------------------------------------------

export interface RetrievalResult {
  documents: KnowledgeDocument[]
  query: string
  role: AIRole
  buildId: string
}

// ---------------------------------------------------------------------------
// Tokenization & scoring
// ---------------------------------------------------------------------------

/** Normalize a string for matching: lowercase, strip punctuation, split on whitespace. */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1)
}

/** Stop words to ignore during matching. */
const STOP_WORDS = new Set([
  "the", "is", "at", "which", "on", "in", "to", "of", "and", "or",
  "it", "an", "as", "be", "by", "for", "from", "has", "he", "if",
  "its", "my", "not", "was", "are", "but", "can", "do", "had",
  "her", "his", "how", "me", "no", "our", "out", "she", "so",
  "up", "we", "what", "who", "will", "with", "you", "your", "this",
  "that", "they", "them", "have", "been", "does", "did", "would",
  "could", "should", "about", "just", "than", "very",
])

/**
 * Score a document against query tokens using TF-based keyword matching.
 * Higher score = better match.
 */
function scoreDocument(doc: KnowledgeDocument, queryTokens: string[]): number {
  const meaningful = queryTokens.filter((t) => !STOP_WORDS.has(t))
  if (meaningful.length === 0) return 0

  const docText = `${doc.title} ${doc.text} ${doc.tags.join(" ")}`.toLowerCase()
  let score = 0

  for (const token of meaningful) {
    // Title match is worth more
    if (doc.title.toLowerCase().includes(token)) {
      score += 3
    }
    // Tag match
    if (doc.tags.some((tag) => tag.includes(token))) {
      score += 2
    }
    // Text match
    if (docText.includes(token)) {
      score += 1
    }
  }

  // Bonus for multi-word phrase match in text
  const queryPhrase = meaningful.join(" ")
  if (queryPhrase.length > 3 && docText.includes(queryPhrase)) {
    score += 5
  }

  return score
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Search the knowledge corpus with role-scoped visibility.
 *
 * @param query - The user's question or search text
 * @param role - The user's AIRole for visibility filtering
 * @param maxResults - Maximum number of results to return (default: 3)
 * @returns Matching documents sorted by relevance, filtered by visibility
 */
export function retrieveKnowledge(
  query: string,
  role: AIRole,
  maxResults = 3,
): RetrievalResult {
  const allowedVisibility = VISIBILITY_ACCESS[role] ?? VISIBILITY_ACCESS.public
  const queryTokens = tokenize(query)

  // Filter by visibility, then score and sort
  const scored = knowledgeCorpus
    .filter((doc) => allowedVisibility.includes(doc.visibility))
    .map((doc) => ({ doc, score: scoreDocument(doc, queryTokens) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)

  const buildId = getCorpusBuildId()

  return {
    documents: scored.map((entry) => entry.doc),
    query,
    role,
    buildId,
  }
}

/**
 * Format retrieved documents into a context string for inclusion in the system prompt.
 * Returns null if no documents were retrieved.
 */
export function formatRetrievalContext(result: RetrievalResult): string | null {
  if (result.documents.length === 0) return null

  const citations = result.documents
    .map((doc, i) => `[Source ${i + 1}: ${doc.title} (${doc.url})]\n${doc.text}`)
    .join("\n\n")

  return `RETRIEVED KNOWLEDGE (use these sources to answer — cite the source URL when relevant):\n\n${citations}\n\nBuild: ${result.buildId}`
}

/**
 * Get the current build ID from the corpus.
 */
export function getCorpusBuildId(): string {
  return knowledgeCorpus[0]?.buildId ?? "unknown"
}
