// Layout for the week calendar's time grid. Tasks have a time but no length,
// so each one gets a fixed-height entry starting at its time.
import { minutesOf } from './dates.ts'

export const HOUR_HEIGHT = 56
/** Tall enough to be a 44px touch target with a gap. */
export const ENTRY_HEIGHT = 46
const ENTRY_GAP = 2
/** The grid starts here unless a task in the week is earlier. */
export const DEFAULT_FIRST_HOUR = 7

/** The first hour row: 07:00, or the hour of the earliest task if that's sooner. */
export function firstHour(times: readonly string[]): number {
  return Math.min(DEFAULT_FIRST_HOUR, ...times.map((t) => Math.floor(minutesOf(t) / 60)))
}

/** Pixels from the top of the grid to `time`. */
export function offsetOf(time: string, first: number): number {
  return ((minutesOf(time) - first * 60) / 60) * HOUR_HEIGHT
}

/**
 * Top of each entry for one day's times, in time order. An entry that would
 * overlap the one before is pushed down below it, so nothing is hidden.
 */
export function entryTops(times: readonly string[], first: number): number[] {
  const tops: number[] = []
  for (const time of times) {
    const prev = tops.at(-1)
    const top = offsetOf(time, first)
    tops.push(prev === undefined ? top : Math.max(top, prev + ENTRY_HEIGHT + ENTRY_GAP))
  }
  return tops
}
