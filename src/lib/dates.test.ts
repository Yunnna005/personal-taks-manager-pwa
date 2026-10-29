import {
  addDays,
  compareDue,
  daysBetween,
  dueLabel,
  isOverdue,
  isValidDate,
  isValidTime,
  selectDueSoon,
  shortDate,
  toDateString,
  toTimeString,
  urgencyOf,
  weekdayAndDay,
  type DueFields,
} from './dates.ts'

// Tests run with TZ=Europe/London (see vite.config.ts).
// Thursday 29 October 2026, the day used in DESIGN.md's examples.
const at = (y: number, m: number, d: number, h = 12, min = 0, s = 0) =>
  new Date(y, m - 1, d, h, min, s)

const task = (dueDate: string | null, dueTime: string | null = null, done = false): DueFields => ({
  dueDate,
  dueTime,
  completedAt: done ? '2026-10-29T08:00:00.000Z' : null,
})

describe('isValidDate', () => {
  it.each(['2026-10-29', '2026-02-28', '2028-02-29', '2026-12-31', '2026-01-01'])(
    'accepts %s',
    (d) => expect(isValidDate(d)).toBe(true),
  )

  it.each(['2026-02-29', '2026-02-30', '2026-13-01', '2026-00-10', '2026-1-1', '29/10/2026', ''])(
    'rejects %s',
    (d) => expect(isValidDate(d)).toBe(false),
  )
})

describe('isValidTime', () => {
  it.each(['00:00', '09:05', '23:59'])('accepts %s', (t) => expect(isValidTime(t)).toBe(true))
  it.each(['24:00', '7:30', '12:60', '12:5', '', '12:00:00'])('rejects %s', (t) =>
    expect(isValidTime(t)).toBe(false),
  )
})

describe('toDateString / toTimeString', () => {
  it('uses the local calendar day right up to midnight', () => {
    expect(toDateString(at(2026, 10, 29, 23, 59, 59))).toBe('2026-10-29')
    expect(toDateString(at(2026, 10, 30, 0, 0, 0))).toBe('2026-10-30')
  })

  it('uses local time, not UTC, during summer time', () => {
    // 00:30 BST on 1 June is still 31 May in UTC
    const d = at(2026, 6, 1, 0, 30)
    expect(toDateString(d)).toBe('2026-06-01')
    expect(toTimeString(d)).toBe('00:30')
  })
})

describe('addDays', () => {
  it('crosses month, year and leap-day boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01')
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
  })

  it('is not thrown off by clock changes', () => {
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29') // clocks go forward
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30')
    expect(addDays('2026-10-24', 1)).toBe('2026-10-25') // clocks go back
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26')
  })
})

describe('daysBetween', () => {
  it('counts calendar days, including across clock changes', () => {
    expect(daysBetween('2026-10-29', '2026-10-29')).toBe(0)
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2)
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2)
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1)
    expect(daysBetween('2026-10-29', '2026-10-27')).toBe(-2)
  })
})

describe('isOverdue', () => {
  it('treats an untimed task as due all day, overdue from the next midnight', () => {
    const t = task('2026-10-29')
    expect(isOverdue(t, at(2026, 10, 29, 0, 0))).toBe(false)
    expect(isOverdue(t, at(2026, 10, 29, 23, 59, 59))).toBe(false)
    expect(isOverdue(t, at(2026, 10, 30, 0, 0, 0))).toBe(true)
  })

  it('makes a timed task overdue once its minute has passed', () => {
    const t = task('2026-10-29', '17:00')
    expect(isOverdue(t, at(2026, 10, 29, 16, 59, 59))).toBe(false)
    expect(isOverdue(t, at(2026, 10, 29, 17, 0, 59))).toBe(false)
    expect(isOverdue(t, at(2026, 10, 29, 17, 1, 0))).toBe(true)
  })

  it('handles a 23:59 task across midnight', () => {
    const t = task('2026-10-29', '23:59')
    expect(isOverdue(t, at(2026, 10, 29, 23, 59, 30))).toBe(false)
    expect(isOverdue(t, at(2026, 10, 30, 0, 0, 0))).toBe(true)
  })

  it('handles a 00:00 task', () => {
    const t = task('2026-10-30', '00:00')
    expect(isOverdue(t, at(2026, 10, 29, 23, 59))).toBe(false)
    expect(isOverdue(t, at(2026, 10, 30, 0, 0))).toBe(false)
    expect(isOverdue(t, at(2026, 10, 30, 0, 1))).toBe(true)
  })

  it('never marks completed, undated or future tasks overdue', () => {
    const now = at(2026, 10, 29)
    expect(isOverdue(task('2026-10-01', null, true), now)).toBe(false)
    expect(isOverdue(task(null), now)).toBe(false)
    expect(isOverdue(task('2026-10-30', '00:00'), now)).toBe(false)
  })
})

