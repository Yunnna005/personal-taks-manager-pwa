import { useSyncExternalStore } from 'react'
import { registerSW } from 'virtual:pwa-register'

// The service worker and whether a new version is waiting, kept outside React
// so the update banner and Settings share one state.

export type UpdateStatus =
  | 'idle'
  | 'checking'
  /** Checked just now and nothing newer was found. */
  | 'latest'
  /** A new version is installed and waiting for a reload. */
  | 'ready'
  | 'failed'
  /** No service worker: an old browser, or the dev server. */
  | 'unsupported'

/** How often an open app checks for a new version. */
const UPDATE_CHECK_MS = 60 * 60 * 1000
/** Coming back to the app checks again, but not more often than this. */
const FOREGROUND_CHECK_MS = 5 * 60 * 1000

let status: UpdateStatus = 'idle'
let registration: ServiceWorkerRegistration | undefined
let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined
let lastCheck = 0
const listeners = new Set<() => void>()

function set(next: UpdateStatus) {
  status = next
  listeners.forEach((l) => l())
}

/** Registers the service worker. Called once from main.tsx. */
export function startUpdates() {
  if (!('serviceWorker' in navigator)) {
    set('unsupported')
    return
  }
  updateSW = registerSW({
    onNeedRefresh: () => set('ready'),
    onRegisteredSW(_url, reg) {
      registration = reg
      lastCheck = Date.now()
      setInterval(() => void checkForUpdate({ quiet: true }), UPDATE_CHECK_MS)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible') return
        if (Date.now() - lastCheck >= FOREGROUND_CHECK_MS) void checkForUpdate({ quiet: true })
      })
    },
  })
}

/** Resolves once a new worker that's installing has finished, true if it's now waiting. */
function settled(reg: ServiceWorkerRegistration): Promise<boolean> {
  const worker = reg.installing
  if (!worker) return Promise.resolve(Boolean(reg.waiting))
  return new Promise((resolve) => {
    const onChange = () => {
      if (worker.state === 'installing') return
      worker.removeEventListener('statechange', onChange)
      resolve(Boolean(reg.waiting))
    }
    worker.addEventListener('statechange', onChange)
  })
}

/**
 * Asks the server for a new version. Quiet checks (the timer, coming back to
 * the app) only change the status when they find one.
 */
export async function checkForUpdate({ quiet = false } = {}): Promise<void> {
  if (status === 'ready' || status === 'checking' || status === 'unsupported') return
  if (!registration) {
    if (!quiet) set('unsupported')
    return
  }
  lastCheck = Date.now()
  if (!quiet) set('checking')
  try {
    await registration.update()
    if (await settled(registration)) set('ready')
    else if (!quiet) set('latest')
  } catch {
    if (!quiet) set('failed')
  }
}

/** Switches to the waiting version, or just reloads when there's no service worker. */
export function reloadToUpdate() {
  if (status === 'ready' && updateSW) void updateSW(true)
  else location.reload()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useUpdateStatus(): UpdateStatus {
  return useSyncExternalStore(subscribe, () => status)
}
