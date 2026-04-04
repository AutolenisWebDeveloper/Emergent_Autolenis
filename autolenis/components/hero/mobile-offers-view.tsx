"use client"

import { useState, useEffect, useRef } from "react"
import { Shield, CheckCircle2, FileCheck, Sparkles, ArrowRight, Check } from "lucide-react"

/* ------------------------------------------------------------------ */
/*  MobileOffersView — offer detail / comparison for phone showcase    */
/*  Auto-demo: taps "Approve" after a delay, then resets               */
/* ------------------------------------------------------------------ */

const APPROVE_DELAY = 3500
const RESET_DELAY = 4000
const RIPPLE_DURATION = 400

export function MobileOffersView() {
  const [approved, setApproved] = useState(false)
  const [ripple, setRipple] = useState(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    let approveTimer: ReturnType<typeof setTimeout>
    let rippleTimer: ReturnType<typeof setTimeout>
    let resetTimer: ReturnType<typeof setTimeout>

    function cycle() {
      approveTimer = setTimeout(() => {
        if (!mountedRef.current) return
        setRipple(true)
        rippleTimer = setTimeout(() => {
          if (!mountedRef.current) return
          setApproved(true)
          setRipple(false)
        }, RIPPLE_DURATION)

        resetTimer = setTimeout(() => {
          if (!mountedRef.current) return
          setApproved(false)
          cycle()
        }, RESET_DELAY)
      }, APPROVE_DELAY)
    }

    cycle()

    return () => {
      mountedRef.current = false
      clearTimeout(approveTimer)
      clearTimeout(rippleTimer)
      clearTimeout(resetTimer)
    }
  }, [])
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
      <div className="px-3 pt-2 pb-1.5 border-b border-border">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[7px] text-brand-purple font-medium">← Back</span>
        </div>
        <h2 className="text-[11px] font-bold text-foreground leading-tight">Offer Details</h2>
        <p className="text-[7px] text-muted-foreground">Dealer B — Best Value</p>
      </div>

      {/* Price hero */}
      <div className="px-3 pt-2 pb-1.5">
        <div className="text-center">
          <div className="text-[14px] font-bold text-foreground leading-tight">$31,240</div>
          <div className="text-[7px] text-brand-green font-medium">Out-the-door price</div>
        </div>
      </div>

      {/* Breakdown */}
      <div className="px-3 mb-1.5">
        <div className="rounded-lg border border-border p-2">
          <div className="text-[7px] font-semibold text-foreground mb-1">Price Breakdown</div>
          {[
            { label: "Vehicle Price", value: "$28,200" },
            { label: "Dealer Fees", value: "$399" },
            { label: "Tax & Title", value: "$2,641" },
            { label: "APR", value: "2.9%" },
            { label: "Term", value: "60 months" },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between py-[2px]">
              <span className="text-[6.5px] text-muted-foreground">{row.label}</span>
              <span className="text-[6.5px] font-semibold text-foreground">{row.value}</span>
            </div>
          ))}
          <div className="flex items-center justify-between pt-1 mt-1 border-t border-border">
            <span className="text-[7px] font-semibold text-foreground">Est. Monthly</span>
            <span className="text-[8px] font-bold text-brand-purple">$561/mo</span>
          </div>
        </div>
      </div>

      {/* Contract Shield */}
      <div className="px-3 mb-1.5">
        <div className="rounded-lg border border-brand-green/20 bg-brand-green/[0.03] p-2">
          <div className="flex items-center gap-1 mb-1">
            <Shield className="w-2.5 h-2.5 text-brand-green" />
            <span className="text-[7px] font-bold text-foreground">Contract Shield</span>
          </div>
          <div className="flex flex-col gap-0.5">
            {[
              { icon: CheckCircle2, text: "No hidden fees detected" },
              { icon: CheckCircle2, text: "Terms match offer" },
              { icon: FileCheck, text: "All disclosures included" },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-1">
                <item.icon className="w-2 h-2 text-brand-green flex-shrink-0" />
                <span className="text-[6px] text-muted-foreground">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Insight */}
      <div className="px-3 mb-1.5 flex-1 min-h-0">
        <div className="rounded-lg border border-border bg-muted/20 p-2">
          <div className="flex items-center gap-1 mb-0.5">
            <Sparkles className="w-2 h-2 text-brand-purple" />
            <span className="text-[7px] font-bold text-foreground">AI Insight</span>
          </div>
          <p className="text-[6px] text-muted-foreground leading-relaxed">
            This offer has the lowest total cost. Dealer B&apos;s fees are $96 below average. Recommended for value-focused buyers.
          </p>
        </div>
      </div>

      {/* Bottom actions */}
      <div className="px-3 pb-2 pt-1 mt-auto flex gap-1.5">
        <div
          className={`relative flex-1 flex items-center justify-center rounded-lg py-1.5 text-[7px] font-semibold gap-0.5 transition-all duration-300 overflow-hidden ${
            approved
              ? "bg-brand-green text-white"
              : "text-primary-foreground"
          }`}
          style={!approved ? { background: "var(--brand-purple)" } : undefined}
        >
          {/* Touch ripple */}
          {ripple && (
            <span
              className="absolute inset-0 rounded-lg pointer-events-none"
              style={{
                background: "radial-gradient(circle at 50% 50%, white 0%, transparent 70%)",
                opacity: 0.15,
                animation: "touch-ripple 0.5s ease-out forwards",
              }}
            />
          )}
          {approved ? (
            <>
              <Check className="w-2 h-2" /> Approved!
            </>
          ) : (
            <>
              Approve <ArrowRight className="w-2 h-2" />
            </>
          )}
        </div>
        <div className="flex-1 flex items-center justify-center rounded-lg py-1.5 text-[7px] font-semibold text-foreground border border-border">
          Revise
        </div>
      </div>
    </div>
  )
}
