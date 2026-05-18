import { useState, useRef, useCallback, useEffect } from 'react'

interface UseCallTimerReturn {
  elapsed: number
  isRunning: boolean
  start: () => void
  stop: () => void
  reset: () => void
  formatted: string
}

export function useCallTimer(): UseCallTimerReturn {
  const [elapsed, setElapsed] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)

  const start = useCallback(() => {
    startTimeRef.current = Date.now()
    setElapsed(0)
    setIsRunning(true)
  }, [])

  const stop = useCallback(() => {
    setIsRunning(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const reset = useCallback(() => {
    stop()
    setElapsed(0)
    startTimeRef.current = 0
  }, [stop])

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 200)
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning])

  const formatted = formatTime(elapsed)

  return { elapsed, isRunning, start, stop, reset, formatted }
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}