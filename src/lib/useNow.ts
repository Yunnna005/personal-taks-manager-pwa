import { useEffect, useState } from 'react'

/**
 * The current time, refreshed every 30 seconds and whenever the app comes
 * back to the foreground, so urgency moves on at midnight or when a due time
 * passes without a reload.
 */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const tick = () => setNow(new Date())
    const id = setInterval(tick, intervalMs)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [intervalMs])

  return now
}
