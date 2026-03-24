/**
 * Knowledge module — public API.
 */
export { knowledgeCorpus } from "./corpus"
export { retrieveKnowledge, formatRetrievalContext, getCorpusBuildId } from "./retrieval"
export type { KnowledgeDocument, KnowledgeCorpus } from "./types"
export type { RetrievalResult } from "./retrieval"
