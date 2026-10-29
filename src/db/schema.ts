import { Dexie, type EntityTable } from 'dexie'

export const FOLDER_COLORS = ['lilac', 'peach', 'mint', 'sky', 'butter', 'rose'] as const
export type FolderColor = (typeof FOLDER_COLORS)[number]

export type Folder = {
  id: string
  name: string
  color: FolderColor
  createdAt: string
  updatedAt: string
}

export type Step = {
  id: string
  title: string
  done: boolean
}

export type Task = {
  id: string
  title: string
  notes: string
  /** null = Unsorted, the built-in inbox folder (it has no row of its own). */
  folderId: string | null
  /** Local date, "YYYY-MM-DD". */
  dueDate: string | null
  /** Local time, "HH:mm". Only allowed with a dueDate. */
  dueTime: string | null
  steps: Step[]
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export type Theme = 'system' | 'light' | 'dark'

export type Settings = {
  dueSoonDays: number
  theme: Theme
  lastBackupAt: string | null
  installHintDismissed: boolean
}

export type SettingRow<K extends keyof Settings = keyof Settings> = {
  key: K
  value: Settings[K]
}

export const DEFAULT_SETTINGS: Settings = {
  dueSoonDays: 3,
  theme: 'system',
  lastBackupAt: null,
  installHintDismissed: false,
}

export class SoonDB extends Dexie {
  folders!: EntityTable<Folder, 'id'>
  tasks!: EntityTable<Task, 'id'>
  settings!: EntityTable<SettingRow, 'key'>

  constructor(name = 'soon') {
    super(name)
    // IndexedDB doesn't index null, so Unsorted tasks (folderId null) are
    // found by filtering rather than through the folderId index.
    this.version(1).stores({
      folders: 'id, createdAt',
      tasks: 'id, folderId, dueDate, createdAt',
      settings: 'key',
    })
  }
}

export const db = new SoonDB()
