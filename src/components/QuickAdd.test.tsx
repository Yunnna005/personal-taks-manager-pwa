import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createFolder } from '../db/folders.ts'
import { db } from '../db/schema.ts'
import { listTasks } from '../db/tasks.ts'
import QuickAdd from './QuickAdd.tsx'

// Thursday 29 October 2026, 12:00 London time
const NOW = new Date(2026, 9, 29, 12, 0)

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

const titleInput = () => screen.getByRole('textbox', { name: 'Task title' })
const type = (value: string) => fireEvent.change(titleInput(), { target: { value } })
const addButton = () => screen.getByRole('button', { name: 'Add task' })
const chip = (name: string | RegExp) => screen.getByRole('button', { name })

async function addAndWait(count: number) {
  fireEvent.click(addButton())
  await waitFor(async () => expect(await listTasks()).toHaveLength(count))
}

describe('QuickAdd', () => {
  it('adds an undated task to Unsorted, confirms it and stays ready for the next', async () => {
    render(<QuickAdd onClose={() => {}} />)
    expect(addButton()).toBeDisabled()

    type('  Pay rent ')
    await addAndWait(1)

    expect(await listTasks()).toMatchObject([
      { title: 'Pay rent', folderId: null, dueDate: null, dueTime: null },
    ])
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Pay rent added'))
    expect(titleInput()).toHaveValue('')
    expect(titleInput()).toHaveFocus()
  })

  it('submits on Enter and keeps the chosen folder and date for the next task', async () => {
    const work = await createFolder('Work', 'sky')
    render(<QuickAdd onClose={() => {}} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Work' }))
    fireEvent.click(chip('Tomorrow'))
    expect(chip('Work')).toHaveAttribute('aria-pressed', 'true')
    expect(chip('Tomorrow')).toHaveAttribute('aria-pressed', 'true')

    type('Send invoice')
    fireEvent.submit(titleInput())
    await waitFor(async () => expect(await listTasks()).toHaveLength(1))
    type('Book room')
    fireEvent.submit(titleInput())
    await waitFor(async () => expect(await listTasks()).toHaveLength(2))

    const tasks = await listTasks()
    for (const t of tasks) expect(t).toMatchObject({ folderId: work.id, dueDate: '2026-10-30' })
  })

  it('labels the day chips and saves the chosen day', async () => {
    render(<QuickAdd onClose={() => {}} />)
    for (const name of ['No date', 'Today', 'Tomorrow', 'Sat 31', 'Sun 1', 'Wed 4', 'Other date']) {
      expect(chip(name)).toBeInTheDocument()
    }

    fireEvent.click(chip('Sun 1'))
    type('Call mum')
    await addAndWait(1)
    expect((await listTasks())[0]?.dueDate).toBe('2026-11-01')
  })

  it('accepts a date from the calendar, matching a chip when it is one', async () => {
    render(<QuickAdd onClose={() => {}} />)
    const picker = screen.getByLabelText('Pick a date')

    fireEvent.change(picker, { target: { value: '2026-11-09' } })
    expect(chip('Mon 9 Nov')).toHaveAttribute('aria-pressed', 'true')

    fireEvent.change(picker, { target: { value: '2026-10-30' } })
    expect(chip('Tomorrow')).toHaveAttribute('aria-pressed', 'true')
    expect(chip('Other date')).toHaveAttribute('aria-pressed', 'false')
  })

  it('only offers a time once there is a date, and saves it', async () => {
    render(<QuickAdd onClose={() => {}} />)
    expect(screen.queryByRole('button', { name: 'Add time' })).not.toBeInTheDocument()

    fireEvent.click(chip('Today'))
    fireEvent.click(chip('Add time'))
    fireEvent.change(screen.getByLabelText('Time'), { target: { value: '17:00' } })
    type('Gym')
    await addAndWait(1)
    expect((await listTasks())[0]).toMatchObject({ dueDate: '2026-10-29', dueTime: '17:00' })
  })

  it('drops the time when the date is cleared or the time removed', async () => {
    render(<QuickAdd onClose={() => {}} />)
    fireEvent.click(chip('Today'))
    fireEvent.click(chip('Add time'))
    fireEvent.change(screen.getByLabelText('Time'), { target: { value: '09:00' } })

    fireEvent.click(chip('No date'))
    type('No date task')
    await addAndWait(1)

    fireEvent.click(chip('Today'))
    fireEvent.click(screen.getByRole('button', { name: 'Remove time' }))
    type('Untimed')
    await addAndWait(2)

    const tasks = await listTasks()
    expect(tasks.find((t) => t.title === 'No date task')).toMatchObject({
      dueDate: null,
      dueTime: null,
    })
    expect(tasks.find((t) => t.title === 'Untimed')).toMatchObject({
      dueDate: '2026-10-29',
      dueTime: null,
    })
  })

  it('starts in the given folder', async () => {
    const home = await createFolder('Home', 'mint')
    render(<QuickAdd defaultFolderId={home.id} onClose={() => {}} />)

    expect(await screen.findByRole('button', { name: 'Home' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    type('Water plants')
    await addAndWait(1)
    expect((await listTasks())[0]?.folderId).toBe(home.id)
  })

  it('closes from the close button', () => {
    const onClose = vi.fn()
    render(<QuickAdd onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
