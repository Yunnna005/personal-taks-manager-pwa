import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { flushSync } from 'react-dom'
import AddBar from '../components/AddBar.tsx'
import DueCard from '../components/DueCard.tsx'
import { dotBg, nextColor, UNSORTED_DOT } from '../components/folderColors.ts'
import { FOLDER_EDITOR_TITLE_ID, FolderEditor } from '../components/FolderSheets.tsx'
import { FolderTile, NewFolderTile, UnsortedRow } from '../components/FolderTile.tsx'
import { SettingsIcon } from '../components/icons.tsx'
import QuickAdd, { QUICK_ADD_TITLE_ID } from '../components/QuickAdd.tsx'
import Sheet from '../components/Sheet.tsx'
import { listFolders } from '../db/folders.ts'
import { getSettings, setSetting } from '../db/settings.ts'
import { countByFolder, listTasks } from '../db/tasks.ts'
import { backupAge, dueSoonSummary, needsBackup, nothingDue } from '../lib/copy.ts'
import { dueLabel, isOverdue, selectDueSoon, urgencyOf } from '../lib/dates.ts'
import { navigate } from '../lib/route.ts'
import { completeWithUndo } from '../lib/taskActions.ts'
import { useExport } from '../lib/useExport.ts'
import InstallHint from '../pwa/InstallHint.tsx'
import { browserInfo, isIosSafari, isStandalone } from '../pwa/platform.ts'
import { useNow } from '../lib/useNow.ts'

const DUE_SOON_LIMIT = 5

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

export default function Home() {
  const now = useNow()
  const tasks = useLiveQuery(listTasks)
  const folders = useLiveQuery(listFolders)
  const counts = useLiveQuery(countByFolder)
  const settings = useLiveQuery(getSettings)
  const [expanded, setExpanded] = useState(false)
  const exporter = useExport()
  const [sheet, setSheet] = useState<'add' | 'folder' | null>(null)
  // Opening from a tap with flushSync keeps the keyboard behaviour iOS needs
  const show = (s: 'add' | 'folder') => flushSync(() => setSheet(s))
  const close = () => setSheet(null)

  const loaded = tasks && folders && counts && settings
  const days = settings?.dueSoonDays ?? 0
  const dueSoon = tasks ? selectDueSoon(tasks, now, days) : []
  const lateCount = dueSoon.filter((t) => isOverdue(t, now)).length
  const shown = expanded ? dueSoon : dueSoon.slice(0, DUE_SOON_LIMIT)
  const folderById = new Map(folders?.map((f) => [f.id, f]))
  const unsorted = counts?.get('') ?? { done: 0, total: 0 }
  const summary = dueSoonSummary(dueSoon.length, lateCount, days)

  return (
    <>
      <main className="mx-auto min-h-dvh max-w-xl px-5 pt-[max(24px,env(safe-area-inset-top))] pb-32">
        <header className="flex h-11 items-center justify-between">
          <p className="text-section">soon</p>
          <button
            type="button"
            aria-label="Settings"
            onClick={() => navigate({ name: 'settings' })}
            className="grid size-11 place-items-center rounded-full bg-surface"
          >
            <SettingsIcon className="size-6" />
          </button>
        </header>

        <h1 className="mt-6 text-display">{dateFormat.format(now).replace(',', '')}</h1>
        {loaded && summary && <p className="mt-3 text-[17px] text-text-secondary">{summary}</p>}

        {folders && counts && settings && (
          <>
            {!settings.installHintDismissed && isIosSafari(browserInfo()) && !isStandalone() && (
              <InstallHint onDismiss={() => void setSetting('installHintDismissed', true)} />
            )}
            {tasks && needsBackup(settings.lastBackupAt, tasks.length > 0, now) && (
              <section
                aria-label="Backup"
                className="mt-6 flex items-center gap-3 rounded-card bg-nudge p-4 text-nudge-text"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[16px] font-bold">{backupAge(settings.lastBackupAt, now)}</p>
                  <p className="text-[14px]">Your tasks live only on this phone.</p>
                </div>
                <button
                  type="button"
                  onClick={exporter.run}
                  disabled={exporter.busy}
                  className="h-11 shrink-0 rounded-full bg-ink px-5 text-[15px] font-bold text-white disabled:opacity-50"
                >
                  Export
                </button>
              </section>
            )}
            <section aria-labelledby="due-soon-heading" className="mt-8">
              <h2 id="due-soon-heading" className="text-section">
                Due soon
              </h2>
              {dueSoon.length === 0 ? (
                <p className="mt-3 rounded-card border-2 border-dashed border-control px-5 py-6 text-center text-[16px] text-text-secondary">
                  {nothingDue(days)}
                </p>
              ) : (
                <ul aria-labelledby="due-soon-heading" className="mt-3 flex flex-col gap-2.5">
                  {shown.map((task) => {
                    const folder = task.folderId ? folderById.get(task.folderId) : undefined
                    return (
                      <DueCard
                        key={task.id}
                        task={task}
                        urgency={urgencyOf(task, now, days)!}
                        label={dueLabel(task, now)!}
                        folderName={folder?.name ?? 'Unsorted'}
                        folderDot={folder ? dotBg[folder.color] : UNSORTED_DOT}
                        onOpen={() => navigate({ name: 'task', taskId: task.id })}
                        onComplete={() => void completeWithUndo(task)}
                      />
                    )
                  })}
                </ul>
              )}
              {dueSoon.length > DUE_SOON_LIMIT && (
                <button
                  type="button"
                  onClick={() => setExpanded(!expanded)}
                  className="mt-2 h-11 rounded-full px-4 text-[15px] font-bold text-link"
                >
                  {expanded ? 'Show fewer' : `See all ${dueSoon.length}`}
                </button>
              )}
            </section>

            <section aria-labelledby="folders-heading" className="mt-8">
              <h2 id="folders-heading" className="text-section">
                Folders
              </h2>
              <div className="mt-3">
                <UnsortedRow
                  open={unsorted.total - unsorted.done}
                  onOpen={() => navigate({ name: 'folder', folderId: null })}
                />
              </div>
              <ul className="mt-2.5 grid grid-cols-2 gap-2.5">
                {folders.map((folder) => {
                  const c = counts.get(folder.id) ?? { done: 0, total: 0 }
                  return (
                    <FolderTile
                      key={folder.id}
                      folder={folder}
                      done={c.done}
                      total={c.total}
                      onOpen={() => navigate({ name: 'folder', folderId: folder.id })}
                    />
                  )
                })}
                <NewFolderTile onClick={() => show('folder')} />
              </ul>
            </section>
          </>
        )}
      </main>

      <AddBar
        label={tasks?.length === 0 ? 'Add your first task' : 'Add a task'}
        onOpen={() => show('add')}
      />
      <Sheet open={sheet === 'add'} onClose={close} labelledBy={QUICK_ADD_TITLE_ID}>
        <QuickAdd onClose={close} />
      </Sheet>
      <Sheet open={sheet === 'folder'} onClose={close} labelledBy={FOLDER_EDITOR_TITLE_ID}>
        <FolderEditor initialColor={nextColor(folders ?? [])} onDone={close} onCancel={close} />
      </Sheet>
    </>
  )
}
