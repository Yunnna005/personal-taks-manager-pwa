import type { Task } from '../db/schema.ts'
import { dueText, type Urgency } from '../lib/dates.ts'
import { duePill } from './folderColors.ts'

/** A task inside a folder's list card. */
export default function TaskRow({
  task,
  now,
  urgency,
  onOpen,
  onComplete,
}: {
  task: Task
  now: Date
  urgency: Urgency | null
  onOpen: () => void
  onComplete: () => void
}) {
  const due = dueText(task, now)
  const stepsDone = task.steps.filter((s) => s.done).length

  return (
    <li className="flex items-center gap-2 border-b border-divider py-1 pr-2 pl-1 last:border-b-0">
      <button
        type="button"
        onClick={onOpen}
        className="min-h-11 min-w-0 flex-1 rounded-[14px] py-2 pl-3 text-left"
      >
        <span className="block text-task break-words">{task.title}</span>
        {(due || task.steps.length > 0) && (
          <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[13px] font-bold">
            {due && <span className={`rounded-full px-2 py-0.5 ${duePill(urgency)}`}>{due}</span>}
            {task.steps.length > 0 && (
              <span className="rounded-full bg-bg px-2 py-0.5 text-text-secondary">
                {stepsDone}/{task.steps.length} steps
              </span>
            )}
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={onComplete}
        aria-label={`Mark ${task.title} as done`}
        className="grid size-11 shrink-0 place-items-center rounded-full"
      >
        <span aria-hidden="true" className="size-7 rounded-full border-2 border-control" />
      </button>
    </li>
  )
}
