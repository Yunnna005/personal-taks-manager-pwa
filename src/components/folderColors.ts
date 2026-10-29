import type { FolderColor } from '../db/schema.ts'

// Full class names so Tailwind can find them when scanning the source.

export const tileBg: Record<FolderColor, string> = {
  lilac: 'bg-lilac',
  peach: 'bg-peach',
  mint: 'bg-mint',
  sky: 'bg-sky',
  butter: 'bg-butter',
  rose: 'bg-rose',
}

export const dotBg: Record<FolderColor, string> = {
  lilac: 'bg-lilac-dot',
  peach: 'bg-peach-dot',
  mint: 'bg-mint-dot',
  sky: 'bg-sky-dot',
  butter: 'bg-butter-dot',
  rose: 'bg-rose-dot',
}

export const UNSORTED_DOT = 'bg-unsorted-dot'
