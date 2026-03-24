"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  BarChart3,
  TrendingUp,
  Clock,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Check,
} from "lucide-react"

/* ------------------------------------------------------------------ */
/*  Types & data                                                       */
/* ------------------------------------------------------------------ */

interface DealerOffer {
  id: string
  name: string
  price: number
  subtitle: string
  badge?: string
  breakdown: {
    vehiclePrice: number
    dealerFees: number
    taxTitle: number
    apr: number
    term: number
    monthly: number
  }
}

const dealers: DealerOffer[] = [
  {
    id: "a",
    name: "Dealer A",
    price: 32150,
    subtitle: "0.9% APR available",
    breakdown: {
      vehiclePrice: 28900,
      dealerFees: 495,
      taxTitle: 2755,
      apr: 0.9,
      term: 60,
      monthly: 548,
    },
  },
  {
    id: "b",
    name: "Dealer B",
    price: 31240,
    subtitle: "Lowest OTD, ready for delivery",
    badge: "Best Value",
    breakdown: {
      vehiclePrice: 28200,
      dealerFees: 399,
      taxTitle: 2641,
      apr: 2.9,
      term: 60,
      monthly: 561,
    },
  },
  {
    id: "c",
    name: "Dealer C",
    price: 31800,
    subtitle: "Includes extended warranty",
    breakdown: {
      vehiclePrice: 28400,
      dealerFees: 550,
      taxTitle: 2850,
      apr: 3.4,
      term: 72,
      monthly: 493,
    },
  },
]

const fmt = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0 })

/* ------------------------------------------------------------------ */
/*  Auto-demo constants                                                */
/* ------------------------------------------------------------------ */

const DEMO_SEQUENCE = ["a", "c", "b"] as const
const DEMO_INTERVAL_MS = 2800
const IDLE_RESUME_MS = 4000
const CURSOR_LEAD_MS = 450
const DEMO_START_DELAY_MS = 2200

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function StatBadge({
  icon: Icon,
  iconColor,
  label,
  value,
  delay,
}: {
  icon: React.ElementType
  iconColor: string
  label: string
  value: string
  delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3"
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ background: `color-mix(in oklch, ${iconColor} 12%, transparent)` }}
      >
        <Icon className="h-[18px] w-[18px]" style={{ color: iconColor }} />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground leading-none mb-0.5">
          {label}
        </div>
        <div className="text-sm font-bold text-foreground leading-tight">
          {value}
        </div>
      </div>
    </motion.div>
  )
}

function BreakdownRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-semibold text-foreground">{value}</span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  DealerCard                                                         */
/* ------------------------------------------------------------------ */

