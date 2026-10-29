import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import App from '../App.tsx'
import { createFolder } from '../db/folders.ts'
import { db } from '../db/schema.ts'
import { addTask, completeTask, getTask, listTasks } from '../db/tasks.ts'
import { navigate } from '../lib/route.ts'
import { dismissToast } from '../lib/toast.ts'

// Thursday 29 October 2026, 12:00 London time
const NOW = new Date(2026, 9, 29, 12, 0)

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
  history.replaceState(null, '', '#/')
  dismissToast()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

const completedRow = () => screen.queryByRole('button', { name: /^Completed/ })

describe('Home', () => {
  it('never shows a backup nudge', async () => {
    await addTask({ title: 'Something' })
    render(<App />)
    expect(await screen.findByText('Due soon')).toBeInTheDocument()
    expect(screen.queryByText('No backup yet')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Export' })).not.toBeInTheDocument()
  })

  it('shows Completed only once a task is completed', async () => {
    const t = await addTask({ title: 'Pay rent', dueDate: '2026-10-29' })
    render(<App />)
    expect(await screen.findByText('Due soon')).toBeInTheDocument()
    expect(completedRow()).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Mark Pay rent as done' }))
    await waitFor(() => expect(completedRow()).toHaveTextContent('1 task done'))
    expect((await getTask(t.id))?.completedAt).not.toBeNull()
  })
})

describe('Completed screen', () => {
  async function setup() {
    const work = await createFolder('Work', 'sky')
    const older = await addTask({ title: 'Report', folderId: work.id })
    const newer = await addTask({ title: 'Post parcel' })
    await addTask({ title: 'Still open' })
    await completeTask(older.id)
    vi.setSystemTime(new Date(NOW.getTime() + 60_000))
    await completeTask(newer.id)
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: /^Completed/ }))
    return screen.findByRole('list', { name: 'Completed tasks' })
  }

  it('lists completed tasks from every folder, newest first, with their folder', async () => {
    const list = await setup()
    expect(screen.getByRole('heading', { level: 1, name: 'Completed' })).toBeInTheDocument()
    const rows = within(list).getAllByRole('listitem')
    expect(rows.map((li) => li.querySelector('.text-task')?.textContent)).toEqual([
      'Post parcel',
      'Report',
    ])
    expect(rows[0]).toHaveTextContent('Unsorted')
    expect(rows[1]).toHaveTextContent('Work')
  })

  it('reopens a task from its tick', async () => {
    const list = await setup()
    fireEvent.click(within(list).getByRole('button', { name: 'Mark Report as not done' }))
    await waitFor(() => expect(within(list).getAllByRole('listitem')).toHaveLength(1))
  })

  it('deletes them all after confirming, hides Completed, and can be undone', async () => {
    await setup()
    fireEvent.click(screen.getByRole('button', { name: 'Delete all' }))
    const confirm = screen.getByRole('alertdialog', { name: 'Delete 2 completed tasks?' })
    expect(within(confirm).getByRole('button', { name: 'Keep them' })).toHaveFocus()
    fireEvent.click(within(confirm).getByRole('button', { name: 'Delete all' }))

    await waitFor(() => expect(location.hash).toBe('#/'))
    await waitFor(async () =>
      expect((await listTasks()).map((t) => t.title)).toEqual(['Still open']),
    )
    expect(await screen.findByText('Due soon')).toBeInTheDocument()
    await waitFor(() => expect(completedRow()).toBeNull())
    await waitFor(() =>
      expect(document.querySelector('.toast')).toHaveTextContent('2 completed tasks deleted'),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    await waitFor(() => expect(completedRow()).toHaveTextContent('2 tasks done'))
    expect(await listTasks()).toHaveLength(3)
  })

  it('keeps everything when the delete is cancelled', async () => {
    await setup()
    fireEvent.click(screen.getByRole('button', { name: 'Delete all' }))
    fireEvent.click(screen.getByRole('button', { name: 'Keep them' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Completed' })).toBeInTheDocument()
    expect(await listTasks()).toHaveLength(3)
  })

  it('says so when there is nothing completed', async () => {
    render(<App />)
    act(() => navigate({ name: 'completed' }))
    expect(await screen.findByText('No completed tasks.')).toBeInTheDocument()
  })
})
