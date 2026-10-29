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
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  dismissToast()
})

afterEach(() => {
  vi.useRealTimers()
})

const expectToast = (text: string) =>
  waitFor(() => expect(document.querySelector('.toast')).toHaveTextContent(text))
const undo = () => fireEvent.click(screen.getByRole('button', { name: 'Undo' }))

describe('completing with Undo', () => {
  it('ticks a task on Home, then puts it back with Undo', async () => {
    const t = await addTask({ title: 'Pay rent', dueDate: '2026-10-29' })
    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: 'Mark Pay rent as done' }))
    await expectToast('Pay rent done')
    await waitFor(() => expect(screen.queryByText('Pay rent')).not.toBeInTheDocument())

    undo()
    expect(await screen.findByText('Pay rent')).toBeInTheDocument()
    expect((await getTask(t.id))?.completedAt).toBeNull()
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument()
  })

  it('shows the toast when marking done on the Task page', async () => {
    const t = await addTask({ title: 'Gym' })
    render(<App />)
    act(() => navigate({ name: 'task', taskId: t.id }))

    fireEvent.click(await screen.findByRole('button', { name: 'Mark as done' }))
    await expectToast('Gym done')
    undo()
    expect(await screen.findByRole('button', { name: 'Mark as done' })).toBeInTheDocument()
  })
})

describe('deleting with Undo', () => {
  it('deletes from the Task page and restores the task exactly', async () => {
    const work = await createFolder('Work', 'sky')
    const t = await addTask({ title: 'Report', folderId: work.id, notes: 'Q3 numbers' })
    render(<App />)
    act(() => navigate({ name: 'folder', folderId: work.id }))
    fireEvent.click(await screen.findByRole('button', { name: /Report(?! as done)/ }))

    fireEvent.click(await screen.findByRole('button', { name: 'Delete task' }))
    await expectToast('Task deleted')
    expect(await screen.findByRole('heading', { level: 1, name: 'Work' })).toBeInTheDocument()
    await waitFor(async () => expect(await listTasks()).toHaveLength(0))

    undo()
    expect(await screen.findByText('Report')).toBeInTheDocument()
    expect(await getTask(t.id)).toEqual(t)
  })
})

describe('Show completed', () => {
  it('lists completed tasks on demand and can reopen one', async () => {
    const home = await createFolder('Home', 'mint')
    const open = await addTask({ title: 'Water plants', folderId: home.id })
    const older = await addTask({ title: 'Fix tap', folderId: home.id })
    const newer = await addTask({ title: 'Post parcel', folderId: home.id })
    await completeTask(older.id)
    vi.setSystemTime(new Date(NOW.getTime() + 60_000))
    await completeTask(newer.id)
    render(<App />)
    act(() => navigate({ name: 'folder', folderId: home.id }))

    const toggle = await screen.findByRole('button', { name: 'Show completed (2)' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Fix tap')).not.toBeInTheDocument()

    fireEvent.click(toggle)
    const list = screen.getByRole('list', { name: 'Completed' })
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((li) => li.querySelector('.text-task')?.textContent),
    ).toEqual(['Post parcel', 'Fix tap'])
    expect(screen.getByRole('button', { name: 'Hide completed (2)' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )

    fireEvent.click(within(list).getByRole('button', { name: 'Mark Fix tap as not done' }))
    await waitFor(async () => expect((await getTask(older.id))?.completedAt).toBeNull())
    expect(await screen.findByRole('button', { name: 'Hide completed (1)' })).toBeInTheDocument()
    expect(within(screen.getByRole('list', { name: 'No date' })).getByText('Fix tap')).toBeTruthy()
    expect(open.completedAt).toBeNull()
  })

  it('has no toggle when nothing is completed', async () => {
    const home = await createFolder('Home', 'mint')
    await addTask({ title: 'Water plants', folderId: home.id })
    render(<App />)
    act(() => navigate({ name: 'folder', folderId: home.id }))

    expect(await screen.findByText('Water plants')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Show completed/ })).not.toBeInTheDocument()
  })
})
