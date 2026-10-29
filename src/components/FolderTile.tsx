import type { Folder } from '../db/schema.ts'
import { unsortedSummary } from '../lib/copy.ts'
import { tileBg } from './folderColors.ts'
import { CheckIcon, PlusIcon } from './icons.tsx'
import ProgressBar from './ProgressBar.tsx'

export function FolderTile({
  folder,
  done,
  total,
}: {
  folder: Folder
  done: number
  total: number
}) {
  const allDone = total > 0 && done === total

  return (
    <li className={`flex min-h-[150px] flex-col rounded-tile p-4 text-ink ${tileBg[folder.color]}`}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 text-tile break-words">{folder.name}</h3>
        {allDone && (
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ink text-white">
            <CheckIcon className="size-4" />
          </span>
        )}
      </div>
      <div className="mt-auto pt-4">
        <p className="text-[15px] font-bold">
          {total === 0 ? 'No tasks yet' : allDone ? 'All done' : `${total - done} left`}
        </p>
        {total > 0 && (
          <p className="text-[13px] font-semibold text-ink/75">
            {done} of {total} done
          </p>
        )}
        <ProgressBar done={done} total={total} className="mt-2" />
      </div>
    </li>
  )
}

/** The built-in inbox, shown as a full-width row above the folder grid. */
export function UnsortedRow({ open }: { open: number }) {
  return (
    <div className="flex items-center gap-3 rounded-card bg-surface p-4">
      <span aria-hidden="true" className="size-10 shrink-0 rounded-[12px] bg-unsorted" />
      <div className="min-w-0">
        <h3 className="text-tile">Unsorted</h3>
        <p className="text-[14px] font-semibold text-text-secondary">{unsortedSummary(open)}</p>
      </div>
    </div>
  )
}

export function NewFolderTile({ onClick }: { onClick?: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex size-full min-h-[150px] flex-col items-center justify-center gap-2 rounded-tile border-2 border-dashed border-control text-[15px] font-bold text-text-secondary"
      >
        <PlusIcon className="size-6" />
        New folder
      </button>
    </li>
  )
}
