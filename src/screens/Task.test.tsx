import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import App from '../App.tsx'
import { createFolder } from '../db/folders.ts'
import { db } from '../db/schema.ts'
import { addStep, addTask, getTask, toggleStep } from '../db/tasks.ts'
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

async function openTask(taskId: string) {
  render(<App />)
  act(() => navigate({ name: 'task', taskId }))
  return screen.findByRole('textbox', { name: 'Title' })
}

const saved = () => waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Saved'))

describe('Task page', () => {
  it('shows the task with its date, folder, notes, steps and stamps', async () => {
    const work = await createFolder('Work', 'sky')
    const t = await addTask({
      title: 'Send invoice',
      notes: 'Ask for PO number',
      folderId: work.id,
      dueDate: '2026-10-29',
      dueTime: '17:00',
    })
    const step = await addStep(t.id, 'Check hours')
    await addStep(t.id, 'Attach timesheet')
    await toggleStep(t.id, step.id)

    expect(await openTask(t.id)).toHaveValue('Send invoice')
    expect(screen.getByText('Today 17:00')).toHaveClass('bg-today')
    expect(screen.getByLabelText('Date')).toHaveValue('2026-10-29')
    expect(screen.getByLabelText('Time')).toHaveValue('17:00')
    expect(screen.getByLabelText('Folder')).toHaveValue(work.id)
    expect(screen.getByLabelText('Notes')).toHaveValue('Ask for PO number')
    expect(screen.getByText('1 of 2 done')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Check hours' })).toBeChecked()
    expect(screen.getByText(/Created today at 12:00/)).toBeInTheDocument()
  })

  it('saves the title as you type, ignoring an empty title', async () => {
    const t = await addTask({ title: 'Draft' })
    const title = await openTask(t.id)

    fireEvent.change(title, { target: { value: 'Final title' } })
    expect(screen.getByRole('status')).toHaveTextContent('Saving…')
    await saved()
    expect((await getTask(t.id))?.title).toBe('Final title')

    fireEvent.change(title, { target: { value: '   ' } })
    fireEvent.blur(title)
    expect(title).toHaveValue('Final title')
    expect((await getTask(t.id))?.title).toBe('Final title')
  })

  it('keeps titles on one line', async () => {
    const t = await addTask({ title: 'One' })
    const title = await openTask(t.id)
    fireEvent.change(title, { target: { value: 'Line one\nline two' } })
    expect(title).toHaveValue('Line one line two')
  })

  it('saves notes, and saves pending typing when leaving the page', async () => {
    const t = await addTask({ title: 'Call bank' })
    await openTask(t.id)

    fireEvent.change(screen.getByLabelText('Notes'), { target: { value: 'Ref 1234' } })
    act(() => navigate({ name: 'home' }))

    await waitFor(async () => expect((await getTask(t.id))?.notes).toBe('Ref 1234'))
  })

  it('sets and clears the date, time and folder', async () => {
    const home = await createFolder('Home', 'mint')
    const t = await addTask({ title: 'Plumber' })
    await openTask(t.id)
    expect(screen.queryByLabelText('Time')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-10-30' } })
    fireEvent.change(await screen.findByLabelText('Time'), { target: { value: '08:30' } })
    fireEvent.change(screen.getByLabelText('Folder'), { target: { value: home.id } })
    await waitFor(async () =>
      expect(await getTask(t.id)).toMatchObject({
        dueDate: '2026-10-30',
        dueTime: '08:30',
        folderId: home.id,
      }),
    )
    expect(await screen.findByText('Tomorrow 08:30')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Remove date' }))
    await waitFor(async () =>
      expect(await getTask(t.id)).toMatchObject({ dueDate: null, dueTime: null }),
    )
    expect(screen.queryByLabelText('Time')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Folder'), { target: { value: '' } })
    await waitFor(async () => expect((await getTask(t.id))?.folderId).toBeNull())
  })

  it('adds, ticks, renames and removes steps', async () => {
    const t = await addTask({ title: 'Move flat' })
    await openTask(t.id)

    const input = screen.getByLabelText('New step')
    fireEvent.change(input, { target: { value: 'Book van' } })
    fireEvent.submit(input)
    fireEvent.change(input, { target: { value: 'Pack' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add step' }))
    expect(await screen.findByText('0 of 2 done')).toBeInTheDocument()
    expect(input).toHaveValue('')

    fireEvent.click(screen.getByRole('checkbox', { name: 'Book van' }))
    expect(await screen.findByText('1 of 2 done')).toBeInTheDocument()

    fireEvent.change(screen.getByRole('textbox', { name: 'Step 2' }), {
      target: { value: 'Pack boxes' },
    })
    await waitFor(async () => expect((await getTask(t.id))?.steps[1]?.title).toBe('Pack boxes'))

    fireEvent.click(screen.getByRole('button', { name: 'Remove step Book van' }))
    await waitFor(async () =>
      expect((await getTask(t.id))?.steps).toEqual([
        expect.objectContaining({ title: 'Pack boxes', done: false }),
      ]),
    )
  })

  it('marks the task done and not done', async () => {
    const t = await addTask({ title: 'Gym' })
    await openTask(t.id)

    fireEvent.click(screen.getByRole('button', { name: 'Mark as done' }))
    expect(await screen.findByRole('button', { name: 'Mark as not done' })).toBeInTheDocument()
    expect((await getTask(t.id))?.completedAt).not.toBeNull()
    expect(screen.getByText(/Done today at 12:00/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Mark as not done' }))
    expect(await screen.findByRole('button', { name: 'Mark as done' })).toBeInTheDocument()
    expect((await getTask(t.id))?.completedAt).toBeNull()
  })

  it('deletes the task and goes back', async () => {
    const t = await addTask({ title: 'Old task' })
    render(<App />)
    act(() => navigate({ name: 'task', taskId: t.id }))

    fireEvent.click(await screen.findByRole('button', { name: 'Delete task' }))
    await waitFor(async () => expect(await getTask(t.id)).toBeUndefined())
    await waitFor(() => expect(location.hash).toBe('#/'))
    expect(await screen.findByText('Due soon')).toBeInTheDocument()
  })

  it('goes Home for a task that does not exist', async () => {
    render(<App />)
    act(() => navigate({ name: 'task', taskId: 'missing' }))
    await waitFor(() => expect(location.hash).toBe('#/'))
  })
})

describe('opening tasks', () => {
  it('opens from a Due soon card and from a folder row', async () => {
    const work = await createFolder('Work', 'sky')
    await addTask({ title: 'Send invoice', folderId: work.id, dueDate: '2026-10-29' })
    render(<App />)

    const list = await screen.findByRole('list', { name: 'Due soon' })
    fireEvent.click(within(list).getByRole('button', { name: /Send invoice(?! as done)/ }))
    expect(await screen.findByRole('textbox', { name: 'Title' })).toHaveValue('Send invoice')

    act(() => navigate({ name: 'folder', folderId: work.id }))
    const rows = await screen.findByRole('list', { name: 'With a due date' })
    fireEvent.click(within(rows).getByRole('button', { name: /Send invoice(?! as done)/ }))
    expect(await screen.findByRole('textbox', { name: 'Title' })).toHaveValue('Send invoice')
  })
})
