// Backup files: export everything as versioned JSON, and import by checking
// the whole file first, then replacing all data in one transaction.
import { isValidDate, isValidTime } from '../lib/dates.ts'
import { MAX_FOLDER_NAME } from './folders.ts'
import { db, FOLDER_COLORS, type Folder, type Step, type Task, type Theme } from './schema.ts'
import { getSettings } from './settings.ts'

export const BACKUP_VERSION = 1
/** Far beyond any real task list; stops a wrong file from freezing the phone. */
export const MAX_BACKUP_BYTES = 20 * 1024 * 1024

export type BackupFile = {
  app: 'soon'
  version: number
  exportedAt: string
  folders: Folder[]
  tasks: Task[]
  /** Preferences that travel with the data. Backup dates and hints stay per device. */
  settings: { dueSoonDays: number; theme: Theme }
}

export type ParseResult = { ok: true; backup: BackupFile } | { ok: false; error: string }

const UNCHANGED = 'Nothing on this phone was changed.'
export const NOT_A_BACKUP = `That file isn't a soon backup. ${UNCHANGED}`

export async function createBackup(now: Date): Promise<BackupFile> {
  return db.transaction('r', db.folders, db.tasks, db.settings, async () => {
    const [folders, tasks, settings] = await Promise.all([
      db.folders.orderBy('createdAt').toArray(),
      db.tasks.orderBy('createdAt').toArray(),
      getSettings(),
    ])
    return {
      app: 'soon',
      version: BACKUP_VERSION,
      exportedAt: now.toISOString(),
      folders,
      tasks,
      settings: { dueSoonDays: settings.dueSoonDays, theme: settings.theme },
    }
  })
}

/** "soon-backup-2026-10-29.json" */
export function backupFileName(localDate: string): string {
  return `soon-backup-${localDate}.json`
}

// --- Validation -----------------------------------------------------------

class Invalid extends Error {}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

function str(o: Record<string, unknown>, key: string, where: string): string {
  const v = o[key]
  if (typeof v !== 'string') throw new Invalid(`${where} has no ${key}`)
  return v
}

function nonEmpty(o: Record<string, unknown>, key: string, where: string): string {
  const v = str(o, key, where).trim()
  if (!v) throw new Invalid(`${where} has an empty ${key}`)
  return v
}

function iso(o: Record<string, unknown>, key: string, where: string): string {
  const v = str(o, key, where)
  if (Number.isNaN(Date.parse(v))) throw new Invalid(`${where} has a bad ${key}`)
  return v
}

function isoOrNull(o: Record<string, unknown>, key: string, where: string): string | null {
  return o[key] === null ? null : iso(o, key, where)
}

function uniqueId(o: Record<string, unknown>, where: string, seen: Set<string>): string {
  const id = nonEmpty(o, 'id', where)
  if (seen.has(id)) throw new Invalid(`${where} repeats an id`)
  seen.add(id)
  return id
}

function readFolder(v: unknown, i: number, seen: Set<string>): Folder {
  const where = `Folder ${i + 1}`
  if (!isObject(v)) throw new Invalid(`${where} isn't a folder`)
  const name = nonEmpty(v, 'name', where)
  if (name.length > MAX_FOLDER_NAME) throw new Invalid(`${where} has a name that's too long`)
  if (!(FOLDER_COLORS as readonly unknown[]).includes(v.color)) {
    throw new Invalid(`${where} has an unknown colour`)
  }
  return {
    id: uniqueId(v, where, seen),
    name,
    color: v.color as Folder['color'],
    createdAt: iso(v, 'createdAt', where),
    updatedAt: iso(v, 'updatedAt', where),
  }
}

function readStep(v: unknown, where: string, seen: Set<string>): Step {
  if (!isObject(v)) throw new Invalid(`${where} has a broken step`)
  if (typeof v.done !== 'boolean') throw new Invalid(`${where} has a step without done`)
  return {
    id: uniqueId(v, `${where}, a step,`, seen),
    title: nonEmpty(v, 'title', `${where}, a step,`),
    done: v.done,
  }
}

