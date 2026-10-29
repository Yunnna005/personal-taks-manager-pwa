// Date and urgency logic. Due dates are local "YYYY-MM-DD" strings and times
// are local "HH:mm" strings, so "due today" never shifts with time zones.
// Everything here is pure: callers pass `now` in.

export type DueFields = {
  dueDate: string | null
  dueTime: string | null
  completedAt: string | null
}

export type Urgency = 'late' | 'today' | 'tomorrow' | 'later'

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function parts(date: string): [number, number, number] {
  const m = DATE_RE.exec(date)
  if (!m) throw new Error(`Invalid date: ${date}`)
  return [Number(m[1]), Number(m[2]), Number(m[3])]
}

/** True for a real calendar date in "YYYY-MM-DD" form (rejects 2026-02-30). */
export function isValidDate(value: string): boolean {
  const m = DATE_RE.exec(value)
  if (!m) return false
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const utc = new Date(Date.UTC(y, mo - 1, d))
  return utc.getUTCFullYear() === y && utc.getUTCMonth() === mo - 1 && utc.getUTCDate() === d
}

export function isValidTime(value: string): boolean {
  return TIME_RE.test(value)
}

/** Local calendar date of `d` as "YYYY-MM-DD". */
export function toDateString(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Local wall-clock time of `d` as "HH:mm". */
export function toTimeString(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Calendar arithmetic is done in UTC so DST changes (and zones where local
// midnight doesn't exist) can't add or lose a day.
export function addDays(date: string, days: number): string {
  const [y, m, d] = parts(date)
  const utc = new Date(Date.UTC(y, m - 1, d + days))
  return `${utc.getUTCFullYear()}-${pad(utc.getUTCMonth() + 1)}-${pad(utc.getUTCDate())}`
}

/** Whole calendar days from `from` to `to` (negative if `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  const [y1, m1, d1] = parts(from)
  const [y2, m2, d2] = parts(to)
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000)
}

/**
 * A task with a time is overdue once that minute has passed (due 17:00 is
 * late from 17:01). A task without a time is overdue from the next day.
 */
export function isOverdue(task: DueFields, now: Date): boolean {
  if (task.completedAt || !task.dueDate) return false
  const today = toDateString(now)
  if (task.dueDate < today) return true
  if (task.dueDate > today || !task.dueTime) return false
  return task.dueTime < toTimeString(now)
}

/**
 * Where a task sits in the "Due soon" window, or null if it isn't in it
 * (no date, completed, or due more than `dueSoonDays` days from today).
 */
export function urgencyOf(task: DueFields, now: Date, dueSoonDays: number): Urgency | null {
  if (task.completedAt || !task.dueDate) return null
  if (isOverdue(task, now)) return 'late'
  const days = daysBetween(toDateString(now), task.dueDate)
  if (days === 0) return 'today'
  if (days > dueSoonDays) return null
  return days === 1 ? 'tomorrow' : 'later'
}

/** Date order; on the same day timed tasks first in time order, then untimed. */
export function compareDue(a: DueFields, b: DueFields): number {
  if (a.dueDate !== b.dueDate) {
    if (!a.dueDate) return 1
    if (!b.dueDate) return -1
    return a.dueDate < b.dueDate ? -1 : 1
  }
  if (a.dueTime === b.dueTime) return 0
  if (!a.dueTime) return 1
  if (!b.dueTime) return -1
  return a.dueTime < b.dueTime ? -1 : 1
}

/** Overdue tasks plus tasks due within `dueSoonDays`, overdue first, then by date. */
export function selectDueSoon<T extends DueFields>(
  tasks: readonly T[],
  now: Date,
  dueSoonDays: number,
): T[] {
  return tasks
    .filter((t) => urgencyOf(t, now, dueSoonDays) !== null)
    .sort((a, b) => {
      const lateA = isOverdue(a, now)
      const lateB = isOverdue(b, now)
      if (lateA !== lateB) return lateA ? -1 : 1
      return compareDue(a, b)
    })
}

const weekdayFormat = new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: 'UTC' })
const dayMonthFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
})

function asUtcDate(date: string): Date {
  const [y, m, d] = parts(date)
  return new Date(Date.UTC(y, m - 1, d))
}

/**
 * The two lines on a Due soon card's urgency tab, e.g. "2 days" / "late",
 * "17:00" / "today", "Fri" / "30 Oct". Big line is the time when there is one,
 * otherwise the weekday; a task late by whole days shows how many.
 */
export function dueLabel(task: DueFields, now: Date): { big: string; small: string } | null {
  if (!task.dueDate) return null
  const today = toDateString(now)
  const days = daysBetween(today, task.dueDate)
  const big = task.dueTime ?? weekdayFormat.format(asUtcDate(task.dueDate))

  if (isOverdue(task, now)) {
    if (days === 0) return { big, small: 'late' }
    const n = -days
    return { big: `${n} ${n === 1 ? 'day' : 'days'}`, small: 'late' }
  }
  if (days === 0) return { big, small: 'today' }
  if (days === 1) return { big, small: 'tomorrow' }
  return { big, small: dayMonthFormat.format(asUtcDate(task.dueDate)) }
}

