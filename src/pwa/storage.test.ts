import { requestPersistentStorage } from './storage.ts'

const original = Object.getOwnPropertyDescriptor(navigator, 'storage')

function stubStorage(storage: Partial<StorageManager> | undefined) {
  Object.defineProperty(navigator, 'storage', { value: storage, configurable: true })
}

afterEach(() => {
  if (original) Object.defineProperty(navigator, 'storage', original)
  else delete (navigator as { storage?: unknown }).storage
})

describe('requestPersistentStorage', () => {
  it('asks once when storage is not yet protected', async () => {
    const persist = vi.fn().mockResolvedValue(true)
    stubStorage({ persisted: vi.fn().mockResolvedValue(false), persist })
    expect(await requestPersistentStorage()).toBe(true)
    expect(persist).toHaveBeenCalledOnce()
  })

  it('does not ask again when already protected', async () => {
    const persist = vi.fn()
    stubStorage({ persisted: vi.fn().mockResolvedValue(true), persist })
    expect(await requestPersistentStorage()).toBe(true)
    expect(persist).not.toHaveBeenCalled()
  })

  it('copes with browsers that refuse or have no storage API', async () => {
    stubStorage({ persisted: vi.fn().mockRejectedValue(new Error('no')), persist: vi.fn() })
    expect(await requestPersistentStorage()).toBe(false)
    stubStorage(undefined)
    expect(await requestPersistentStorage()).toBe(false)
  })
})
