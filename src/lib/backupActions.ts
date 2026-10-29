// Saving a backup file and reading one back. On phones the share sheet is the
// reliable way to save a file ("Save to Files"); elsewhere it downloads.
import {
  backupFileName,
  createBackup,
  importBackup,
  MAX_BACKUP_BYTES,
  NOT_A_BACKUP,
  parseBackup,
  type BackupFile,
  type ParseResult,
} from '../db/backup.ts'
import { setSetting } from '../db/settings.ts'
import { toDateString } from './dates.ts'

export type ExportResult = 'saved' | 'cancelled' | 'failed'

export async function exportBackup(now = new Date()): Promise<ExportResult> {
  try {
    const backup = await createBackup(now)
    const name = backupFileName(toDateString(now))
    const file = new File([JSON.stringify(backup, null, 2)], name, { type: 'application/json' })

    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'soon backup' })
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'
        throw e
      }
    } else {
      download(file)
    }
    await setSetting('lastBackupAt', now.toISOString())
    return 'saved'
  } catch {
    return 'failed'
  }
}

function download(file: File) {
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/** Reads and fully checks a chosen file. Nothing is written yet. */
export async function readBackupFile(file: File): Promise<ParseResult> {
  if (file.size > MAX_BACKUP_BYTES) return { ok: false, error: NOT_A_BACKUP }
  try {
    return parseBackup(await file.text())
  } catch {
    return { ok: false, error: NOT_A_BACKUP }
  }
}

export async function restoreBackup(backup: BackupFile): Promise<boolean> {
  try {
    await importBackup(backup)
    return true
  } catch {
    return false
  }
}
