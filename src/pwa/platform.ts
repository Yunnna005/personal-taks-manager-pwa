// Where the app is running. Pure functions take the browser details as input
// so they can be tested with real user agent strings.

export type BrowserInfo = {
  userAgent: string
  maxTouchPoints: number
}

export function browserInfo(): BrowserInfo {
  return { userAgent: navigator.userAgent, maxTouchPoints: navigator.maxTouchPoints ?? 0 }
}

/** iPhone, iPod or iPad (iPadOS reports itself as a Mac, but with touch). */
export function isIos({ userAgent, maxTouchPoints }: BrowserInfo): boolean {
  return /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1)
}

/** Safari itself, not Chrome, Firefox, Edge or another app's browser on iOS. */
export function isIosSafari(info: BrowserInfo): boolean {
  return (
    isIos(info) &&
    /Safari\//.test(info.userAgent) &&
    !/CriOS|FxiOS|EdgiOS|OPiOS|GSA|DuckDuckGo|YaBrowser/.test(info.userAgent)
  )
}

/** Running as the installed app rather than in a browser tab. */
export function isStandalone(): boolean {
  const media = typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches
  return media || (navigator as Navigator & { standalone?: boolean }).standalone === true
}
