import { useMemo, useSyncExternalStore } from 'react'

// Hash routes, so static hosting needs no fallback and reloads keep the screen:
//   #/                   Home, in the view chosen in Settings (startView)
//   #/list               Home as the Due soon list
//   #/calendar           Home as the week calendar, on this week
//   #/calendar/<date>    the week calendar on the week of <date> (YYYY-MM-DD)
//   #/folder/unsorted    Unsorted
//   #/folder/<id>        a folder
//   #/task/<id>          a task
//   #/settings           Settings
//   #/completed          Completed tasks from every folder

export type Route =
  | { name: 'home' }
  | { name: 'list' }
  | { name: 'calendar'; week?: string }
  | { name: 'folder'; folderId: string | null }
  | { name: 'task'; taskId: string }
  | { name: 'settings' }
  | { name: 'completed' }

export const HOME: Route = { name: 'home' }

export function parseHash(hash: string): Route {
  if (hash === '#/list') return { name: 'list' }
  if (hash === '#/calendar') return { name: 'calendar' }
  const week = /^#\/calendar\/(\d{4}-\d{2}-\d{2})$/.exec(hash)
  if (week) return { name: 'calendar', week: week[1]! }
  if (hash === '#/settings') return { name: 'settings' }
  if (hash === '#/completed') return { name: 'completed' }
  const m = /^#\/(folder|task)\/([^/]+)$/.exec(hash)
  if (!m) return HOME
  const id = decodeURIComponent(m[2]!)
  if (m[1] === 'task') return { name: 'task', taskId: id }
  return { name: 'folder', folderId: id === 'unsorted' ? null : id }
}

export function toHash(route: Route): string {
  if (route.name === 'home') return '#/'
  if (route.name === 'list') return '#/list'
  if (route.name === 'calendar') return route.week ? `#/calendar/${route.week}` : '#/calendar'
  if (route.name === 'settings') return '#/settings'
  if (route.name === 'completed') return '#/completed'
  if (route.name === 'task') return `#/task/${encodeURIComponent(route.taskId)}`
  return `#/folder/${route.folderId === null ? 'unsorted' : encodeURIComponent(route.folderId)}`
}

const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

function subscribe(listener: () => void) {
  listeners.add(listener)
  window.addEventListener('popstate', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('popstate', listener)
  }
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => location.hash)
  return useMemo(() => parseHash(hash), [hash])
}

/** Opens a screen as a new history entry, so the phone's back gesture returns. */
export function navigate(route: Route) {
  history.pushState({ inApp: true }, '', toHash(route))
  window.scrollTo(0, 0)
  notify()
}

export function replaceRoute(route: Route) {
  history.replaceState(history.state, '', toHash(route))
  notify()
}

/** Back to the previous screen, or Home if the app was opened straight onto this one. */
export function goBack() {
  if ((history.state as { inApp?: boolean } | null)?.inApp) history.back()
  else replaceRoute(HOME)
}
