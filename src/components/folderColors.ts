import { FOLDER_COLORS, type Folder, type FolderColor } from '../db/schema.ts'
import type { Urgency } from '../lib/dates.ts'

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

/** First colour no folder uses yet, so new folders look different by default. */
export function nextColor(folders: readonly Folder[]): FolderColor {
  return FOLDER_COLORS.find((c) => !folders.some((f) => f.color === c)) ?? FOLDER_COLORS[0]
}

/** Due pills coloured by urgency; outside the Due soon window they stay neutral. */
export function duePill(urgency: Urgency | null): string {
  return urgency ? URGENCY_PILL[urgency] : 'bg-bg text-text-secondary'
}

const URGENCY_PILL: Record<Urgency, string> = {
  late: 'bg-late text-ink',
  today: 'bg-today text-ink',
  tomorrow: 'bg-tomorrow text-ink',
  later: 'bg-later text-ink',
}
