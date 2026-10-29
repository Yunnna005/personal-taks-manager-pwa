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
