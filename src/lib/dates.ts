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
