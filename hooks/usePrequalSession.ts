"use client"

import { useState, useEffect, useCallback } from "react"
import type { PrequalStep1Data, PrequalStep2Data, PrequalStep3Data, PrequalStep4Data } from "@/lib/types/prequal"

interface PrequalSessionState {
  applicationId: string | null
  sessionToken: string | null
  step1: Partial<PrequalStep1Data>
  step2: Partial<PrequalStep2Data>
  step3: Partial<PrequalStep3Data>
  step4: Partial<PrequalStep4Data>
  currentStep: number
}

const STORAGE_KEY = "al_prequal_session_state"
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export function usePrequalSession() {
  const [state, setState] = useState<PrequalSessionState>({
    applicationId: null,
    sessionToken: null,
    step1: {},
    step2: {},
    step3: {},
    step4: {},
    currentStep: 1,
  })

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.timestamp && Date.now() - parsed.timestamp < MAX_AGE_MS) {
          setState(parsed.data)
        } else {
          sessionStorage.removeItem(STORAGE_KEY)
        }
      }
    } catch {
      // Storage may be unavailable
    }
  }, [])

  const updateSession = useCallback((updates: Partial<PrequalSessionState>) => {
    setState((prev) => {
      const next = { ...prev, ...updates }
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ data: next, timestamp: Date.now() }))
      } catch {
        // Storage may be unavailable
      }
      return next
    })
  }, [])

  const clearSession = useCallback(() => {
    setState({
      applicationId: null,
      sessionToken: null,
      step1: {},
      step2: {},
      step3: {},
      step4: {},
      currentStep: 1,
    })
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      // Storage may be unavailable
    }
  }, [])

  return { state, updateSession, clearSession }
}
