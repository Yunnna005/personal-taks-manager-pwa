import { newId, nowIso } from '../lib/ids.ts'
import { db, FOLDER_COLORS, type Folder, type FolderColor } from './schema.ts'

export const MAX_FOLDER_NAME = 40

function cleanName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Folder name is required')
  if (trimmed.length > MAX_FOLDER_NAME) {
    throw new Error(`Folder name must be ${MAX_FOLDER_NAME} characters or fewer`)
  }
  return trimmed
}

function checkColor(color: string): FolderColor {
  if (!(FOLDER_COLORS as readonly string[]).includes(color)) {
    throw new Error(`Unknown folder colour: ${color}`)
  }
  return color as FolderColor
}

/** Folders in the order they were created. Unsorted isn't included. */
export function listFolders(): Promise<Folder[]> {
  return db.folders.orderBy('createdAt').toArray()
}

export function getFolder(id: string): Promise<Folder | undefined> {
  return db.folders.get(id)
}

export async function createFolder(name: string, color: FolderColor): Promise<Folder> {
  const now = nowIso()
  const folder: Folder = {
    id: newId(),
    name: cleanName(name),
    color: checkColor(color),
    createdAt: now,
    updatedAt: now,
  }
  await db.folders.add(folder)
  return folder
}

async function updateFolder(id: string, changes: Partial<Folder>): Promise<void> {
  const updated = await db.folders.update(id, { ...changes, updatedAt: nowIso() })
  if (!updated) throw new Error(`Folder not found: ${id}`)
}

export async function renameFolder(id: string, name: string): Promise<void> {
  await updateFolder(id, { name: cleanName(name) })
}

export async function recolorFolder(id: string, color: FolderColor): Promise<void> {
  await updateFolder(id, { color: checkColor(color) })
}

/** Deletes the folder and moves all its tasks (open and completed) to Unsorted. */
export async function deleteFolder(id: string): Promise<void> {
  await db.transaction('rw', db.folders, db.tasks, async () => {
    const now = nowIso()
    await db.tasks.where('folderId').equals(id).modify({ folderId: null, updatedAt: now })
    await db.folders.delete(id)
  })
}
