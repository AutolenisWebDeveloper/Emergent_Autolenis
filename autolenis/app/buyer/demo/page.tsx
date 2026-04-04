"use client"

import { csrfHeaders } from "@/lib/csrf-client"
import { useState, useRef, useCallback } from "react"
import Link from "next/link"
import { ProtectedRoute } from "@/components/layout/protected-route"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
  CheckCircle2,
  Lock,
  Circle,
  Copy,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Play,
} from "lucide-react"
import useSWR from "swr"
import {
  CANONICAL_STATUSES,
  STATUS_LABELS,
  computeBuyerProgress,
} from "@/lib/progress/dealProgress"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const KEY_IDS = {
  dealId: "deal_gold_001",
  requestId: "req_gold_001",
  auctionId: "auc_gold_001",
  contractId: "ctr_gold_001",
} as const

const STATUS_PAGE_MAP: Record<string, string> = {
  REQUEST_SUBMITTED: "/buyer/requests",
  PREQUAL_STARTED: "/buyer/prequal",
  PREQUAL_APPROVED: "/buyer/prequal",
  DOCS_UPLOADED: "/buyer/documents",
  SHORTLIST_CREATED: "/buyer/shortlist",
  AUCTION_STARTED: "/buyer/auction",
  OFFERS_RECEIVED: "/buyer/offers",
  OFFER_SELECTED: "/buyer/offers",
  DEAL_SELECTED: "/buyer/offers",
  DEPOSIT_PAID: "/buyer/payments",
  CONTRACT_UPLOADED: "/buyer/contracts",
  CONTRACT_SHIELD_COMPLETE: "/buyer/contract-shield",
  ESIGN_SENT: "/buyer/esign",
  ESIGN_COMPLETED: "/buyer/esign",
  FUNDING_STARTED: "/buyer/deal/deal_gold_001/financing",
  PAYMENT_REQUESTED: "/buyer/payments",
  BUYER_PAYMENT_RECEIVED: "/buyer/payments",
  DELIVERY_SCHEDULED: "/buyer/deal/deal_gold_001/pickup",
  DELIVERY_CONFIRMED: "/buyer/deal/deal_gold_001/pickup",
  DEAL_COMPLETED: "/buyer/dashboard",
}

const DEMO_ACTIONS = [
  { label: "Submit Request", action: "submitRequest" },
  { label: "Run Prequal", action: "runPrequal" },
  { label: "Upload Docs", action: "uploadDocs" },
  { label: "Create Shortlist", action: "createShortlist" },
  { label: "Start Auction", action: "startAuction" },
  { label: "Generate Dealer Offers", action: "generateDealerOffers" },
  { label: "Select Offer", action: "chooseOffer" },
  { label: "Pay Deposit", action: "payDeposit" },
  { label: "Upload Contract", action: "uploadContract" },
  { label: "Generate Contract Shield", action: "generateContractShield" },
  { label: "Send eSign", action: "sendEsign" },
  { label: "Complete eSign", action: "completeEsign" },
  { label: "Start Funding", action: "startFunding" },
  { label: "Request Payment from Buyer", action: "requestBuyerPayment" },
  { label: "Mark Buyer Payment Received", action: "markBuyerPaymentReceived" },
  { label: "Schedule Delivery", action: "scheduleDelivery" },
  { label: "Confirm Delivery", action: "confirmDelivery" },
  { label: "Complete Deal", action: "completeDeal" },
] as const

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
      onClick={() => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
    >
      <Copy className="h-3 w-3" />
      <span className="text-[10px]">{copied ? "Copied!" : "Copy"}</span>
    </button>
  )
}

