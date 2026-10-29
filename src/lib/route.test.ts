import { act, renderHook } from '@testing-library/react'
import { goBack, HOME, navigate, parseHash, toHash, useRoute } from './route.ts'

describe('parseHash / toHash', () => {
  it('round-trips each route', () => {
    for (const route of [
      HOME,
      { name: 'folder', folderId: null },
      { name: 'folder', folderId: '6a1f-uuid' },
      { name: 'task', taskId: '9c2e-uuid' },
    ] as const) {
      expect(parseHash(toHash(route))).toEqual(route)
    }
  })

  it('treats anything unknown as Home', () => {
    expect(parseHash('')).toEqual(HOME)
    expect(parseHash('#/nope')).toEqual(HOME)
    expect(parseHash('#/folder/')).toEqual(HOME)
    expect(parseHash('#/task/')).toEqual(HOME)
  })
})

describe('navigation', () => {
  beforeEach(() => history.replaceState(null, '', '#/'))

  it('pushes a screen and goes back to the previous one', async () => {
    const { result } = renderHook(() => useRoute())
    act(() => navigate({ name: 'folder', folderId: 'abc' }))
    expect(result.current).toEqual({ name: 'folder', folderId: 'abc' })

    await act(async () => {
      goBack()
      await new Promise((r) => window.addEventListener('popstate', r, { once: true }))
    })
    expect(result.current).toEqual(HOME)
  })

  it('goes Home when the app was opened straight onto a folder', () => {
    history.replaceState(null, '', '#/folder/abc')
    const { result } = renderHook(() => useRoute())
    act(() => goBack())
    expect(result.current).toEqual(HOME)
    expect(location.hash).toBe('#/')
  })
})