describe('urgencyOf', () => {
  const now = at(2026, 10, 29, 12, 0)

  it('maps each day to its urgency', () => {
    expect(urgencyOf(task('2026-10-27'), now, 3)).toBe('late')
    expect(urgencyOf(task('2026-10-29', '09:00'), now, 3)).toBe('late')
    expect(urgencyOf(task('2026-10-29', '17:00'), now, 3)).toBe('today')
    expect(urgencyOf(task('2026-10-29'), now, 3)).toBe('today')
    expect(urgencyOf(task('2026-10-30'), now, 3)).toBe('tomorrow')
    expect(urgencyOf(task('2026-10-31'), now, 3)).toBe('later')
  })

  it('includes the last day of the window and nothing after it', () => {
    expect(urgencyOf(task('2026-11-01'), now, 3)).toBe('later')
    expect(urgencyOf(task('2026-11-02'), now, 3)).toBeNull()
    expect(urgencyOf(task('2026-10-30'), now, 1)).toBe('tomorrow')
    expect(urgencyOf(task('2026-10-31'), now, 1)).toBeNull()
    expect(urgencyOf(task('2026-11-05'), now, 7)).toBe('later')
    expect(urgencyOf(task('2026-11-06'), now, 7)).toBeNull()
  })

  it('keeps old overdue tasks however late they are', () => {
    expect(urgencyOf(task('2025-01-01'), now, 1)).toBe('late')
  })

  it('moves tasks along at midnight', () => {
    const tomorrow = task('2026-10-30')
    const today = task('2026-10-29')
    const beforeMidnight = at(2026, 10, 29, 23, 59, 59)
    const midnight = at(2026, 10, 30, 0, 0, 0)
    expect(urgencyOf(tomorrow, beforeMidnight, 3)).toBe('tomorrow')
    expect(urgencyOf(tomorrow, midnight, 3)).toBe('today')
    expect(urgencyOf(today, beforeMidnight, 3)).toBe('today')
    expect(urgencyOf(today, midnight, 3)).toBe('late')
  })

  it('works on the night the clocks go back', () => {
    // 25 Oct 2026 has two 01:30s in London; both are still the 25th
    const t = task('2026-10-25')
    expect(urgencyOf(t, at(2026, 10, 25, 1, 30), 3)).toBe('today')
    expect(urgencyOf(task('2026-10-26'), at(2026, 10, 25, 23, 0), 3)).toBe('tomorrow')
  })

  it('ignores completed and undated tasks', () => {
    expect(urgencyOf(task('2026-10-27', null, true), now, 3)).toBeNull()
    expect(urgencyOf(task(null), now, 3)).toBeNull()
  })
})

describe('compareDue', () => {
  it('orders by date, then timed before untimed, then by time', () => {
    const list = [
      task('2026-10-30'),
      task('2026-10-29'),
      task('2026-10-29', '17:00'),
      task(null),
      task('2026-10-29', '09:30'),
    ]
    expect([...list].sort(compareDue)).toEqual([
      task('2026-10-29', '09:30'),
      task('2026-10-29', '17:00'),
      task('2026-10-29'),
      task('2026-10-30'),
      task(null),
    ])
  })
})