export default function BuyerDemoPage() {
  const { data, error, isLoading, mutate } = useSWR("/api/buyer/demo", fetcher, {
    refreshInterval: 10000,
  })

  const [showAll, setShowAll] = useState(false)
  const [actionsOpen, setActionsOpen] = useState(true)
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const stepRefs = useRef<Record<number, HTMLDivElement | null>>({})

  const history: Array<{ status: string }> = data?.history ?? []

  const progress = computeBuyerProgress(
    showAll
      ? CANONICAL_STATUSES.map((s) => ({ status: s }))
      : history,
  )

  const handleAction = useCallback(
    async (action: string) => {
      setLoadingAction(action)
      try {
        await fetch("/api/buyer/demo", {
          method: "POST",
          headers: csrfHeaders(),
          body: JSON.stringify({ action }),
        })
        await mutate()
      } finally {
        setLoadingAction(null)
      }
    },
    [mutate],
  )

  const scrollToStep = (index: number) => {
    const el = stepRefs.current[index]
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" })
  }

  if (isLoading) {
    return (
      <ProtectedRoute allowedRoles={["BUYER"]}>
        <div className="space-y-6">
          <div>
            <Skeleton className="h-9 w-64 mb-2" />
            <Skeleton className="h-5 w-48" />
          </div>
          <Skeleton className="h-32 w-full rounded-xl" />
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (error) {
    return (
      <ProtectedRoute allowedRoles={["BUYER"]}>
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">Failed to load walkthrough</h2>
          <p className="text-muted-foreground">Please try refreshing the page</p>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={["BUYER"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-3">
              Golden Deal Walkthrough
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700">
                Demo Mode
              </span>
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base mt-1">
              Step through every stage of a buyer deal
            </p>
          </div>
          {/* Show Everything Toggle */}
          <Button
            variant={showAll ? "default" : "outline"}
            size="sm"
            onClick={() => setShowAll((v) => !v)}
            className="gap-2"
          >
            {showAll ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showAll ? "Show Actual" : "Show Everything"}
          </Button>
        </div>

        {/* Progress Bar */}
        <Card className="bg-gradient-to-r from-primary to-[#0066FF] text-white overflow-hidden">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="font-semibold text-lg">Deal Progress</h3>
                <p className="text-white/80 text-sm">
                  {progress.completedSteps} of {progress.totalSteps} steps completed
                </p>
              </div>
              <div className="text-3xl sm:text-4xl font-bold">{progress.percent}%</div>
            </div>
            <Progress value={progress.percent} className="h-2 bg-white/20" />
          </CardContent>
        </Card>

        {/* Jump to Step */}
        <div className="flex items-center gap-3">
          <label htmlFor="jump-step" className="text-sm font-medium text-muted-foreground whitespace-nowrap">
            Jump to step:
          </label>
          <select
            id="jump-step"
            className="flex h-9 w-full max-w-xs rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            defaultValue=""
            onChange={(e) => {
              const idx = parseInt(e.target.value, 10)
              if (!isNaN(idx)) scrollToStep(idx)
            }}
          >
            <option value="" disabled>
              Select a step…
            </option>
            {CANONICAL_STATUSES.map((status, idx) => (
              <option key={status} value={idx}>
                {idx + 1}. {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>

        {/* Key IDs */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              {Object.entries(KEY_IDS).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{key}:</span>
                  <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{value}</code>
                  <CopyButton text={value} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <div className="space-y-3">
          {progress.steps.map((step, idx) => {
            const effectiveStatus = showAll ? "completed" : step.status
            const href = STATUS_PAGE_MAP[step.key]
            const isActive = effectiveStatus === "active"
            const isCompleted = effectiveStatus === "completed"

            return (
              <div
                key={step.key}
                ref={(el) => { if (el) stepRefs.current[idx] = el }}
                className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                  isActive
                    ? "border-[#0066FF] bg-[#0066FF]/5"
                    : isCompleted
                      ? "border-[#7ED321]/30 bg-[#7ED321]/5"
                      : "border-border"
                }`}
              >
                {/* Status indicator */}
                <div className="flex flex-col items-center gap-1 pt-0.5">
                  <span className="text-xs font-bold text-muted-foreground">{idx + 1}</span>
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-[#7ED321]" />
                  ) : isActive ? (
                    <Circle className="h-5 w-5 text-[#0066FF] animate-pulse" />
                  ) : (
                    <Lock className="h-5 w-5 text-muted-foreground/40" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium text-sm sm:text-base">{step.label}</h4>
                    <span
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                        isCompleted
                          ? "bg-[#7ED321]/10 text-[#7ED321]"
                          : isActive
                            ? "bg-[#0066FF]/10 text-[#0066FF]"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isCompleted ? "Complete" : isActive ? "Active" : "Locked"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono mt-1">{step.key}</p>
                </div>

                {/* Go to page link */}
                {href && (isCompleted || isActive) && (
                  <Link
                    href={href}
                    className="flex items-center gap-1 text-xs text-[#0066FF] hover:underline whitespace-nowrap flex-shrink-0"
                  >
                    Go to page
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            )
          })}
        </div>

        {/* Demo Actions Panel */}
        <Card>
          <CardHeader
            className="cursor-pointer select-none"
            onClick={() => setActionsOpen((v) => !v)}
          >
            <CardTitle className="flex items-center justify-between text-base sm:text-lg">
              <span className="flex items-center gap-2">
                <Play className="h-5 w-5 text-[#0066FF]" />
                Demo Actions
              </span>
              {actionsOpen ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </CardTitle>
          </CardHeader>
          {actionsOpen && (
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {DEMO_ACTIONS.map(({ label, action }, idx) => (
                  <Button
                    key={action}
                    variant="outline"
                    size="sm"
                    disabled={loadingAction !== null}
                    className="justify-start gap-2 text-left"
                    onClick={() => handleAction(action)}
                  >
                    <span className="text-xs font-bold text-muted-foreground w-5 text-right flex-shrink-0">
                      {idx + 1}.
                    </span>
                    <span className="truncate">
                      {loadingAction === action ? "Running…" : label}
                    </span>
                  </Button>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </ProtectedRoute>
  )
}
