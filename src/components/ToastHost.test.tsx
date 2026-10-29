import { act, fireEvent, render, screen } from '@testing-library/react'
import { dismissToast, showToast, TOAST_MS } from '../lib/toast.ts'
import ToastHost from './ToastHost.tsx'

beforeEach(() => {
  vi.useFakeTimers()
  dismissToast()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('ToastHost', () => {
  it('shows the message in a live region and hides it after 5 seconds', () => {
    render(<ToastHost />)
    act(() => showToast('Pay rent done', () => {}))

    expect(screen.getByRole('status')).toHaveTextContent('Pay rent done')
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(TOAST_MS))
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('stays while focused, so keyboard users can reach Undo', () => {
    render(<ToastHost />)
    act(() => showToast('Task deleted', () => {}))

    const button = screen.getByRole('button', { name: 'Undo' })
    act(() => button.focus())
    act(() => vi.advanceTimersByTime(TOAST_MS * 3))
    expect(button).toBeInTheDocument()

    act(() => button.blur())
    act(() => vi.advanceTimersByTime(TOAST_MS))
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument()
  })

  it('omits Undo when there is nothing to undo', () => {
    render(<ToastHost />)
    act(() => showToast("Couldn't save that change. Try again."))
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument()
  })

  it('runs undo when pressed', () => {
    const undo = vi.fn()
    render(<ToastHost />)
    act(() => showToast('Task deleted', undo))
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(undo).toHaveBeenCalledOnce()
  })
})
