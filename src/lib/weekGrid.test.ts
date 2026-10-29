import {
  DEFAULT_FIRST_HOUR,
  ENTRY_HEIGHT,
  entryTops,
  firstHour,
  HOUR_HEIGHT,
  offsetOf,
} from './weekGrid.ts'

describe('firstHour', () => {
  it('starts at 07:00 unless something is earlier', () => {
    expect(firstHour([])).toBe(DEFAULT_FIRST_HOUR)
    expect(firstHour(['09:00', '18:30'])).toBe(7)
    expect(firstHour(['09:00', '05:45'])).toBe(5)
    expect(firstHour(['00:10'])).toBe(0)
  })
})

describe('offsetOf / entryTops', () => {
  it('places times by the minute', () => {
    expect(offsetOf('07:00', 7)).toBe(0)
    expect(offsetOf('09:30', 7)).toBe(2.5 * HOUR_HEIGHT)
  })

  it('keeps entries apart that are far enough apart', () => {
    expect(entryTops(['08:00', '10:00'], 7)).toEqual([HOUR_HEIGHT, 3 * HOUR_HEIGHT])
  })

  it('pushes overlapping entries below the one before', () => {
    const [a, b, c] = entryTops(['09:00', '09:00', '09:15'], 7)
    expect(a).toBe(2 * HOUR_HEIGHT)
    expect(b).toBeGreaterThanOrEqual(a! + ENTRY_HEIGHT)
    expect(c).toBeGreaterThanOrEqual(b! + ENTRY_HEIGHT)
  })
})