describe('selectDueSoon', () => {
  const now = at(2026, 10, 29, 12, 0)
  const named = (
    name: string,
    dueDate: string | null,
    dueTime: string | null = null,
    done = false,
  ) => ({
    name,
    ...task(dueDate, dueTime, done),
  })

  it('puts overdue first, then date order with timed before untimed', () => {
    const tasks = [
      named('fri', '2026-10-30'),
      named('today untimed', '2026-10-29'),
      named('today 17:00', '2026-10-29', '17:00'),
      named('today 09:00 (late)', '2026-10-29', '09:00'),
      named('two days late', '2026-10-27'),
      named('sat 10:30', '2026-10-31', '10:30'),
      named('sat untimed', '2026-10-31'),
      named('fri 08:00', '2026-10-30', '08:00'),
    ]
    expect(selectDueSoon(tasks, now, 3).map((t) => t.name)).toEqual([
      'two days late',
      'today 09:00 (late)',
      'today 17:00',
      'today untimed',
      'fri 08:00',
      'fri',
      'sat 10:30',
      'sat untimed',
    ])
  })

  it('leaves out completed, undated and out-of-window tasks', () => {
    const tasks = [
      named('in', '2026-10-30'),
      named('done', '2026-10-30', null, true),
      named('no date', null),
      named('too far', '2026-11-02'),
    ]
    expect(selectDueSoon(tasks, now, 3).map((t) => t.name)).toEqual(['in'])
  })

  it('does not change the input array', () => {
    const tasks = [named('b', '2026-10-30'), named('a', '2026-10-29')]
    selectDueSoon(tasks, now, 3)
    expect(tasks.map((t) => t.name)).toEqual(['b', 'a'])
  })
})

describe('dueLabel', () => {
  const now = at(2026, 10, 29, 12, 0)

  it('matches the DESIGN.md examples', () => {
    expect(dueLabel(task('2026-10-27'), now)).toEqual({ big: '2 days', small: 'late' })
    expect(dueLabel(task('2026-10-29', '17:00'), now)).toEqual({ big: '17:00', small: 'today' })
    expect(dueLabel(task('2026-10-30', '10:30'), now)).toEqual({ big: '10:30', small: 'tomorrow' })
    expect(dueLabel(task('2026-10-30'), now)).toEqual({ big: 'Fri', small: 'tomorrow' })
  })

  it('labels later tasks with the weekday or time over the date', () => {
    expect(dueLabel(task('2026-10-31'), now)).toEqual({ big: 'Sat', small: '31 Oct' })
    expect(dueLabel(task('2026-11-01', '09:15'), now)).toEqual({ big: '09:15', small: '1 Nov' })
  })

  it('says how late, in days or by the time missed today', () => {
    expect(dueLabel(task('2026-10-28'), now)).toEqual({ big: '1 day', small: 'late' })
    expect(dueLabel(task('2026-10-28', '23:00'), now)).toEqual({ big: '1 day', small: 'late' })
    expect(dueLabel(task('2026-10-29', '09:00'), now)).toEqual({ big: '09:00', small: 'late' })
  })

  it('labels untimed tasks due today with the weekday', () => {
    expect(dueLabel(task('2026-10-29'), now)).toEqual({ big: 'Thu', small: 'today' })
  })

  it('returns null without a date', () => {
    expect(dueLabel(task(null), now)).toBeNull()
  })
})

describe('in a zone where midnight is skipped (America/Santiago)', () => {
  // On 6 Sep 2026 Chile's clocks jump from 00:00 straight to 01:00
  beforeAll(() => {
    vi.stubEnv('TZ', 'America/Santiago')
  })
  afterAll(() => {
    vi.unstubAllEnvs()
  })

  it('still sees the 6th as its own day', () => {
    const firstMoment = new Date(2026, 8, 6, 0, 0) // becomes 01:00 local
    expect(firstMoment.getHours()).toBe(1)
    expect(toDateString(firstMoment)).toBe('2026-09-06')
    expect(addDays('2026-09-05', 1)).toBe('2026-09-06')
    expect(daysBetween('2026-09-05', '2026-09-07')).toBe(2)
  })

  it('moves tasks along when the day starts at 01:00', () => {
    const now = new Date(2026, 8, 6, 1, 0)
    expect(urgencyOf(task('2026-09-05'), now, 3)).toBe('late')
    expect(urgencyOf(task('2026-09-06'), now, 3)).toBe('today')
    expect(urgencyOf(task('2026-09-07'), now, 3)).toBe('tomorrow')
  })
})

describe('weekdayAndDay / shortDate', () => {
  it('formats chip labels', () => {
    expect(weekdayAndDay('2026-10-31')).toBe('Sat 31')
    expect(weekdayAndDay('2026-11-01')).toBe('Sun 1')
    expect(shortDate('2026-11-09')).toBe('Mon 9 Nov')
  })
})
