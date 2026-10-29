// User-facing sentences built from counts. Wording follows DESIGN.md's Copy section.

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

function nextDays(days: number): string {
  return days === 1 ? 'the next day' : `the next ${days} days`
}

/** "4 tasks due in the next 3 days. One is already late." Null when nothing is due. */
export function dueSoonSummary(due: number, late: number, days: number): string | null {
  if (due === 0) return null
  const first = `${plural(due, 'task', 'tasks')} due in ${nextDays(days)}.`
  if (late === 0) return first
  if (late === due) return `${first} ${due === 1 ? 'It is' : 'All are'} already late.`
  return `${first} ${late === 1 ? 'One is' : `${late} are`} already late.`
}

/** "Nothing due in the next 3 days." */
export function nothingDue(days: number): string {
  return `Nothing due in ${nextDays(days)}.`
}

/** "3 tasks to sort" */
export function unsortedSummary(open: number): string {
  return open === 0 ? 'Nothing to sort' : `${plural(open, 'task', 'tasks')} to sort`
}

/** Home nudges once there are tasks and the last backup is more than this old (or never). */
export const BACKUP_NUDGE_DAYS = 14

function daysAgo(iso: string, now: Date): number {
  const then = new Date(iso)
  const a = Date.UTC(then.getFullYear(), then.getMonth(), then.getDate())
  const b = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((b - a) / 86_400_000)
}

export function needsBackup(lastBackupAt: string | null, hasTasks: boolean, now: Date): boolean {
  if (!hasTasks) return false
  return lastBackupAt === null || daysAgo(lastBackupAt, now) > BACKUP_NUDGE_DAYS
}

/** "Last backup was 14 days ago", "Last backup was today", "No backup yet" */
export function backupAge(lastBackupAt: string | null, now: Date): string {
  if (lastBackupAt === null) return 'No backup yet'
  const days = daysAgo(lastBackupAt, now)
  if (days <= 0) return 'Last backup was today'
  if (days === 1) return 'Last backup was yesterday'
  return `Last backup was ${days} days ago`
}

/** "Imported 24 tasks and 4 folders" */
export function importedSummary(tasks: number, folders: number): string {
  return `Imported ${plural(tasks, 'task', 'tasks')} and ${plural(folders, 'folder', 'folders')}`
}

/** "3 days ahead" */
export function daysAhead(days: number): string {
  return `${plural(days, 'day', 'days')} ahead`
}
