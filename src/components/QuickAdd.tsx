import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState, type FormEvent } from 'react'
import { flushSync } from 'react-dom'
import { listFolders } from '../db/folders.ts'
import { addTask } from '../db/tasks.ts'
import {
  addDays,
  daysBetween,
  isValidDate,
  shortDate,
  toDateString,
  weekdayAndDay,
} from '../lib/dates.ts'
import { useNow } from '../lib/useNow.ts'
import Chip from './Chip.tsx'
import { dotBg, UNSORTED_DOT } from './folderColors.ts'
import { CheckIcon, CloseIcon } from './icons.tsx'

/** Days from today shown as chips: Today, Tomorrow, then the next five weekdays. */
const DAY_CHIPS = [0, 1, 2, 3, 4, 5, 6]

/** null = no date, a number = days from today, a string = a date picked from the calendar. */
type When = number | string | null

export const QUICK_ADD_TITLE_ID = 'quick-add-title'

export default function QuickAdd({
  defaultFolderId = null,
  onClose,
}: {
  defaultFolderId?: string | null
  onClose: () => void
}) {
  const today = toDateString(useNow())
  const folders = useLiveQuery(listFolders)
  const [title, setTitle] = useState('')
  const [folderId, setFolderId] = useState<string | null>(defaultFolderId)
  const [when, setWhen] = useState<When>(null)
  const [showTime, setShowTime] = useState(false)
  const [time, setTime] = useState('')
  const [lastAdded, setLastAdded] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const timeRef = useRef<HTMLInputElement>(null)
  const dateRef = useRef<HTMLInputElement>(null)

  // Day chips are stored as offsets so "Today" stays today if the sheet is open over midnight
  const dueDate = when === null ? null : typeof when === 'number' ? addDays(today, when) : when
  const dueTime = dueDate && showTime && time ? time : null
  // A folder deleted while the sheet is open falls back to Unsorted
  const target = !folders || folders.some((f) => f.id === folderId) ? folderId : null

  async function submit(e: FormEvent) {
    e.preventDefault()
    const clean = title.trim()
    if (!clean) return
    try {
      await addTask({ title: clean, folderId: target, dueDate, dueTime })
      setLastAdded(clean)
      setTitle('')
      setError(null)
    } catch {
      setError("Couldn't add that task. Nothing was saved, so try again.")
    }
    titleRef.current?.focus()
  }

  function pickDate(value: string) {
    if (!isValidDate(value)) return
    const offset = daysBetween(today, value)
    setWhen(DAY_CHIPS.includes(offset) ? offset : value)
  }

  function openPicker(input: HTMLInputElement | null) {
    if (!input) return
    try {
      input.showPicker()
    } catch {
      input.focus()
    }
  }

  return (
    <form onSubmit={submit} className="mt-2">
      <h2 id={QUICK_ADD_TITLE_ID} className="sr-only">
        Add a task
      </h2>

      <div className="flex min-h-11 items-center justify-between gap-3">
        <p role="status" className="min-w-0">
          {lastAdded && (
            <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-mint px-3 py-1.5 text-[14px] font-bold text-ink">
              <CheckIcon className="size-4 shrink-0" />
              <span className="truncate">{lastAdded}</span> <span className="shrink-0">added</span>
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="-mr-1.5 grid size-11 shrink-0 place-items-center rounded-full bg-bg"
        >
          <CloseIcon className="size-5" />
        </button>
      </div>

      <label htmlFor="quick-add-input" className="sr-only">
        Task title
      </label>
      <input
        id="quick-add-input"
        ref={titleRef}
        data-autofocus
        autoComplete="off"
        enterKeyHint="done"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What needs doing?"
        className="mt-3 w-full border-b-2 border-divider bg-transparent pt-1 pb-2 text-page-title placeholder:text-text-secondary focus-visible:border-link focus-visible:outline-none"
      />

      <p id="quick-add-folder" className="mt-5 text-label">
        Folder
      </p>
      <div
        role="group"
        aria-labelledby="quick-add-folder"
        className="-mx-5 mt-2 no-scrollbar flex gap-2 overflow-x-auto px-5"
      >
        <Chip selected={target === null} onClick={() => setFolderId(null)}>
          <span aria-hidden="true" className={`size-2.5 rounded-full ${UNSORTED_DOT}`} />
          Unsorted
        </Chip>
        {folders?.map((f) => (
          <Chip key={f.id} selected={target === f.id} onClick={() => setFolderId(f.id)}>
            <span aria-hidden="true" className={`size-2.5 rounded-full ${dotBg[f.color]}`} />
            {f.name}
          </Chip>
        ))}
      </div>

      <p id="quick-add-when" className="mt-5 text-label">
        When
      </p>
      <div
        role="group"
        aria-labelledby="quick-add-when"
        className="-mx-5 mt-2 no-scrollbar flex gap-2 overflow-x-auto px-5"
      >
        <Chip tone="butter" selected={when === null} onClick={() => setWhen(null)}>
          No date
        </Chip>
        {DAY_CHIPS.map((n) => (
          <Chip key={n} tone="butter" selected={when === n} onClick={() => setWhen(n)}>
            {n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : weekdayAndDay(addDays(today, n))}
          </Chip>
        ))}
        <Chip
          tone="butter"
          selected={typeof when === 'string'}
          onClick={() => openPicker(dateRef.current)}
        >
          {typeof when === 'string' ? shortDate(when) : 'Other date'}
        </Chip>
        <input
          ref={dateRef}
          type="date"
          aria-label="Pick a date"
          tabIndex={-1}
          value={typeof when === 'string' ? when : ''}
          onChange={(e) => pickDate(e.target.value)}
          className="sr-only"
        />
      </div>

      {dueDate && (
        <div className="mt-3 flex items-center gap-2">
          {showTime ? (
            <>
              <label htmlFor="quick-add-time" className="text-label">
                Time
              </label>
              <input
                id="quick-add-time"
                ref={timeRef}
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="h-11 rounded-full bg-bg px-4 text-[15px] font-bold"
              />
              <button
                type="button"
                onClick={() => {
                  setShowTime(false)
                  setTime('')
                }}
                aria-label="Remove time"
                className="grid size-11 place-items-center rounded-full"
              >
                <CloseIcon className="size-4" />
              </button>
            </>
          ) : (
            <Chip
              dashed
              onClick={() => {
                // Render the input now so the picker opens within this tap
                flushSync(() => setShowTime(true))
                openPicker(timeRef.current)
              }}
            >
              Add time
            </Chip>
          )}
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-card bg-error px-4 py-3 text-[15px] text-error-text"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!title.trim()}
        className="mt-6 h-[52px] w-full rounded-full bg-cobalt text-[17px] font-bold text-white disabled:opacity-50"
      >
        Add task
      </button>
    </form>
  )
}
