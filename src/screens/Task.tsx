import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import AutoTextarea from '../components/AutoTextarea.tsx'
import Button from '../components/Button.tsx'
import { dotBg, duePill, UNSORTED_DOT } from '../components/folderColors.ts'
import { BackIcon, CheckIcon, CloseIcon } from '../components/icons.tsx'
import ProgressBar from '../components/ProgressBar.tsx'
import { listFolders } from '../db/folders.ts'
import type { Folder, Step, Task } from '../db/schema.ts'
import { getSettings } from '../db/settings.ts'
import {
  addStep,
  getTask,
  removeStep,
  renameStep,
  toggleStep,
  uncompleteTask,
  updateTask,
} from '../db/tasks.ts'
import { dueText, formatStamp, isValidDate, isValidTime, urgencyOf } from '../lib/dates.ts'
import { goBack, HOME, replaceRoute } from '../lib/route.ts'
import { completeWithUndo, deleteWithUndo } from '../lib/taskActions.ts'
import { useNow } from '../lib/useNow.ts'

/** Typing pauses this long before title, notes and step names save. */
const SAVE_DELAY = 300

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export default function TaskScreen({ taskId }: { taskId: string }) {
  // undefined while loading, false if the task doesn't exist
  const task = useLiveQuery(async () => (await getTask(taskId)) ?? false, [taskId])
  const folders = useLiveQuery(listFolders)
  const settings = useLiveQuery(getSettings)
  // Set when this screen deletes the task, so it doesn't also redirect Home
  const leaving = useRef(false)

  useEffect(() => {
    if (task === false && !leaving.current) replaceRoute(HOME)
  }, [task])

  if (!task || !folders || !settings) return null

  async function remove() {
    leaving.current = true
    goBack()
    await deleteWithUndo(taskId)
  }

  return (
    <TaskEditor
      key={taskId}
      task={task}
      folders={folders}
      dueSoonDays={settings.dueSoonDays}
      onDelete={() => void remove()}
    />
  )
}