const shortDateFormat = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
})

/** "Sat 31" for date chips. */
export function weekdayAndDay(date: string): string {
  const d = asUtcDate(date)
  return `${weekdayFormat.format(d)} ${d.getUTCDate()}`
}

/** "Mon 9 Nov" for a date picked outside the chips. */
export function shortDate(date: string): string {
  return shortDateFormat.format(asUtcDate(date)).replace(',', '')
}

/**
 * One-line due text for task rows: "Today 17:00", "Tomorrow", "Mon 9 Nov".
 * Overdue tasks start with "Late · " so lateness isn't shown by colour alone.
 */
export function dueText(task: DueFields, now: Date): string | null {
  if (!task.dueDate) return null
  const days = daysBetween(toDateString(now), task.dueDate)
  const day =
    days === 0
      ? 'Today'
      : days === 1
        ? 'Tomorrow'
        : days === -1
          ? 'Yesterday'
          : shortDate(task.dueDate)
  const text = task.dueTime ? `${day} ${task.dueTime}` : day
  return isOverdue(task, now) ? `Late · ${text}` : text
}

const stampDateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

/** "today at 12:04", "yesterday at 09:00" or "29 Oct 2026" for created/edited stamps. */
export function formatStamp(iso: string, now: Date): string {
  const d = new Date(iso)
  const days = daysBetween(toDateString(d), toDateString(now))
  if (days === 0) return `today at ${toTimeString(d)}`
  if (days === 1) return `yesterday at ${toTimeString(d)}`
  return stampDateFormat.format(d)
}

// --- Week calendar ----------------------------------------------------------

/** The Monday of the week `date` falls in (weeks start on Monday, as in the UK). */
export function startOfWeek(date: string): string {
  return addDays(date, -((asUtcDate(date).getUTCDay() + 6) % 7))
}

/** The seven dates of the week starting `monday`. */
export function weekDates(monday: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

const dayMonthYearFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

/**
 * "26 Oct – 1 Nov" for the week starting `monday`. The year is added when the
 * week isn't all in the current year: "28 Dec 2026 – 3 Jan 2027".
 */
export function weekLabel(monday: string, now: Date): string {
  const sunday = addDays(monday, 6)
  const year = String(now.getFullYear())
  if (monday.startsWith(year) && sunday.startsWith(year)) {
    return `${dayMonthFormat.format(asUtcDate(monday))} – ${dayMonthFormat.format(asUtcDate(sunday))}`
  }
  return `${dayMonthYearFormat.format(asUtcDate(monday))} – ${dayMonthYearFormat.format(asUtcDate(sunday))}`
}

type CalendarTask = DueFields & { title: string; createdAt: string }

export type CalendarDay<T> = {
  date: string
  /** Tasks with a time, in time order. */
  timed: T[]
  /** Tasks without a time, oldest first. */
  untimed: T[]
}

function compareCalendar(a: CalendarTask, b: CalendarTask): number {
  return (
    compareDue(a, b) || a.createdAt.localeCompare(b.createdAt) || a.title.localeCompare(b.title)
  )
}

/** Open tasks for each of `dates`, split into timed and untimed. Completed tasks are left out. */
export function tasksByDay<T extends CalendarTask>(
  tasks: readonly T[],
  dates: readonly string[],
): CalendarDay<T>[] {
  const days = dates.map((date) => ({ date, timed: [] as T[], untimed: [] as T[] }))
  const byDate = new Map(days.map((d) => [d.date, d]))
  for (const task of [...tasks].sort(compareCalendar)) {
    const day = !task.completedAt && task.dueDate ? byDate.get(task.dueDate) : undefined
    if (day) (task.dueTime ? day.timed : day.untimed).push(task)
  }
  return days
}

/** "Thursday 29 October", for calendar headings read by screen readers. */
export function longDay(date: string): string {
  return longDayFormat.format(asUtcDate(date)).replace(',', '')
}

const longDayFormat = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
})

/** "Thu" and "29" for a calendar column header. */
export function dayHeader(date: string): { weekday: string; day: string; month: string } {
  const d = asUtcDate(date)
  return {
    weekday: weekdayFormat.format(d),
    day: String(d.getUTCDate()),
    month: dayMonthFormat.formatToParts(d).find((p) => p.type === 'month')!.value,
  }
}

/**
 * The time on a calendar entry: "17:00", or "Late · 09:00" once it has passed,
 * so lateness isn't shown by colour alone. Null without a time.
 */
export function calendarTime(task: DueFields, now: Date): string | null {
  if (!task.dueTime) return null
  return isOverdue(task, now) ? `Late · ${task.dueTime}` : task.dueTime
}

/** Minutes since midnight for "HH:mm". */
export function minutesOf(time: string): number {
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))
}
