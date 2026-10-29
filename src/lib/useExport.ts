import { useState } from 'react'
import { exportBackup } from './backupActions.ts'
import { showToast } from './toast.ts'

/** Export with a busy flag and a toast for the outcome. */
export function useExport() {
  const [busy, setBusy] = useState(false)

  async function run() {
    setBusy(true)
    const result = await exportBackup()
    setBusy(false)
    if (result === 'saved') showToast('Backup saved')
    else if (result === 'failed') showToast("Couldn't make a backup. Nothing was saved.")
  }

  return { busy, run: () => void run() }
}
