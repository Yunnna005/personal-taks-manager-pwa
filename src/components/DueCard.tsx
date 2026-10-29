import type { Task } from '../db/schema.ts'
import type { Urgency } from '../lib/dates.ts'

const tabBg: Record<Urgency, string> = {
  late: 'bg-late',
  today: 'bg-today',
  tomorrow: 'bg-tomorrow',
  later: 'bg-later',
}

export default function DueCard({
  task,
  urgency,
  label,
  folderName,
  folderDot,
  onComplete,
}: {
  task: Task
  urgency: Urgency
  label: { big: string; small: string }
  folderName: string
  folderDot: string
  onComplete: () => void
}) {
  const stepsDone = task.steps.filter((s) => s.done).length

  return (
    <li className="flex items-stretch gap-3 rounded-card bg-surface p-1.5">
      <div
        className={`flex w-[78px] shrink-0 flex-col items-center justify-center rounded-tab px-1 py-3 text-center text-ink ${tabBg[urgency]}`}
      >
        <span className="text-tab">{label.big}</span>
        <span className="mt-1 text-[13px] font-bold">{label.small}</span>
      </div>

      <div className="min-w-0 flex-1 self-center py-2">
        <p className="text-task break-words">{task.title}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] font-semibold text-text-secondary">
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${folderDot}`} />
            {folderName}
          </span>
          {task.steps.length > 0 && (
            <span className="rounded-full bg-bg px-2 py-0.5 text-[13px] font-bold">
              {stepsDone}/{task.steps.length} steps
            </span>
          )}
        </p>
      </div>

      <button
        type="button"
        onClick={onComplete}
        aria-label={`Mark ${task.title} as done`}
        className="mr-1 grid size-11 shrink-0 place-items-center self-center rounded-full"
      >
        <span aria-hidden="true" className="size-7 rounded-full border-2 border-control" />
      </button>
    </li>
  )
}