function DealerCard({
  dealer,
  isSelected,
  onSelect,
  index,
}: {
  dealer: DealerOffer
  isSelected: boolean
  onSelect: () => void
  index: number
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.div
      data-dealer-id={dealer.id}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: 0.35 + index * 0.1,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            onSelect()
          }
        }}
        className={`w-full text-left rounded-xl border p-4 transition-all duration-200 cursor-pointer ${
          isSelected
            ? "border-brand-green/40 bg-brand-green/[0.03] shadow-sm"
            : "border-border bg-background hover:border-border/80 hover:shadow-sm"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-semibold text-foreground text-[15px]">
                {dealer.name}
              </span>
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-green"
                >
                  <Check className="h-2.5 w-2.5 text-white" />
                </motion.div>
              )}
            </div>
            <div className="text-2xl font-bold text-foreground leading-tight">
              {fmt(dealer.price)}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {dealer.subtitle}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            {dealer.badge && (
              <span className="inline-flex items-center rounded-md border border-brand-green/25 bg-brand-green/8 px-2 py-0.5 text-[11px] font-semibold text-brand-green">
                {dealer.badge}
              </span>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setExpanded(!expanded)
              }}
              className="inline-flex items-center gap-1 text-xs font-medium text-brand-purple hover:underline"
            >
              {expanded ? "Hide" : "View"} breakdown
              {expanded ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="mt-3 pt-3 border-t border-border">
                <BreakdownRow
                  label="Vehicle price"
                  value={fmt(dealer.breakdown.vehiclePrice)}
                />
                <BreakdownRow
                  label="Dealer fees"
                  value={fmt(dealer.breakdown.dealerFees)}
                />
                <BreakdownRow
                  label="Tax, title & registration"
                  value={fmt(dealer.breakdown.taxTitle)}
                />
                <BreakdownRow
                  label="APR"
                  value={`${dealer.breakdown.apr}%`}
                />
                <BreakdownRow
                  label="Term"
                  value={`${dealer.breakdown.term} months`}
                />
                <div className="flex items-center justify-between pt-2 mt-2 border-t border-border">
                  <span className="text-xs font-semibold text-foreground">
                    Est. monthly
                  </span>
                  <span className="text-sm font-bold text-brand-purple">
                    {fmt(dealer.breakdown.monthly)}/mo
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Demo Cursor                                                        */
/* ------------------------------------------------------------------ */

function DemoCursor({
  x,
  y,
  visible,
}: {
  x: number
  y: number
  visible: boolean
}) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute z-50"
      style={{
        transform: `translate3d(${x}px, ${y}px, 0)`,
        opacity: visible ? 1 : 0,
        transition:
          "transform 0.5s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease",
        willChange: "transform, opacity",
      }}
    >
      <svg
        width="20"
        height="24"
        viewBox="0 0 20 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M2 1L2 18L6.8 13.8L10 22L13 20.5L9.8 12L15 12L2 1Z"
          fill="white"
          stroke="#1a1a1a"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Console Component                                             */
/* ------------------------------------------------------------------ */

export function BuyerConsole() {
  const [selectedDealer, setSelectedDealer] = useState<string>("b")
  const [actionTaken, setActionTaken] = useState<
    "approved" | "revision" | null
  >(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 })
  const [cursorVisible, setCursorVisible] = useState(false)
  const pausedRef = useRef(false)
  const demoIndexRef = useRef(0)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(true)
  const prefersReducedMotionRef = useRef(false)

  const selected = dealers.find((d) => d.id === selectedDealer) ?? dealers[1]

  /* Detect prefers-reduced-motion */
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    prefersReducedMotionRef.current = mq.matches
    const handler = (e: MediaQueryListEvent) => {
      prefersReducedMotionRef.current = e.matches
    }
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  /* Pause on user interaction, resume after idle */
  const pauseDemo = useCallback(() => {
    pausedRef.current = true
    setCursorVisible(false)
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    idleTimerRef.current = setTimeout(() => {
      if (mountedRef.current) pausedRef.current = false
    }, IDLE_RESUME_MS)
  }, [])

  /* Auto-demo loop */
  useEffect(() => {
    mountedRef.current = true
    const startTimer = setTimeout(() => {
      if (!mountedRef.current) return
      intervalRef.current = setInterval(() => {
        if (prefersReducedMotionRef.current || pausedRef.current) return
        if (!mountedRef.current) return

        const seq = DEMO_SEQUENCE
        const nextId = seq[demoIndexRef.current % seq.length]
        demoIndexRef.current++

        const container = containerRef.current
        if (!container) return
        const card = container.querySelector(
          `[data-dealer-id="${nextId}"]`
        )
        if (!card) return

        const containerRect = container.getBoundingClientRect()
        const cardRect = card.getBoundingClientRect()
        setCursorPos({
          x: cardRect.left - containerRect.left + cardRect.width * 0.3,
          y: cardRect.top - containerRect.top + cardRect.height * 0.35,
        })
        setCursorVisible(true)

        if (clickTimerRef.current) clearTimeout(clickTimerRef.current)
        clickTimerRef.current = setTimeout(() => {
          if (!mountedRef.current || pausedRef.current) return
          setSelectedDealer(nextId)
          setActionTaken(null)
        }, CURSOR_LEAD_MS)
      }, DEMO_INTERVAL_MS)
    }, DEMO_START_DELAY_MS)

    return () => {
      mountedRef.current = false
      clearTimeout(startTimer)
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current)
    }
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="w-full"
    >
      {/* Window chrome — rotation handled by parent DevicePreview frame */}
      <div
        ref={containerRef}
        className="relative bg-background overflow-hidden"
        onMouseEnter={pauseDemo}
        onFocus={pauseDemo}
        onClick={pauseDemo}
      >
        {/* Auto-demo cursor */}
        <DemoCursor x={cursorPos.x} y={cursorPos.y} visible={cursorVisible} />

        {/* Title bar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#FF6058]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#27C840]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#7D7DE0]" />
          </div>
          <span className="text-xs font-medium text-muted-foreground tracking-wide">
            Buyer Console
          </span>
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col gap-3.5">
          {/* Stat row */}
          <div className="grid grid-cols-3 gap-3">
            <StatBadge
              icon={BarChart3}
              iconColor="var(--brand-purple)"
              label="Offers Received"
              value="5"
              delay={0.15}
            />
            <StatBadge
              icon={TrendingUp}
              iconColor="var(--brand-green)"
              label="Best Value"
              value={selected.name}
              delay={0.25}
            />
            <StatBadge
              icon={Clock}
              iconColor="var(--brand-cyan)"
              label="ETA"
              value={"3\u20135 days"}
              delay={0.35}
            />
          </div>

          {/* Dealer offers */}
          <div className="flex flex-col gap-3">
            {dealers.map((dealer, i) => (
              <DealerCard
                key={dealer.id}
                dealer={dealer}
                isSelected={selectedDealer === dealer.id}
                onSelect={() => {
                  setSelectedDealer(dealer.id)
                  setActionTaken(null)
                }}
                index={i}
              />
            ))}
          </div>

          {/* AI Summary */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-xl border border-border bg-muted/20 p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-brand-purple" />
              <span className="text-sm font-bold text-foreground">
                AI Summary
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Best value offer balances price, terms, and delivery. Recommend{" "}
              <span className="font-semibold text-foreground">Dealer B</span>{" "}
              for lowest cost or{" "}
              <span className="font-semibold text-foreground">Dealer A</span>{" "}
              for strongest financing.
            </p>
          </motion.div>

          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.85, ease: [0.22, 1, 0.36, 1] }}
            className="grid grid-cols-2 gap-3"
          >
            <button
              type="button"
              onClick={() => setActionTaken("approved")}
              className={`relative flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition-all duration-200 ${
                actionTaken === "approved"
                  ? "bg-brand-green text-white"
                  : "text-primary-foreground hover:opacity-90 active:scale-[0.98]"
              }`}
              style={
                actionTaken !== "approved"
                  ? { background: "var(--brand-purple)" }
                  : undefined
              }
            >
              {actionTaken === "approved" ? (
                <>
                  <Check className="h-4 w-4" />
                  Approved!
                </>
              ) : (
                "Approve Offer"
              )}
            </button>
            <button
              type="button"
              onClick={() => setActionTaken("revision")}
              className={`flex items-center justify-center gap-2 rounded-lg border px-5 py-3 text-sm font-semibold transition-all duration-200 ${
                actionTaken === "revision"
                  ? "border-brand-cyan bg-brand-cyan/10 text-brand-cyan"
                  : "border-border text-foreground hover:bg-accent active:scale-[0.98]"
              }`}
            >
              {actionTaken === "revision" ? "Revision Sent!" : "Request Revision"}
            </button>
          </motion.div>

          {/* Success toast */}
          <AnimatePresence>
            {actionTaken && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div
                  className={`rounded-lg px-4 py-3 text-xs font-medium ${
                    actionTaken === "approved"
                      ? "bg-brand-green/10 text-brand-green border border-brand-green/20"
                      : "bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20"
                  }`}
                >
                  {actionTaken === "approved"
                    ? `Great choice! ${selected.name}'s offer for ${fmt(selected.price)} has been approved. Your concierge will finalize delivery details.`
                    : `Revision requested for ${selected.name}. Your concierge will negotiate better terms and get back to you within 24 hours.`}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
