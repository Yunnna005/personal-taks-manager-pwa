import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import AddBar from '../components/AddBar.tsx'
import { tileBg } from '../components/folderColors.ts'
import {
  DELETE_FOLDER_TITLE_ID,
  DeleteFolderConfirm,
  FOLDER_EDITOR_TITLE_ID,
  FOLDER_OPTIONS_TITLE_ID,
  FolderEditor,
  FolderOptions,
} from '../components/FolderSheets.tsx'
import { BackIcon, MoreIcon } from '../components/icons.tsx'
import ProgressBar from '../components/ProgressBar.tsx'
import QuickAdd, { QUICK_ADD_TITLE_ID } from '../components/QuickAdd.tsx'
import Sheet from '../components/Sheet.tsx'
import TaskRow from '../components/TaskRow.tsx'
import { deleteFolder, getFolder } from '../db/folders.ts'
import type { Task } from '../db/schema.ts'
import { getSettings } from '../db/settings.ts'
import { completeTask, listTasksInFolder } from '../db/tasks.ts'
import { compareDue, urgencyOf } from '../lib/dates.ts'
import { goBack, HOME, navigate, replaceRoute } from '../lib/route.ts'
import { useNow } from '../lib/useNow.ts'

type OpenSheet = 'add' | 'options' | 'rename' | 'recolor' | 'delete' | null

export default function FolderScreen({ folderId }: { folderId: string | null }) {
  const now = useNow()
  // undefined while loading, null for Unsorted, false if the folder doesn't exist
  const folder = useLiveQuery(
    async () => (folderId ? ((await getFolder(folderId)) ?? false) : null),
    [folderId],
  )
  const tasks = useLiveQuery(() => listTasksInFolder(folderId), [folderId])
  const settings = useLiveQuery(getSettings)
  const [sheet, setSheet] = useState<OpenSheet>(null)

  useEffect(() => {
    if (folder === false) replaceRoute(HOME)
  }, [folder])

  if (folder === undefined || folder === false || !tasks || !settings) return null

  const name = folder?.name ?? 'Unsorted'
  const colorClass = folder ? tileBg[folder.color] : 'bg-unsorted'
  const open = tasks.filter((t) => !t.completedAt)
  const done = tasks.length - open.length
  // Ties go oldest first, then by title, so the order never jumps around
  const byAge = (a: Task, b: Task) =>
    a.createdAt.localeCompare(b.createdAt) || a.title.localeCompare(b.title)
  const dated = open.filter((t) => t.dueDate).sort((a, b) => compareDue(a, b) || byAge(a, b))
  const undated = open.filter((t) => !t.dueDate).sort(byAge)
  // Opening from a tap with flushSync keeps the keyboard behaviour iOS needs
  const show = (s: OpenSheet) => flushSync(() => setSheet(s))
  const close = () => setSheet(null)

  async function confirmDelete() {
    if (!folder) return
    close()
    goBack()
    await deleteFolder(folder.id)
  }

  const list = (id: string, heading: string, items: Task[]) =>
    items.length > 0 && (
      <section aria-labelledby={id} className="mt-7">
        <h2 id={id} className="text-section">
          {heading}
        </h2>
        <ul aria-labelledby={id} className="mt-3 overflow-hidden rounded-card bg-surface">
          {items.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              now={now}
              urgency={urgencyOf(task, now, settings.dueSoonDays)}
              onOpen={() => navigate({ name: 'task', taskId: task.id })}
              onComplete={() => void completeTask(task.id)}
            />
          ))}
        </ul>
      </section>
    )

  return (
    <>
      <header
        className={`rounded-b-sheet px-5 pt-[max(24px,env(safe-area-inset-top))] pb-6 text-ink ${colorClass}`}
      >
        <div className="mx-auto max-w-xl">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={goBack}
              aria-label="Back"
              className="grid size-11 place-items-center rounded-full bg-paper/60"
            >
              <BackIcon className="size-6" />
            </button>
            {folder && (
              <button
                type="button"
                onClick={() => show('options')}
                aria-label="Folder options"
                className="grid size-11 place-items-center rounded-full bg-paper/60"
              >
                <MoreIcon className="size-6" />
              </button>
            )}
          </div>
          <h1 className="mt-6 text-display break-words">{name}</h1>
          <p className="mt-4 text-[15px] font-bold">
            {tasks.length === 0
              ? 'No tasks yet'
              : open.length === 0
                ? `All done · ${done} of ${tasks.length}`
                : `${open.length} left · ${done} of ${tasks.length} done`}
          </p>
          <ProgressBar tall done={done} total={tasks.length} className="mt-2" />
        </div>
      </header>

      <main className="mx-auto max-w-xl px-5 pb-32">
        {open.length === 0 ? (
          <p className="mt-7 rounded-card border-2 border-dashed border-control px-5 py-6 text-center text-[16px] text-text-secondary">
            {tasks.length === 0 ? 'No tasks here yet.' : 'Everything here is done.'}
          </p>
        ) : (
          <>
            {list('dated-heading', 'With a due date', dated)}
            {list('undated-heading', 'No date', undated)}
          </>
        )}
      </main>

      <AddBar
        label={`Add to ${name}`}
        plusClassName={`${colorClass} text-ink`}
        onOpen={() => show('add')}
      />

      <Sheet open={sheet === 'add'} onClose={close} labelledBy={QUICK_ADD_TITLE_ID}>
        <QuickAdd defaultFolderId={folderId} onClose={close} />
      </Sheet>

      {folder && (
        <>
          <Sheet open={sheet === 'options'} onClose={close} labelledBy={FOLDER_OPTIONS_TITLE_ID}>
            <FolderOptions
              folder={folder}
              onRename={() => show('rename')}
              onRecolor={() => show('recolor')}
              onDelete={() => show('delete')}
              onCancel={close}
            />
          </Sheet>
          <Sheet
            open={sheet === 'rename' || sheet === 'recolor'}
            onClose={close}
            labelledBy={FOLDER_EDITOR_TITLE_ID}
          >
            <FolderEditor
              folder={folder}
              initialColor={folder.color}
              counts={{ done, total: tasks.length }}
              focus={sheet === 'recolor' ? 'color' : 'name'}
              onDone={close}
              onCancel={close}
            />
          </Sheet>
          <Sheet
            centered
            open={sheet === 'delete'}
            onClose={close}
            labelledBy={DELETE_FOLDER_TITLE_ID}
          >
            <DeleteFolderConfirm
              folder={folder}
              openTasks={open.length}
              onDelete={() => void confirmDelete()}
              onKeep={close}
            />
          </Sheet>
        </>
      )}
    </>
  )
}
