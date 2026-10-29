import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { flushSync } from 'react-dom'
import Button from '../components/Button.tsx'
import { dotBg, UNSORTED_DOT } from '../components/folderColors.ts'
import { AlertIcon, BackIcon } from '../components/icons.tsx'
import Sheet from '../components/Sheet.tsx'
import TaskRow from '../components/TaskRow.tsx'
import { listFolders } from '../db/folders.ts'
import { listCompletedTasks, uncompleteTask } from '../db/tasks.ts'
import { goBack, navigate } from '../lib/route.ts'
import { deleteCompletedWithUndo } from '../lib/taskActions.ts'
import { useNow } from '../lib/useNow.ts'

const CONFIRM_TITLE_ID = 'delete-completed-title'

/** Completed tasks from every folder, with a way to clear them all. */
export default function CompletedScreen() {
  const now = useNow()
  const tasks = useLiveQuery(listCompletedTasks)
  const folders = useLiveQuery(listFolders)
  const [confirming, setConfirming] = useState(false)

  if (!tasks || !folders) return null

  const folderById = new Map(folders.map((f) => [f.id, f]))
  const count = tasks.length === 1 ? '1 completed task' : `${tasks.length} completed tasks`

  async function deleteAll() {
    setConfirming(false)
    goBack()
    await deleteCompletedWithUndo()
  }

  return (
    <>
      <header className="rounded-b-sheet bg-mint px-5 pt-[max(24px,env(safe-area-inset-top))] pb-6 text-ink">
        <div className="mx-auto max-w-xl">
          <button
            type="button"
            onClick={goBack}
            aria-label="Back"
            className="grid size-11 place-items-center rounded-full bg-paper/60"
          >
            <BackIcon className="size-6" />
          </button>
          <h1 className="mt-6 text-display">Completed</h1>
          <p className="mt-4 text-[15px] font-bold">
            {tasks.length === 0 ? 'Nothing here' : `${tasks.length} done`}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-5 pb-16">
        {tasks.length === 0 ? (
          <p className="mt-7 rounded-card border-2 border-dashed border-control px-5 py-6 text-center text-[16px] text-text-secondary">
            No completed tasks.
          </p>
        ) : (
          <>
            <ul
              aria-label="Completed tasks"
              className="mt-7 overflow-hidden rounded-card bg-surface"
            >
              {tasks.map((task) => {
                const folder = task.folderId ? folderById.get(task.folderId) : undefined
                return (
                  <TaskRow
                    key={task.id}
                    task={task}
                    now={now}
                    urgency={null}
                    folder={{
                      name: folder?.name ?? 'Unsorted',
                      dot: folder ? dotBg[folder.color] : UNSORTED_DOT,
                    }}
                    onOpen={() => navigate({ name: 'task', taskId: task.id })}
                    onToggle={() => void uncompleteTask(task.id)}
                  />
                )
              })}
            </ul>
            <Button
              variant="destructive"
              onClick={() => flushSync(() => setConfirming(true))}
              className="mt-6 w-full"
            >
              Delete all
            </Button>
          </>
        )}
      </main>

      <Sheet
        centered
        open={confirming}
        onClose={() => setConfirming(false)}
        labelledBy={CONFIRM_TITLE_ID}
      >
        <div className="text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-late text-ink">
            <AlertIcon className="size-7" />
          </span>
          <h2 id={CONFIRM_TITLE_ID} className="mt-3 text-section">
            Delete {count}?
          </h2>
          <p className="mt-2 text-[16px] text-text-secondary">
            They'll be removed from every folder. Your open tasks stay as they are.
          </p>
          <div className="mt-6 flex flex-col gap-2.5">
            <Button variant="destructive" onClick={() => void deleteAll()}>
              Delete all
            </Button>
            <Button variant="secondary" onClick={() => setConfirming(false)} data-autofocus>
              Keep them
            </Button>
          </div>
        </div>
      </Sheet>
    </>
  )
}
