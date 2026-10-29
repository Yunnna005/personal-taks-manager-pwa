import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import App from '../App.tsx'
import { createFolder, listFolders } from '../db/folders.ts'
import { db } from '../db/schema.ts'
import { getSettings, setSetting } from '../db/settings.ts'
import { addTask, listTasks } from '../db/tasks.ts'
import { navigate } from '../lib/route.ts'
import { dismissToast } from '../lib/toast.ts'

// Thursday 29 October 2026, 12:00 London time
const NOW = new Date(2026, 9, 29, 12, 0)

let downloads: File[] = []

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
  history.replaceState(null, '', '#/')
  delete document.documentElement.dataset.theme
  localStorage.clear()
  dismissToast()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)

  downloads = []
  URL.createObjectURL = vi.fn((blob: Blob) => {
    downloads.push(blob as File)
    return 'blob:backup'
  })
  URL.revokeObjectURL = vi.fn()
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

async function openSettings() {
  render(<App />)
  act(() => navigate({ name: 'settings' }))
  return screen.findByRole('heading', { level: 1, name: 'Settings' })
}

const jsonFile = (data: unknown, name = 'backup.json') =>
  new File([typeof data === 'string' ? data : JSON.stringify(data)], name, {
    type: 'application/json',
  })

const chooseFile = (file: File) =>
  fireEvent.change(screen.getByLabelText('Backup file to import'), { target: { files: [file] } })

describe('Settings', () => {
  it('opens from the Home settings button', async () => {
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'Settings' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByText('Version')).toBeInTheDocument()
  })

  it('steps the due-soon window between 1 and 7 days', async () => {
    await setSetting('dueSoonDays', 2)
    await openSettings()

    expect(await screen.findByText('2 days ahead')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Fewer days' }))
    expect(await screen.findByText('1 day ahead')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fewer days' })).toBeDisabled()

    await setSetting('dueSoonDays', 7)
    await waitFor(() => expect(screen.getByRole('button', { name: 'More days' })).toBeDisabled())
    fireEvent.click(screen.getByRole('button', { name: 'Fewer days' }))
    await waitFor(async () => expect((await getSettings()).dueSoonDays).toBe(6))
  })

  it('applies the theme to the page and remembers it for the next load', async () => {
    await openSettings()
    expect(await screen.findByRole('radio', { name: 'System' })).toBeChecked()

    fireEvent.click(screen.getByRole('radio', { name: 'Dark' }))
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dark'))
    expect(localStorage.getItem('soon-theme')).toBe('dark')

    fireEvent.click(screen.getByRole('radio', { name: 'System' }))
    await waitFor(() => expect(document.documentElement.dataset.theme).toBeUndefined())
    expect((await getSettings()).theme).toBe('system')
  })

  it('exports a backup file and records when', async () => {
    const work = await createFolder('Work', 'sky')
    await addTask({ title: 'Report', folderId: work.id })
    await openSettings()
    expect(await screen.findByText('No backup yet')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Export' }))
    await waitFor(() => expect(downloads).toHaveLength(1))
    const file = downloads[0]!
    expect(file.name).toBe('soon-backup-2026-10-29.json')
    const data = JSON.parse(await file.text())
    expect(data).toMatchObject({ app: 'soon', version: 1 })
    expect(data.tasks[0].title).toBe('Report')

    expect(await screen.findByText('Last backup was today')).toBeInTheDocument()
    expect((await getSettings()).lastBackupAt).toBe(NOW.toISOString())
  })

  it('imports a backup after confirming, replacing everything', async () => {
    await addTask({ title: 'Old task' })
    await openSettings()

    chooseFile(
      jsonFile({
        app: 'soon',
        version: 1,
        exportedAt: '2026-10-12T09:00:00.000Z',
        folders: [
          {
            id: 'f1',
            name: 'Home',
            color: 'mint',
            createdAt: '2026-10-01T08:00:00.000Z',
            updatedAt: '2026-10-01T08:00:00.000Z',
          },
        ],
        tasks: [
          {
            id: 't1',
            title: 'Water plants',
            notes: '',
            folderId: 'f1',
            dueDate: null,
            dueTime: null,
            steps: [],
            completedAt: null,
            createdAt: '2026-10-01T08:00:00.000Z',
            updatedAt: '2026-10-01T08:00:00.000Z',
          },
        ],
        settings: { dueSoonDays: 4, theme: 'system' },
      }),
    )

    const confirm = await screen.findByRole('alertdialog', { name: 'Replace everything?' })
    expect(confirm).toHaveTextContent('This backup has 1 task and 1 folder from 12 Oct 2026.')
    expect(within(confirm).getByRole('button', { name: 'Cancel' })).toHaveFocus()
    fireEvent.click(within(confirm).getByRole('button', { name: 'Replace everything' }))

    expect(await screen.findByText('Imported 1 task and 1 folder')).toBeInTheDocument()
    expect((await listTasks()).map((t) => t.title)).toEqual(['Water plants'])
    expect((await listFolders()).map((f) => f.name)).toEqual(['Home'])
    expect((await getSettings()).dueSoonDays).toBe(4)
  })

  it('changes nothing when the import is cancelled', async () => {
    await addTask({ title: 'Keep me' })
    await openSettings()
    chooseFile(jsonFile({ app: 'soon', version: 1, folders: [], tasks: [] }))

    fireEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Cancel' }),
    )
    expect((await listTasks()).map((t) => t.title)).toEqual(['Keep me'])
  })

  it.each([
    ['a file that is not a backup', 'just some text', /isn't a soon backup/],
    [
      'a damaged backup',
      { app: 'soon', version: 1, folders: [], tasks: [{ id: 't', title: '' }] },
      /damaged: Task 1/,
    ],
  ])('explains %s and changes nothing', async (_, content, message) => {
    await addTask({ title: 'Keep me' })
    await openSettings()
    chooseFile(jsonFile(content))

    const alert = await screen.findByRole('alert')
    await waitFor(() => expect(alert).toHaveTextContent(message))
    expect(alert).toHaveTextContent('Nothing on this phone was changed.')
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect((await listTasks()).map((t) => t.title)).toEqual(['Keep me'])
  })
})
