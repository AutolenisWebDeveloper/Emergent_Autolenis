/**
 * Job queue abstraction for background processing.
 * Supports in-memory (default) and can be extended for Redis-backed queues.
 * Queue provider is selected via QUEUE_PROVIDER env var: "memory" (default) | "redis".
 */

// ---------------------------------------------------------------------------
// Job types
// ---------------------------------------------------------------------------

export type JobType = "commission.process" | "email.send" | "reconciliation.run"

export interface CommissionProcessPayload {
  dealId: string
  affiliateId: string
  amount: number
  currency: string
  correlationId?: string
}

export interface EmailSendPayload {
  to: string
  subject: string
  templateId: string
  templateData: Record<string, unknown>
  correlationId?: string
}

export interface ReconciliationRunPayload {
  startDate: string
  endDate: string
  correlationId?: string
}

export type JobPayload =
  | { type: "commission.process"; data: CommissionProcessPayload }
  | { type: "email.send"; data: EmailSendPayload }
  | { type: "reconciliation.run"; data: ReconciliationRunPayload }

export type JobStatus = "pending" | "processing" | "completed" | "failed"

export interface Job<T = JobPayload> {
  id: string
  payload: T
  status: JobStatus
  createdAt: Date
  updatedAt: Date
  attempts: number
  maxAttempts: number
  error?: string
}

// ---------------------------------------------------------------------------
// JobQueue interface
// ---------------------------------------------------------------------------

export type JobHandler = (payload: JobPayload) => Promise<void>

export interface JobQueue {
  /**
   * Enqueue a new job for background processing.
   * Returns the job ID.
   */
  enqueue(payload: JobPayload, options?: { maxAttempts?: number }): Promise<string>

  /**
   * Register a handler that processes jobs as they arrive.
   * Only one handler is active at a time per queue instance.
   */
  process(handler: JobHandler): void

  /**
   * Get the current status of a job by ID.
   */
  getStatus(jobId: string): Promise<Job | null>
}

// ---------------------------------------------------------------------------
// In-memory implementation (default, dev / single-instance)
// ---------------------------------------------------------------------------

let counter = 0
function generateJobId(): string {
  counter += 1
  return `job_${Date.now()}_${counter}`
}

export class InMemoryJobQueue implements JobQueue {
  private jobs = new Map<string, Job>()
  private handler: JobHandler | null = null
  private processing = false

  async enqueue(payload: JobPayload, options?: { maxAttempts?: number }): Promise<string> {
    const id = generateJobId()
    const job: Job = {
      id,
      payload,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
      attempts: 0,
      maxAttempts: options?.maxAttempts ?? 3,
    }
    this.jobs.set(id, job)
    // Trigger processing on next tick if a handler is registered
    if (this.handler && !this.processing) {
      void this.tick().catch((err) => {
        console.error("[JobQueue] Unhandled error during background processing:", err)
      })
    }
    return id
  }

  process(handler: JobHandler): void {
    this.handler = handler
  }

  async getStatus(jobId: string): Promise<Job | null> {
    return this.jobs.get(jobId) ?? null
  }

  /** Drain pending jobs synchronously (for testing). */
  async drain(): Promise<void> {
    if (!this.handler) return
    while (this.hasPending()) {
      await this.tick()
    }
  }

  private hasPending(): boolean {
    for (const job of this.jobs.values()) {
      if (job.status === "pending") return true
    }
    return false
  }

  private async tick(): Promise<void> {
    if (!this.handler || this.processing) return
    this.processing = true

    try {
      for (const job of this.jobs.values()) {
        if (job.status !== "pending") continue

        job.status = "processing"
        job.attempts += 1
        job.updatedAt = new Date()

        try {
          await this.handler(job.payload)
          job.status = "completed"
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          if (job.attempts >= job.maxAttempts) {
            job.status = "failed"
            job.error = message
          } else {
            job.status = "pending"
            job.error = message
          }
        }
        job.updatedAt = new Date()
      }
    } finally {
      this.processing = false
    }
  }

  /** Exposed for testing only. */
  _size(): number {
    return this.jobs.size
  }

  destroy(): void {
    this.jobs.clear()
    this.handler = null
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

let queueInstance: JobQueue | null = null

/**
 * Returns the appropriate job queue based on environment.
 * - QUEUE_PROVIDER=redis → reserved for future Redis-backed implementation
 * - Otherwise → InMemoryJobQueue (default)
 *
 * The queue is created once and reused (singleton).
 */
export function getJobQueue(): JobQueue {
  if (queueInstance) return queueInstance

  const provider = process.env["QUEUE_PROVIDER"] ?? "memory"

  if (provider === "redis") {
    // Future: plug in a BullMQ / Redis-backed queue here.
    // For now, fall back to in-memory with a warning.
    console.warn("[JobQueue] QUEUE_PROVIDER=redis is not yet implemented. Falling back to in-memory queue.")
  }

  queueInstance = new InMemoryJobQueue()
  return queueInstance
}

/** Reset the singleton – for testing only. */
export function _resetJobQueue(): void {
  queueInstance = null
}
