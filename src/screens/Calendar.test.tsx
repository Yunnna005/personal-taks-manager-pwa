import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import App from '../App.tsx'
import { db } from '../db/schema.ts'
import { seedSampleData } from '../db/seed.ts'
import { getSettings, setSetting } from '../db/settings.ts'
import { listTasks } from '../db/tasks.ts'
import { navigate } from '../lib/route.ts'
import { dismissToast } from '../lib/toast.ts'
import { HOUR_HEIGHT } from '../lib/weekGrid.ts'

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

const titles = (list: HTMLElement) =>
  within(list)
    .queryAllByRole('listitem')
    .map((li) => li.textContent)
    .filter(Boolean)

async function openCalendar() {
  render(<App />)
  act(() => navigate({ name: 'calendar' }))
  return screen.findByRole('region', { name: 'Week of 26 Oct – 1 Nov' })
}

describe('Calendar', () => {
  it('opens from the header switch on this week, with tasks in their day and hour', async () => {
    await seedSampleData(NOW)
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'Calendar view' }))

    expect(location.hash).toBe('#/calendar')
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('26 Oct – 1 Nov')
    expect(screen.getByText('This week')).toBeInTheDocument()

    const thursdayAnyTime = await screen.findByRole('list', {
      name: 'Thursday 29 October, any time',
    })
    expect(titles(thursdayAnyTime)).toEqual(['Water the plants'])
    expect(titles(screen.getByRole('list', { name: 'Thursday 29 October, with a time' }))).toEqual([
      'Late · 09:00Reply to landlord',
      '17:00Send invoice',
    ])
    // Earlier days keep their tasks, marked late in words
    expect(titles(screen.getByRole('list', { name: 'Tuesday 27 October, any time' }))).toEqual([
      'LatePay rent',
    ])
    // Undated tasks have no place on a calendar
    expect(screen.queryByText('Plan holiday')).not.toBeInTheDocument()
  })

  it('opens on the calendar when it is the chosen first page, and switches back', async () => {
    await setSetting('startView', 'calendar')
    render(<App />)

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('26 Oct – 1 Nov')
    fireEvent.click(screen.getByRole('button', { name: 'List view' }))
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
      'Thursday 29 October',
    )
    expect(location.hash).toBe('#/list')
  })

  it('moves between weeks and keeps the week in the address', async () => {
    await seedSampleData(NOW)
    await openCalendar()

    fireEvent.click(screen.getByRole('button', { name: 'Next week' }))
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('2 Nov – 8 Nov')
    expect(location.hash).toBe('#/calendar/2026-11-02')
    expect(
      titles(await screen.findByRole('list', { name: 'Sunday 8 November, any time' })),
    ).toEqual(['Renew passport'])

    fireEvent.click(screen.getByRole('button', { name: 'Back to this week' }))
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('26 Oct – 1 Nov')
    expect(location.hash).toBe('#/calendar')
  })

  it('adds a task on a day from its + button', async () => {
    await openCalendar()

    fireEvent.click(await screen.findByRole('button', { name: 'Add task on Saturday 31 October' }))
    const sheet = await screen.findByRole('dialog', { name: 'Add a task' })
    expect(within(sheet).getByText('Sat 31 Oct')).toBeInTheDocument()
    fireEvent.change(within(sheet).getByLabelText('Task title'), {
      target: { value: 'Call the bank' },
    })
    fireEvent.click(within(sheet).getByRole('button', { name: 'Add task' }))

    await waitFor(async () =>
      expect((await listTasks())[0]).toMatchObject({
        title: 'Call the bank',
        dueDate: '2026-10-31',
        dueTime: null,
      }),
    )
  })

  it('adds a task at the hour tapped', async () => {
    await openCalendar()

    const friday = await screen.findByRole('list', { name: 'Friday 30 October, with a time' })
    // The grid starts at 07:00, so a tap a little below three hours down is 10:00
    fireEvent.click(friday.parentElement!, { clientY: 3 * HOUR_HEIGHT + 10 })
    const sheet = await screen.findByRole('dialog', { name: 'Add a task' })
    expect(within(sheet).getByRole('button', { name: 'Tomorrow' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(within(sheet).getByLabelText('Time')).toHaveValue('10:00')
  })

  it('lists a day in a sheet from its header, and ticking closes it to show Undo', async () => {
    await seedSampleData(NOW)
    await openCalendar()

    fireEvent.click(
      await screen.findByRole('button', { name: 'Thursday 29 October, today, 3 tasks' }),
    )
    const sheet = await screen.findByRole('dialog', { name: 'Thursday 29 October' })
    expect(
      within(sheet)
        .getAllByRole('listitem')
        .map((li) => li.querySelector('.text-task')?.textContent),
    ).toEqual(['Reply to landlord', 'Send invoice', 'Water the plants'])

    fireEvent.click(within(sheet).getByRole('button', { name: 'Mark Send invoice as done' }))
    expect(await screen.findByText('Send invoice done')).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Thursday 29 October' })).not.toBeInTheDocument(),
    )
  })

  it('is chosen as the first page in Settings', async () => {
    render(<App />)
    act(() => navigate({ name: 'settings' }))

    expect(await screen.findByRole('radio', { name: 'List' })).toBeChecked()
    fireEvent.click(screen.getByRole('radio', { name: 'Calendar' }))
    await waitFor(async () => expect((await getSettings()).startView).toBe('calendar'))
  })
})
