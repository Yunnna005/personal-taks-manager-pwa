import { createFolder, deleteFolder } from './folders.ts'
import { db } from './schema.ts'
import {
  addStep,
  addTask,
  completeTask,
  countByFolder,
  deleteTask,
  getTask,
  listTasks,
  listTasksInFolder,
  removeStep,
  renameStep,
  restoreTask,
  toggleStep,
  uncompleteTask,
  updateTask,
} from './tasks.ts'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-29T09:00:00.000Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('addTask', () => {
  it('saves a task in Unsorted with defaults', async () => {
    const task = await addTask({ title: '  Pay rent  ' })
    expect(task).toMatchObject({
      title: 'Pay rent',
      notes: '',
      folderId: null,
      dueDate: null,
      dueTime: null,
      steps: [],
      completedAt: null,
      createdAt: '2026-10-29T09:00:00.000Z',
      updatedAt: '2026-10-29T09:00:00.000Z',
    })
    expect(await getTask(task.id)).toEqual(task)
  })

  it('saves into a folder with a date and time', async () => {
    const folder = await createFolder('Home', 'mint')
    const task = await addTask({
      title: 'Call plumber',
      folderId: folder.id,
      dueDate: '2026-10-30',
      dueTime: '10:30',
    })
    expect(await getTask(task.id)).toMatchObject({
      folderId: folder.id,
      dueDate: '2026-10-30',
      dueTime: '10:30',
    })
  })

  it('rejects bad input and saves nothing', async () => {
    await expect(addTask({ title: '   ' })).rejects.toThrow('title is required')
    await expect(addTask({ title: 'x', dueDate: '2026-02-30' })).rejects.toThrow('Invalid due date')
    await expect(addTask({ title: 'x', dueDate: '2026-10-30', dueTime: '25:00' })).rejects.toThrow(
      'Invalid due time',
    )
    await expect(addTask({ title: 'x', dueTime: '10:00' })).rejects.toThrow('needs a due date')
    await expect(addTask({ title: 'x', folderId: 'nope' })).rejects.toThrow('Folder not found')
    expect(await listTasks()).toEqual([])
  })
})

describe('updateTask', () => {
  it('applies edits and bumps updatedAt only', async () => {
    const task = await addTask({ title: 'Draft', dueDate: '2026-10-30' })
    vi.setSystemTime(new Date('2026-10-29T10:00:00.000Z'))

    const updated = await updateTask(task.id, {
      title: 'Final',
      notes: 'Bring ID',
      dueTime: '09:00',
    })
    expect(updated).toMatchObject({
      title: 'Final',
      notes: 'Bring ID',
      dueDate: '2026-10-30',
      dueTime: '09:00',
      createdAt: '2026-10-29T09:00:00.000Z',
      updatedAt: '2026-10-29T10:00:00.000Z',
    })
    expect(await getTask(task.id)).toEqual(updated)
  })

  it('clears the time when the date is cleared', async () => {
    const task = await addTask({ title: 'x', dueDate: '2026-10-30', dueTime: '09:00' })
    expect(await updateTask(task.id, { dueDate: null })).toMatchObject({
      dueDate: null,
      dueTime: null,
    })
  })

  it('ignores keys passed as undefined', async () => {
    const task = await addTask({ title: 'Keep me', notes: 'n' })
    const updated = await updateTask(task.id, { title: undefined, notes: undefined })
    expect(updated).toMatchObject({ title: 'Keep me', notes: 'n' })
  })

  it('rejects invalid edits and leaves the task unchanged', async () => {
    const task = await addTask({ title: 'x' })
    await expect(updateTask(task.id, { title: '' })).rejects.toThrow('title is required')
    await expect(updateTask(task.id, { dueTime: '09:00' })).rejects.toThrow('needs a due date')
    await expect(updateTask(task.id, { folderId: 'nope' })).rejects.toThrow('Folder not found')
    await expect(updateTask('missing', { title: 'y' })).rejects.toThrow('Task not found')
    expect(await getTask(task.id)).toEqual(task)
  })
})

describe('complete and undo', () => {
  it('sets and clears completedAt', async () => {
    const task = await addTask({ title: 'x' })
    await completeTask(task.id)
    expect((await getTask(task.id))?.completedAt).toBe('2026-10-29T09:00:00.000Z')
    await uncompleteTask(task.id)
    expect((await getTask(task.id))?.completedAt).toBeNull()
  })

  it('throws for a missing task', async () => {
    await expect(completeTask('missing')).rejects.toThrow('Task not found')
  })
})

describe('delete and undo', () => {
  it('deletes and restores the task exactly', async () => {
    const task = await addTask({ title: 'x', dueDate: '2026-10-30' })
    await addStep(task.id, 'step')
    const before = await getTask(task.id)

    const deleted = await deleteTask(task.id)
    expect(deleted).toEqual(before)
    expect(await getTask(task.id)).toBeUndefined()

    await restoreTask(deleted)
    expect(await getTask(task.id)).toEqual(before)
  })

  it('restores to Unsorted if the folder was deleted in between', async () => {
    const folder = await createFolder('Work', 'sky')
    const task = await addTask({ title: 'x', folderId: folder.id })
    const deleted = await deleteTask(task.id)
    await deleteFolder(folder.id)

    await restoreTask(deleted)
    expect((await getTask(task.id))?.folderId).toBeNull()
  })
})

describe('steps', () => {
  it('adds, renames, toggles and removes steps in order', async () => {
    const task = await addTask({ title: 'Move flat' })
    const a = await addStep(task.id, ' Book van ')
    const b = await addStep(task.id, 'Pack')
    expect(a.title).toBe('Book van')

    await renameStep(task.id, b.id, 'Pack boxes')
    await toggleStep(task.id, a.id)
    expect((await getTask(task.id))?.steps).toEqual([
      { id: a.id, title: 'Book van', done: true },
      { id: b.id, title: 'Pack boxes', done: false },
    ])

    await toggleStep(task.id, a.id)
    await removeStep(task.id, b.id)
    expect((await getTask(task.id))?.steps).toEqual([{ id: a.id, title: 'Book van', done: false }])
  })

  it('bumps updatedAt and rejects empty titles', async () => {
    const task = await addTask({ title: 'x' })
    vi.setSystemTime(new Date('2026-10-29T11:00:00.000Z'))
    await addStep(task.id, 'one')
    expect((await getTask(task.id))?.updatedAt).toBe('2026-10-29T11:00:00.000Z')
    await expect(addStep(task.id, '  ')).rejects.toThrow('title is required')
    await expect(addStep('missing', 'one')).rejects.toThrow('Task not found')
    await expect(renameStep(task.id, 'any', '')).rejects.toThrow('title is required')
  })
})

describe('listing and counts', () => {
  it('lists tasks per folder, with null as Unsorted', async () => {
    const work = await createFolder('Work', 'sky')
    const inbox = await addTask({ title: 'inbox' })
    const report = await addTask({ title: 'report', folderId: work.id })

    expect(await listTasksInFolder(null)).toEqual([inbox])
    expect(await listTasksInFolder(work.id)).toEqual([report])
  })

  it('counts done and total per folder', async () => {
    const work = await createFolder('Work', 'sky')
    const a = await addTask({ title: 'a', folderId: work.id })
    await addTask({ title: 'b', folderId: work.id })
    await addTask({ title: 'c' })
    await completeTask(a.id)

    const counts = await countByFolder()
    expect(counts.get(work.id)).toEqual({ done: 1, total: 2 })
    expect(counts.get('')).toEqual({ done: 0, total: 1 })
  })
})
