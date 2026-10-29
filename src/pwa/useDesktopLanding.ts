import { useState, useSyncExternalStore } from 'react'
import { isStandalone } from './platform.ts'

// A desktop browser: wide, with a mouse. Tablets and phones get the app.
const DESKTOP_QUERY = '(min-width: 900px) and (hover: hover) and (pointer: fine)'
export const TRY_IN_BROWSER_KEY = 'soon-try-in-browser'

function subscribe(listener: () => void) {
  if (typeof matchMedia !== 'function') return () => {}
  const query = matchMedia(DESKTOP_QUERY)
  query.addEventListener('change', listener)
  return () => query.removeEventListener('change', listener)
}

const isDesktop = () => typeof matchMedia === 'function' && matchMedia(DESKTOP_QUERY).matches

function triedBefore(): boolean {
  try {
    return localStorage.getItem(TRY_IN_BROWSER_KEY) === '1'
  } catch {
    return false
  }
}

/** Whether to show DesktopLanding, and a way to go to the app anyway (remembered). */
export function useDesktopLanding(): [show: boolean, tryInBrowser: () => void] {
  const desktop = useSyncExternalStore(subscribe, isDesktop)
  const [tried, setTried] = useState(triedBefore)

  function tryInBrowser() {
    try {
      localStorage.setItem(TRY_IN_BROWSER_KEY, '1')
    } catch {
      // Storage blocked: still let them in for this visit
    }
    setTried(true)
  }

  return [desktop && !tried && !isStandalone(), tryInBrowser]
}
