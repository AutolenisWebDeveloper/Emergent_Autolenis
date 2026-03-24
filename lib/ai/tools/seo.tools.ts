/**
 * SEO Tools – tools available to the SEO agent.
 * Handlers delegate to SEOService and persist drafts to DB.
 */

import type { ToolDefinition } from "./registry"

export const seoTools: ToolDefinition[] = [
  {
    name: "updateMetaTags",
    description: "Update page title and meta description for a given route. Saves as a draft — does NOT auto-publish.",
    inputSchema: {
      type: "object",
      properties: {
        route: { type: "string", description: "Page route (e.g. /pricing)" },
        title: { type: "string", description: "New page title (max 60 chars)" },
        description: { type: "string", description: "New meta description (max 160 chars)" },
      },
      required: ["route", "title", "description"],
    },
    allowedRoles: ["admin"],
    auditRequired: true,
    handler: async (_input) => {
      return { success: false, error: "Meta tag update service not available" }
    },
  },
  {
    name: "createBlogDraft",
    description: "Create an SEO-optimized blog post draft. Does NOT auto-publish — requires admin confirmation.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Blog post title" },
        keywords: { type: "string", description: "Comma-separated target keywords" },
        wordCount: { type: "string", description: "Target word count (default 1000)" },
        content: { type: "string", description: "Blog post content (markdown)" },
      },
      required: ["title", "keywords"],
    },
    allowedRoles: ["admin"],
    auditRequired: true,
    handler: async (_input) => {
      return { success: false, error: "Blog draft service not available" }
    },
  },
  {
    name: "generateFAQSchema",
    description: "Generate JSON-LD FAQ structured data for a page. Saves as draft.",
    inputSchema: {
      type: "object",
      properties: {
        route: { type: "string", description: "Page route" },
        questions: { type: "string", description: "JSON array of {question, answer} objects" },
      },
      required: ["route", "questions"],
    },
    allowedRoles: ["admin"],
    auditRequired: false,
    handler: async (_input) => {
      return { success: false, error: "FAQ schema service not available" }
    },
  },
  {
    name: "suggestInternalLinks",
    description: "Suggest internal linking opportunities for a page based on existing site structure.",
    inputSchema: {
      type: "object",
      properties: {
        route: { type: "string", description: "Page route to analyse" },
      },
      required: ["route"],
    },
    allowedRoles: ["admin"],
    auditRequired: false,
    handler: async (_input) => {
      return { success: false, error: "Internal link suggestion service not available" }
    },
  },
]
