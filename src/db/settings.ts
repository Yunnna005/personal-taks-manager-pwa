import { db, DEFAULT_SETTINGS, type Settings, type StartView, type Theme } from './schema.ts'

export const MIN_DUE_SOON_DAYS = 1
export const MAX_DUE_SOON_DAYS = 7

const THEMES: readonly Theme[] = ['system', 'light', 'dark']
export const START_VIEWS: readonly StartView[] = ['list', 'calendar']

function validate<K extends keyof Settings>(key: K, value: Settings[K]): Settings[K] {
  switch (key) {
    case 'dueSoonDays': {
      const n = value as number
      if (!Number.isInteger(n) || n < MIN_DUE_SOON_DAYS || n > MAX_DUE_SOON_DAYS) {
        throw new Error(`dueSoonDays must be a whole number from 1 to 7, got ${n}`)
      }
      break
    }
    case 'theme':
      if (!THEMES.includes(value as Theme)) throw new Error(`Unknown theme: ${String(value)}`)
      break
    case 'startView':
      if (!START_VIEWS.includes(value as StartView)) {
        throw new Error(`Unknown start view: ${String(value)}`)
      }
      break
    case 'lastBackupAt':
      if (value !== null && Number.isNaN(Date.parse(value as string))) {
        throw new Error(`lastBackupAt must be an ISO date or null`)
      }
      break
    case 'installHintDismissed':
      if (typeof value !== 'boolean') throw new Error('installHintDismissed must be true or false')
      break
  }
  return value
}

/** All settings, with defaults for anything never saved. */
export async function getSettings(): Promise<Settings> {
  const rows = await db.settings.toArray()
  const settings: Settings = { ...DEFAULT_SETTINGS }
  for (const row of rows) {
    if (row.key in settings) (settings as Record<string, unknown>)[row.key] = row.value
  }
  return settings
}

export async function setSetting<K extends keyof Settings>(
  key: K,
  value: Settings[K],
): Promise<void> {
  await db.settings.put({ key, value: validate(key, value) })
}
