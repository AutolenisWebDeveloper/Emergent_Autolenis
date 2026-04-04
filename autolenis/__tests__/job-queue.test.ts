import { describe, it, expect, beforeEach } from "vitest"
import {
  InMemoryJobQueue,
  getJobQueue,
  _resetJobQueue,
  type JobPayload,
} from "@/lib/queue/job-queue"

describe("InMemoryJobQueue", () => {
  let queue: InMemoryJobQueue

  beforeEach(() => {
    queue = new InMemoryJobQueue()
  })

  it("enqueues jobs and returns an id", async () => {
    const id = await queue.enqueue({
      type: "email.send",
      data: {
        to: "test@example.com",
        subject: "Hello",
        templateId: "welcome",
        templateData: {},
      },
    })
    expect(id).toBeTruthy()
    expect(queue._size()).toBe(1)
  })

  it("returns job status as pending initially", async () => {
    const id = await queue.enqueue({
      type: "commission.process",
      data: {
        dealId: "deal_1",
        affiliateId: "aff_1",
        amount: 100,
        currency: "USD",
      },
    })
    const job = await queue.getStatus(id)
    expect(job).not.toBeNull()
    expect(job?.status).toBe("pending")
  })

  it("processes jobs via registered handler", async () => {
    const processed: string[] = []
    queue.process(async (payload: JobPayload) => {
      processed.push(payload.type)
    })

    await queue.enqueue({
      type: "reconciliation.run",
      data: { startDate: "2024-01-01", endDate: "2024-01-31" },
    })

    await queue.drain()
    expect(processed).toEqual(["reconciliation.run"])
  })

  it("marks jobs as failed after maxAttempts", async () => {
    queue.process(async () => {
      throw new Error("processing error")
    })

    const id = await queue.enqueue(
      {
        type: "email.send",
        data: {
          to: "test@example.com",
          subject: "Test",
          templateId: "t1",
          templateData: {},
        },
      },
      { maxAttempts: 1 },
    )

    await queue.drain()
    const job = await queue.getStatus(id)
    expect(job?.status).toBe("failed")
    expect(job?.error).toBe("processing error")
  })

  it("returns null for unknown job ids", async () => {
    expect(await queue.getStatus("nonexistent")).toBeNull()
  })
})

describe("getJobQueue", () => {
  beforeEach(() => {
    _resetJobQueue()
  })

  it("returns InMemoryJobQueue by default", () => {
    delete process.env["QUEUE_PROVIDER"]
    const q = getJobQueue()
    expect(q).toBeInstanceOf(InMemoryJobQueue)
  })

  it("returns the same singleton on repeated calls", () => {
    delete process.env["QUEUE_PROVIDER"]
    const a = getJobQueue()
    const b = getJobQueue()
    expect(a).toBe(b)
  })
})
