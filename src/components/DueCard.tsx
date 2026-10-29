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
  onOpen,
  onComplete,
}: {
  task: Task
  urgency: Urgency
  label: { big: string; small: string }
  folderName: string
  folderDot: string
  onOpen: () => void
  onComplete: () => void
}) {
  const stepsDone = task.steps.filter((s) => s.done).length

  return (
    <li className="flex items-stretch gap-1 rounded-card bg-surface p-1.5">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-stretch gap-3 rounded-[17px] text-left"
      >
        <span
          className={`flex w-[78px] shrink-0 flex-col items-center justify-center rounded-tab px-1 py-3 text-center text-ink ${tabBg[urgency]}`}
        >
          <span className="text-tab">{label.big}</span>
          <span className="mt-1 text-[13px] font-bold">{label.small}</span>
        </span>

        <span className="min-w-0 flex-1 self-center py-2">
          <span className="block text-task break-words">{task.title}</span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] font-semibold text-text-secondary">
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${folderDot}`} />
              {folderName}
            </span>
            {task.steps.length > 0 && (
              <span className="rounded-full bg-bg px-2 py-0.5 text-[13px] font-bold">
                {stepsDone}/{task.steps.length} steps
              </span>
            )}
          </span>
        </span>
      </button>

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
