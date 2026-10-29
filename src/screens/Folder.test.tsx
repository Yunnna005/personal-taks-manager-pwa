import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import App from '../App.tsx'
import { createFolder, getFolder } from '../db/folders.ts'
import { db } from '../db/schema.ts'
import { addStep, addTask, completeTask, getTask, listTasks } from '../db/tasks.ts'
import { navigate } from '../lib/route.ts'

// Thursday 29 October 2026, 12:00 London time
const NOW = new Date(2026, 9, 29, 12, 0)

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
  history.replaceState(null, '', '#/')
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

async function openFolder(folderId: string | null) {
  render(<App />)
  act(() => navigate({ name: 'folder', folderId }))
}

const titles = (listName: string) =>
  within(screen.getByRole('list', { name: listName }))
    .getAllByRole('listitem')
    .map((li) => li.querySelector('.text-task')?.textContent)

describe('Folder screen', () => {
  it('shows the header, progress and both lists in order', async () => {
    const work = await createFolder('Work', 'sky')
    await addTask({ title: 'Later today', folderId: work.id, dueDate: '2026-10-29' })
    await addTask({ title: 'Report', folderId: work.id, dueDate: '2026-11-09', dueTime: '08:15' })
    await addTask({ title: 'Standup', folderId: work.id, dueDate: '2026-10-29', dueTime: '09:00' })
    await addTask({ title: 'Ideas', folderId: work.id })
    vi.setSystemTime(new Date(NOW.getTime() + 1000))
    const steps = await addTask({ title: 'Plan offsite', folderId: work.id })
    await addStep(steps.id, 'Venue')
    const done = await addTask({ title: 'Expenses', folderId: work.id })
    await completeTask(done.id)
    await addTask({ title: 'Elsewhere' })

    await openFolder(work.id)

    expect(await screen.findByRole('heading', { level: 1, name: 'Work' })).toBeInTheDocument()
    expect(screen.getByText('5 left · 1 of 6 done')).toBeInTheDocument()
    expect(titles('With a due date')).toEqual(['Standup', 'Later today', 'Report'])
    expect(titles('No date')).toEqual(['Ideas', 'Plan offsite'])
    expect(screen.getByText('Late · Today 09:00')).toHaveClass('bg-late')
    expect(screen.getByText('Mon 9 Nov 08:15')).toHaveClass('bg-bg')
    expect(screen.getByText('0/1 steps')).toBeInTheDocument()
    expect(screen.queryByText('Expenses')).not.toBeInTheDocument()
    expect(screen.queryByText('Elsewhere')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add to Work' })).toBeInTheDocument()
  })

  it('shows Unsorted without folder options', async () => {
    await addTask({ title: 'Inbox item' })
    await openFolder(null)

    expect(await screen.findByRole('heading', { level: 1, name: 'Unsorted' })).toBeInTheDocument()
    expect(screen.getByText('Inbox item')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Folder options' })).not.toBeInTheDocument()
  })

  it('shows empty and all-done states', async () => {
    const empty = await createFolder('Empty', 'mint')
    await openFolder(empty.id)
    expect(await screen.findByText('No tasks here yet.')).toBeInTheDocument()
  })

  it('ticks a task off', async () => {
    const home = await createFolder('Home', 'mint')
    const t = await addTask({ title: 'Water plants', folderId: home.id })
    await openFolder(home.id)

    fireEvent.click(await screen.findByRole('button', { name: 'Mark Water plants as done' }))
    expect(await screen.findByText('Everything here is done.')).toBeInTheDocument()
    expect(screen.getByText('All done · 1 of 1')).toBeInTheDocument()
    expect((await getTask(t.id))?.completedAt).not.toBeNull()
  })

  it('adds tasks to this folder from the add bar', async () => {
    const home = await createFolder('Home', 'mint')
    await openFolder(home.id)

    fireEvent.click(await screen.findByRole('button', { name: 'Add to Home' }))
    expect(await screen.findByRole('button', { name: 'Home', pressed: true })).toBeInTheDocument()
    fireEvent.change(screen.getByRole('textbox', { name: 'Task title' }), {
      target: { value: 'Fix tap' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add task' }))

    await waitFor(async () => expect(await listTasks()).toHaveLength(1))
    expect((await listTasks())[0]?.folderId).toBe(home.id)
  })

  it('renames and recolours through the options sheet', async () => {
    const folder = await createFolder('Wrok', 'sky')
    await openFolder(folder.id)

    fireEvent.click(await screen.findByRole('button', { name: 'Folder options' }))
    fireEvent.click(screen.getByRole('button', { name: 'Rename folder' }))
    const editor = screen.getByRole('dialog', { name: 'Edit folder' })
    expect(editor).toHaveAttribute('open')
    // The options sheet handed over rather than staying open underneath
    expect(document.querySelectorAll('dialog[open]')).toHaveLength(1)
    expect(within(editor).getByLabelText('Name')).toHaveFocus()

    fireEvent.change(within(editor).getByLabelText('Name'), { target: { value: 'Work' } })
    fireEvent.click(within(editor).getByRole('button', { name: 'Save' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Work' })).toBeInTheDocument()
    expect(editor).not.toHaveAttribute('open')

    fireEvent.click(screen.getByRole('button', { name: 'Folder options' }))
    fireEvent.click(screen.getByRole('button', { name: 'Change colour' }))
    expect(within(editor).getByRole('radio', { name: 'Sky' })).toHaveFocus()
    fireEvent.click(within(editor).getByRole('radio', { name: 'Rose' }))
    fireEvent.click(within(editor).getByRole('button', { name: 'Save' }))
    await waitFor(async () => expect((await getFolder(folder.id))?.color).toBe('rose'))
  })

  it('deletes the folder after confirming, moving its tasks to Unsorted', async () => {
    const folder = await createFolder('Work', 'sky')
    const a = await addTask({ title: 'Report', folderId: folder.id })
    await addTask({ title: 'Slides', folderId: folder.id })
    await openFolder(folder.id)

    fireEvent.click(await screen.findByRole('button', { name: 'Folder options' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete folder' }))
    const confirm = screen.getByRole('alertdialog', { name: 'Delete Work?' })
    expect(confirm).toHaveTextContent('Its 2 open tasks will move to Unsorted.')
    expect(within(confirm).getByRole('button', { name: 'Keep folder' })).toHaveFocus()

    fireEvent.click(within(confirm).getByRole('button', { name: 'Delete folder' }))
    await waitFor(async () => expect(await getFolder(folder.id)).toBeUndefined())
    expect((await getTask(a.id))?.folderId).toBeNull()
    expect(location.hash).toBe('#/')
    expect(await screen.findByText('2 tasks to sort')).toBeInTheDocument()
  })

  it('keeps the folder when the delete is cancelled', async () => {
    const folder = await createFolder('Work', 'sky')
    await openFolder(folder.id)

    fireEvent.click(await screen.findByRole('button', { name: 'Folder options' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete folder' }))
    fireEvent.click(screen.getByRole('button', { name: 'Keep folder' }))

    expect(screen.getByRole('heading', { level: 1, name: 'Work' })).toBeInTheDocument()
    expect(await getFolder(folder.id)).toBeDefined()
  })

  it('goes Home for a folder that does not exist', async () => {
    await openFolder('missing')
    await waitFor(() => expect(location.hash).toBe('#/'))
    expect(await screen.findByText('Due soon')).toBeInTheDocument()
  })
})

describe('Home folder navigation', () => {
  it('opens a folder from its tile and Unsorted from its row', async () => {
    await createFolder('Garden', 'mint')
    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: /^Garden/ }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Garden' })).toBeInTheDocument()

    act(() => navigate({ name: 'home' }))
    fireEvent.click(await screen.findByRole('button', { name: /^Unsorted/ }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Unsorted' })).toBeInTheDocument()
  })

  it('creates a folder from the New folder tile', async () => {
    await createFolder('Work', 'lilac')
    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: 'New folder' }))
    const sheet = screen.getByRole('dialog', { name: 'New folder' })
    expect(within(sheet).getByRole('radio', { name: 'Peach' })).toBeChecked()
    fireEvent.change(within(sheet).getByLabelText('Name'), { target: { value: 'Garden' } })
    fireEvent.click(within(sheet).getByRole('button', { name: 'Create folder' }))

    expect(await screen.findByRole('button', { name: /^Garden/ })).toBeInTheDocument()
    expect(sheet).not.toHaveAttribute('open')
  })
})
