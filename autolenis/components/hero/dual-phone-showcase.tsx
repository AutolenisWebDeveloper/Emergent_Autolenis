"use client"

import { type ReactNode } from "react"
import { DevicePreview } from "@/components/ui/device-preview"

/* ------------------------------------------------------------------ */
/*  DualPhoneShowcase — reusable iPhone + Android side-by-side showcase */
/* ------------------------------------------------------------------ */

interface DualPhoneShowcaseProps {
  /** Content rendered inside the iPhone screen */
  iphoneContent: ReactNode
  /** Content rendered inside the Android screen */
  androidContent: ReactNode
  /** Optional wrapper className */
  className?: string
  /** Enable 3D rotation animations (default: true) */
  tilt?: boolean
  /** Show subtle glow behind devices (default: true) */
  glow?: boolean
}

export function DualPhoneShowcase({
  iphoneContent,
  androidContent,
  className = "",
  tilt = true,
  glow = true,
}: DualPhoneShowcaseProps) {
  return (
    <div className={`relative flex items-center justify-center gap-8 sm:gap-12 md:gap-16 ${className}`}>
      {/* Shared ambient glow */}
      {glow && (
        <div
          className="absolute inset-0 -z-10 scale-[0.65] rounded-[80px] blur-[70px] pointer-events-none"
          style={{
            opacity: 0.08,
            background:
              "radial-gradient(ellipse at 38% 50%, var(--brand-purple), transparent 55%), radial-gradient(ellipse at 62% 50%, var(--brand-cyan), transparent 55%)",
          }}
          aria-hidden="true"
        />
      )}

      {/* iPhone */}
      <div className="relative flex flex-col items-center">
        <DevicePreview
          type="iphone"
          tilt={tilt}
          glow={false}
          animationName="device-float-phone-left"
          animationDelay="0s"
        >
          {iphoneContent}
        </DevicePreview>
        <div className="text-center mt-3">
          <span className="text-[10px] font-medium text-muted-foreground/50 tracking-widest uppercase">
            iPhone
          </span>
        </div>
      </div>

      {/* Android — identical size, no vertical offset */}
      <div className="relative flex flex-col items-center">
        <DevicePreview
          type="android"
          tilt={tilt}
          glow={false}
          animationName="device-float-phone-right"
          animationDelay="0.65s"
        >
          {androidContent}
        </DevicePreview>
        <div className="text-center mt-3">
          <span className="text-[10px] font-medium text-muted-foreground/50 tracking-widest uppercase">
            Android
          </span>
        </div>
      </div>
    </div>
  )
}
