"use client"

/**
 * In-memory conversation state hook for AutoLenis copilot.
 *
 * - NO localStorage
 * - NO sessionStorage
 * - All state lives in component memory, cleared on unmount
 */

import { useState, useCallback } from "react"
import type { ConversationTurn } from "./types"

export interface CopilotSessionState {
  turns: ConversationTurn[]
  addTurn: (turn: ConversationTurn) => void
  clearSession: () => void
  lastIntent: string | null
  setLastIntent: (intent: string | null) => void
  clickedChips: string[]
  addClickedChip: (chip: string) => void
  confirmedIntents: string[]
  addConfirmedIntent: (intent: string) => void
}

export function useCopilotSession(): CopilotSessionState {
  const [turns, setTurns] = useState<ConversationTurn[]>([])
  const [lastIntent, setLastIntent] = useState<string | null>(null)
  const [clickedChips, setClickedChips] = useState<string[]>([])
  const [confirmedIntents, setConfirmedIntents] = useState<string[]>([])

  const addTurn = useCallback((turn: ConversationTurn) => {
    setTurns((prev) => [...prev, turn])
  }, [])

  const clearSession = useCallback(() => {
    setTurns([])
    setLastIntent(null)
    setClickedChips([])
    setConfirmedIntents([])
  }, [])

  const addClickedChip = useCallback((chip: string) => {
    setClickedChips((prev) => (prev.includes(chip) ? prev : [...prev, chip]))
  }, [])

  const addConfirmedIntent = useCallback((intent: string) => {
    setConfirmedIntents((prev) => (prev.includes(intent) ? prev : [...prev, intent]))
  }, [])

  return {
    turns,
    addTurn,
    clearSession,
    lastIntent,
    setLastIntent,
    clickedChips,
    addClickedChip,
    confirmedIntents,
    addConfirmedIntent,
  }
}
