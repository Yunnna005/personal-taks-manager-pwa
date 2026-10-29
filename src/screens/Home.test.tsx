import { fireEvent, render, screen, within } from '@testing-library/react'
import { createFolder } from '../db/folders.ts'
import { db } from '../db/schema.ts'
import { seedSampleData } from '../db/seed.ts'
import { setSetting } from '../db/settings.ts'
import { addTask, completeTask } from '../db/tasks.ts'
import Home from './Home.tsx'

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

const dueSoonList = () => screen.findByRole('list', { name: 'Due soon' })
const cardTitles = (list: HTMLElement) =>
  within(list)
    .getAllByRole('listitem')
    .map((li) => li.querySelector('.text-task')?.textContent)

describe('Home', () => {
  it('shows the wordmark, date and first-run state', async () => {
    render(<Home />)

    expect(screen.getByText('soon')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Thursday 29 October')
    expect(await screen.findByText('Nothing due in the next 3 days.')).toBeInTheDocument()
    expect(screen.getByText('Nothing to sort')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New folder' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add your first task' })).toBeInTheDocument()
  })

  it('lists the first five due tasks in order, with a See all button', async () => {
    await seedSampleData(NOW)
    render(<Home />)

    expect(
      await screen.findByText('8 tasks due in the next 3 days. 2 are already late.'),
    ).toBeInTheDocument()
    const list = await dueSoonList()
    expect(cardTitles(list)).toEqual([
      'Pay rent',
      'Reply to landlord',
      'Send invoice',
      'Water the plants',
      'Dentist',
    ])

    fireEvent.click(screen.getByRole('button', { name: 'See all 8' }))
    expect(cardTitles(list)).toHaveLength(8)
    expect(cardTitles(list).slice(5)).toEqual([
      'Book train tickets',
      'Buy birthday present',
      'Quarterly report',
    ])
    fireEvent.click(screen.getByRole('button', { name: 'Show fewer' }))
    expect(cardTitles(list)).toHaveLength(5)
  })

  it('shows urgency labels, folder names and step counts on the cards', async () => {
    await seedSampleData(NOW)
    render(<Home />)
    fireEvent.click(await screen.findByRole('button', { name: 'See all 8' }))
    const card = (title: string) => screen.getByText(title).closest('li')!

    expect(card('Pay rent')).toHaveTextContent(/2 days\s*late/)
    expect(card('Pay rent')).toHaveTextContent('Home')
    expect(card('Reply to landlord')).toHaveTextContent(/09:00\s*late/)
    expect(card('Reply to landlord')).toHaveTextContent('Unsorted')
    expect(card('Send invoice')).toHaveTextContent(/17:00\s*today/)
    expect(card('Dentist')).toHaveTextContent(/10:30\s*tomorrow/)
    expect(card('Buy birthday present')).toHaveTextContent(/Sat\s*31 Oct/)
    expect(card('Buy birthday present')).toHaveTextContent('2/4 steps')
  })

  it('removes a task from Due soon when it is ticked', async () => {
    await seedSampleData(NOW)
    render(<Home />)

    fireEvent.click(await screen.findByRole('button', { name: 'Mark Pay rent as done' }))

    expect(
      await screen.findByText('7 tasks due in the next 3 days. One is already late.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Pay rent')).not.toBeInTheDocument()
  })

  it('shows folder progress, All done and the Unsorted count', async () => {
    await seedSampleData(NOW)
    render(<Home />)

    const tile = async (name: string) =>
      (await screen.findByRole('heading', { level: 3, name })).closest('li')!
    expect(await tile('Work')).toHaveTextContent(/3 left\s*1 of 4 done/)
    expect(await tile('Errands')).toHaveTextContent(/All done\s*2 of 2 done/)
    expect(screen.getByText('3 tasks to sort')).toBeInTheDocument()
  })

  it('uses the saved due-soon window', async () => {
    await setSetting('dueSoonDays', 1)
    await addTask({ title: 'Tomorrow', dueDate: '2026-10-30' })
    await addTask({ title: 'Saturday', dueDate: '2026-10-31' })
    render(<Home />)

    expect(await screen.findByText('1 task due in the next day.')).toBeInTheDocument()
    expect(screen.queryByText('Saturday')).not.toBeInTheDocument()
  })

  it('shows "No tasks yet" for an empty folder and drops completed tasks', async () => {
    await createFolder('Garden', 'mint')
    const t = await addTask({ title: 'Done already', dueDate: '2026-10-29' })
    await completeTask(t.id)
    render(<Home />)

    expect(await screen.findByText('No tasks yet')).toBeInTheDocument()
    expect(screen.getByText('Nothing due in the next 3 days.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add a task' })).toBeInTheDocument()
  })
})
