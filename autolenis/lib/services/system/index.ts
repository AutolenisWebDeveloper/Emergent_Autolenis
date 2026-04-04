/**
 * Phase 12 — System Operations
 *
 * Public barrel export for the system operations service.
 */

// Types
export type {
  HealthCheckStatus,
  HealthCheckInput,
  SystemHealthCheck,
  JobRunType,
  JobRunStatus,
  StartJobRunInput,
  SystemJobRun,
  IncidentSeverity,
  IncidentStatus,
  OpenIncidentInput,
  SystemIncident,
  SystemRateLimit,
  SystemConfigEntry,
  ConfigValidationResult,
} from "./types"

// Service functions
export {
  // Health checks
  recordHealthCheck,
  recordHealthCheckAsync,
  getLatestHealthChecks,
  // Job runs
  startJobRun,
  startJobRunAsync,
  completeJobRun,
  completeJobRunAsync,
  getRecentJobRuns,
  // Incidents
  openIncident,
  openIncidentAsync,
  updateIncidentStatus,
  updateIncidentStatusAsync,
  getOpenIncidents,
  // Rate limits
  getRateLimits,
  getRateLimit,
  // Config validation
  validateConfig,
  // Test utilities
  resetSystemStores,
  getHealthCheckStore,
  getJobRunStore,
  getIncidentStore,
} from "./ops.service"
