import { dueSoonSummary, nothingDue, unsortedSummary } from './copy.ts'

describe('dueSoonSummary', () => {
  it('matches the DESIGN.md example', () => {
    expect(dueSoonSummary(4, 1, 3)).toBe('4 tasks due in the next 3 days. One is already late.')
  })

  it('handles singular, none late, several late and all late', () => {
    expect(dueSoonSummary(1, 0, 3)).toBe('1 task due in the next 3 days.')
    expect(dueSoonSummary(5, 0, 3)).toBe('5 tasks due in the next 3 days.')
    expect(dueSoonSummary(5, 2, 3)).toBe('5 tasks due in the next 3 days. 2 are already late.')
    expect(dueSoonSummary(1, 1, 3)).toBe('1 task due in the next 3 days. It is already late.')
    expect(dueSoonSummary(3, 3, 3)).toBe('3 tasks due in the next 3 days. All are already late.')
  })

  it('says "the next day" for a one-day window', () => {
    expect(dueSoonSummary(2, 0, 1)).toBe('2 tasks due in the next day.')
  })

  it('returns null when nothing is due', () => {
    expect(dueSoonSummary(0, 0, 3)).toBeNull()
  })
})

describe('nothingDue', () => {
  it('reads naturally for any window', () => {
    expect(nothingDue(3)).toBe('Nothing due in the next 3 days.')
    expect(nothingDue(1)).toBe('Nothing due in the next day.')
  })
})

describe('unsortedSummary', () => {
  it('counts open tasks', () => {
    expect(unsortedSummary(0)).toBe('Nothing to sort')
    expect(unsortedSummary(1)).toBe('1 task to sort')
    expect(unsortedSummary(3)).toBe('3 tasks to sort')
  })
})
