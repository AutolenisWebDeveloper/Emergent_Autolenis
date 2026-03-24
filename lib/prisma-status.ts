/**
 * Prisma availability utilities.
 *
 * Separated from lib/db.ts so that portal API routes can check Prisma
 * readiness without importing the service-role Supabase client that
 * lib/db.ts also exports.
 */

export { isPrismaAvailable as isPrismaReady, isPrismaConfigured } from "./db"
