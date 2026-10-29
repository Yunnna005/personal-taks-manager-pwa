import { useLiveQuery } from 'dexie-react-hooks'
import { useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import AddBar from '../components/AddBar.tsx'
import Button from '../components/Button.tsx'
import { dotBg, tileBg, UNSORTED_DOT } from '../components/folderColors.ts'
import HomeHeader from '../components/HomeHeader.tsx'
import { BackIcon, CloseIcon, PlusIcon } from '../components/icons.tsx'
import QuickAdd, { QUICK_ADD_TITLE_ID } from '../components/QuickAdd.tsx'
import Sheet from '../components/Sheet.tsx'
import TaskRow from '../components/TaskRow.tsx'
import { listFolders } from '../db/folders.ts'
import type { Folder, Task } from '../db/schema.ts'
import { getSettings, setSetting } from '../db/settings.ts'
import { listTasks } from '../db/tasks.ts'
import {
  addDays,
  calendarTime,
  dayHeader,
  isOverdue,
  isValidDate,
  longDay,
  startOfWeek,
  tasksByDay,
  toDateString,
  toTimeString,
  weekDates,
  weekLabel,
} from '../lib/dates.ts'
import { navigate, replaceRoute } from '../lib/route.ts'
import { completeWithUndo } from '../lib/taskActions.ts'
import { useNow } from '../lib/useNow.ts'
import { ENTRY_HEIGHT, entryTops, firstHour, HOUR_HEIGHT, offsetOf } from '../lib/weekGrid.ts'
import InstallHint from '../pwa/InstallHint.tsx'
import { browserInfo, isIosSafari, isStandalone } from '../pwa/platform.ts'

/** Width of the hours column that stays on the left while the days scroll. */
const TIME_COL = 52
/** Narrowest day column; about three fit on a phone, the rest scroll in from the right. */
const DAY_COL = 116
const DAY_SHEET_TITLE_ID = 'calendar-day-title'

type OpenSheet =
  { kind: 'day'; date: string } | { kind: 'add'; date: string | null; time: string | null } | null

const pad = (n: number) => String(n).padStart(2, '0')
const plural = (n: number) => (n === 1 ? '1 task' : `${n} tasks`)

function LatePill({ children }: { children: string }) {
  return <span className="rounded-full bg-late px-1.5 text-ink">{children}</span>
}

export default function CalendarScreen({ week }: { week?: string }) {
  const now = useNow()
  const today = toDateString(now)
  const thisWeek = startOfWeek(today)
  const monday = week && isValidDate(week) ? startOfWeek(week) : thisWeek
  const tasks = useLiveQuery(listTasks)
  const folders = useLiveQuery(listFolders)
  const settings = useLiveQuery(getSettings)
  const [sheet, setSheet] = useState<OpenSheet>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const todayHeader = useRef<HTMLButtonElement>(null)
  // Opening from a tap with flushSync keeps the keyboard behaviour iOS needs
  const show = (s: OpenSheet) => flushSync(() => setSheet(s))
  const close = () => setSheet(null)

  const ready = Boolean(tasks && folders)
  const days = tasksByDay(tasks ?? [], weekDates(monday))
  const first = firstHour(days.flatMap((d) => d.timed.map((t) => t.dueTime!)))
  const tops = days.map((d) =>
    entryTops(
      d.timed.map((t) => t.dueTime!),
      first,
    ),
  )
  const gridHeight = Math.max(
    (24 - first) * HOUR_HEIGHT,
    ...tops.flat().map((top) => top + ENTRY_HEIGHT + 4),
  )
  const folderById = new Map<string, Folder>(folders?.map((f) => [f.id, f]))
  const folderOf = (task: Task) => (task.folderId ? folderById.get(task.folderId) : undefined)
  const entryBg = (task: Task) => {
    const folder = folderOf(task)
    return folder ? tileBg[folder.color] : 'bg-unsorted'
  }

  // A new week starts at the top, scrolled across to today when it's in view
  useLayoutEffect(() => {
    const el = scroller.current
    if (!el || !ready) return
    el.scrollTop = 0
    el.scrollLeft = todayHeader.current ? todayHeader.current.offsetLeft - TIME_COL : 0
  }, [monday, ready])

  const goToWeek = (date: string) =>
    replaceRoute(date === thisWeek ? { name: 'calendar' } : { name: 'calendar', week: date })

  const openTask = (task: Task) => navigate({ name: 'task', taskId: task.id })
  const sheetDay = sheet?.kind === 'day' ? days.find((d) => d.date === sheet.date) : undefined

  return (
    <>
      <main className="mx-auto flex h-dvh max-w-5xl flex-col pt-[max(24px,env(safe-area-inset-top))]">
        <div className="px-5">
          <HomeHeader view="calendar" />
          {settings &&
            !settings.installHintDismissed &&
            isIosSafari(browserInfo()) &&
            !isStandalone() && (
              <InstallHint onDismiss={() => void setSetting('installHintDismissed', true)} />
            )}
          <div className="mt-5 flex items-center justify-between gap-3">
            <h1 className="text-page-title">{weekLabel(monday, now)}</h1>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                aria-label="Previous week"
                onClick={() => goToWeek(addDays(monday, -7))}
                className="grid size-11 place-items-center rounded-full bg-surface"
              >
                <BackIcon className="size-6" />
              </button>
              <button
                type="button"
                aria-label="Next week"
                onClick={() => goToWeek(addDays(monday, 7))}
                className="grid size-11 place-items-center rounded-full bg-surface"
              >
                <BackIcon className="size-6 rotate-180" />
              </button>
            </div>
          </div>
          {monday === thisWeek ? (
            <p className="flex h-11 items-center text-label">This week</p>
          ) : (
            <button
              type="button"
              onClick={() => goToWeek(thisWeek)}
              className="-ml-1 h-11 px-1 text-[15px] font-bold text-link"
            >
              Back to this week
            </button>
          )}
        </div>

        {/* Scrolls both ways: the hours stay on the left, the day headers on top */}
        <div
          ref={scroller}
          role="region"
          aria-label={`Week of ${weekLabel(monday, now)}`}
          tabIndex={0}
          // isolate keeps the sticky layers below the add bar and toasts
          className="isolate mt-1 min-h-0 flex-1 overflow-auto overscroll-contain"
        >
          {ready && (
            <div
              // At least as wide as its columns, so the sticky hours have room to stick in
              className="grid"
              style={{
                minWidth: TIME_COL + 7 * DAY_COL,
                gridTemplateColumns: `${TIME_COL}px repeat(7, minmax(${DAY_COL}px, 1fr))`,
                gridTemplateRows: `auto auto ${gridHeight}px`,
              }}
            >
              <div aria-hidden="true" className="sticky top-0 left-0 z-30 bg-bg" />
              {days.map(({ date, timed, untimed }) => {
                const h = dayHeader(date)
                const isToday = date === today
                const count = timed.length + untimed.length
                return (
                  <button
                    key={date}
                    ref={isToday ? todayHeader : undefined}
                    type="button"
                    onClick={() => show({ kind: 'day', date })}
                    className="sticky top-0 z-20 bg-bg px-1 pb-1.5"
                  >
                    <span className="sr-only">
                      {longDay(date)}
                      {isToday ? ', today' : ''}, {count === 0 ? 'nothing planned' : plural(count)}
                    </span>
                    <span
                      aria-hidden="true"
                      className={`flex flex-col items-center rounded-tab py-1.5 ${
                        isToday
                          ? 'bg-today text-ink'
                          : date < today
                            ? 'text-text-secondary'
                            : 'text-text'
                      }`}
                    >
                      <span className="text-[13px] font-bold">{h.weekday}</span>
                      <span className="text-[26px] leading-none font-[780] [font-stretch:76%]">
                        {h.day}
                      </span>
                      <span className="text-[13px] font-bold">{h.month}</span>
                    </span>
                  </button>
                )
              })}

              <p className="sticky left-0 z-20 bg-bg pt-2 pr-1 text-right text-[12px] leading-tight font-bold text-text-secondary">
                Any time
              </p>
              {days.map(({ date, untimed }) => (
                <ul
                  key={date}
                  aria-label={`${longDay(date)}, any time`}
                  className="flex flex-col gap-1 border-b-2 border-l border-divider p-1"
                >
                  {untimed.map((task) => (
                    <li key={task.id}>
                      <button
                        type="button"
                        onClick={() => openTask(task)}
                        className={`flex min-h-11 w-full flex-col justify-center rounded-[12px] px-2 py-1 text-left text-[14px] leading-tight font-semibold text-ink ${entryBg(task)}`}
                      >
                        {isOverdue(task, now) && (
                          <span className="text-[12px] font-bold">
                            <LatePill>Late</LatePill>
                          </span>
                        )}
                        <span className="line-clamp-2 break-words">{task.title}</span>
                      </button>
                    </li>
                  ))}
                  <li>
                    <button
                      type="button"
                      aria-label={`Add task on ${longDay(date)}`}
                      onClick={() => show({ kind: 'add', date, time: null })}
                      className="grid min-h-11 w-full place-items-center rounded-[12px] border-2 border-dashed border-control/60 text-text-secondary"
                    >
                      <PlusIcon className="size-5" />
                    </button>
                  </li>
                </ul>
              ))}

              <div aria-hidden="true" className="sticky left-0 z-20 bg-bg">
                {Array.from({ length: 24 - first }, (_, i) => (
                  <span
                    key={i}
                    className="absolute right-1.5 text-[12px] font-bold text-text-secondary"
                    style={{ top: i * HOUR_HEIGHT + 3 }}
                  >
                    {pad(first + i)}:00
                  </span>
                ))}
              </div>
              {days.map(({ date, timed }, d) => (
                // A tap on an empty hour adds a task at that hour. Keyboard and
                // screen reader users add from the + under "Any time" instead.
                <div
                  key={date}
                  onClick={(e) => {
                    if (e.target !== e.currentTarget) return
                    const y = e.clientY - e.currentTarget.getBoundingClientRect().top
                    const hour = Math.min(23, first + Math.floor(y / HOUR_HEIGHT))
                    show({ kind: 'add', date, time: `${pad(hour)}:00` })
                  }}
                  className="relative border-l border-divider"
                  style={{
                    backgroundImage: 'linear-gradient(var(--divider) 1px, transparent 1px)',
                    backgroundSize: `100% ${HOUR_HEIGHT}px`,
                  }}
                >
                  <ul aria-label={`${longDay(date)}, with a time`}>
                    {timed.map((task, i) => {
                      const time = calendarTime(task, now)!
                      return (
                        <li key={task.id}>
                          <button
                            type="button"
                            onClick={() => openTask(task)}
                            className={`absolute inset-x-1 flex flex-col justify-center overflow-hidden rounded-[12px] px-2 text-left text-ink ${entryBg(task)}`}
                            style={{ top: tops[d]![i], height: ENTRY_HEIGHT }}
                          >
                            <span className="text-[12px] leading-tight font-bold">
                              {isOverdue(task, now) ? <LatePill>{time}</LatePill> : time}
                            </span>
                            <span className="truncate text-[14px] leading-tight font-semibold">
                              {task.title}
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                  {date === today && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-late"
                      style={{ top: offsetOf(toTimeString(now), first) }}
                    >
                      <span className="absolute -top-[3px] -left-1 size-2 rounded-full bg-late" />
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          {/* Room to scroll the last hours up above the add bar */}
          <div
            aria-hidden="true"
            className="h-[calc(max(12px,env(safe-area-inset-bottom))+80px)]"
          />
        </div>
      </main>

      <AddBar
        label={tasks?.length === 0 ? 'Add your first task' : 'Add a task'}
        onOpen={() => show({ kind: 'add', date: null, time: null })}
      />
      <Sheet open={sheet?.kind === 'add'} onClose={close} labelledBy={QUICK_ADD_TITLE_ID}>
        {sheet?.kind === 'add' && (
          <QuickAdd defaultDate={sheet.date} defaultTime={sheet.time} onClose={close} />
        )}
      </Sheet>
      <Sheet open={sheet?.kind === 'day'} onClose={close} labelledBy={DAY_SHEET_TITLE_ID}>
        {sheetDay && (
          <div className="mt-2">
            <div className="flex items-center justify-between gap-3">
              <h2 id={DAY_SHEET_TITLE_ID} className="text-section">
                {longDay(sheetDay.date)}
              </h2>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="-mr-1.5 grid size-11 shrink-0 place-items-center rounded-full bg-bg"
              >
                <CloseIcon className="size-5" />
              </button>
            </div>
            {sheetDay.timed.length + sheetDay.untimed.length === 0 ? (
              <p className="mt-3 text-[16px] text-text-secondary">Nothing planned.</p>
            ) : (
              <ul
                aria-labelledby={DAY_SHEET_TITLE_ID}
                className="mt-3 rounded-card border-2 border-divider"
              >
                {[...sheetDay.timed, ...sheetDay.untimed].map((task) => {
                  const folder = folderOf(task)
                  return (
                    <TaskRow
                      key={task.id}
                      task={task}
                      now={now}
                      urgency={isOverdue(task, now) ? 'late' : null}
                      due={calendarTime(task, now) ?? (isOverdue(task, now) ? 'Late' : null)}
                      folder={{
                        name: folder?.name ?? 'Unsorted',
                        dot: folder ? dotBg[folder.color] : UNSORTED_DOT,
                      }}
                      onOpen={() => openTask(task)}
                      onToggle={() => {
                        // The Undo toast sits under an open sheet, so close it first
                        close()
                        void completeWithUndo(task)
                      }}
                    />
                  )
                })}
              </ul>
            )}
            <Button
              variant="primary"
              data-autofocus
              onClick={() => show({ kind: 'add', date: sheetDay.date, time: null })}
              className="mt-5 w-full"
            >
              Add task
            </Button>
          </div>
        )}
      </Sheet>
    </>
  )
}
