import { act, renderHook } from '@testing-library/react'
import {
  dismissToast,
  pauseToast,
  resumeToast,
  showToast,
  TOAST_MS,
  undoToast,
  useToast,
} from './toast.ts'

beforeEach(() => {
  vi.useFakeTimers()
  dismissToast()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('toast', () => {
  it('shows a toast and hides it after about 5 seconds', () => {
    const { result } = renderHook(() => useToast())
    act(() => showToast('Pay rent done'))
    expect(result.current?.message).toBe('Pay rent done')

    act(() => vi.advanceTimersByTime(TOAST_MS - 1))
    expect(result.current).not.toBeNull()
    act(() => vi.advanceTimersByTime(1))
    expect(result.current).toBeNull()
  })

  it('replaces the current toast and restarts the clock', () => {
    const { result } = renderHook(() => useToast())
    act(() => showToast('First'))
    act(() => vi.advanceTimersByTime(4000))
    act(() => showToast('Second'))
    act(() => vi.advanceTimersByTime(4000))
    expect(result.current?.message).toBe('Second')
  })

  it('pauses while held and resumes with the time that was left', () => {
    const { result } = renderHook(() => useToast())
    act(() => showToast('Held'))
    act(() => vi.advanceTimersByTime(2000))
    act(() => pauseToast())
    act(() => vi.advanceTimersByTime(60_000))
    expect(result.current?.message).toBe('Held')

    act(() => resumeToast())
    act(() => vi.advanceTimersByTime(TOAST_MS - 2000 - 1))
    expect(result.current).not.toBeNull()
    act(() => vi.advanceTimersByTime(1))
    expect(result.current).toBeNull()
  })

  it('gives at least 1.5 seconds after resuming', () => {
    const { result } = renderHook(() => useToast())
    act(() => showToast('Nearly gone'))
    act(() => vi.advanceTimersByTime(4900))
    act(() => pauseToast())
    act(() => resumeToast())
    act(() => vi.advanceTimersByTime(1400))
    expect(result.current).not.toBeNull()
  })

  it('runs undo once and hides the toast', () => {
    const undo = vi.fn()
    const { result } = renderHook(() => useToast())
    act(() => showToast('Task deleted', undo))
    act(() => undoToast())
    act(() => undoToast())
    expect(undo).toHaveBeenCalledOnce()
    expect(result.current).toBeNull()
  })
})
