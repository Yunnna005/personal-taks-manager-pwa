import type { Task } from '../db/schema.ts'
import { dueText, type Urgency } from '../lib/dates.ts'

const pillBg: Record<Urgency, string> = {
  late: 'bg-late text-ink',
  today: 'bg-today text-ink',
  tomorrow: 'bg-tomorrow text-ink',
  later: 'bg-later text-ink',
}

/** A task inside a folder's list card. */
export default function TaskRow({
  task,
  now,
  urgency,
  onComplete,
}: {
  task: Task
  now: Date
  urgency: Urgency | null
  onComplete: () => void
}) {
  const due = dueText(task, now)
  const stepsDone = task.steps.filter((s) => s.done).length

  return (
    <li className="flex items-center gap-2 border-b border-divider py-2 pr-2 pl-4 last:border-b-0">
      <div className="min-w-0 flex-1 py-1">
        <p className="text-task break-words">{task.title}</p>
        {(due || task.steps.length > 0) && (
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[13px] font-bold">
            {due && (
              <span
                className={`rounded-full px-2 py-0.5 ${urgency ? pillBg[urgency] : 'bg-bg text-text-secondary'}`}
              >
                {due}
              </span>
            )}
            {task.steps.length > 0 && (
              <span className="rounded-full bg-bg px-2 py-0.5 text-text-secondary">
                {stepsDone}/{task.steps.length} steps
              </span>
            )}
          </p>
        )}
      </div>
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