function readTask(v: unknown, i: number, seen: Set<string>, folderIds: Set<string>): Task {
  const where = `Task ${i + 1}`
  if (!isObject(v)) throw new Invalid(`${where} isn't a task`)

  const folderId = v.folderId === null ? null : str(v, 'folderId', where)
  if (folderId !== null && !folderIds.has(folderId)) {
    throw new Invalid(`${where} is in a folder that isn't in the file`)
  }
  const dueDate = v.dueDate === null ? null : str(v, 'dueDate', where)
  if (dueDate !== null && !isValidDate(dueDate)) throw new Invalid(`${where} has a bad due date`)
  const dueTime = v.dueTime === null ? null : str(v, 'dueTime', where)
  if (dueTime !== null) {
    if (!isValidTime(dueTime)) throw new Invalid(`${where} has a bad due time`)
    if (dueDate === null) throw new Invalid(`${where} has a time but no date`)
  }
  if (!Array.isArray(v.steps)) throw new Invalid(`${where} has no steps list`)
  const stepIds = new Set<string>()

  return {
    id: uniqueId(v, where, seen),
    title: nonEmpty(v, 'title', where),
    notes: str(v, 'notes', where),
    folderId,
    dueDate,
    dueTime,
    steps: v.steps.map((s) => readStep(s, where, stepIds)),
    completedAt: isoOrNull(v, 'completedAt', where),
    createdAt: iso(v, 'createdAt', where),
    updatedAt: iso(v, 'updatedAt', where),
  }
}

/**
 * Checks a whole backup file before anything is touched. Unknown fields are
 * dropped; anything missing or malformed rejects the file.
 */
export function parseBackup(text: string): ParseResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, error: NOT_A_BACKUP }
  }
  if (!isObject(raw) || raw.app !== 'soon' || typeof raw.version !== 'number') {
    return { ok: false, error: NOT_A_BACKUP }
  }
  if (raw.version > BACKUP_VERSION) {
    return {
      ok: false,
      error: `That backup is from a newer version of soon. Update the app, then try again. ${UNCHANGED}`,
    }
  }

  try {
    if (!Array.isArray(raw.folders) || !Array.isArray(raw.tasks)) {
      throw new Invalid('It has no folders or tasks list')
    }
    const folderIds = new Set<string>()
    const folders = raw.folders.map((f, i) => readFolder(f, i, folderIds))
    const taskIds = new Set<string>()
    const tasks = raw.tasks.map((t, i) => readTask(t, i, taskIds, folderIds))

    const s = isObject(raw.settings) ? raw.settings : {}
    const days = s.dueSoonDays
    const settings = {
      dueSoonDays:
        Number.isInteger(days) && (days as number) >= 1 && (days as number) <= 7
          ? (days as number)
          : 3,
      theme: (['system', 'light', 'dark'] as const).find((t) => t === s.theme) ?? 'system',
    }

    return {
      ok: true,
      backup: {
        app: 'soon',
        version: raw.version,
        exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : '',
        folders,
        tasks,
        settings,
      },
    }
  } catch (e) {
    if (!(e instanceof Invalid)) throw e
    return { ok: false, error: `That backup is damaged: ${e.message}. ${UNCHANGED}` }
  }
}

/** Replaces all folders, tasks and synced settings in one transaction, or changes nothing. */
export async function importBackup(backup: BackupFile): Promise<void> {
  await db.transaction('rw', db.folders, db.tasks, db.settings, async () => {
    await db.folders.clear()
    await db.tasks.clear()
    await db.folders.bulkAdd(backup.folders)
    await db.tasks.bulkAdd(backup.tasks)
    await db.settings.bulkPut([
      { key: 'dueSoonDays', value: backup.settings.dueSoonDays },
      { key: 'theme', value: backup.settings.theme },
    ])
  })
}
