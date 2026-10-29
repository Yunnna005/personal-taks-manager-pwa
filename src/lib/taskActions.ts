// Completing and deleting, each with an Undo toast. Screens call these rather
// than the db functions directly, so every place behaves the same.
import type { Task } from '../db/schema.ts'
import {
  completeTask,
  deleteCompletedTasks,
  deleteTask,
  restoreTask,
  restoreTasks,
  uncompleteTask,
} from '../db/tasks.ts'
import { showToast } from './toast.ts'

const FAILED = "Couldn't save that change. Try again."

export async function completeWithUndo(task: Pick<Task, 'id' | 'title'>): Promise<void> {
  try {
    await completeTask(task.id)
    showToast(`${task.title} done`, () => uncompleteTask(task.id))
  } catch {
    showToast(FAILED)
  }
}

export async function deleteWithUndo(taskId: string): Promise<void> {
  try {
    const task = await deleteTask(taskId)
    showToast('Task deleted', () => restoreTask(task))
  } catch {
    showToast(FAILED)
  }
}

/** Clears the Completed list, with Undo for the whole batch. */
export async function deleteCompletedWithUndo(): Promise<void> {
  try {
    const tasks = await deleteCompletedTasks()
    if (tasks.length === 0) return
    const what = tasks.length === 1 ? '1 completed task' : `${tasks.length} completed tasks`
    showToast(`${what} deleted`, () => restoreTasks(tasks))
  } catch {
    showToast(FAILED)
  }
}
