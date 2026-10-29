import { navigate, replaceRoute } from '../lib/route.ts'
import { CalendarIcon, ListIcon, SettingsIcon } from './icons.tsx'

export type HomeView = 'list' | 'calendar'

const VIEWS = [
  { view: 'list', label: 'List view', Icon: ListIcon },
  { view: 'calendar', label: 'Calendar view', Icon: CalendarIcon },
] as const

/**
 * Wordmark, the List / Calendar switch and Settings, at the top of both Home
 * views. Switching replaces the route, so the back gesture doesn't flip views.
 */
export default function HomeHeader({ view }: { view: HomeView }) {
  return (
    <header className="flex h-11 items-center justify-between gap-3">
      <p className="text-section">soon</p>
      <div className="flex items-center gap-2">
        <nav aria-label="Home view" className="flex rounded-full bg-surface p-0.5">
          {VIEWS.map(({ view: v, label, Icon }) => (
            <button
              key={v}
              type="button"
              aria-label={label}
              aria-pressed={view === v}
              onClick={() => {
                if (view === v) return
                replaceRoute({ name: v })
                window.scrollTo(0, 0)
              }}
              className={`grid size-11 place-items-center rounded-full ${
                view === v ? 'bg-ink text-white dark:bg-text-dark dark:text-ink' : ''
              }`}
            >
              <Icon className="size-[22px]" />
            </button>
          ))}
        </nav>
        <button
          type="button"
          aria-label="Settings"
          onClick={() => navigate({ name: 'settings' })}
          className="grid size-11 place-items-center rounded-full bg-surface"
        >
          <SettingsIcon className="size-6" />
        </button>
      </div>
    </header>
  )
}
