import { useEffect } from 'react'

// Hold a screen wake lock while `active` is true.
//
// The browser drops the lock every time the page stops being visible — tab
// switch, phone auto-lock, app switcher — and never restores it on its own, so
// re-acquiring on visibilitychange is what actually makes this work across a
// 40-minute cook. Unsupported browsers get nothing and cook fine without it.
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return

    let sentinel: WakeLockSentinel | null = null
    let cancelled = false

    async function acquire() {
      if (cancelled || document.visibilityState !== 'visible') return
      try {
        const next = await navigator.wakeLock.request('screen')
        if (cancelled) {
          void next.release().catch(() => {})
          return
        }
        sentinel = next
        next.addEventListener('release', () => {
          if (sentinel === next) sentinel = null
        })
      } catch {
        // Denied — battery saver, no user activation, or an unsupported
        // surface. Nothing to recover from; the page just behaves as before.
      }
    }

    function handleVisibility() {
      if (document.visibilityState === 'visible' && !sentinel) void acquire()
    }

    void acquire()
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', handleVisibility)
      void sentinel?.release().catch(() => {})
      sentinel = null
    }
  }, [active])
}
