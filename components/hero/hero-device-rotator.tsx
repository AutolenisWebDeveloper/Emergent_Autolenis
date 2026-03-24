"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { DevicePreview } from "@/components/ui/device-preview"
import { DualPhoneShowcase } from "@/components/hero/dual-phone-showcase"
import { BuyerConsole } from "@/components/hero/buyer-console"
import { MobileDashboardView } from "@/components/hero/mobile-dashboard-view"
import { MobileOffersView } from "@/components/hero/mobile-offers-view"

/* ------------------------------------------------------------------ */
/*  HeroDeviceRotator                                                  */
/*  Unified rotating device display — cycles through three states:     */
/*    0 = iPad / tablet   1 = MacBook / laptop   2 = iPhone + Android  */
/*  Rotates every 15 seconds with a horizontal roll transition.        */
/* ------------------------------------------------------------------ */

const ROTATION_INTERVAL = 15_000
const TOTAL_STATES = 3

interface HeroDeviceRotatorProps {
  variant: "desktop" | "mobile"
}

export function HeroDeviceRotator({ variant }: HeroDeviceRotatorProps) {
  const [active, setActive] = useState(0)
  const directionRef = useRef(1) // 1 = rolling right-to-left (forward)
  const [direction, setDirection] = useState(1) // state mirror of directionRef for render

  const advance = useCallback(() => {
    directionRef.current = 1
    setActive((prev) => (prev + 1) % TOTAL_STATES)
  }, [])

  /* Sync directionRef to state after active changes so render uses state, not ref */
  useEffect(() => {
    setDirection(directionRef.current)
  }, [active])

  useEffect(() => {
    const id = setInterval(advance, ROTATION_INTERVAL)
    return () => clearInterval(id)
  }, [advance])

  /* Horizontal roll variants — slides in from the right, exits to the left */
  const rollVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? "40%" : "-40%",
      opacity: 0,
      scale: 0.95,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? "-40%" : "40%",
      opacity: 0,
      scale: 0.95,
    }),
  }

  const transition = {
    duration: 0.8,
    ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
  }

  const showcaseContent = (state: number) => {
    switch (state) {
      /* State 0 — iPad */
      case 0:
        return (
          <DevicePreview
            type="tablet"
            tilt
            responsiveTilt={variant === "mobile"}
            glow
          >
            <BuyerConsole />
          </DevicePreview>
        )
      /* State 1 — MacBook */
      case 1:
        return (
          <DevicePreview type="laptop" tilt glow>
            <BuyerConsole />
          </DevicePreview>
        )
      /* State 2 — iPhone + Android */
      case 2:
        return (
          <DualPhoneShowcase
            iphoneContent={<MobileDashboardView />}
            androidContent={<MobileOffersView />}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="relative w-full overflow-hidden">
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={active}
          custom={direction}
          variants={rollVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={transition}
        >
          {showcaseContent(active)}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
