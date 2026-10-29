import {
  createFolder,
  deleteFolder,
  getFolder,
  listFolders,
  recolorFolder,
  renameFolder,
} from './folders.ts'
import { db, type FolderColor } from './schema.ts'
import { addTask, completeTask, getTask } from './tasks.ts'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-29T09:00:00.000Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('folders', () => {
  it('creates folders and lists them in creation order', async () => {
    const b = await createFolder(' Work ', 'sky')
    vi.setSystemTime(new Date('2026-10-29T09:01:00.000Z'))
    const a = await createFolder('Admin', 'peach')

    expect(b.name).toBe('Work')
    expect((await listFolders()).map((f) => f.id)).toEqual([b.id, a.id])
  })

  it('validates names and colours', async () => {
    await expect(createFolder('  ', 'sky')).rejects.toThrow('name is required')
    await expect(createFolder('x'.repeat(41), 'sky')).rejects.toThrow('40 characters')
    await expect(createFolder('Ok', 'teal' as FolderColor)).rejects.toThrow('Unknown folder colour')
    expect(await listFolders()).toEqual([])
  })

  it('renames and recolours, bumping updatedAt', async () => {
    const folder = await createFolder('Wrok', 'sky')
    vi.setSystemTime(new Date('2026-10-29T10:00:00.000Z'))
    await renameFolder(folder.id, 'Work')
    await recolorFolder(folder.id, 'rose')

    expect(await getFolder(folder.id)).toMatchObject({
      name: 'Work',
      color: 'rose',
      createdAt: '2026-10-29T09:00:00.000Z',
      updatedAt: '2026-10-29T10:00:00.000Z',
    })
    await expect(renameFolder('missing', 'x')).rejects.toThrow('Folder not found')
    await expect(renameFolder(folder.id, '')).rejects.toThrow('name is required')
    await expect(recolorFolder(folder.id, 'teal' as FolderColor)).rejects.toThrow('Unknown')
  })

  it('moves open and completed tasks to Unsorted when deleted', async () => {
    const work = await createFolder('Work', 'sky')
    const home = await createFolder('Home', 'mint')
    const open = await addTask({ title: 'open', folderId: work.id })
    const done = await addTask({ title: 'done', folderId: work.id })
    const other = await addTask({ title: 'other', folderId: home.id })
    await completeTask(done.id)

    vi.setSystemTime(new Date('2026-10-29T12:00:00.000Z'))
    await deleteFolder(work.id)

    expect(await getFolder(work.id)).toBeUndefined()
    expect(await getTask(open.id)).toMatchObject({
      folderId: null,
      updatedAt: '2026-10-29T12:00:00.000Z',
    })
    expect(await getTask(done.id)).toMatchObject({
      folderId: null,
      completedAt: expect.any(String),
    })
    expect((await getTask(other.id))?.folderId).toBe(home.id)
  })
})
