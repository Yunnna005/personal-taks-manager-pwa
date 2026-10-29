import {
  backupFileName,
  BACKUP_VERSION,
  createBackup,
  importBackup,
  NOT_A_BACKUP,
  parseBackup,
  type BackupFile,
} from './backup.ts'
import { createFolder, listFolders } from './folders.ts'
import { db } from './schema.ts'
import { getSettings, setSetting } from './settings.ts'
import { addStep, addTask, completeTask, listTasks } from './tasks.ts'

const NOW = new Date('2026-10-29T12:00:00.000Z')

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

async function sample() {
  const work = await createFolder('Work', 'sky')
  const t = await addTask({
    title: 'Report',
    folderId: work.id,
    dueDate: '2026-10-30',
    dueTime: '09:00',
    notes: 'Q3',
  })
  await addStep(t.id, 'Draft')
  const done = await addTask({ title: 'Expenses' })
  await completeTask(done.id)
  await setSetting('dueSoonDays', 5)
  await setSetting('theme', 'dark')
  await setSetting('lastBackupAt', '2026-10-01T08:00:00.000Z')
}

const valid = (): BackupFile => ({
  app: 'soon',
  version: 1,
  exportedAt: NOW.toISOString(),
  folders: [
    {
      id: 'f1',
      name: 'Home',
      color: 'mint',
      createdAt: '2026-10-01T08:00:00.000Z',
      updatedAt: '2026-10-01T08:00:00.000Z',
    },
  ],
  tasks: [
    {
      id: 't1',
      title: 'Water plants',
      notes: '',
      folderId: 'f1',
      dueDate: '2026-10-30',
      dueTime: null,
      steps: [{ id: 's1', title: 'Fill can', done: false }],
      completedAt: null,
      createdAt: '2026-10-01T08:00:00.000Z',
      updatedAt: '2026-10-01T08:00:00.000Z',
    },
  ],
  settings: { dueSoonDays: 3, theme: 'system' },
})

const parse = (data: unknown) => parseBackup(JSON.stringify(data))

describe('createBackup / importBackup', () => {
  it('round-trips folders, tasks and synced settings exactly', async () => {
    await sample()
    const folders = await listFolders()
    const tasks = await listTasks()
    const backup = await createBackup(NOW)
    expect(backup).toMatchObject({ app: 'soon', version: BACKUP_VERSION })
    expect(backup.settings).toEqual({ dueSoonDays: 5, theme: 'dark' })

    await Promise.all(db.tables.map((t) => t.clear()))
    const parsed = parseBackup(JSON.stringify(backup))
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    await importBackup(parsed.backup)

    expect(await listFolders()).toEqual(folders)
    expect(new Set(await listTasks())).toEqual(new Set(tasks))
    expect(await getSettings()).toMatchObject({ dueSoonDays: 5, theme: 'dark' })
  })

  it('replaces everything that was there and keeps device-only settings', async () => {
    await sample()
    const parsed = parse(valid())
    if (!parsed.ok) throw new Error(parsed.error)
    await importBackup(parsed.backup)

    expect((await listFolders()).map((f) => f.name)).toEqual(['Home'])
    expect((await listTasks()).map((t) => t.title)).toEqual(['Water plants'])
    expect((await getSettings()).lastBackupAt).toBe('2026-10-01T08:00:00.000Z')
  })

  it('changes nothing if writing fails part way', async () => {
    await sample()
    const before = { folders: await listFolders(), tasks: await listTasks() }
    const parsed = parse(valid())
    if (!parsed.ok) throw new Error(parsed.error)

    const spy = vi.spyOn(db.tasks, 'bulkAdd').mockRejectedValueOnce(new Error('disk full'))
    await expect(importBackup(parsed.backup)).rejects.toThrow()
    spy.mockRestore()

    expect(await listFolders()).toEqual(before.folders)
    expect(new Set(await listTasks())).toEqual(new Set(before.tasks))
  })

  it('names the file by local date', () => {
    expect(backupFileName('2026-10-29')).toBe('soon-backup-2026-10-29.json')
  })
})

describe('parseBackup', () => {
  it('accepts a valid file and drops unknown fields', () => {
    const data = valid() as unknown as Record<string, unknown>
    ;(data.tasks as Record<string, unknown>[])[0]!.extra = 'ignored'
    const result = parse(data)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.backup.tasks[0]).not.toHaveProperty('extra')
  })

  it.each([
    ['not JSON', 'hello'],
    ['another app', JSON.stringify({ app: 'other', version: 1 })],
    ['an array', JSON.stringify([])],
    ['no version', JSON.stringify({ app: 'soon' })],
  ])('rejects %s as not a soon backup', (_, text) => {
    expect(parseBackup(text)).toEqual({ ok: false, error: NOT_A_BACKUP })
  })

  it('rejects a newer version with advice', () => {
    const result = parse({ ...valid(), version: BACKUP_VERSION + 1 })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/newer version.*Nothing on this phone was changed/)
  })

  const broken: [string, (b: BackupFile) => void, RegExp][] = [
    ['missing lists', (b) => delete (b as Partial<BackupFile>).tasks, /no folders or tasks/],
    [
      'a bad colour',
      (b) => ((b.folders[0] as { color: string }).color = 'teal'),
      /Folder 1.*colour/,
    ],
    ['an empty folder name', (b) => (b.folders[0]!.name = ' '), /Folder 1.*empty name/],
    ['a long folder name', (b) => (b.folders[0]!.name = 'x'.repeat(41)), /too long/],
    ['a repeated folder id', (b) => b.folders.push({ ...b.folders[0]! }), /Folder 2 repeats/],
    ['an empty title', (b) => (b.tasks[0]!.title = ''), /Task 1.*empty title/],
    ['a missing folder', (b) => (b.tasks[0]!.folderId = 'nope'), /folder that isn't in the file/],
    ['a bad date', (b) => (b.tasks[0]!.dueDate = '2026-02-30'), /bad due date/],
    ['a bad time', (b) => (b.tasks[0]!.dueTime = '25:00'), /bad due time/],
    [
      'a time without a date',
      (b) => {
        b.tasks[0]!.dueDate = null
        b.tasks[0]!.dueTime = '09:00'
      },
      /time but no date/,
    ],
    ['a bad timestamp', (b) => (b.tasks[0]!.createdAt = 'yesterday'), /bad createdAt/],
    ['a step without done', (b) => delete (b.tasks[0]!.steps[0] as Partial<Step>).done, /step/],
    ['notes that are not text', (b) => ((b.tasks[0] as { notes: unknown }).notes = 5), /notes/],
    ['a repeated task id', (b) => b.tasks.push({ ...b.tasks[0]! }), /Task 2 repeats/],
  ]

  it.each(broken)('rejects a file with %s, saying what is wrong', (_, breakIt, message) => {
    const data = valid()
    breakIt(data)
    const result = parse(data)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toMatch(message)
      expect(result.error).toMatch(
        /^That backup is damaged: .*Nothing on this phone was changed\.$/,
      )
    }
  })

  it('falls back to default settings when they are missing or odd', () => {
    const data = { ...valid(), settings: { dueSoonDays: 99, theme: 'neon' } }
    const result = parse(data)
    expect(result.ok && result.backup.settings).toEqual({ dueSoonDays: 3, theme: 'system' })
  })
})

type Step = BackupFile['tasks'][number]['steps'][number]
