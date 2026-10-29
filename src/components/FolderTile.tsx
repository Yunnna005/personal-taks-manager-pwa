import type { Folder, FolderColor } from '../db/schema.ts'
import { unsortedSummary } from '../lib/copy.ts'
import { tileBg } from './folderColors.ts'
import { CheckIcon, PlusIcon } from './icons.tsx'
import ProgressBar from './ProgressBar.tsx'

type TileProps = {
  name: string
  color: FolderColor
  done: number
  total: number
}

function TileContent({ name, done, total }: Omit<TileProps, 'color'>) {
  const allDone = total > 0 && done === total
  return (
    <>
      <span className="flex items-start justify-between gap-2">
        <span className="min-w-0 text-tile break-words">{name}</span>
        {allDone && (
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ink text-white">
            <CheckIcon className="size-4" />
          </span>
        )}
      </span>
      <span className="mt-auto block pt-4">
        <span className="block text-[15px] font-bold">
          {total === 0 ? 'No tasks yet' : allDone ? 'All done' : `${total - done} left`}
        </span>
        {total > 0 && (
          <span className="block text-[13px] font-semibold text-ink/75">
            {done} of {total} done
          </span>
        )}
        <ProgressBar done={done} total={total} className="mt-2" />
      </span>
    </>
  )
}

const tileClass = 'flex min-h-[150px] w-full flex-col rounded-tile p-4 text-left text-ink'

export function FolderTile({
  folder,
  done,
  total,
  onOpen,
}: {
  folder: Folder
  done: number
  total: number
  onOpen: () => void
}) {
  return (
    <li>
      <button type="button" onClick={onOpen} className={`${tileClass} ${tileBg[folder.color]}`}>
        <TileContent name={folder.name} done={done} total={total} />
      </button>
    </li>
  )
}

/** Non-interactive copy of a tile for the folder sheet's live preview. */
export function TilePreview({ name, color, done, total }: TileProps) {
  return (
    <div aria-hidden="true" className={`${tileClass} ${tileBg[color]}`}>
      <TileContent name={name} done={done} total={total} />
    </div>
  )
}

/** The built-in inbox, shown as a full-width row above the folder grid. */
export function UnsortedRow({ open, onOpen }: { open: number; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-card bg-surface p-4 text-left"
    >
      <span aria-hidden="true" className="size-10 shrink-0 rounded-[12px] bg-unsorted" />
      <span className="min-w-0">
        <span className="block text-tile">Unsorted</span>
        <span className="block text-[14px] font-semibold text-text-secondary">
          {unsortedSummary(open)}
        </span>
      </span>
    </button>
  )
}

export function NewFolderTile({ onClick }: { onClick: () => void }) {
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