function TaskEditor({
  task,
  folders,
  dueSoonDays,
  onDelete,
}: {
  task: Task
  folders: Folder[]
  dueSoonDays: number
  onDelete: () => void
}) {
  const now = useNow()
  const [saveState, setSaveState] = useState<SaveState>('idle')
  // Title and notes keep local drafts so the live query never fights the cursor
  const [title, setTitle] = useState(task.title)
  const [notes, setNotes] = useState(task.notes)
  const [newStep, setNewStep] = useState('')
  const pending = useRef(new Map<string, () => Promise<unknown>>())
  const timer = useRef<number | undefined>(undefined)

  // Leaving the page saves whatever is still waiting
  useEffect(() => {
    const queue = pending
    const t = timer
    return () => {
      clearTimeout(t.current)
      for (const save of queue.current.values()) void save()
      queue.current.clear()
    }
  }, [])

  async function run(save: () => Promise<unknown>) {
    setSaveState('saving')
    try {
      await save()
      setSaveState('saved')
    } catch {
      setSaveState('error')
    }
  }

  function flush() {
    clearTimeout(timer.current)
    const saves = [...pending.current.values()]
    pending.current.clear()
    if (saves.length > 0) void run(() => Promise.all(saves.map((save) => save())))
  }

  /** Saves after a pause in typing. A later edit to the same field replaces this one. */
  function schedule(field: string, save: (() => Promise<unknown>) | null) {
    if (save) pending.current.set(field, save)
    else pending.current.delete(field)
    setSaveState(pending.current.size > 0 ? 'saving' : 'idle')
    clearTimeout(timer.current)
    timer.current = window.setTimeout(flush, SAVE_DELAY)
  }

  function changeTitle(value: string) {
    const oneLine = value.replace(/\n/g, ' ')
    setTitle(oneLine)
    const clean = oneLine.trim()
    schedule('title', clean ? () => updateTask(task.id, { title: clean }) : null)
  }

  function addNewStep(e: FormEvent) {
    e.preventDefault()
    const clean = newStep.trim()
    if (!clean) return
    setNewStep('')
    void run(() => addStep(task.id, clean))
  }

  const folder = folders.find((f) => f.id === task.folderId)
  const due = dueText(task, now)
  const stepsDone = task.steps.filter((s) => s.done).length
  const row = 'flex min-h-14 items-center justify-between gap-3 px-4 py-1.5'
  const field = 'h-11 rounded-full bg-bg px-4 text-[15px] font-bold'

  return (
    <main className="mx-auto max-w-xl px-5 pt-[max(24px,env(safe-area-inset-top))] pb-16">
      <header className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            flush()
            goBack()
          }}
          aria-label="Back"
          className="grid size-11 place-items-center rounded-full bg-surface"
        >
          <BackIcon className="size-6" />
        </button>
        <p
          role="status"
          className={`text-[14px] font-bold ${saveState === 'error' ? 'text-danger-text dark:text-late' : 'text-text-secondary'}`}
        >
          {saveState === 'saving'
            ? 'Saving…'
            : saveState === 'saved'
              ? 'Saved'
              : saveState === 'error'
                ? "Couldn't save"
                : ''}
        </p>
      </header>

      <label htmlFor="task-title" className="sr-only">
        Title
      </label>
      <AutoTextarea
        id="task-title"
        value={title}
        enterKeyHint="done"
        onChange={(e) => changeTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            e.currentTarget.blur()
          }
        }}
        onBlur={() => {
          if (!title.trim()) setTitle(task.title)
          flush()
        }}
        className="mt-5 w-full border-b-2 border-transparent bg-transparent pb-1 text-page-title focus-visible:border-link focus-visible:outline-none"
      />

      <p className="mt-3 flex flex-wrap items-center gap-2 text-[14px] font-bold">
        {due && (
          <span className={`rounded-full px-3 py-1 ${duePill(urgencyOf(task, now, dueSoonDays))}`}>
            {due}
          </span>
        )}
        <span className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-1">
          <span
            aria-hidden="true"
            className={`size-2.5 rounded-full ${folder ? dotBg[folder.color] : UNSORTED_DOT}`}
          />
          {folder?.name ?? 'Unsorted'}
        </span>
        {task.completedAt && (
          <span className="flex items-center gap-1 rounded-full bg-mint px-3 py-1 text-ink">
            <CheckIcon className="size-4" />
            Done
          </span>
        )}
      </p>

      {task.completedAt ? (
        <Button
          variant="secondary"
          onClick={() => void run(() => uncompleteTask(task.id))}
          className="mt-5 w-full"
        >
          Mark as not done
        </Button>
      ) : (
        <Button
          variant="strong"
          onClick={() => void run(() => completeWithUndo(task))}
          className="mt-5 w-full"
        >
          Mark as done
        </Button>
      )}

      <div className="mt-4 divide-y divide-divider rounded-card bg-surface">
        <div className={row}>
          <label htmlFor="task-date" className="text-[16px] font-semibold">
            Date
          </label>
          <span className="flex items-center gap-1">
            <input
              id="task-date"
              type="date"
              value={task.dueDate ?? ''}
              onChange={(e) => {
                const v = e.target.value
                if (v === '') void run(() => updateTask(task.id, { dueDate: null }))
                else if (isValidDate(v)) void run(() => updateTask(task.id, { dueDate: v }))
              }}
              className={field}
            />
            {task.dueDate && (
              <button
                type="button"
                onClick={() => void run(() => updateTask(task.id, { dueDate: null }))}
                aria-label="Remove date"
                className="grid size-11 place-items-center rounded-full"
              >
                <CloseIcon className="size-4" />
              </button>
            )}
          </span>
        </div>

        {task.dueDate && (
          <div className={row}>
            <label htmlFor="task-time" className="text-[16px] font-semibold">
              Time
            </label>
            <span className="flex items-center gap-1">
              <input
                id="task-time"
                type="time"
                value={task.dueTime ?? ''}
                onChange={(e) => {
                  const v = e.target.value
                  if (v === '') void run(() => updateTask(task.id, { dueTime: null }))
                  else if (isValidTime(v)) void run(() => updateTask(task.id, { dueTime: v }))
                }}
                className={field}
              />
              {task.dueTime && (
                <button
                  type="button"
                  onClick={() => void run(() => updateTask(task.id, { dueTime: null }))}
                  aria-label="Remove time"
                  className="grid size-11 place-items-center rounded-full"
                >
                  <CloseIcon className="size-4" />
                </button>
              )}
            </span>
          </div>
        )}

        <div className={row}>
          <label htmlFor="task-folder" className="text-[16px] font-semibold">
            Folder
          </label>
          <select
            id="task-folder"
            value={task.folderId ?? ''}
            onChange={(e) =>
              void run(() => updateTask(task.id, { folderId: e.target.value || null }))
            }
            className={`${field} max-w-[60%]`}
          >
            <option value="">Unsorted</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <section className="mt-4 rounded-card bg-surface p-4">
        <label htmlFor="task-notes" className="text-label">
          Notes
        </label>
        <AutoTextarea
          id="task-notes"
          value={notes}
          placeholder="Add notes"
          onChange={(e) => {
            const v = e.target.value
            setNotes(v)
            schedule('notes', () => updateTask(task.id, { notes: v }))
          }}
          onBlur={flush}
          className="mt-1 block min-h-12 w-full bg-transparent text-[17px] leading-relaxed placeholder:text-text-secondary"
        />
      </section>

      <section aria-labelledby="steps-heading" className="mt-4 rounded-card bg-surface p-4">
        <div className="flex items-baseline justify-between">
          <h2 id="steps-heading" className="text-label">
            Steps
          </h2>
          {task.steps.length > 0 && (
            <p className="text-[14px] font-bold text-text-secondary">
              {stepsDone} of {task.steps.length} done
            </p>
          )}
        </div>
        {task.steps.length > 0 && (
          <>
            <ProgressBar onSurface done={stepsDone} total={task.steps.length} className="mt-2" />
            <ul className="mt-2">
              {task.steps.map((step, i) => (
                <StepRow
                  key={step.id}
                  step={step}
                  index={i}
                  onToggle={() => void run(() => toggleStep(task.id, step.id))}
                  onRename={(clean) =>
                    schedule(
                      `step:${step.id}`,
                      clean ? () => renameStep(task.id, step.id, clean) : null,
                    )
                  }
                  onBlur={flush}
                  onRemove={() => {
                    pending.current.delete(`step:${step.id}`)
                    void run(() => removeStep(task.id, step.id))
                  }}
                />
              ))}
            </ul>
          </>
        )}
        <form onSubmit={addNewStep} className="mt-2 flex items-center gap-2">
          <label htmlFor="new-step" className="sr-only">
            New step
          </label>
          <input
            id="new-step"
            value={newStep}
            onChange={(e) => setNewStep(e.target.value)}
            placeholder="Add a step"
            enterKeyHint="done"
            autoComplete="off"
            className="h-11 min-w-0 flex-1 rounded-full bg-bg px-4 text-[16px] placeholder:text-text-secondary"
          />
          <button
            type="submit"
            disabled={!newStep.trim()}
            className="h-11 shrink-0 rounded-full bg-ink px-4 text-[15px] font-bold text-white disabled:opacity-50 dark:bg-text-dark dark:text-ink"
          >
            Add step
          </button>
        </form>
      </section>

      <p className="mt-6 text-center text-[14px] font-semibold text-text-secondary">
        Created {formatStamp(task.createdAt, now)}
        <br />
        Edited {formatStamp(task.updatedAt, now)}
        {task.completedAt && (
          <>
            <br />
            Done {formatStamp(task.completedAt, now)}
          </>
        )}
      </p>

      <div className="mt-4 flex justify-center">
        <button
          type="button"
          onClick={onDelete}
          className="h-11 rounded-full px-5 text-[16px] font-bold text-danger-text dark:text-late"
        >
          Delete task
        </button>
      </div>
    </main>
  )
}

