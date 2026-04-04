/**
 * Knowledge Store – static corpus of AutoLenis website content for Lenis Concierge RAG.
 *
 * Each document chunk has:
 *   id, title, text, url, visibility, tags, updatedAt, buildId
 *
 * This file IS the source-of-truth corpus. It is regenerated on every build
 * by `scripts/build-knowledge.ts` but also serves as a directly importable
 * module for the retrieval layer.
 */

export interface KnowledgeDocument {
  id: string
  title: string
  text: string
  url: string
  visibility: "public" | "buyer" | "dealer" | "affiliate" | "admin"
  tags: string[]
  updatedAt: string
  buildId: string
}

export type KnowledgeCorpus = KnowledgeDocument[]
