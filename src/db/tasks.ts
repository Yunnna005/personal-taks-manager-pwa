import { isValidDate, isValidTime } from '../lib/dates.ts'
import { newId, nowIso } from '../lib/ids.ts'
import { db, type Step, type Task } from './schema.ts'

export type NewTask = {
  title: string
  notes?: string
  folderId?: string | null
  dueDate?: string | null
  dueTime?: string | null
}

/** Fields the task page can edit. Completion and steps have their own functions. */
export type TaskChanges = Partial<
  Pick<Task, 'title' | 'notes' | 'folderId' | 'dueDate' | 'dueTime'>
>

export type FolderCounts = { done: number; total: number }

function cleanTitle(title: string): string {
  const trimmed = title.trim()
  if (!trimmed) throw new Error('Task title is required')
  return trimmed
}

function checkDue(dueDate: string | null, dueTime: string | null): void {
  if (dueDate !== null && !isValidDate(dueDate)) throw new Error(`Invalid due date: ${dueDate}`)
  if (dueTime !== null) {
    if (!isValidTime(dueTime)) throw new Error(`Invalid due time: ${dueTime}`)
    if (dueDate === null) throw new Error('A due time needs a due date')
  }
}

async function checkFolder(folderId: string | null): Promise<void> {
  if (folderId !== null && !(await db.folders.get(folderId))) {
    throw new Error(`Folder not found: ${folderId}`)
  }
}

async function getOrThrow(id: string): Promise<Task> {
  const task = await db.tasks.get(id)
  if (!task) throw new Error(`Task not found: ${id}`)
  return task
}

export function getTask(id: string): Promise<Task | undefined> {
  return db.tasks.get(id)
}

/** Every task, including completed ones. Home filters these with lib/dates. */
export function listTasks(): Promise<Task[]> {
  return db.tasks.toArray()
}

/** Tasks in one folder; `null` is Unsorted. */
export function listTasksInFolder(folderId: string | null): Promise<Task[]> {
  if (folderId === null) return db.tasks.filter((t) => t.folderId === null).toArray()
  return db.tasks.where('folderId').equals(folderId).toArray()
}

/** Done / total per folder, keyed by folder id ('' for Unsorted). */
export async function countByFolder(): Promise<Map<string, FolderCounts>> {
  const counts = new Map<string, FolderCounts>()
  await db.tasks.each((t) => {
    const key = t.folderId ?? ''
    const c = counts.get(key) ?? { done: 0, total: 0 }
    c.total += 1
    if (t.completedAt) c.done += 1
    counts.set(key, c)
  })
  return counts
}

export async function addTask(input: NewTask): Promise<Task> {
  const folderId = input.folderId ?? null
  const dueDate = input.dueDate ?? null
  const dueTime = input.dueTime ?? null
  const title = cleanTitle(input.title)
  checkDue(dueDate, dueTime)

  const now = nowIso()
  const task: Task = {
    id: newId(),
    title,
    notes: input.notes ?? '',
    folderId,
    dueDate,
    dueTime,
    steps: [],
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  }
  await db.transaction('rw', db.folders, db.tasks, async () => {
    await checkFolder(folderId)
    await db.tasks.add(task)
  })
  return task
}

/**
 * Applies edits from the task page. Clearing the due date also clears the time.
 */
export async function updateTask(id: string, changes: TaskChanges): Promise<Task> {
  return db.transaction('rw', db.folders, db.tasks, async () => {
    const task = await getOrThrow(id)
    const defined = Object.entries(changes).filter(([, v]) => v !== undefined)
    const next: Task = { ...task, ...Object.fromEntries(defined) }

    if (changes.title !== undefined) next.title = cleanTitle(changes.title)
    if (changes.dueDate === null && changes.dueTime === undefined) next.dueTime = null
    checkDue(next.dueDate, next.dueTime)
    if (changes.folderId !== undefined) await checkFolder(next.folderId)

    next.updatedAt = nowIso()
    await db.tasks.put(next)
    return next
  })
}

export async function completeTask(id: string): Promise<void> {
  await setCompleted(id, nowIso())
}

/** Undo for completeTask, and the way to reopen a completed task. */
export async function uncompleteTask(id: string): Promise<void> {
  await setCompleted(id, null)
}

async function setCompleted(id: string, completedAt: string | null): Promise<void> {
  const updated = await db.tasks.update(id, { completedAt, updatedAt: nowIso() })
  if (!updated) throw new Error(`Task not found: ${id}`)
}

/** Deletes a task and returns it so the Undo toast can put it back. */
export async function deleteTask(id: string): Promise<Task> {
  return db.transaction('rw', db.tasks, async () => {
    const task = await getOrThrow(id)
    await db.tasks.delete(id)
    return task
  })
}

/**
 * Undo for deleteTask. Puts the task back unchanged; if its folder was
 * deleted in the meantime it goes to Unsorted.
 */
export async function restoreTask(task: Task): Promise<void> {
  await db.transaction('rw', db.folders, db.tasks, async () => {
    const folderExists = task.folderId === null || (await db.folders.get(task.folderId))
    await db.tasks.put(folderExists ? task : { ...task, folderId: null })
  })
}

async function updateSteps(id: string, change: (steps: Step[]) => Step[]): Promise<Step[]> {
  return db.transaction('rw', db.tasks, async () => {
    const task = await getOrThrow(id)
    const steps = change(task.steps)
    await db.tasks.update(id, { steps, updatedAt: nowIso() })
    return steps
  })
}

export async function addStep(taskId: string, title: string): Promise<Step> {
  const step: Step = { id: newId(), title: cleanTitle(title), done: false }
  await updateSteps(taskId, (steps) => [...steps, step])
  return step
}

export async function renameStep(taskId: string, stepId: string, title: string): Promise<Step[]> {
  const clean = cleanTitle(title)
  return updateSteps(taskId, (steps) =>
    steps.map((s) => (s.id === stepId ? { ...s, title: clean } : s)),
  )
}

export function toggleStep(taskId: string, stepId: string): Promise<Step[]> {
  return updateSteps(taskId, (steps) =>
    steps.map((s) => (s.id === stepId ? { ...s, done: !s.done } : s)),
  )
}

export function removeStep(taskId: string, stepId: string): Promise<Step[]> {
  return updateSteps(taskId, (steps) => steps.filter((s) => s.id !== stepId))
}
