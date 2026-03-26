"use client"

import { useState, useEffect, useRef } from "react"

export function useCountdown(targetSeconds: number, autoStart = false) {
  const [seconds, setSeconds] = useState(targetSeconds)
  const [isRunning, setIsRunning] = useState(autoStart)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!isRunning) return

    intervalRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          setIsRunning(false)
          if (intervalRef.current) clearInterval(intervalRef.current)
          return 0
        }
        return s - 1
      })
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning])

  const start = () => {
    setSeconds(targetSeconds)
    setIsRunning(true)
  }

  const stop = () => {
    setIsRunning(false)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  const reset = () => {
    stop()
    setSeconds(targetSeconds)
  }

  return { seconds, isRunning, start, stop, reset, isComplete: seconds === 0 }
}