function StepRow({
  step,
  index,
  onToggle,
  onRename,
  onBlur,
  onRemove,
}: {
  step: Step
  index: number
  onToggle: () => void
  onRename: (clean: string) => void
  onBlur: () => void
  onRemove: () => void
}) {
  const [title, setTitle] = useState(step.title)

  return (
    <li className="flex items-center gap-1">
      <label className="grid size-11 shrink-0 cursor-pointer place-items-center">
        <input
          type="checkbox"
          checked={step.done}
          onChange={onToggle}
          aria-label={step.title}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className="grid size-6 place-items-center rounded-md border-2 border-control text-white peer-checked:border-ink peer-checked:bg-ink peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-link dark:text-ink dark:peer-checked:border-text-dark dark:peer-checked:bg-text-dark"
        >
          {step.done && <CheckIcon className="size-4" />}
        </span>
      </label>
      <input
        value={title}
        aria-label={`Step ${index + 1}`}
        onChange={(e) => {
          setTitle(e.target.value)
          onRename(e.target.value.trim())
        }}
        onBlur={() => {
          if (!title.trim()) setTitle(step.title)
          onBlur()
        }}
        className={`h-11 min-w-0 flex-1 bg-transparent text-[16px] ${step.done ? 'text-text-secondary line-through' : ''}`}
      />
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove step ${step.title}`}
        className="grid size-11 shrink-0 place-items-center rounded-full text-text-secondary"
      >
        <CloseIcon className="size-4" />
      </button>
    </li>
  )
}
