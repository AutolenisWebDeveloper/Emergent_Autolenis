"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { BarChart3, TrendingUp, Clock, Sparkles, Check, ChevronRight } from "lucide-react"

/* ------------------------------------------------------------------ */
/*  MobileDashboardView — compact mobile dashboard for phone showcase  */
/*  Auto-demo: cycles through offer cards with a touch-ripple          */
/* ------------------------------------------------------------------ */

/* Demo-only placeholder data — values are illustrative, not live pricing */
const OFFERS = [
  { id: "a", name: "Dealer A", price: "$32,150", tag: null, apr: "0.9% APR" },
  { id: "b", name: "Dealer B", price: "$31,240", tag: "Best Value", apr: "2.9% APR" },
  { id: "c", name: "Dealer C", price: "$31,800", tag: null, apr: "3.4% APR" },
] as const

const DEMO_SEQUENCE = ["a", "c", "b"] as const
const DEMO_INTERVAL = 3200
const DEMO_START_DELAY = 1800
const RIPPLE_DURATION = 400

export function MobileDashboardView() {
  const [selected, setSelected] = useState("b")
  const [rippleId, setRippleId] = useState<string | null>(null)
  const indexRef = useRef(0)
  const mountedRef = useRef(true)
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const tick = useCallback(() => {
    if (!mountedRef.current) return
    const next = DEMO_SEQUENCE[indexRef.current % DEMO_SEQUENCE.length]
    indexRef.current++
    setRippleId(next)
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current)
    clickTimerRef.current = setTimeout(() => {
      if (!mountedRef.current) return
      setSelected(next)
      setRippleId(null)
    }, RIPPLE_DURATION)
  }, [])

  useEffect(() => {
    mountedRef.current = true
    let intervalTimer: ReturnType<typeof setInterval> | undefined
    const startTimer = setTimeout(() => {
      if (!mountedRef.current) return
      tick()
      intervalTimer = setInterval(tick, DEMO_INTERVAL)
    }, DEMO_START_DELAY)

    return () => {
      mountedRef.current = false
      clearTimeout(startTimer)
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current)
      if (intervalTimer) clearInterval(intervalTimer)
    }
  }, [tick])
  return (
    <div className="flex flex-col h-full bg-background text-foreground overflow-hidden">
      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-1 text-[7px] font-medium text-muted-foreground">
        <span>9:41</span>
        <div className="flex items-center gap-1">
          <div className="flex gap-[1px]">
            {[3, 4, 5, 6].map((h) => (
              <div key={h} className="w-[2px] rounded-[0.5px] bg-foreground/60" style={{ height: `${h}px` }} />
            ))}
          </div>
          <div className="w-3 h-[6px] rounded-[1px] border border-foreground/40 relative">
            <div className="absolute inset-[0.5px] right-[1px] bg-brand-green rounded-[0.5px]" />
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="px-3 pt-2 pb-1.5">
        <div className="flex items-center gap-1.5 mb-1">
          <div className="w-4 h-4 rounded-full bg-brand-purple/10 flex items-center justify-center">
            <Sparkles className="w-2 h-2 text-brand-purple" />
          </div>
          <span className="text-[9px] font-bold text-foreground">AutoLenis</span>
        </div>
        <h2 className="text-[11px] font-bold text-foreground leading-tight">Your Offers</h2>
        <p className="text-[7px] text-muted-foreground">3 active offers ready for review</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-1.5 px-3 mb-2">
        {[
          { icon: BarChart3, color: "var(--brand-purple)", label: "Offers", value: "5" },
          { icon: TrendingUp, color: "var(--brand-green)", label: "Saved", value: "$3.2K" },
          { icon: Clock, color: "var(--brand-cyan)", label: "ETA", value: "3 days" },
        ].map((stat) => (
          <div key={stat.label} className="flex flex-col items-center rounded-lg border border-border bg-muted/20 py-1.5 px-1">
            <stat.icon className="w-2.5 h-2.5 mb-0.5" style={{ color: stat.color }} />
            <span className="text-[8px] font-bold text-foreground">{stat.value}</span>
            <span className="text-[6px] text-muted-foreground">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Offer cards */}
      <div className="flex flex-col gap-1.5 px-3 flex-1 min-h-0 overflow-hidden">
        {OFFERS.map((offer) => {
          const isSelected = selected === offer.id
          const isRippling = rippleId === offer.id
          return (
            <div
              key={offer.id}
              className={`relative flex items-center justify-between rounded-lg border p-2 transition-all duration-300 ${
                isSelected
                  ? "border-brand-green/40 bg-brand-green/[0.03]"
                  : "border-border bg-background"
              }`}
            >
              {/* Touch ripple */}
              {isRippling && (
                <span
                  className="absolute inset-0 rounded-lg pointer-events-none"
                  style={{
                    background: "radial-gradient(circle at 30% 50%, var(--brand-purple) 0%, transparent 70%)",
                    opacity: 0.06,
                    animation: "touch-ripple 0.5s ease-out forwards",
                  }}
                />
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-[8px] font-semibold text-foreground">{offer.name}</span>
                  {isSelected && (
                    <div className="flex h-2.5 w-2.5 items-center justify-center rounded-full bg-brand-green">
                      <Check className="h-1.5 w-1.5 text-white" />
                    </div>
                  )}
                  {offer.tag && (
                    <span className="text-[5px] font-semibold text-brand-green bg-brand-green/10 px-1 py-0.5 rounded">
                      {offer.tag}
                    </span>
                  )}
                </div>
                <span className="text-[7px] text-muted-foreground">{offer.apr}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[9px] font-bold text-foreground">{offer.price}</span>
                <ChevronRight className="w-2 h-2 text-muted-foreground" />
              </div>
            </div>
          )
        })}
      </div>

      {/* Bottom CTA */}
      <div className="px-3 pb-2 pt-1.5 mt-auto">
        <div className="flex items-center justify-center rounded-lg py-1.5 text-[8px] font-semibold text-primary-foreground" style={{ background: "var(--brand-purple)" }}>
          Compare All Offers
        </div>
      </div>
    </div>
  )
}
