import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from '../App.tsx'
import QrCode from '../components/QrCode.tsx'
import { db } from '../db/schema.ts'
import { getSettings } from '../db/settings.ts'
import { addTask } from '../db/tasks.ts'
import { UA } from '../test/userAgents.ts'
import { UpdateBannerView } from './UpdateBanner.tsx'
import { TRY_IN_BROWSER_KEY } from './useDesktopLanding.ts'

const realUA = navigator.userAgent

function setUserAgent(ua: string, touchPoints = 5) {
  Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true })
  Object.defineProperty(navigator, 'maxTouchPoints', { value: touchPoints, configurable: true })
}

/** jsdom has no matchMedia; answer each query from a table. */
function stubMatchMedia(matches: (query: string) => boolean) {
  window.matchMedia = vi.fn((query: string) => ({
    matches: matches(query),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia
}

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
  history.replaceState(null, '', '#/')
  localStorage.clear()
})

afterEach(() => {
  setUserAgent(realUA, 0)
  delete (window as { matchMedia?: unknown }).matchMedia
})

describe('iPhone install hint', () => {
  it('shows in Safari on iPhone until dismissed, then never again', async () => {
    setUserAgent(UA.iphoneSafari)
    await addTask({ title: 'Something' })
    const { unmount } = render(<App />)

    const hint = await screen.findByRole('region', { name: 'Install soon on this iPhone' })
    expect(hint).toHaveTextContent("tasks added in a Safari tab stay in Safari and don't move")
    fireEvent.click(screen.getByRole('button', { name: 'Got it, hide install tip' }))
    await waitFor(async () => expect((await getSettings()).installHintDismissed).toBe(true))
    unmount()

    render(<App />)
    expect(await screen.findByText('Due soon')).toBeInTheDocument()
    expect(screen.queryByText('Install soon on this iPhone')).not.toBeInTheDocument()
  })

  it.each([
    ['Chrome on iPhone', UA.iphoneChrome],
    ['Android', UA.android],
  ])('does not show in %s', async (_, ua) => {
    setUserAgent(ua)
    render(<App />)
    expect(await screen.findByText('Due soon')).toBeInTheDocument()
    expect(screen.queryByText('Install soon on this iPhone')).not.toBeInTheDocument()
  })

  it('does not show once installed', async () => {
    setUserAgent(UA.iphoneSafari)
    stubMatchMedia((q) => q === '(display-mode: standalone)')
    render(<App />)
    expect(await screen.findByText('Due soon')).toBeInTheDocument()
    expect(screen.queryByText('Install soon on this iPhone')).not.toBeInTheDocument()
  })
})

describe('Desktop landing', () => {
  const desktop = (q: string) => q.includes('min-width: 900px')

  it('shows on a desktop browser, with a QR code for this address', async () => {
    stubMatchMedia(desktop)
    render(<App />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'soon lives on your phone' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('img', { name: `QR code for ${location.origin}/` })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'iPhone' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Android' })).toBeInTheDocument()
    expect(screen.queryByText('Due soon')).not.toBeInTheDocument()
  })

  it('opens the app on "Try it in this browser" and remembers the choice', async () => {
    stubMatchMedia(desktop)
    const { unmount } = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Try it in this browser' }))
    expect(await screen.findByText('Due soon')).toBeInTheDocument()
    expect(localStorage.getItem(TRY_IN_BROWSER_KEY)).toBe('1')
    unmount()

    render(<App />)
    expect(await screen.findByText('Due soon')).toBeInTheDocument()
  })

  it('never shows on phones or in the installed app', async () => {
    stubMatchMedia(() => false)
    const { unmount } = render(<App />)
    expect(await screen.findByText('Due soon')).toBeInTheDocument()
    unmount()

    stubMatchMedia((q) => desktop(q) || q === '(display-mode: standalone)')
    render(<App />)
    expect(await screen.findByText('Due soon')).toBeInTheDocument()
  })
})

describe('UpdateBannerView', () => {
  it('offers a reload only when a new version is waiting', () => {
    const onReload = vi.fn()
    const { rerender } = render(<UpdateBannerView show={false} onReload={onReload} />)
    expect(screen.queryByText('A new version of soon is ready')).not.toBeInTheDocument()

    rerender(<UpdateBannerView show onReload={onReload} />)
    expect(screen.getByRole('status')).toHaveTextContent('A new version of soon is ready')
    fireEvent.click(screen.getByRole('button', { name: 'Reload' }))
    expect(onReload).toHaveBeenCalledOnce()
  })
})

describe('QrCode', () => {
  it('draws a square code with a label', () => {
    render(<QrCode text="https://soon.example/" />)
    const svg = screen.getByRole('img', { name: 'QR code for https://soon.example/' })
    const [, , w, h] = svg.getAttribute('viewBox')!.split(' ').map(Number)
    expect(w).toBe(h)
    expect(w).toBeGreaterThanOrEqual(21)
    expect(svg.querySelector('path')!.getAttribute('d')).toMatch(/^M\d/)
  })
})
