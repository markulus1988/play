import { useEffect } from 'react'

interface WakeLockSentinelLike {
  release: () => Promise<void>
}

/**
 * Trzyma ekran włączony, kiedy leci runda – inaczej telefon gasi ekran
 * w połowie pokazywania hasła. Gdy przeglądarka tego nie wspiera, po prostu nic
 * się nie dzieje.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active) return
    const api = (navigator as Navigator & {
      wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> }
    }).wakeLock
    if (!api) return

    let sentinel: WakeLockSentinelLike | null = null
    let cancelled = false

    const acquire = async () => {
      try {
        const lock = await api.request('screen')
        if (cancelled) {
          void lock.release()
          return
        }
        sentinel = lock
      } catch {
        // Odmowa (np. karta w tle) nie jest błędem gry.
      }
    }

    // Po powrocie z tła blokada przepada – bierzemy ją ponownie.
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !sentinel) void acquire()
    }

    void acquire()
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      void sentinel?.release().catch(() => undefined)
      sentinel = null
    }
  }, [active])
}
