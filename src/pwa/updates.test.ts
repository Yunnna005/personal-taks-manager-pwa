import { renderHook } from '@testing-library/react'
import type { RegisterSWOptions } from 'vite-plugin-pwa/types'

// Each test gets a fresh copy of the module, since its state is module-level
let options: RegisterSWOptions
const updateSW = vi.fn(async () => {})
vi.mock('virtual:pwa-register', () => ({
  registerSW: (o: RegisterSWOptions) => {
    options = o
    return updateSW
  },
}))

type FakeWorker = { state: string; listeners: (() => void)[] }

/** A registration whose update() may find a new worker that then installs. */
function fakeRegistration(finds: 'nothing' | 'new' | 'error') {
  const reg = {
    installing: null as FakeWorker | null,
    waiting: null as FakeWorker | null,
    update: vi.fn(async () => {
      if (finds === 'error') throw new Error('offline')
      if (finds === 'new') reg.installing = makeWorker()
    }),
  }
  function makeWorker(): FakeWorker & EventTarget {
    const w = {
      state: 'installing',
      listeners: [] as (() => void)[],
      addEventListener: (_: string, l: () => void) => w.listeners.push(l),
      removeEventListener: vi.fn(),
    }
    return w as unknown as FakeWorker & EventTarget
  }
  /** The new worker finishes installing and waits. */
  const install = () => {
    const w = reg.installing!
    reg.installing = null
    reg.waiting = w
    w.state = 'installed'
    w.listeners.forEach((l) => l())
  }
  return { reg, install }
}

async function load(reg?: object) {
  vi.resetModules()
  Object.defineProperty(navigator, 'serviceWorker', { value: {}, configurable: true })
  const updates = await import('./updates.ts')
  updates.startUpdates()
  if (reg) options.onRegisteredSW?.('/sw.js', reg as ServiceWorkerRegistration)
  return updates
}

/** The status as components see it, through the hook. */
function statusOf(updates: typeof import('./updates.ts')) {
  return renderHook(() => updates.useUpdateStatus()).result
}

afterEach(() => {
  delete (navigator as { serviceWorker?: unknown }).serviceWorker
  updateSW.mockClear()
})

describe('updates', () => {
  it('says so when a check finds nothing new', async () => {
    const { reg } = fakeRegistration('nothing')
    const updates = await load(reg)
    const status = statusOf(updates)

    expect(status.current).toBe('idle')
    await updates.checkForUpdate()
    expect(reg.update).toHaveBeenCalledOnce()
    expect(status.current).toBe('latest')
  })

  it('waits for a new version to install, then offers the reload', async () => {
    const { reg, install } = fakeRegistration('new')
    const updates = await load(reg)
    const status = statusOf(updates)

    const check = updates.checkForUpdate()
    await vi.waitFor(() => expect(status.current).toBe('checking'))
    await Promise.resolve()
    install()
    await check
    expect(status.current).toBe('ready')

    updates.reloadToUpdate()
    expect(updateSW).toHaveBeenCalledWith(true)
  })

  it('reports a failed check, but quiet checks stay quiet', async () => {
    const { reg } = fakeRegistration('error')
    const updates = await load(reg)
    const status = statusOf(updates)

    await updates.checkForUpdate({ quiet: true })
    expect(status.current).toBe('idle')
    await updates.checkForUpdate()
    expect(status.current).toBe('failed')
  })

  it('shows the banner state when the service worker reports a waiting version', async () => {
    const updates = await load(fakeRegistration('nothing').reg)
    const status = statusOf(updates)

    options.onNeedRefresh?.()
    await vi.waitFor(() => expect(status.current).toBe('ready'))
  })

  it('is unsupported without a registered service worker', async () => {
    const updates = await load()
    const status = statusOf(updates)

    await updates.checkForUpdate()
    expect(status.current).toBe('unsupported')
  })
})
