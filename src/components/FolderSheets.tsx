import { useState, type FormEvent } from 'react'
import { createFolder, MAX_FOLDER_NAME, recolorFolder, renameFolder } from '../db/folders.ts'
import { FOLDER_COLORS, type Folder, type FolderColor } from '../db/schema.ts'
import Button from './Button.tsx'
import { tileBg } from './folderColors.ts'
import { TilePreview } from './FolderTile.tsx'
import { AlertIcon, CheckIcon } from './icons.tsx'

export const FOLDER_EDITOR_TITLE_ID = 'folder-editor-title'
export const FOLDER_OPTIONS_TITLE_ID = 'folder-options-title'
export const DELETE_FOLDER_TITLE_ID = 'delete-folder-title'

const COLOR_NAMES: Record<FolderColor, string> = {
  lilac: 'Lilac',
  peach: 'Peach',
  mint: 'Mint',
  sky: 'Sky',
  butter: 'Butter',
  rose: 'Rose',
}

/**
 * New folder, or edit an existing one. `focus` picks what gets focus on open:
 * the name (keyboard up) for New and Rename, the swatches for Change colour.
 */
export function FolderEditor({
  folder,
  initialColor,
  counts = { done: 0, total: 0 },
  focus = 'name',
  onDone,
  onCancel,
}: {
  folder?: Folder
  initialColor: FolderColor
  counts?: { done: number; total: number }
  focus?: 'name' | 'color'
  onDone: (folder?: Folder) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(folder?.name ?? '')
  const [color, setColor] = useState<FolderColor>(folder?.color ?? initialColor)
  const [error, setError] = useState<string | null>(null)
  const clean = name.trim()

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!clean) return
    try {
      if (folder) {
        if (clean !== folder.name) await renameFolder(folder.id, clean)
        if (color !== folder.color) await recolorFolder(folder.id, color)
        onDone(folder)
      } else {
        onDone(await createFolder(clean, color))
      }
    } catch {
      setError("Couldn't save the folder. Nothing was changed, so try again.")
    }
  }

  return (
    <form onSubmit={submit} className="mt-3">
      <h2 id={FOLDER_EDITOR_TITLE_ID} className="text-page-title">
        {folder ? 'Edit folder' : 'New folder'}
      </h2>

      <label htmlFor="folder-name" className="mt-5 block text-label">
        Name
      </label>
      <input
        id="folder-name"
        data-autofocus={focus === 'name' ? true : undefined}
        autoComplete="off"
        enterKeyHint="done"
        maxLength={MAX_FOLDER_NAME}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Folder name"
        className="mt-2 h-12 w-full rounded-[14px] bg-bg px-4 text-[17px] font-semibold placeholder:text-text-secondary"
      />

      <fieldset className="mt-5">
        <legend className="text-label">Colour</legend>
        <div className="mt-2 flex flex-wrap gap-2.5">
          {FOLDER_COLORS.map((c) => (
            <label
              key={c}
              className={`relative grid size-11 cursor-pointer place-items-center rounded-full text-ink ${tileBg[c]} has-checked:ring-[3px] has-checked:ring-ink has-checked:ring-offset-2 has-checked:ring-offset-surface has-focus-visible:outline-3 has-focus-visible:outline-offset-4 has-focus-visible:outline-link dark:has-checked:ring-text-dark`}
            >
              <input
                type="radio"
                name="folder-color"
                value={c}
                checked={color === c}
                onChange={() => setColor(c)}
                data-autofocus={focus === 'color' && color === c ? true : undefined}
                className="sr-only"
              />
              <span className="sr-only">{COLOR_NAMES[c]}</span>
              {color === c && <CheckIcon className="size-5" />}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-5 w-1/2 pr-1.5">
        <TilePreview
          name={clean || 'Folder name'}
          color={color}
          done={counts.done}
          total={counts.total}
        />
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-card bg-error px-4 py-3 text-[15px] text-error-text"
        >
          {error}
        </p>
      )}

      <div className="mt-6 grid grid-cols-2 gap-2.5">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="strong" type="submit" disabled={!clean}>
          {folder ? 'Save' : 'Create folder'}
        </Button>
      </div>
    </form>
  )
}

export function FolderOptions({
  folder,
  onRename,
  onRecolor,
  onDelete,
  onCancel,
}: {
  folder: Folder
  onRename: () => void
  onRecolor: () => void
  onDelete: () => void
  onCancel: () => void
}) {
  const row = 'h-14 w-full rounded-card px-5 text-left text-[17px] font-bold'
  return (
    <div className="mt-3">
      <h2 id={FOLDER_OPTIONS_TITLE_ID} className="text-page-title break-words">
        {folder.name}
      </h2>
      <div className="mt-4 flex flex-col gap-2">
        <button type="button" onClick={onRename} className={`${row} bg-bg`}>
          Rename folder
        </button>
        <button type="button" onClick={onRecolor} className={`${row} bg-bg`}>
          Change colour
        </button>
        <button type="button" onClick={onDelete} className={`${row} bg-error text-error-text`}>
          Delete folder
        </button>
        <Button variant="secondary" onClick={onCancel} className="mt-2">
          Cancel
        </Button>
      </div>
    </div>
  )
}

export function DeleteFolderConfirm({
  folder,
  openTasks,
  onDelete,
  onKeep,
}: {
  folder: Folder
  openTasks: number
  onDelete: () => void
  onKeep: () => void
}) {
  return (
    <div className="text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-late text-ink">
        <AlertIcon className="size-7" />
      </span>
      <h2 id={DELETE_FOLDER_TITLE_ID} className="mt-3 text-section break-words">
        Delete {folder.name}?
      </h2>
      <p className="mt-2 text-[16px] text-text-secondary">
        {openTasks === 0
          ? 'It has no open tasks.'
          : `Its ${openTasks === 1 ? '1 open task' : `${openTasks} open tasks`} will move to Unsorted.`}
      </p>
      <div className="mt-6 flex flex-col gap-2.5">
        <Button variant="destructive" onClick={onDelete}>
          Delete folder
        </Button>
        <Button variant="secondary" onClick={onKeep} data-autofocus>
          Keep folder
        </Button>
      </div>
    </div>
  )
}
