import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import Button from '../components/Button.tsx'
import {
  AlertIcon,
  BackIcon,
  CalendarIcon,
  CheckIcon,
  ListIcon,
  MinusIcon,
  PlusIcon,
} from '../components/icons.tsx'
import Sheet from '../components/Sheet.tsx'
import type { BackupFile } from '../db/backup.ts'
import type { StartView, Theme } from '../db/schema.ts'
import { getSettings, MAX_DUE_SOON_DAYS, MIN_DUE_SOON_DAYS, setSetting } from '../db/settings.ts'
import { listTasks } from '../db/tasks.ts'
import { readBackupFile, restoreBackup } from '../lib/backupActions.ts'
import { backupAge, daysAhead, importedSummary, needsBackup } from '../lib/copy.ts'
import { goBack } from '../lib/route.ts'
import { useExport } from '../lib/useExport.ts'
import { useNow } from '../lib/useNow.ts'
import {
  checkForUpdate,
  reloadToUpdate,
  useUpdateStatus,
  type UpdateStatus,
} from '../pwa/updates.ts'

const CONFIRM_TITLE_ID = 'import-confirm-title'

// Flat halves for System: light on the left, dark on the right
const THEMES: { value: Theme; label: string; halves: string[] }[] = [
  { value: 'system', label: 'System', halves: ['bg-mist', 'bg-ground'] },
  { value: 'light', label: 'Light', halves: ['bg-mist'] },
  { value: 'dark', label: 'Dark', halves: ['bg-ground'] },
]

const START_VIEWS: { value: StartView; label: string; Icon: typeof ListIcon }[] = [
  { value: 'list', label: 'List', Icon: ListIcon },
  { value: 'calendar', label: 'Calendar', Icon: CalendarIcon },
]

type StorageStatus = 'checking' | 'protected' | 'unprotected' | 'unsupported'

// Older browsers have no persisted(), whatever the types say
const canCheckStorage = () => typeof navigator.storage?.persisted === 'function'

const STORAGE_TEXT: Record<StorageStatus, string> = {
  checking: 'Checking…',
  protected: 'Protected',
  unprotected: 'Not protected yet',
  unsupported: 'Not available in this browser',
}

const UPDATE_TEXT: Record<UpdateStatus, { title: string; detail: string }> = {
  idle: {
    title: 'soon updates itself',
    detail:
      'It looks for a new version when you open it and shows a Reload banner when one is ready.',
  },
  checking: { title: 'Checking for updates…', detail: 'This takes a moment.' },
  latest: { title: 'You have the latest version', detail: 'Nothing new to install right now.' },
  ready: {
    title: 'A new version is ready',
    detail: 'Reload to start using it. Your tasks stay as they are.',
  },
  failed: {
    title: "Couldn't check for updates",
    detail: 'Check your internet connection and try again.',
  },
  unsupported: {
    title: "This browser can't check for updates",
    detail: 'Reload the page to get the newest version.',
  },
}

type Message = { kind: 'success' | 'error'; text: string } | null

const exportedOn = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

