import { useSyncExternalStore } from 'react'

// One toast at a time, kept outside React so it survives moving between
// screens (deleting on the Task page shows its toast on the screen you return to).

export type Toast = {
  id: number
  message: string
  undo?: () => unknown
}

export const TOAST_MS = 5000

let current: Toast | null = null
let seq = 0
let timer: ReturnType<typeof setTimeout> | undefined
let remaining = 0
let startedAt = 0
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((l) => l())
}

function start(ms: number) {
  clearTimeout(timer)
  remaining = ms
  startedAt = Date.now()
  timer = setTimeout(dismissToast, ms)
}

/** Shows a toast for about 5 seconds, replacing any toast already showing. */
export function showToast(message: string, undo?: () => unknown) {
  current = { id: ++seq, message, undo }
  start(TOAST_MS)
  emit()
}

export function dismissToast() {
  clearTimeout(timer)
  timer = undefined
  current = null
  emit()
}

/** Holds the toast while someone is pointing at it or has focus in it. */
export function pauseToast() {
  if (!current || timer === undefined) return
  clearTimeout(timer)
  timer = undefined
  remaining = Math.max(0, remaining - (Date.now() - startedAt))
}

export function resumeToast() {
  if (current && timer === undefined) start(Math.max(remaining, 1500))
}

/** Runs the toast's undo action and hides it. */
export function undoToast() {
  const undo = current?.undo
  dismissToast()
  void undo?.()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useToast(): Toast | null {
  return useSyncExternalStore(subscribe, () => current)
}
