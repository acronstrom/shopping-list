import { useCallback, useEffect, useRef, useState } from 'react'
import { playCompleteSound } from '@/lib/feedback'

// Countdown timers attached to instruction steps.
//
// Deadlines are wall-clock (endsAt), not tick counts, so a backgrounded tab —
// where browsers throttle setInterval hard — still shows the right number the
// moment you look at the phone again.

interface Timer {
  endsAt: number
  total: number
}

export interface TimerState {
  remaining: number
  total: number
  done: boolean
}

export function useStepTimers() {
  const [timers, setTimers] = useState<Record<string, Timer>>({})
  const [now, setNow] = useState(() => Date.now())
  const firedRef = useRef<Set<string>>(new Set())

  const hasTimers = Object.keys(timers).length > 0

  useEffect(() => {
    if (!hasTimers) return
    // 500ms rather than 1000: a 1s tick drifts against the wall clock and the
    // countdown visibly skips a second every few steps.
    const id = window.setInterval(() => setNow(Date.now()), 500)
    const handleVisibility = () => setNow(Date.now())
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [hasTimers])

  useEffect(() => {
    for (const [key, timer] of Object.entries(timers)) {
      if (timer.endsAt > now || firedRef.current.has(key)) continue
      firedRef.current.add(key)
      playCompleteSound()
      navigator.vibrate?.([180, 90, 180])
    }
  }, [now, timers])

  const cancel = useCallback((key: string) => {
    firedRef.current.delete(key)
    setTimers(prev => {
      if (!(key in prev)) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  const toggle = useCallback(
    (key: string, seconds: number) => {
      setTimers(prev => {
        if (key in prev) {
          firedRef.current.delete(key)
          const next = { ...prev }
          delete next[key]
          return next
        }
        firedRef.current.delete(key)
        return { ...prev, [key]: { endsAt: Date.now() + seconds * 1000, total: seconds } }
      })
      setNow(Date.now())
    },
    [],
  )

  const get = useCallback(
    (key: string): TimerState | null => {
      const timer = timers[key]
      if (!timer) return null
      const remaining = (timer.endsAt - now) / 1000
      return { remaining: Math.max(0, remaining), total: timer.total, done: remaining <= 0 }
    },
    [timers, now],
  )

  return { cancel, toggle, get }
}