export default function SettingsScreen() {
  const now = useNow()
  const settings = useLiveQuery(getSettings)
  const taskCount = useLiveQuery(async () => (await listTasks()).length)
  const exporter = useExport()
  const update = useUpdateStatus()
  const [storage, setStorage] = useState<StorageStatus>(() =>
    canCheckStorage() ? 'checking' : 'unsupported',
  )
  const [pending, setPending] = useState<BackupFile | null>(null)
  const [message, setMessage] = useState<Message>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!canCheckStorage()) return
    void navigator.storage
      .persisted()
      .then((p) => setStorage(p ? 'protected' : 'unprotected'))
      .catch(() => setStorage('unsupported'))
  }, [])

  if (!settings || taskCount === undefined) return null

  const days = settings.dueSoonDays
  const old = needsBackup(settings.lastBackupAt, taskCount > 0, now)

  async function chooseFile(file: File | undefined) {
    if (!file) return
    setMessage(null)
    const result = await readBackupFile(file)
    if (result.ok) flushSync(() => setPending(result.backup))
    else setMessage({ kind: 'error', text: result.error })
  }

  async function confirmImport() {
    if (!pending) return
    const backup = pending
    setPending(null)
    const ok = await restoreBackup(backup)
    setMessage(
      ok
        ? { kind: 'success', text: importedSummary(backup.tasks.length, backup.folders.length) }
        : {
            kind: 'error',
            text: "Couldn't import that backup. Nothing on this phone was changed.",
          },
    )
  }

  const card = 'rounded-card bg-surface p-4'
  const round = 'grid size-11 place-items-center rounded-full bg-bg disabled:opacity-40'
  const radioCard = `flex cursor-pointer flex-col gap-2 p-3 ${card} has-checked:ring-[3px] has-checked:ring-ink has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-link dark:has-checked:ring-text-dark`

  return (
    <main className="mx-auto max-w-xl px-5 pt-[max(24px,env(safe-area-inset-top))] pb-16">
      <button
        type="button"
        onClick={goBack}
        aria-label="Back"
        className="grid size-11 place-items-center rounded-full bg-surface"
      >
        <BackIcon className="size-6" />
      </button>
      <h1 className="mt-6 text-display">Settings</h1>

      <section aria-labelledby="due-soon-setting" className="mt-8">
        <h2 id="due-soon-setting" className="text-section">
          Due soon
        </h2>
        <div className={`mt-3 flex items-center justify-between gap-3 ${card}`}>
          <p className="text-[16px] text-text-secondary">Show tasks due up to</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Fewer days"
              disabled={days <= MIN_DUE_SOON_DAYS}
              onClick={() => void setSetting('dueSoonDays', days - 1)}
              className={round}
            >
              <MinusIcon className="size-5" />
            </button>
            <output aria-live="polite" className="w-28 text-center text-[17px] font-bold">
              {daysAhead(days)}
            </output>
            <button
              type="button"
              aria-label="More days"
              disabled={days >= MAX_DUE_SOON_DAYS}
              onClick={() => void setSetting('dueSoonDays', days + 1)}
              className={round}
            >
              <PlusIcon className="size-5" />
            </button>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <fieldset>
          <legend className="text-section">First page</legend>
          <p className="mt-1 text-[15px] text-text-secondary">
            What soon opens on. You can switch at the top of the page any time.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            {START_VIEWS.map(({ value, label, Icon }) => (
              <label key={value} className={radioCard}>
                <input
                  type="radio"
                  name="start-view"
                  value={value}
                  checked={settings.startView === value}
                  onChange={() => void setSetting('startView', value)}
                  className="sr-only"
                />
                <span
                  aria-hidden="true"
                  className="grid h-14 place-items-center rounded-[12px] bg-bg"
                >
                  <Icon className="size-7" />
                </span>
                <span className="flex items-center justify-between text-[15px] font-bold">
                  {label}
                  {settings.startView === value && <CheckIcon className="size-4" />}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section className="mt-8">
        <fieldset>
          <legend className="text-section">Theme</legend>
          <div className="mt-3 grid grid-cols-3 gap-2.5">
            {THEMES.map((t) => (
              <label key={t.value} className={radioCard}>
                <input
                  type="radio"
                  name="theme"
                  value={t.value}
                  checked={settings.theme === t.value}
                  onChange={() => void setSetting('theme', t.value)}
                  className="sr-only"
                />
                <span
                  aria-hidden="true"
                  className="flex h-14 overflow-hidden rounded-[12px] border-2 border-divider"
                >
                  {t.halves.map((bg) => (
                    <span key={bg} className={`flex-1 ${bg}`} />
                  ))}
                </span>
                <span className="flex items-center justify-between text-[15px] font-bold">
                  {t.label}
                  {settings.theme === t.value && <CheckIcon className="size-4" />}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section aria-labelledby="backup-heading" className="mt-8">
        <h2 id="backup-heading" className="text-section">
          Backup
        </h2>
        <div className={`mt-3 ${card} ${old ? 'bg-nudge! text-nudge-text' : ''}`}>
          <p className="text-[17px] font-bold">{backupAge(settings.lastBackupAt, now)}</p>
          <p className={`mt-1 text-[15px] ${old ? '' : 'text-text-secondary'}`}>
            Your tasks live only on this phone. Export a backup now and then and keep the file
            somewhere safe. Importing a backup replaces everything here.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <Button
              variant="strong"
              onClick={exporter.run}
              disabled={exporter.busy}
              // On the amber card the button stays ink in both themes, like the Home nudge
              className={old ? 'bg-ink! text-white!' : ''}
            >
              Export
            </Button>
            <Button
              variant="secondary"
              onClick={() => fileInput.current?.click()}
              className={old ? 'border-nudge-text! text-nudge-text!' : ''}
            >
              Import
            </Button>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            aria-label="Backup file to import"
            // Opened by the Import button; hidden so it isn't a second control
            hidden
            onChange={(e) => {
              void chooseFile(e.target.files?.[0])
              // Allow choosing the same file again
              e.target.value = ''
            }}
          />
        </div>
        <div role="status">
          {message?.kind === 'success' && (
            <p className="mt-3 flex items-center gap-2 rounded-card bg-mint px-4 py-3 text-[15px] font-bold text-ink">
              <CheckIcon className="size-5 shrink-0" />
              {message.text}
            </p>
          )}
        </div>
        <div role="alert">
          {message?.kind === 'error' && (
            <p className="mt-3 flex items-start gap-2 rounded-card bg-error px-4 py-3 text-[15px] text-error-text">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-late text-ink">
                <AlertIcon className="size-4" />
              </span>
              {message.text}
            </p>
          )}
        </div>
      </section>

      <section aria-labelledby="updates-heading" className="mt-8">
        <h2 id="updates-heading" className="text-section">
          Updates
        </h2>
        <div className={`mt-3 ${card}`}>
          <div aria-live="polite">
            <p className="text-[17px] font-bold">{UPDATE_TEXT[update].title}</p>
            <p className="mt-1 text-[15px] text-text-secondary">{UPDATE_TEXT[update].detail}</p>
          </div>
          {update === 'ready' || update === 'unsupported' ? (
            <Button
              variant={update === 'ready' ? 'strong' : 'secondary'}
              onClick={reloadToUpdate}
              className="mt-4 w-full"
            >
              Reload
            </Button>
          ) : (
            <Button
              variant="secondary"
              disabled={update === 'checking'}
              onClick={() => void checkForUpdate()}
              className="mt-4 w-full"
            >
              Check for updates
            </Button>
          )}
        </div>
      </section>

      <dl className="mt-8 divide-y divide-divider rounded-card bg-surface">
        <div className="flex min-h-14 items-center justify-between gap-3 px-4 py-2">
          <dt className="text-[16px] font-semibold">Storage</dt>
          <dd className="text-right text-[15px] text-text-secondary">{STORAGE_TEXT[storage]}</dd>
        </div>
        <div className="flex min-h-14 items-center justify-between gap-3 px-4 py-2">
          <dt className="text-[16px] font-semibold">Version</dt>
          <dd className="text-[15px] text-text-secondary">{__APP_VERSION__}</dd>
        </div>
      </dl>

      <Sheet
        centered
        open={pending !== null}
        onClose={() => setPending(null)}
        labelledBy={CONFIRM_TITLE_ID}
      >
        {pending && (
          <div className="text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-full bg-late text-ink">
              <AlertIcon className="size-7" />
            </span>
            <h2 id={CONFIRM_TITLE_ID} className="mt-3 text-section">
              Replace everything?
            </h2>
            <p className="mt-2 text-[16px] text-text-secondary">
              This backup has{' '}
              {pending.tasks.length === 1 ? '1 task' : `${pending.tasks.length} tasks`} and{' '}
              {pending.folders.length === 1 ? '1 folder' : `${pending.folders.length} folders`}
              {Number.isNaN(Date.parse(pending.exportedAt))
                ? ''
                : ` from ${exportedOn.format(new Date(pending.exportedAt))}`}
              . Everything on this phone now will be replaced.
            </p>
            <div className="mt-6 flex flex-col gap-2.5">
              <Button variant="destructive" onClick={() => void confirmImport()}>
                Replace everything
              </Button>
              <Button variant="secondary" onClick={() => setPending(null)} data-autofocus>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Sheet>
    </main>
  )
}
